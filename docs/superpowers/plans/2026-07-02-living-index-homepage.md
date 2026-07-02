# Living Index Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero+grid homepage with a full-viewport live shader backdrop and a flat typographic index whose rows drive the backdrop on hover.

**Architecture:** One client component tree under `app/page.tsx`: `Gallery` (state owner — unchanged logic) composes `ShaderBackdrop` (fixed fullscreen live canvas + poster mask + scrim, generalized from `hero-shader.tsx`), `FilterLinks` (inline text filters), and `IndexList`/`IndexRow` (numbered rows, CSS sibling-dimming, GSAP stagger). Grid, pill filter bar, and custom cursor are deleted.

**Tech Stack:** Next.js 16 App Router (client components only), Tailwind v4, GSAP via `lib/gsap.ts`, existing `ShaderCanvas`/`ComponentShaderCanvas` renderers.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-living-index-homepage-design.md`.
- No test framework exists in this repo; each task's verify step is `npm run build` (typechecks) and the final task is a Playwright browser check. Do not add a test framework.
- All new files are client components (`"use client"`), Geist Mono only, no new fonts or deps.
- `lib/shaders.ts`, `/shader/[slug]`, and the capture flow must not change.
- Exactly one live canvas may exist at any time; only the active poster image may be requested.
- Row title size: `clamp(1.5rem, 4vw, 3.25rem)`. Hover debounce: 120 ms. Cycle: 4200 ms.

---

### Task 1: `ShaderBackdrop`

**Files:**
- Create: `components/gallery/shader-backdrop.tsx`

**Interfaces:**
- Consumes: `getShader` from `@/lib/shaders`, `ShaderCanvas`, `ComponentShaderCanvas`, `hasGpu` from `@/lib/has-gpu`, `gsap` from `@/lib/gsap`.
- Produces: `ShaderBackdrop({ activeSlug: string; hovered: boolean; reduced: boolean })` — fixed `inset-0 z-0` backdrop. Task 3 renders it.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { getShader } from "@/lib/shaders";
import { ShaderCanvas } from "@/components/shader-canvas";
import { ComponentShaderCanvas } from "@/components/component-shader-canvas";
import { hasGpu } from "@/lib/has-gpu";
import { gsap } from "@/lib/gsap";
import type { ShaderFn } from "@/tsl/types";

// Debounce active -> rendered slug so sweeping the pointer down the index
// doesn't recompile WGSL on every intermediate row.
const SWITCH_DEBOUNCE_MS = 120;

export function ShaderBackdrop({
  activeSlug,
  hovered,
  reduced,
}: {
  activeSlug: string;
  /** True while a row is hovered — lightens the scrim. */
  hovered: boolean;
  reduced: boolean;
}) {
  const [renderSlug, setRenderSlug] = useState(activeSlug);
  const [mod, setMod] = useState<{
    slug: string;
    default: ShaderFn | ComponentType;
  } | null>(null);
  const [gpu, setGpu] = useState(true);
  const posterRef = useRef<HTMLDivElement>(null);

  // Client-only capability check; SSR/first paint assumes true.
  useEffect(() => setGpu(hasGpu()), []);

  // Reduced motion or no GPU: poster-only backdrop, never mount the canvas.
  const still = reduced || !gpu;

  useEffect(() => {
    const id = window.setTimeout(
      () => setRenderSlug(activeSlug),
      SWITCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [activeSlug]);

  // Load (cached) module for the rendered slug; raise the poster mask first.
  useEffect(() => {
    if (still) return;
    let alive = true;
    const e = getShader(renderSlug);
    if (!e) return;
    if (posterRef.current) gsap.set(posterRef.current, { opacity: 1 });
    e.load().then((m) => {
      if (alive) setMod({ slug: renderSlug, default: m.default });
    });
    return () => {
      alive = false;
    };
  }, [renderSlug, still]);

  // Fade the poster mask out once the live module matches.
  useEffect(() => {
    if (still || !mod || mod.slug !== renderSlug || !posterRef.current) return;
    const t = gsap.to(posterRef.current, {
      opacity: 0,
      duration: 0.5,
      delay: 0.15,
      ease: "power2.out",
    });
    return () => {
      t.kill();
    };
  }, [mod, renderSlug, still]);

  const renderEntry = getShader(renderSlug);

  return (
    <div aria-hidden className="fixed inset-0 z-0 bg-black">
      <div className="absolute inset-0">
        {!still &&
          mod &&
          (renderEntry?.kind === "component" ? (
            <ComponentShaderCanvas
              key="component"
              component={mod.default as ComponentType}
            />
          ) : (
            <ShaderCanvas shader={mod.default as ShaderFn} />
          ))}
      </div>

      {/* Poster mask: instant swap on hover, faded once the live view is up. */}
      <div
        ref={posterRef}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/posters/${activeSlug}.png)` }}
      />

      {/* Legibility scrim — steps back while a row is hovered. */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25 transition-opacity duration-500 ${
          hovered ? "opacity-55" : "opacity-100"
        }`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (component is not yet referenced).

- [ ] **Step 3: Commit**

```bash
git add components/gallery/shader-backdrop.tsx
git commit -m "feat(gallery): fullscreen live shader backdrop"
```

---

### Task 2: `FilterLinks`, `IndexRow`, `IndexList` + row-dimming CSS

**Files:**
- Create: `components/gallery/filter-links.tsx`
- Create: `components/gallery/index-row.tsx`
- Create: `components/gallery/index-list.tsx`
- Modify: `app/globals.css` (replace the `cursor: none` block, lines 21-28)

**Interfaces:**
- Consumes: `ShaderEntry` type, `gsap`.
- Produces (Task 3 renders these):
  - `FilterLinks({ categories: string[]; active: string; counts: Record<string, number>; onChange: (c: string) => void })`
  - `IndexList({ entries: ShaderEntry[]; filterKey: string; activeSlug: string; onHover: (slug: string | null) => void; reduced: boolean })`
  - `IndexRow({ entry: ShaderEntry; index: number; live: boolean; onHover: (slug: string | null) => void })`

- [ ] **Step 1: Write `filter-links.tsx`**

```tsx
"use client";

export function FilterLinks({
  categories,
  active,
  counts,
  onChange,
}: {
  categories: string[];
  active: string;
  counts: Record<string, number>;
  onChange: (c: string) => void;
}) {
  return (
    <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest">
      {categories.map((c) => {
        const on = c === active;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`transition-colors ${
              on ? "text-white" : "text-white/40 hover:text-white/80"
            }`}
          >
            {c}{" "}
            <span
              className={`tabular-nums ${on ? "text-white/50" : "text-white/25"}`}
            >
              {counts[c]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Write `index-row.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { ShaderEntry } from "@/lib/shaders";

export function IndexRow({
  entry,
  index,
  live,
  onHover,
}: {
  entry: ShaderEntry;
  index: number;
  /** This work is playing on the backdrop right now. */
  live: boolean;
  onHover: (slug: string | null) => void;
}) {
  return (
    <li className="index-row border-b border-white/10 first:border-t">
      <Link
        href={`/shader/${entry.slug}`}
        onMouseEnter={() => onHover(entry.slug)}
        onFocus={() => onHover(entry.slug)}
        onBlur={() => onHover(null)}
        className="group flex items-baseline gap-4 py-4 md:gap-8 md:py-5"
      >
        <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-white/35 md:w-12">
          {String(index + 1).padStart(3, "0")}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono font-semibold uppercase leading-none tracking-tight text-white [font-size:clamp(1.5rem,4vw,3.25rem)]">
          {entry.title}
        </span>
        <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-widest text-white/45 sm:block">
          {entry.category}
        </span>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest">
          {live ? (
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              live
            </span>
          ) : (
            <span className="text-white/45 transition-colors group-hover:text-white">
              ↗
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
```

- [ ] **Step 3: Write `index-list.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap } from "@/lib/gsap";
import { IndexRow } from "./index-row";

export function IndexList({
  entries,
  filterKey,
  activeSlug,
  onHover,
  reduced,
}: {
  entries: ShaderEntry[];
  /** Changes when the active filter changes — re-triggers the stagger. */
  filterKey: string;
  activeSlug: string;
  onHover: (slug: string | null) => void;
  reduced: boolean;
}) {
  const rootRef = useRef<HTMLUListElement>(null);

  // Stagger rows in on load and on filter change. clearProps hands opacity
  // back to the stylesheet afterwards so CSS hover-dimming keeps working
  // (inline opacity would beat the .index-list:hover rules).
  useEffect(() => {
    if (!rootRef.current || reduced) return;
    const rows = gsap.utils.toArray<HTMLElement>(
      ".index-row",
      rootRef.current,
    );
    const tween = gsap.fromTo(
      rows,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.03,
        clearProps: "all",
        overwrite: true,
      },
    );
    return () => {
      tween.kill();
    };
  }, [filterKey, reduced]);

  return (
    <ul
      ref={rootRef}
      className="index-list mt-6"
      onMouseLeave={() => onHover(null)}
    >
      {entries.map((e, i) => (
        <IndexRow
          key={e.slug}
          entry={e}
          index={i}
          live={e.slug === activeSlug}
          onHover={onHover}
        />
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Update `app/globals.css`**

Replace the custom-cursor block (the `@media (hover: hover) and (pointer: fine)` rule hiding the native cursor, with its comment) with:

```css
/* Living Index: dim sibling rows while one is hovered (hover devices only). */
.index-row {
  transition: opacity 0.3s ease;
}
@media (hover: hover) and (pointer: fine) {
  .index-list:hover .index-row {
    opacity: 0.4;
  }
  .index-list:hover .index-row:hover {
    opacity: 1;
  }
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/gallery/filter-links.tsx components/gallery/index-row.tsx components/gallery/index-list.tsx app/globals.css
git commit -m "feat(gallery): typographic index rows, inline filters, row dimming"
```

---

### Task 3: Rewire `Gallery`, delete replaced components

**Files:**
- Modify: `components/gallery/gallery.tsx` (full rewrite below)
- Delete: `components/gallery/hero-shader.tsx`, `components/gallery/gallery-grid.tsx`, `components/gallery/gallery-tile.tsx`, `components/gallery/filter-bar.tsx`, `components/gallery/custom-cursor.tsx`

**Interfaces:**
- Consumes: `ShaderBackdrop` (Task 1), `FilterLinks` / `IndexList` (Task 2).
- Produces: `Gallery()` — unchanged export consumed by `app/page.tsx` (no change there).

- [ ] **Step 1: Rewrite `gallery.tsx`**

```tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { shaders } from "@/lib/shaders";
import { ShaderBackdrop } from "./shader-backdrop";
import { FilterLinks } from "./filter-links";
import { IndexList } from "./index-list";

const CYCLE_MS = 4200;
const ALL = "all";

/** Subscribe to a media query without setState-in-effect (SSR-safe: false). */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function Gallery() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Category filter derived from the registry — scales to any shader count.
  const categories = useMemo(() => {
    const set = new Set(shaders.map((s) => s.category));
    return [ALL, ...[...set].sort()];
  }, []);
  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: shaders.length };
    for (const s of shaders) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, []);

  const [category, setCategory] = useState(ALL);
  const filtered = useMemo(
    () =>
      category === ALL ? shaders : shaders.filter((s) => s.category === category),
    [category],
  );

  // Backdrop: hovered row wins; otherwise auto-cycle the filtered set.
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [cycleSlug, setCycleSlug] = useState(shaders[0].slug);

  const hoveredRef = useRef<string | null>(null);
  const reducedRef = useRef(false);
  const filteredRef = useRef(filtered);
  useEffect(() => {
    hoveredRef.current = hoveredSlug;
    reducedRef.current = reduced;
    filteredRef.current = filtered;
  });

  // Change filter + reset the backdrop to the new set's first item, all in
  // the event handler (no setState-in-effect).
  function handleCategory(next: string) {
    const list = next === ALL ? shaders : shaders.filter((s) => s.category === next);
    setCategory(next);
    setHoveredSlug(null);
    setCycleSlug(list[0]?.slug ?? shaders[0].slug);
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      if (hoveredRef.current || reducedRef.current || document.hidden) return;
      const list = filteredRef.current;
      if (list.length < 2) return;
      setCycleSlug((cur) => {
        const i = list.findIndex((s) => s.slug === cur);
        return list[(i + 1) % list.length].slug;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  const activeSlug = hoveredSlug ?? cycleSlug;

  return (
    <div className="relative min-h-dvh">
      <ShaderBackdrop
        activeSlug={activeSlug}
        hovered={hoveredSlug !== null}
        reduced={reduced}
      />

      <main className="relative z-10 px-6 pb-20 pt-6 md:px-10">
        <header className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.2em] text-white/60">
          <span className="text-white">TSL — Gallery</span>
          <span>
            ©2026 · <span className="tabular-nums">{shaders.length}</span> works
          </span>
        </header>

        <FilterLinks
          categories={categories}
          active={category}
          counts={counts}
          onChange={handleCategory}
        />

        <IndexList
          entries={filtered}
          filterKey={category}
          activeSlug={activeSlug}
          onHover={setHoveredSlug}
          reduced={reduced}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Delete replaced components**

```bash
git rm components/gallery/hero-shader.tsx components/gallery/gallery-grid.tsx components/gallery/gallery-tile.tsx components/gallery/filter-bar.tsx components/gallery/custom-cursor.tsx
```

- [ ] **Step 3: Verify no dangling imports and the build passes**

Run: `grep -rn "hero-shader\|gallery-grid\|gallery-tile\|filter-bar\|custom-cursor\|gallery-root" app components lib` — expect no hits.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(gallery): living-index homepage — live backdrop + typographic index"
```

---

### Task 4: Browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start dev server** — `npm run dev` (background).

- [ ] **Step 2: Playwright checks against `http://localhost:3000`** (webapp-testing skill):
  1. Backdrop canvas present and animating; header shows work count; all rows render with `001…` numbering.
  2. Hover row 3 (≥150 ms): `● live` marker moves to it; backdrop poster/canvas swaps; sibling rows dim (computed opacity ≈ 0.4).
  3. Click a category filter: list re-numbers from `001`, cycle restarts within that set.
  4. Click a row: navigates to `/shader/<slug>`.
  5. Emulate `prefers-reduced-motion: reduce`: no canvas mounted, poster backdrop visible, no cycling after 5 s.
  6. Viewport 390×844: rows fit, titles clamp down, no horizontal overflow.

- [ ] **Step 3: Screenshot** the homepage for the user.
