# TSL Gallery — Homepage Redesign

**Date:** 2026-07-01
**Status:** Approved (design)

## Goal

Replace the current flat, static poster grid homepage with an awwwards-style,
"brutalist-mono" cinematic gallery driven by GSAP. The core flow is unchanged:
the user sees the shaders on the homepage and clicks one to enter its
full-screen `/shader/[slug]` page.

## Locked decisions

| Area | Decision |
| --- | --- |
| Layout concept | Cinematic reveal grid with a live hero above it |
| Rendering | One live WebGPU hero shader; grid tiles stay static poster PNGs |
| Hero behavior | Hover-reactive: auto-cycles when idle, switches to the hovered shader |
| Click transition | GSAP Flip morph (clicked tile expands into the shader page) |
| Aesthetic | Brutalist mono — near-black canvas, `Geist Mono`, oversized index numbers, hairline rules, uppercase labels; shaders supply the color |
| New fonts | None (reuse the already-loaded Geist Mono / Geist Sans) |

## Layout & behavior

```
┌─ NAV ── TSL/GALLERY ································ ©2026 (5) ─┐
│                                                              │
│   ┌───────────────────────┐    01 ─ SINGULARITY   raymarch  │  hero + index list
│   │   LIVE HERO SHADER     │    02 ─ NEBULA                  │  hovering a row/tile
│   │   (active slug)        │    03 ─ MESH GRADIENT 1         │  drives the hero
│   └───────────────────────┘    04 ─ CELLULAR                │
│   active title · category      05 ─ GENUARY 1               │
│                                                              │
│   ── scroll ─────────────────────────────────────────────   │
│   ┌────────┐   ┌────────┐   ┌────────┐                      │  reveal grid
│   │ poster │   │ poster │   │ poster │   stagger-in on       │  (posters, not live)
│   │ 01     │   │ 02     │   │ 03     │   scroll; magnetic    │
│   └────────┘   └────────┘   └────────┘   hover               │
└──────────────────────────────────────────────────────────────┘
                          ◉ custom cursor ("VIEW" over a tile)
```

- The hero and grid share hover state. Hovering a grid tile **or** an index-list
  row sets the hero's `activeSlug`.
- When no tile is hovered, the hero **auto-cycles** through the shaders with a
  crossfade on a timer. Auto-cycle pauses on hover and when the tab is hidden.
- Clicking any tile or index row triggers the Flip morph into that shader's page.

## Component architecture

All new gallery UI lives under `components/gallery/`.

- **`gallery.tsx`** (client root) — imports the `shaders` registry directly
  (client component, so no RSC serialization of the non-serializable `load`
  fns). Owns `activeSlug` and hover state; composes hero, index list, grid, and
  custom cursor. `app/page.tsx` shrinks to a thin wrapper that renders
  `<Gallery/>`.
- **`hero-shader.tsx`** — a persistent WebGPU canvas that reuses the existing
  `ShaderScene`. Swaps the shader `Fn` when `activeSlug` changes, staying inside
  one WebGPU context (cheap — `ShaderScene` memoizes the material on the fn).
  A **poster crossfade layer** masks the brief load/compile on each switch. The
  one component-kind shader (`cellular`, which owns its own scene) mounts its
  `ComponentScene` on demand behind the same crossfade; if that proves janky it
  falls back to showing the cellular poster in the hero.
- **`gallery-grid.tsx` / `gallery-tile.tsx`** — poster tiles with index number
  and title/category. `ScrollTrigger` staggered reveal on scroll-in, magnetic
  hover, hover → sets hero `activeSlug`, click → Flip transition.
- **`index-list.tsx`** — the oversized numbered list beside the hero. Same
  hover → hero and click → transition wiring as the tiles.
- **`custom-cursor.tsx`** — a GSAP `quickTo` follower that shows a "VIEW" state
  over interactive tiles. Only mounts on fine + hover-capable pointers
  (`(hover: hover) and (pointer: fine)`).
- **`use-flip-transition.ts`** — the Flip morph. On click: clone the tile's
  poster into a fixed full-screen overlay, GSAP Flip-expand it from the tile's
  rect to fullscreen, `router.push('/shader/<slug>')`, then fade the overlay out
  to reveal the live shader page underneath.
- **`lib/gsap.ts`** — one-time client-side registration of the `Flip` and
  `ScrollTrigger` plugins, and the shared `gsap.matchMedia` setup for
  reduced-motion. (GSAP 3.15 ships all plugins free.)

## Cross-cutting concerns

- **Reduced motion** — via `gsap.matchMedia` + `prefers-reduced-motion`:
  reveals become instant, the custom cursor is disabled, the Flip morph
  degrades to a plain crossfade, and the hero stops auto-cycling.
- **Performance** — exactly one live WebGPU context (the hero); the grid stays
  static posters. Auto-cycle also pauses on `visibilitychange`. Old hero
  materials are disposed on swap to avoid leaks.
- **`globals.css`** — switch the base to the dark/mono foundation and remove the
  `Arial` body override that currently fights the Geist fonts. Scope
  `cursor: none` to the gallery root only, so the shader page keeps its normal
  cursor.
- **Shader page** — essentially unchanged. The Flip overlay fades over the
  page's existing black background after the route settles, so no signalling
  coupling between the overlay and the shader page is required.
- **Touch / no-WebGPU** — on coarse pointers the custom cursor and magnetic
  hover are skipped; the hero honors the existing `hasGpu()` check and shows a
  static poster when WebGPU is unavailable.

## Out of scope

- No changes to the shader registry shape, the capture flow, or individual
  sketches.
- No new shaders.
- No unrelated refactoring of the shader page beyond what the transition needs.

## Verification

This is interactive/visual work, so no unit tests. Verify by:

- `npm run dev` + the Playwright/webapp-testing toolkit: screenshot the hero and
  grid, confirm hovering a tile swaps the hero shader, confirm clicking a tile
  navigates to `/shader/<slug>`, and confirm no console errors.
- Exercise the `prefers-reduced-motion` path (reveals instant, no custom cursor,
  fade instead of Flip).
- `next build` and `eslint` clean.
