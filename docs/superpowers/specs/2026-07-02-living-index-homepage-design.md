# Living Index — homepage redesign

Date: 2026-07-02 · Status: approved by user

## Goal

Replace the hero-plus-poster-grid homepage with a "Living Index": the full
viewport is one live shader backdrop, and a flat typographic index of all
works scrolls over it. Must stay cheap and coherent at 50+ shaders.

## Decisions (user-approved)

- Direction: Living Index (full-screen live backdrop + text index).
- Rows: pure text — number, title, category, arrow. No thumbnails.
- Structure: one flat numbered list with inline text filters
  (`ALL 52 · GRADIENT 9 · …`). Filtering re-numbers the list.
- Type: mono lab — Geist Mono throughout; contrast via size/weight only.
  Row titles `clamp(1.75rem, 4vw, 3.5rem)` uppercase; metadata tiny,
  tracked-out.

## Layout

- Fixed full-viewport backdrop (`fixed inset-0 z-0`): live shader canvas
  under a poster mask (crossfade mechanic from the old hero).
- Legibility scrim over the backdrop: soft gradient weighted to the
  bottom/left where text sits; lightens while a row is hovered.
- Fixed small header: `TSL — GALLERY` left, `<count> works ©2026` right.
- Filter links under the header: active = white, inactive = zinc-500,
  no pills, counts inline.
- Index: flat list, hairline `white/10` rules between rows. Each row:
  dim tabular number · big title · category label right-aligned · `↗`
  (or `● LIVE` when that work is playing).

## Interaction

- Hover row → backdrop swaps to that shader. Reuse hero-shader mechanics:
  120 ms debounce; poster mask raised instantly; live canvas fades in when
  the WGSL module resolves.
- While any row is hovered, sibling rows dim to ~40 % (CSS-only:
  `.list:hover .row { opacity }` override on `.row:hover`).
- Idle → auto-cycle the filtered set (existing `CYCLE_MS` interval logic,
  paused on `document.hidden`). The playing row always shows `● LIVE`.
- Click → navigate directly to `/shader/[slug]` (no page transition,
  matches current behavior).
- Filter change → re-number, restart cycle at the new set's first entry.

## Scaling invariants (the point of this design)

- Exactly one live canvas regardless of catalog size.
- Only the active slug's poster image is requested — never N thumbnails.
- Rows are plain DOM; 50–500 entries is trivial.
- Shader modules remain code-split per slug via literal `import()` in
  `lib/shaders.ts`. Adding a shader requires no homepage change.

## Mobile & accessibility

- Touch (no hover): backdrop auto-cycles as ambient preview; the matching
  row highlights; tap navigates. Titles scale down via the clamp.
- `prefers-reduced-motion`: no auto-cycle, poster-only backdrop (no live
  swap animation), no stagger animations.
- WebGPU init failure: poster mask simply never fades out — backdrop
  degrades to a still image.

## Motion

- Load: rows stagger-fade in (GSAP, y≈12, ~30 ms stagger).
- Filter change: list re-staggers.
- Backdrop crossfade: existing GSAP poster-mask opacity trick.
- Removed: ScrollTrigger reveals, magnetic-tile effect.

## Components

- New: `components/gallery/shader-backdrop.tsx` (generalized from
  `hero-shader.tsx`), `index-list.tsx`, `index-row.tsx`,
  `filter-links.tsx`.
- Rewired: `components/gallery/gallery.tsx` — state logic (category,
  hovered slug, cycle slug, media queries) is kept nearly as-is.
- Deleted: `hero-shader.tsx`, `gallery-grid.tsx`, `gallery-tile.tsx`,
  `filter-bar.tsx`, `custom-cursor.tsx` (and the `cursor: none` CSS).
- Untouched: `/shader/[slug]` route, capture flow, `lib/shaders.ts` API.

## Testing

- `npm run build` + `tsc` clean.
- Browser check (Playwright): backdrop renders live shader; hovering a row
  swaps it (after debounce); filters re-number; rows navigate; reduced
  motion shows static poster; layout holds at mobile width.
