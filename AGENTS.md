<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Style

- Don't yap. Get to the point and answer what was asked.
- No preamble or filler; cut throat-clearing and restating the question.
- Be concise. Skip explanation the user didn't ask for.

# Shaders / TSL

- `three` and `@types/three` are pinned to `0.181.x` to match the vendored
  `tsl/` utils from `phobon/fragments-boilerplate`. Newer `@types/three`
  rejects the boilerplate's `Fn(([a,b]) => …)` idioms.
- Every file under `tsl/` starts with `// @ts-nocheck`. The boilerplate is a
  Vite project (never type-checked); the utils are runtime-correct but not
  `tsc`-clean. The typed boundary is `tsl/types.ts` (`ShaderFn`).
- Shaders are full-screen fragment shaders: a `MeshBasicNodeMaterial` whose
  `colorNode` is the sketch's `Fn()`, drawn on a fullscreen surface by
  `WebGPURenderer`. The renderer is client-only (`three/webgpu` never runs on
  the server); a `Fn` can't cross the RSC boundary as a prop — load it
  client-side by slug.

## Adding a shader

1. Add `tsl/sketches/<name>.ts` — start with `// @ts-nocheck`, then
   `export default Fn(() => { …; return colorNode })`.
2. Add an entry to `lib/shaders.ts`:
   `{ slug, title, category, load: () => import('@/tsl/sketches/<name>') }`
   (the `load` specifier must be a literal so Next can code-split).
3. `npm run dev`, visit `/capture` to generate `public/posters/<slug>.png`.

The shared renderer (`components/shader-canvas.tsx`), the `/shader/[slug]`
route, and the capture flow need no changes.
