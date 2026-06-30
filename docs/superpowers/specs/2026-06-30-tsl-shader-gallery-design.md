# TSL Shader Gallery — Design

**Date:** 2026-06-30
**Status:** Approved (pending spec review)

## Goal

A gallery web app that showcases full-screen TSL (Three.js Shading Language) shaders. The homepage lists every shader as a static poster thumbnail; clicking one opens a dynamic route that renders the live shader through a single shared renderer component. Adding a new shader means dropping one `.ts` file and adding one registry entry.

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (already configured)
- **3D / shaders:** `three` (`three/webgpu`, `three/tsl`), `@react-three/fiber` v9, `@react-three/drei`
- **Renderer:** `WebGPURenderer` with automatic WebGL2 backend fallback

Utilities are vendored from the `phobon/fragments-boilerplate` repo (which is Vite + TanStack Router — we port only its `tsl/` shader utils, not its app shell).

## Core insight: one component, every shader

The target shaders are full-screen fragment shaders — they compute an output color from screen-space UV (`screenSize`, `screenAspectUV`, etc.) and do not depend on scene geometry. Therefore the shared renderer is a **fullscreen quad** whose `NodeMaterial.colorNode` is set to the shader's exported `Fn()`.

A single `<ShaderCanvas shader={fn} />` component powers both the detail page and the capture tool. Nothing is per-shader except the shader `.ts` file itself.

## Architecture

### File layout

```
app/
  layout.tsx               # root layout (existing)
  page.tsx                 # gallery grid (Server Component, reads registry)
  shader/[slug]/page.tsx   # dynamic route -> loads shader -> <ShaderCanvas>
  shader/[slug]/not-found.tsx
  capture/page.tsx         # DEV-only: batch-render every shader, save posters
  api/capture/route.ts     # DEV-only: writes PNG to public/posters/<slug>.png
components/
  shader-canvas.tsx        # 'use client' — Canvas + WebGPURenderer + fullscreen quad
  shader-tile.tsx          # poster tile -> Link to /shader/[slug]
lib/
  shaders.ts               # typed registry
tsl/                       # vendored utils + project sketches
  sketches/
    mesh_gradient_1.ts     # the provided example shader
  noise/  patterns/  effects/  utils/color/  utils/function/  utils/math/  utils/sdf/
public/
  posters/
    <slug>.png             # generated poster thumbnails
```

### Registry (`lib/shaders.ts`)

Single source of truth. An array of entries:

```ts
type ShaderEntry = {
  slug: string;          // url + poster filename, e.g. "mesh-gradient-1"
  title: string;         // display name
  category: string;      // grouping label, e.g. "gradient", "noise"
  load: () => Promise<{ default: ShaderFn }>; // static import specifier
};
```

`load` MUST use a literal import specifier (`() => import('@/tsl/sketches/mesh_gradient_1')`) so Next/Turbopack can code-split per shader. Fully dynamic `import(variable)` is not used.

Helper `getShader(slug)` returns the entry or `undefined`.

### Shared renderer (`components/shader-canvas.tsx`)

- `'use client'` component.
- Mounts an R3F `<Canvas>` configured with an async `gl` factory that constructs a `WebGPURenderer`, `await renderer.init()`, and returns it. R3F v9 supports returning (and awaiting) a renderer from `gl`.
- Renders a fullscreen quad (drei `<ScreenQuad>` or an equivalent clip-space triangle).
- Builds the material imperatively: `const material = useMemo(() => { const m = new MeshBasicNodeMaterial(); m.colorNode = shader(); return m }, [shader])`, attached to the quad via `<primitive>`.
- `frameloop="always"` so time-based uniforms (`time`) animate.
- Accepts an optional `onReady`/capture hook so the capture tool can grab a frame.
- Renders a graceful fallback message if neither WebGPU nor WebGL2 is available.

### Dynamic route (`app/shader/[slug]/page.tsx`)

- Reads `slug` from params, looks it up in the registry.
- Unknown slug -> `notFound()`.
- `await entry.load()` -> passes `mod.default` to `<ShaderCanvas>`.
- Minimal chrome: shader fills the viewport, a floating back-link to `/` and the shader title/category.

### Homepage (`app/page.tsx`)

- Server Component. Maps the registry to `<ShaderTile>`s.
- Dark editorial grid: near-black background, full-bleed poster grid with generous gutters, monospace caption (title + category) revealed on hover.
- Each tile links to `/shader/<slug>` and shows `public/posters/<slug>.png` (with a generated gradient placeholder fallback if the poster file is missing).

### Poster capture (dev workflow)

- `/capture` (dev-only) mounts each registered shader in turn via `<ShaderCanvas>`, waits for a rendered frame, reads `renderer.domElement.toDataURL('image/png')`, and POSTs `{ slug, dataUrl }` to `/api/capture`.
- `app/api/capture/route.ts` (dev-only) decodes the data URL and writes `public/posters/<slug>.png`.
- Both paths refuse to run when `NODE_ENV === 'production'`.
- Workflow: add shader file -> add registry entry -> run dev server -> visit `/capture` -> posters written.

### Vendoring the boilerplate utils

- Copy `src/tsl/` from `phobon/fragments-boilerplate` into `tsl/`.
- The provided example imports `@/tsl/patterns/grain_texture_pattern`, `@/tsl/noise/turbulence`, `@/tsl/utils/color/tonemapping`, `@/tsl/utils/function`. The boilerplate places grain under `effects/`; reconcile the vendored folder/paths (and any barrel files) so the example `mesh_gradient_1.ts` compiles unchanged.
- `@/*` already maps to project root in `tsconfig.json`, so `@/tsl/...` resolves.

## Data flow

```
registry (lib/shaders.ts)
   |
   |--> app/page.tsx ............ grid of <ShaderTile> (poster + link)
   |
   '--> app/shader/[slug] ....... getShader(slug) -> load() -> <ShaderCanvas shader={fn}>
                                                                   |
                                              WebGPURenderer + fullscreen quad
                                              material.colorNode = fn()
```

## Error handling

- **Unknown slug:** `notFound()` -> `not-found.tsx`.
- **WebGPU + WebGL2 both unavailable:** `<ShaderCanvas>` shows a static fallback message instead of a blank canvas.
- **Missing poster:** tile renders a generated gradient placeholder.
- **Capture in production:** route + page short-circuit (404 / disabled UI).

## Configuration notes

- Shader components are `'use client'`; `three/webgpu` is never imported on the server.
- `next.config.ts`: add `transpilePackages`/`serverExternalPackages` only if a build error surfaces from `three` subpath ESM — not pre-emptively. Read `node_modules/next/dist/docs/` before changing Next config (per AGENTS.md).

## Verification

- Gate: `tsc --noEmit` (typecheck) and `next build` both pass.
- Manual smoke via the running dev app: homepage grid renders; `/shader/mesh-gradient-1` shows the animated gradient; `/capture` writes a poster.
- No automated render assertion — WebGPU is unreliable in headless CI.

## Out of scope (YAGNI)

- Live mini-canvas previews on the grid (chosen against; static posters).
- Auto-discovery / filesystem globbing of shaders (explicit registry instead).
- Shader parameter UI / Leva controls.
- Auth, persistence, deployment pipeline.
```

## Adding a new shader (summary)

1. Add `tsl/sketches/<name>.ts` exporting a default `Fn` returning a color.
2. Add one entry to `lib/shaders.ts` (`slug`, `title`, `category`, `load`).
3. Run dev server, visit `/capture` to generate the poster.