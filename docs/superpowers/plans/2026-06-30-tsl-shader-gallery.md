# TSL Shader Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js gallery that lists TSL shaders as static poster thumbnails and renders any of them live through one shared WebGPU canvas component on a dynamic route.

**Architecture:** A typed registry (`lib/shaders.ts`) is the single source of truth. The homepage (Server Component) maps it to poster tiles linking to `/shader/[slug]`. The dynamic route looks up the slug, dynamically imports the shader's `.ts` module, and hands its default TSL `Fn` to a shared `<ShaderCanvas>` — a `'use client'` R3F `<Canvas>` running a `WebGPURenderer` that draws a fullscreen quad whose `NodeMaterial.colorNode = shader()`. A dev-only `/capture` page renders each shader and POSTs a PNG to a dev-only API route that writes `public/posters/<slug>.png`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, `three` (`three/webgpu`, `three/tsl`), `@react-three/fiber` v9, `@react-three/drei`.

## Global Constraints

- Next.js version is `16.2.9`. In Next 15+/16, dynamic route `params` and route-handler context are **Promises** — always `await` them.
- React is `19.2.4`; R3F must be `>= 9` and drei `>= 10` (React 19 support). Do not pin older majors.
- All Three.js / R3F code is client-side: every file that imports `three/webgpu`, `three/tsl`, `@react-three/fiber`, or `@react-three/drei` MUST start with `'use client'`. `three/webgpu` must never be imported in a Server Component or server module.
- The TSL renderer is `WebGPURenderer` (from `three/webgpu`), which auto-falls back to a WebGL2 backend. Do not use the legacy `WebGLRenderer`.
- `@/*` maps to the project root (`tsconfig.json` paths). Vendored utils live at `tsl/` so the example's `@/tsl/...` imports resolve.
- Per `AGENTS.md`: this Next.js differs from training data — before writing Next-specific code (route handlers, dynamic params, config), read the relevant guide in `node_modules/next/dist/docs/`.
- Capture page and API route MUST refuse to run when `process.env.NODE_ENV === 'production'`.
- Verification for rendering tasks is `tsc --noEmit` + `next build` + manual browser smoke. WebGPU does not run reliably headless, so there are no automated render assertions. There is no test framework in this project and none is added (YAGNI); the only pure logic (`getShader`) is verified by typecheck and runtime use.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm)

**Interfaces:**
- Produces: `three`, `@react-three/fiber`, `@react-three/drei` available to import.

- [ ] **Step 1: Install the 3D dependencies**

Run (Bash tool):
```bash
cd "c:/Drive_D/tsl-gallery" && npm install three @react-three/fiber @react-three/drei
```

- [ ] **Step 2: Verify resolved versions meet the floors**

Run:
```bash
cd "c:/Drive_D/tsl-gallery" && node -e "for (const p of ['three','@react-three/fiber','@react-three/drei']) console.log(p, require(p+'/package.json').version)"
```
Expected: `@react-three/fiber` major `>= 9`, `@react-three/drei` major `>= 10`, `three` present (>= 0.171). If fiber is `< 9`, run `npm install @react-three/fiber@latest @react-three/drei@latest` (React 19 needs these majors).

- [ ] **Step 3: Confirm `three` ships its own types (no `@types/three` needed)**

Run:
```bash
cd "c:/Drive_D/tsl-gallery" && node -e "console.log(require.resolve('three/webgpu'))"
```
Expected: a path is printed (module resolves). `three` bundles its types; do not install `@types/three`.

- [ ] **Step 4: Commit**

```bash
cd "c:/Drive_D/tsl-gallery" && git add package.json package-lock.json && git commit -m "build: add three, react-three-fiber, drei"
```

---

### Task 2: Vendor the boilerplate TSL utils and add the example shader

Copy the pure-TSL utilities from `phobon/fragments-boilerplate` into `tsl/`, drop the app-coupled folders, add the provided example shader, and define the shader type. Deliverable: `tsc --noEmit` passes with the example shader present.

**Files:**
- Create: `tsl/` (vendored tree: `noise/`, `patterns/`, `distortion/`, `utils/color/`, `utils/function/`, `utils/math/`, `utils/sdf/`, plus `noise/common.ts`, `utils/lighting.ts`)
- Create: `tsl/sketches/mesh_gradient_1.ts`
- Create: `tsl/types.ts`
- Possibly create: `utils/<file>.ts` (only if a kept tsl file imports `@/utils/...`)

**Interfaces:**
- Produces: `tsl/types.ts` exporting `type ShaderFn = () => Node` (Node from `three/webgpu`).
- Produces: `tsl/sketches/mesh_gradient_1.ts` with `export default meshGradient1` of type `ShaderFn`.

- [ ] **Step 1: Clone the boilerplate to a temp dir and copy `src/tsl` into `tsl/`**

Run (Bash tool):
```bash
TMP="$(mktemp -d)" && git clone --depth 1 https://github.com/phobon/fragments-boilerplate "$TMP/fb" \
  && mkdir -p "c:/Drive_D/tsl-gallery/tsl" \
  && cp -r "$TMP/fb/src/tsl/." "c:/Drive_D/tsl-gallery/tsl/" \
  && cp -r "$TMP/fb/src/utils" "c:/Drive_D/tsl-gallery/.vendor-utils" \
  && echo "COPIED"
```
Expected: `COPIED`. (`.vendor-utils` is a temporary staging copy of the boilerplate's `src/utils`, used only if Step 3 needs a file from it; delete it in Step 7.)

- [ ] **Step 2: Remove app-coupled folders (depend on stores/leva/maath — out of scope)**

Run:
```bash
cd "c:/Drive_D/tsl-gallery" && rm -rf tsl/interactivity tsl/post_processing && echo "PRUNED"
```
Expected: `PRUNED`. (These are R3F hooks/effect components that pull Zustand/Leva/maath; the gallery does not need them. They can be re-added later with their deps.)

- [ ] **Step 3: Find and resolve any non-`@/tsl` alias imports in the kept files**

Run:
```bash
cd "c:/Drive_D/tsl-gallery" && grep -rn "from '@/" tsl/ | grep -v "from '@/tsl/" || echo "NONE"
```
- If `NONE`: continue.
- Otherwise, for each printed import `@/utils/<name>`, copy that file in:
```bash
cd "c:/Drive_D/tsl-gallery" && mkdir -p utils && cp ".vendor-utils/<name>.ts" "utils/<name>.ts"
```
Repeat the grep until it prints `NONE` (a copied util may introduce its own `@/utils` import).

- [ ] **Step 4: Add the shader type**

Create `tsl/types.ts`:
```ts
import type { Node } from "three/webgpu";

// A sketch's default export: a TSL Fn callable that returns a color node.
// Loose by design — three/tsl Fn callables are not cleanly typed.
export type ShaderFn = () => Node;
```

- [ ] **Step 5: Add the example shader verbatim**

Create `tsl/sketches/mesh_gradient_1.ts`:
```ts
import { turbulence } from "@/tsl/noise/turbulence";
import { grainTexturePattern } from "@/tsl/patterns/grain_texture_pattern";
import { tanh } from "@/tsl/utils/color/tonemapping";
import { screenAspectUV } from "@/tsl/utils/function";
import { Color, Vector2 } from "three/webgpu";
import { Fn, screenSize, uniformArray, vec3, int, time, div, max, cos, Loop, PI, sin, vec2, length, float, pow, log, rotate } from "three/tsl";

//array of colors
const colors = uniformArray([new Color('#eee9df'), new Color('#ffb162'), new Color('#0870f0ff'), new Color('#9bc8f9ff')])

const colorCount = int(4)

const controlPoints = uniformArray([
  new Vector2(-0.8, -0.6),
  new Vector2(0.2, 0.7),
  new Vector2(0.9, -0.3),
  new Vector2(-0.4, 0.5),
  new Vector2(0.6, -0.8),
])
const meshGradient1 = Fn(() => {

    const _uv = screenAspectUV(screenSize).mul(2.0)
    const uv0 = screenAspectUV(screenSize)

    const _time = time.mul(0.1)

    //domain warping uv
    const uvR = _uv

    const finalColor = vec3(0.0)
    const totalWeight = float(0.0)

    //loop through all colors

    Loop({start: 0, end: colorCount}, ({i}) => {

        //base angle for this color spot

        const pos = controlPoints.element(i).toVar()

        pos.x.addAssign(sin(_time.mul(i.mul(0.75))))
        pos.y.addAssign(cos(_time.mul(2)))

        //distance from current fragment to the color spot
        const dist = length(uvR.sub(pos))
        dist.assign((pow(dist, 4.2)))

        //weight base on distance
        const weight = div(1, max(0.0, dist))


        const _c = colors.element(i)

        finalColor.addAssign(_c.mul(weight))
        totalWeight.addAssign(weight)
    })

    //tonemap
    finalColor.assign(tanh(finalColor.mul(2)))
    finalColor.mulAssign(finalColor)

    //grain
    const grain = grainTexturePattern(uv0).mul(0.1)
    finalColor.addAssign(grain)


    finalColor.divAssign(totalWeight)

    return finalColor
})

export default meshGradient1
```

- [ ] **Step 6: Typecheck — the example and all vendored utils must resolve**

Run:
```bash
cd "c:/Drive_D/tsl-gallery" && npx tsc --noEmit
```
Expected: no errors. If an import from `@/tsl/...` fails, the named export differs from the boilerplate file — open that vendored file and fix the import in `mesh_gradient_1.ts` to the actual export name. If a vendored file errors internally on an unused `@/utils` import, resolve via Step 3.

- [ ] **Step 7: Remove the staging copy and commit**

```bash
cd "c:/Drive_D/tsl-gallery" && rm -rf .vendor-utils && git add tsl utils 2>/dev/null; git add tsl && git commit -m "feat: vendor fragments-boilerplate tsl utils and add mesh_gradient_1 sketch"
```

---

### Task 3: Shared ShaderCanvas component

A `'use client'` component that renders any `ShaderFn` fullscreen through a `WebGPURenderer`. Verified by temporarily rendering the example shader on the homepage and confirming the animated gradient fills the viewport.

**Files:**
- Create: `components/shader-canvas.tsx`
- Modify (temporary): `app/page.tsx`

**Interfaces:**
- Produces: `export function ShaderCanvas({ shader }: { shader: ShaderFn }): JSX.Element` (default export not used).

- [ ] **Step 1: Check the WebGPU + R3F v9 canvas pattern against installed sources**

Read the WebGPU canvas usage in the installed drei/fiber if present, and confirm `ScreenQuad` and `MeshBasicNodeMaterial` exist:
```bash
cd "c:/Drive_D/tsl-gallery" && node -e "console.log('ScreenQuad', !!require('@react-three/drei').ScreenQuad); const T=require('three/webgpu'); console.log('MeshBasicNodeMaterial', !!T.MeshBasicNodeMaterial, 'WebGPURenderer', !!T.WebGPURenderer)"
```
Expected: all `true`.

- [ ] **Step 2: Write the ShaderCanvas component**

Create `components/shader-canvas.tsx`:
```tsx
"use client";

import * as THREE from "three/webgpu";
import { useMemo, useState, useEffect } from "react";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import type { ShaderFn } from "@/tsl/types";

// Register every three/webgpu class as a JSX element + type it for TS.
declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
extend(THREE as unknown as Record<string, unknown>);

function FullscreenShader({ shader }: { shader: ShaderFn }) {
  const material = useMemo(() => {
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = shader();
    return m;
  }, [shader]);

  // ScreenQuad draws a fullscreen clip-space triangle; we own the material.
  return (
    <ScreenQuad>
      <primitive object={material} attach="material" />
    </ScreenQuad>
  );
}

function hasGpu() {
  if (typeof navigator !== "undefined" && "gpu" in navigator) return true;
  if (typeof document === "undefined") return true; // assume yes during SSR
  const c = document.createElement("canvas");
  return !!(c.getContext("webgl2") || c.getContext("webgl"));
}

export function ShaderCanvas({ shader }: { shader: ShaderFn }) {
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasGpu()), []);

  if (!supported) {
    return (
      <div className="grid h-full w-full place-items-center bg-black text-zinc-400">
        <p className="font-mono text-sm">WebGPU / WebGL2 not available in this browser.</p>
      </div>
    );
  }

  return (
    <Canvas
      className="h-full w-full"
      frameloop="always"
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as ConstructorParameters<typeof THREE.WebGPURenderer>[0]);
        await renderer.init();
        return renderer;
      }}
    >
      <FullscreenShader shader={shader} />
    </Canvas>
  );
}
```

- [ ] **Step 3: Temporarily render the example shader on the homepage**

Replace `app/page.tsx` entirely:
```tsx
import { ShaderCanvas } from "@/components/shader-canvas";
import meshGradient1 from "@/tsl/sketches/mesh_gradient_1";

export default function Home() {
  return (
    <main className="h-dvh w-screen bg-black">
      <ShaderCanvas shader={meshGradient1} />
    </main>
  );
}
```

- [ ] **Step 4: Run the dev server and smoke-test in the browser**

Run (Bash tool, background): `cd "c:/Drive_D/tsl-gallery" && npm run dev`
Open `http://localhost:3000`. Expected: an animated blue/cream/orange mesh gradient with subtle grain fills the viewport. Check the browser console — no WebGPU/TSL errors.
If the canvas errors on the `gl` factory or JSX types, consult the installed R3F types and `node_modules/next/dist/docs/` for any client-component caveat, then adjust the `gl`/`extend` block.

- [ ] **Step 5: Stop the dev server and commit**

```bash
cd "c:/Drive_D/tsl-gallery" && git add components/shader-canvas.tsx app/page.tsx && git commit -m "feat: shared ShaderCanvas WebGPU renderer (temp homepage preview)"
```

---

### Task 4: Shader registry

The typed source of truth mapping slugs to metadata and a code-split loader. The example is registered. Verified by typecheck and the route in Task 5.

**Files:**
- Create: `lib/shaders.ts`

**Interfaces:**
- Produces:
  - `type ShaderEntry = { slug: string; title: string; category: string; load: () => Promise<{ default: ShaderFn }> }`
  - `const shaders: ShaderEntry[]`
  - `function getShader(slug: string): ShaderEntry | undefined`

- [ ] **Step 1: Write the registry**

Create `lib/shaders.ts`:
```ts
import type { ShaderFn } from "@/tsl/types";

export type ShaderEntry = {
  /** URL segment and poster filename (kebab-case). */
  slug: string;
  title: string;
  category: string;
  /** MUST use a literal import specifier so Next can code-split per shader. */
  load: () => Promise<{ default: ShaderFn }>;
};

export const shaders: ShaderEntry[] = [
  {
    slug: "mesh-gradient-1",
    title: "Mesh Gradient 1",
    category: "gradient",
    load: () => import("@/tsl/sketches/mesh_gradient_1"),
  },
];

export function getShader(slug: string): ShaderEntry | undefined {
  return shaders.find((s) => s.slug === slug);
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd "c:/Drive_D/tsl-gallery" && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "c:/Drive_D/tsl-gallery" && git add lib/shaders.ts && git commit -m "feat: typed shader registry with mesh-gradient-1"
```

---

### Task 5: Dynamic shader route

`/shader/[slug]` resolves the registry entry, dynamically imports the shader, and renders it fullscreen via `ShaderCanvas`. Unknown slugs `notFound()`.

**Files:**
- Create: `app/shader/[slug]/page.tsx`
- Create: `app/shader/[slug]/not-found.tsx`
- Create: `components/shader-stage.tsx` (`'use client'` wrapper: receives the loaded `ShaderFn` + chrome)

**Interfaces:**
- Consumes: `getShader`, `shaders` (Task 4); `ShaderCanvas` (Task 3).
- Produces: route `/shader/<slug>`.

- [ ] **Step 1: Confirm Next 16 dynamic-params + generateStaticParams API**

Read the App Router dynamic-routes guide:
```bash
cd "c:/Drive_D/tsl-gallery" && ls node_modules/next/dist/docs/ 2>/dev/null | head -40
```
Confirm `params` is a Promise in page props (Next 16). Use `await params`.

- [ ] **Step 2: Write the client stage wrapper**

Create `components/shader-stage.tsx`:
```tsx
"use client";

import Link from "next/link";
import { ShaderCanvas } from "@/components/shader-canvas";
import type { ShaderFn } from "@/tsl/types";

export function ShaderStage({
  shader,
  title,
  category,
}: {
  shader: ShaderFn;
  title: string;
  category: string;
}) {
  return (
    <main className="relative h-dvh w-screen bg-black">
      <ShaderCanvas shader={shader} />
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-6 font-mono text-xs text-white mix-blend-difference">
        <Link href="/" className="pointer-events-auto hover:opacity-60">
          ← gallery
        </Link>
        <span>
          {title} <span className="opacity-50">/ {category}</span>
        </span>
      </header>
    </main>
  );
}
```

- [ ] **Step 3: Write the dynamic page (Server Component, async params)**

Create `app/shader/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getShader, shaders } from "@/lib/shaders";
import { ShaderStage } from "@/components/shader-stage";

export function generateStaticParams() {
  return shaders.map((s) => ({ slug: s.slug }));
}

export default async function ShaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getShader(slug);
  if (!entry) notFound();

  const mod = await entry.load();
  return <ShaderStage shader={mod.default} title={entry.title} category={entry.category} />;
}
```

- [ ] **Step 4: Write the not-found page**

Create `app/shader/[slug]/not-found.tsx`:
```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid h-dvh w-screen place-items-center bg-black text-center font-mono text-sm text-zinc-400">
      <div>
        <p className="mb-4">Shader not found.</p>
        <Link href="/" className="text-zinc-200 underline hover:opacity-60">
          ← back to gallery
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Smoke-test both paths**

Run dev server (background). Visit:
- `http://localhost:3000/shader/mesh-gradient-1` → animated gradient fills viewport; top bar shows "← gallery" and "Mesh Gradient 1 / gradient".
- `http://localhost:3000/shader/does-not-exist` → "Shader not found" page.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
cd "c:/Drive_D/tsl-gallery" && git add app/shader components/shader-stage.tsx && git commit -m "feat: dynamic /shader/[slug] route with shared renderer"
```

---

### Task 6: Homepage gallery grid

Replace the temporary homepage with the real grid: poster tiles per registry entry, dark editorial styling, missing-poster fallback.

**Files:**
- Modify: `app/page.tsx`
- Create: `components/shader-tile.tsx`
- Create: `public/posters/.gitkeep`

**Interfaces:**
- Consumes: `shaders` (Task 4).
- Produces: homepage grid linking to `/shader/<slug>`.

- [ ] **Step 1: Keep `public/posters/` in git**

```bash
cd "c:/Drive_D/tsl-gallery" && mkdir -p public/posters && : > public/posters/.gitkeep
```

- [ ] **Step 2: Write the tile (server component, poster with graceful fallback)**

Create `components/shader-tile.tsx`:
```tsx
import Link from "next/link";
import type { ShaderEntry } from "@/lib/shaders";

export function ShaderTile({ entry }: { entry: ShaderEntry }) {
  return (
    <Link
      href={`/shader/${entry.slug}`}
      className="group relative block aspect-[4/3] overflow-hidden rounded-lg bg-zinc-900"
    >
      {/* Poster (or fallback gradient if the file is missing). Plain <img>
          so a 404 simply shows the gradient background underneath. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"
      />
      <img
        src={`/posters/${entry.slug}.png`}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
        }}
      />
      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 font-mono text-xs text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        {entry.title} <span className="opacity-50">/ {entry.category}</span>
      </div>
    </Link>
  );
}
```
Note: `onError` requires this be a client component. Add `"use client";` at the top of this file.

- [ ] **Step 3: Add the client directive to the tile**

Prepend to `components/shader-tile.tsx`:
```tsx
"use client";
```

- [ ] **Step 4: Write the homepage grid**

Replace `app/page.tsx` entirely:
```tsx
import { shaders } from "@/lib/shaders";
import { ShaderTile } from "@/components/shader-tile";

export default function Home() {
  return (
    <main className="min-h-dvh bg-black px-6 py-16 md:px-12">
      <header className="mb-12">
        <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-zinc-400">
          TSL Shader Gallery
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shaders.map((entry) => (
          <ShaderTile key={entry.slug} entry={entry} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Smoke-test**

Run dev server (background). Visit `http://localhost:3000`. Expected: dark page, one tile ("Mesh Gradient 1") showing the fallback gradient (no poster yet); hover reveals the caption; clicking opens `/shader/mesh-gradient-1`. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
cd "c:/Drive_D/tsl-gallery" && git add app/page.tsx components/shader-tile.tsx public/posters/.gitkeep && git commit -m "feat: homepage poster grid"
```

---

### Task 7: Dev-only poster capture flow

`/capture` renders each registered shader and POSTs a PNG data URL to `/api/capture`, which writes `public/posters/<slug>.png`. Both are disabled in production.

**Files:**
- Create: `app/api/capture/route.ts`
- Create: `app/capture/page.tsx`
- Create: `components/shader-capture.tsx`

**Interfaces:**
- Consumes: `shaders` (Task 4); `ShaderCanvas` building blocks (Task 3) — but capture needs renderer access, so it renders its own minimal canvas.
- Produces: `POST /api/capture` body `{ slug: string; dataUrl: string }` → writes file, returns `{ ok: true }`.

- [ ] **Step 1: Write the dev-only API route**

Read the route-handler guide first:
```bash
cd "c:/Drive_D/tsl-gallery" && ls node_modules/next/dist/docs/ 2>/dev/null | grep -i route
```
Create `app/api/capture/route.ts`:
```ts
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Disabled in production", { status: 404 });
  }

  const { slug, dataUrl } = (await req.json()) as { slug?: string; dataUrl?: string };
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !dataUrl?.startsWith("data:image/png;base64,")) {
    return new Response("Bad request", { status: 400 });
  }

  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const dir = path.join(process.cwd(), "public", "posters");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${slug}.png`), buffer);

  return Response.json({ ok: true, slug });
}
```

- [ ] **Step 2: Write the capture canvas component**

Create `components/shader-capture.tsx`:
```tsx
"use client";

import * as THREE from "three/webgpu";
import { useMemo, useRef } from "react";
import { Canvas, extend, useThree, useFrame, type ThreeToJSXElements } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import type { ShaderFn } from "@/tsl/types";

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
extend(THREE as unknown as Record<string, unknown>);

function Grabber({ shader, onCapture }: { shader: ShaderFn; onCapture: (dataUrl: string) => void }) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const done = useRef(false);

  const material = useMemo(() => {
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = shader();
    return m;
  }, [shader]);

  // Let a few frames render so time-based shaders settle, then grab the canvas.
  useFrame(() => {
    frames.current += 1;
    if (!done.current && frames.current > 8) {
      done.current = true;
      const dataUrl = (gl.domElement as HTMLCanvasElement).toDataURL("image/png");
      onCapture(dataUrl);
    }
  });

  return (
    <ScreenQuad>
      <primitive object={material} attach="material" />
    </ScreenQuad>
  );
}

export function ShaderCapture({
  shader,
  onCapture,
}: {
  shader: ShaderFn;
  onCapture: (dataUrl: string) => void;
}) {
  return (
    <Canvas
      style={{ width: 640, height: 480 }}
      frameloop="always"
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as ConstructorParameters<typeof THREE.WebGPURenderer>[0]);
        await renderer.init();
        return renderer;
      }}
    >
      <Grabber shader={shader} onCapture={onCapture} />
    </Canvas>
  );
}
```
Note: if a captured PNG comes out blank (WebGPU swapchain cleared before `toDataURL`), the fallback is to render into a `THREE.RenderTarget` and read it with `gl.readRenderTargetPixels`; try the simple path first and only escalate if Step 4 shows blanks.

- [ ] **Step 3: Write the dev-only capture page (sequential, one shader at a time)**

Create `app/capture/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { shaders } from "@/lib/shaders";
import { ShaderCapture } from "@/components/shader-capture";

export default function CapturePage() {
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const isProd = process.env.NODE_ENV === "production";

  useEffect(() => {
    if (isProd) return;
  }, [isProd]);

  if (isProd) return <p style={{ fontFamily: "monospace" }}>Capture is disabled in production.</p>;

  const current = shaders[index];

  async function handleCapture(dataUrl: string) {
    const slug = shaders[index].slug;
    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, dataUrl }),
    });
    setLog((l) => [...l, `${slug}: ${res.ok ? "saved" : "FAILED"}`]);
    setIndex((i) => i + 1);
  }

  return (
    <main style={{ padding: 24, fontFamily: "monospace", color: "#ddd", background: "#000", minHeight: "100dvh" }}>
      <h1>Poster capture ({index}/{shaders.length})</h1>
      {current ? (
        // key forces a fresh canvas per shader so each captures cleanly
        <ShaderCapture key={current.slug} shader={undefined as never} onCapture={handleCapture} />
      ) : (
        <p>Done.</p>
      )}
      <ul>{log.map((l) => <li key={l}>{l}</li>)}</ul>
    </main>
  );
}
```
Then fix the `shader` prop: the entry's shader must be loaded. Replace the `current ?` block to load the module:
```tsx
{current ? (
  <Loader key={current.slug} slug={current.slug} onCapture={handleCapture} />
) : (
  <p>Done.</p>
)}
```
and add this component in the same file (above `CapturePage`):
```tsx
import { useMemo } from "react";
import type { ShaderFn } from "@/tsl/types";

function Loader({ slug, onCapture }: { slug: string; onCapture: (d: string) => void }) {
  const [fn, setFn] = useState<ShaderFn | null>(null);
  const entry = useMemo(() => shaders.find((s) => s.slug === slug)!, [slug]);
  useEffect(() => {
    let alive = true;
    entry.load().then((m) => alive && setFn(() => m.default));
    return () => {
      alive = false;
    };
  }, [entry]);
  if (!fn) return <p>loading {slug}…</p>;
  return <ShaderCapture shader={fn} onCapture={onCapture} />;
}
```
(Consolidate the `useMemo`/`useState`/`useEffect` imports into the single React import at the top.)

- [ ] **Step 4: Run capture and verify the poster is written**

Run dev server (background). Visit `http://localhost:3000/capture`. Expected: counter advances to `1/1`, log shows `mesh-gradient-1: saved`. Confirm the file exists and is non-trivial:
```bash
cd "c:/Drive_D/tsl-gallery" && ls -l public/posters/mesh-gradient-1.png
```
Expected: a PNG of more than a few KB. Then reload `http://localhost:3000` — the tile now shows the real poster, not the fallback gradient. If the PNG is blank/tiny, apply the RenderTarget fallback noted in Step 2. Stop the dev server.

- [ ] **Step 5: Commit (do not commit generated posters as code; keep the captured one)**

```bash
cd "c:/Drive_D/tsl-gallery" && git add app/capture app/api/capture components/shader-capture.tsx public/posters/mesh-gradient-1.png && git commit -m "feat: dev-only poster capture flow"
```

---

### Task 8: Final verification and docs

**Files:**
- Modify: `AGENTS.md` (append "Adding a shader" section)

- [ ] **Step 1: Full typecheck + production build**

Run:
```bash
cd "c:/Drive_D/tsl-gallery" && npx tsc --noEmit && npm run build
```
Expected: typecheck clean; `next build` completes. If `three/webgpu` ESM trips the build, read `node_modules/next/dist/docs/` for `transpilePackages`/`serverExternalPackages` and add the minimal config to `next.config.ts` — only then.

- [ ] **Step 2: Document the add-a-shader workflow**

Append to `AGENTS.md`:
```markdown

# Adding a shader

1. Add `tsl/sketches/<name>.ts` — `export default Fn(() => { ...; return colorNode })`.
2. Add an entry to `lib/shaders.ts`: `{ slug, title, category, load: () => import('@/tsl/sketches/<name>') }`.
3. `npm run dev`, visit `/capture` to generate `public/posters/<slug>.png`.
The shared renderer (`components/shader-canvas.tsx`) and `/shader/[slug]` route need no changes.
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Drive_D/tsl-gallery" && git add AGENTS.md && git commit -m "docs: add-a-shader workflow"
```

- [ ] **Step 4: Final smoke pass**

Run dev server (background). Verify in order: `/` (grid with real poster) → click tile → `/shader/mesh-gradient-1` (animated, back-link works) → `/shader/bad` (not-found). Stop the dev server.

---

## Self-Review

**Spec coverage:** Stack/deps → T1. One-component insight + WebGPU renderer + fullscreen quad + fallback → T3. File layout → T2,T3,T4,T5,T6,T7. Registry + dynamic route (async params, notFound) → T4,T5. Poster capture (dev-only, NODE_ENV guard) → T7. Vendoring + path reconciliation → T2. Aesthetic (dark editorial, mono captions, hover) → T5,T6. Error handling (unknown slug, no-GPU, missing poster, prod capture) → T5,T3,T6,T7. Verification (tsc + build + manual) → T8. Out-of-scope items excluded. Covered.

**Placeholder scan:** No TBD/TODO. Vendoring uses exact clone+copy commands plus a typecheck gate rather than fabricated file bodies (the boilerplate's contents are external and authoritative) — these are concrete commands, not placeholders. The example shader is included verbatim.

**Type consistency:** `ShaderFn` (`tsl/types.ts`) is used identically in `ShaderCanvas`, `ShaderStage`, `ShaderCapture`, registry `load` return, and the `Loader`. `ShaderEntry` fields (`slug`, `title`, `category`, `load`) match every consumer. `getShader`/`shaders` names consistent across T4/T5/T6/T7. Capture POST shape `{ slug, dataUrl }` matches route handler.