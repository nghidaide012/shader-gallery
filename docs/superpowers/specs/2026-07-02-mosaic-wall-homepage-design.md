# Mosaic Wall — homepage redesign (supersedes Living Index)

Date: 2026-07-02 · Status: approved by user

## Why the pivot

User feedback on the Living Index: the full-screen shader swapping on every
mouse move is disorienting ("I don't even know where it is"), and the
homepage should not run live shaders at all — posters from the capture flow
are the showcase medium. Requirement: display ALL works at once, static,
in a distinctive style.

## Design

- Dense edge-to-edge poster mosaic, `gap-px` hairlines, `grid-flow-dense`.
- Columns: 2 / 3 (sm) / 4 (lg) / 5 (xl). Every tile `aspect-square`;
  works at index 0, 7, 14, … (i % 7 === 0) span 2×2 as features.
  With 1px gaps the feature square math is exact (2·col + 1px).
- Tile: poster as `bg-cover` div (repo convention). Tiny always-visible
  index number top-left in `mix-blend-difference`. Hover: slight poster
  zoom + gradient overlay sliding in title/category.
- Header and inline text `FilterLinks` kept from the previous iteration.
- Filter change re-flows the wall with GSAP Flip (`absolute: true`,
  matched by `data-flip-id={slug}`, entering tiles fade/scale in).
  Numbering is per filtered set.
- Initial load: one-time stagger fade of tiles. No ScrollTrigger.
- Reduced motion: no Flip, no stagger — tiles just render.
- No WebGPU, no live canvas, no hover-preview anywhere on the homepage.
  Live rendering stays on `/shader/[slug]`.

## Components

- New: `components/gallery/mosaic-grid.tsx`, `mosaic-tile.tsx`.
- Rewired: `gallery.tsx` (drops backdrop/hover/cycle state; keeps
  category state, counts, reduced-motion hook).
- Deleted: `shader-backdrop.tsx`, `index-list.tsx`, `index-row.tsx`;
  `.index-*` CSS rules removed from `globals.css`.
- Untouched: `app/page.tsx`, `FilterLinks`, `/shader/[slug]`, capture flow,
  `lib/shaders.ts`.

## Testing

- `npm run build` clean.
- Playwright: all tiles render with posters; no `<canvas>` on the page;
  feature tile spans 2×2; hover shows title overlay; filter re-flows and
  re-numbers; tile click navigates; no horizontal overflow at 390px.
