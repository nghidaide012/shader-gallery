# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat poster grid homepage with a brutalist-mono cinematic gallery: a live hover-reactive hero shader, a scroll-revealed grid of poster tiles, a custom cursor, and a GSAP Flip morph into each shader's page.

**Architecture:** A single client root (`components/gallery/gallery.tsx`) owns hover + auto-cycle state and composes a live hero (reusing the existing `ShaderCanvas`/`ComponentShaderCanvas`), an index list, a poster grid, and a custom cursor. A body-mounted overlay driven imperatively by GSAP performs the Flip page transition so it survives the route change. All motion is gated behind `prefers-reduced-motion` and pointer-capability media queries.

**Tech Stack:** Next 16 (App Router), React 19, Tailwind v4, GSAP 3.15 (Flip + ScrollTrigger, both free), three/webgpu via @react-three/fiber.

## Global Constraints

- `three` / `@types/three` pinned to `0.185.x`; `tsl/` files stay `// @ts-nocheck`. Do not touch sketches or the registry shape.
- `three/webgpu` is client-only — never import it into a server component; live canvases mount via the existing `dynamic(..., { ssr: false })` wrappers.
- The `shaders` registry `load` fns are non-serializable — client components import `@/lib/shaders` directly rather than receiving it as a prop.
- Poster convention: `/posters/<slug>.png`. Slug is the URL segment for `/shader/<slug>`.
- No new fonts. Use the already-loaded `--font-geist-mono` / `--font-geist-sans`.
- Respect `prefers-reduced-motion: reduce` everywhere (instant reveals, no custom cursor, fade instead of Flip, no auto-cycle).
- This is interactive/visual work: verification is `next build` + `eslint` + dev-server visual/console checks, not unit tests.

---

### Task 1: GSAP registration + dark/mono base

**Files:**
- Create: `lib/gsap.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Create `lib/gsap.ts`**

```ts
"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register GSAP plugins once, on the client. Safe to call repeatedly. */
export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(Flip, ScrollTrigger);
  registered = true;
}

export { gsap, Flip, ScrollTrigger };
```

- [ ] **Step 2: Replace `app/globals.css`** (dark-first base, drop the Arial override, scope `cursor:none` to the gallery)

```css
@import "tailwindcss";

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}

/* Hide the native cursor for the custom one — only where a fine, hoverable
   pointer exists. Scoped to the gallery so the shader page is untouched. */
@media (hover: hover) and (pointer: fine) {
  .gallery-root,
  .gallery-root a {
    cursor: none;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: compiles clean (page still renders old grid — unchanged so far).

- [ ] **Step 4: Commit**

```bash
git add lib/gsap.ts app/globals.css
git commit -m "feat(gallery): gsap plugin registration + dark/mono base"
```

---

### Task 2: Flip transition provider

**Files:**
- Create: `components/gallery/use-flip-transition.tsx`

**Interfaces:**
- Produces: `FlipTransitionProvider({ children, reduced })`, `useFlipTransition()` → `{ navigate }` where `navigate(ev: React.MouseEvent, entry: ShaderEntry, source?: { el: HTMLElement; posterUrl: string })`.

- [ ] **Step 1: Create `components/gallery/use-flip-transition.tsx`**

```tsx
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap, Flip } from "@/lib/gsap";

type Source = { el: HTMLElement; posterUrl: string };
type NavigateFn = (
  ev: React.MouseEvent,
  entry: ShaderEntry,
  source?: Source,
) => void;

const Ctx = createContext<{ navigate: NavigateFn } | null>(null);

export function useFlipTransition() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFlipTransition needs FlipTransitionProvider");
  return ctx;
}

export function FlipTransitionProvider({
  children,
  reduced,
}: {
  children: ReactNode;
  reduced: boolean;
}) {
  const router = useRouter();

  const navigate = useMemo<NavigateFn>(
    () => (ev, entry, source) => {
      // Let modified clicks open a new tab normally.
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
      ev.preventDefault();
      const url = `/shader/${entry.slug}`;

      // Overlay lives on <body> so it outlives the gallery's unmount on nav.
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed",
        zIndex: "9999",
        margin: "0",
        backgroundColor: "#000",
        backgroundSize: "cover",
        backgroundPosition: "center",
      });
      document.body.appendChild(overlay);

      const settle = () =>
        gsap.to(overlay, {
          opacity: 0,
          duration: reduced ? 0.2 : 0.5,
          delay: reduced ? 0.1 : 0.55,
          ease: "power2.out",
          onComplete: () => overlay.remove(),
        });

      if (reduced || !source) {
        Object.assign(overlay.style, {
          inset: "0px",
          width: "100vw",
          height: "100vh",
          opacity: "0",
        });
        if (source) overlay.style.backgroundImage = `url(${source.posterUrl})`;
        gsap.to(overlay, {
          opacity: 1,
          duration: reduced ? 0.15 : 0.35,
          ease: "power2.inOut",
          onComplete: () => {
            router.push(url);
            settle();
          },
        });
        return;
      }

      // Flip morph: place over the tile, capture, expand to fullscreen.
      const r = source.el.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        borderRadius: "6px",
        backgroundImage: `url(${source.posterUrl})`,
      });
      const state = Flip.getState(overlay);
      Object.assign(overlay.style, {
        left: "0px",
        top: "0px",
        width: "100vw",
        height: "100vh",
        borderRadius: "0px",
      });
      Flip.from(state, {
        duration: 0.7,
        ease: "power3.inOut",
        onComplete: () => {
          router.push(url);
          settle();
        },
      });
    },
    [router, reduced],
  );

  return <Ctx.Provider value={{ navigate }}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 2: Verify** — `npm run build` compiles (provider unused yet, so also check lint doesn't flag; it's exported so fine).
- [ ] **Step 3: Commit**

```bash
git add components/gallery/use-flip-transition.tsx
git commit -m "feat(gallery): body-mounted GSAP Flip page transition"
```

---

### Task 3: Live hero shader

**Files:**
- Create: `components/gallery/hero-shader.tsx`

**Interfaces:**
- Consumes: `ShaderCanvas` (`{ shader: ShaderFn }`), `ComponentShaderCanvas` (`{ component: ComponentType }`), `getShader`, `gsap`.
- Produces: `HeroShader({ entries: ShaderEntry[], activeSlug: string, reduced: boolean })`.

- [ ] **Step 1: Create `components/gallery/hero-shader.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { ShaderEntry } from "@/lib/shaders";
import { getShader } from "@/lib/shaders";
import { ShaderCanvas } from "@/components/shader-canvas";
import { ComponentShaderCanvas } from "@/components/component-shader-canvas";
import { gsap } from "@/lib/gsap";
import type { ShaderFn } from "@/tsl/types";

// Debounce active -> rendered slug so sweeping the pointer across tiles doesn't
// recompile WGSL on every intermediate shader.
const SWITCH_DEBOUNCE_MS = 120;

export function HeroShader({
  activeSlug,
  reduced,
}: {
  entries: ShaderEntry[];
  activeSlug: string;
  reduced: boolean;
}) {
  const [renderSlug, setRenderSlug] = useState(activeSlug);
  const [mod, setMod] = useState<{
    slug: string;
    default: ShaderFn | ComponentType;
  } | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setRenderSlug(activeSlug), SWITCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [activeSlug]);

  // Load (cached) module for the rendered slug; raise the poster mask first.
  useEffect(() => {
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
  }, [renderSlug]);

  // Fade the poster mask out once the live module matches.
  useEffect(() => {
    if (!mod || mod.slug !== renderSlug || !posterRef.current) return;
    const t = gsap.to(posterRef.current, {
      opacity: 0,
      duration: reduced ? 0 : 0.5,
      delay: reduced ? 0 : 0.15,
      ease: "power2.out",
    });
    return () => t.kill();
  }, [mod, renderSlug, reduced]);

  const renderEntry = getShader(renderSlug);
  const activeEntry = getShader(activeSlug) ?? renderEntry;

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-zinc-950">
      <div className="absolute inset-0">
        {mod &&
          (renderEntry?.kind === "component" ? (
            <ComponentShaderCanvas
              key="component"
              component={mod.default as ComponentType}
            />
          ) : (
            <ShaderCanvas shader={mod.default as ShaderFn} />
          ))}
      </div>

      <div
        ref={posterRef}
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/posters/${activeSlug}.png)` }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 font-mono text-xs uppercase tracking-widest text-white mix-blend-difference">
        <span>{activeEntry?.title}</span>
        <span className="opacity-60">{activeEntry?.category}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit** (verified end-to-end in Task 6)

```bash
git add components/gallery/hero-shader.tsx
git commit -m "feat(gallery): live hover-reactive hero shader with poster crossfade"
```

---

### Task 4: Index list + grid tile + grid

**Files:**
- Create: `components/gallery/index-list.tsx`, `components/gallery/gallery-tile.tsx`, `components/gallery/gallery-grid.tsx`

**Interfaces:**
- Consumes: `useFlipTransition`, `gsap`, `ScrollTrigger`.
- Produces: `IndexList({ entries, activeSlug, onHover })`, `GalleryTile({ entry, index, onHover, reduced })`, `GalleryGrid({ entries, onHover, reduced })`. `onHover: (slug: string | null) => void`.

- [ ] **Step 1: Create `components/gallery/index-list.tsx`**

```tsx
"use client";

import type { ShaderEntry } from "@/lib/shaders";
import { useFlipTransition } from "./use-flip-transition";

export function IndexList({
  entries,
  activeSlug,
  onHover,
}: {
  entries: ShaderEntry[];
  activeSlug: string;
  onHover: (slug: string | null) => void;
}) {
  const { navigate } = useFlipTransition();
  return (
    <ul
      className="flex flex-col justify-center divide-y divide-white/10 font-mono"
      onMouseLeave={() => onHover(null)}
    >
      {entries.map((e, i) => {
        const active = e.slug === activeSlug;
        return (
          <li key={e.slug}>
            <a
              href={`/shader/${e.slug}`}
              data-tile
              onMouseEnter={() => onHover(e.slug)}
              onClick={(ev) => navigate(ev, e)}
              className={`flex items-baseline gap-4 py-3 transition-colors ${
                active ? "text-white" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <span className="text-xs tabular-nums opacity-60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-lg uppercase tracking-tight sm:text-xl">
                {e.title}
              </span>
              <span className="text-[10px] uppercase tracking-widest opacity-50">
                {e.category}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Create `components/gallery/gallery-tile.tsx`**

```tsx
"use client";

import { useRef } from "react";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap } from "@/lib/gsap";
import { useFlipTransition } from "./use-flip-transition";

export function GalleryTile({
  entry,
  index,
  onHover,
  reduced,
}: {
  entry: ShaderEntry;
  index: number;
  onHover: (slug: string | null) => void;
  reduced: boolean;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const xTo = useRef<((v: number) => void) | null>(null);
  const yTo = useRef<((v: number) => void) | null>(null);
  const { navigate } = useFlipTransition();

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduced || !innerRef.current) return;
    if (!xTo.current) {
      xTo.current = gsap.quickTo(innerRef.current, "x", { duration: 0.4, ease: "power3.out" });
      yTo.current = gsap.quickTo(innerRef.current, "y", { duration: 0.4, ease: "power3.out" });
    }
    const r = e.currentTarget.getBoundingClientRect();
    xTo.current((e.clientX - (r.left + r.width / 2)) * 0.15);
    yTo.current?.((e.clientY - (r.top + r.height / 2)) * 0.15);
  };

  const reset = () => {
    onHover(null);
    xTo.current?.(0);
    yTo.current?.(0);
  };

  return (
    <a
      href={`/shader/${entry.slug}`}
      data-tile
      data-reveal
      onMouseEnter={() => onHover(entry.slug)}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={(ev) =>
        navigate(ev, entry, {
          el: posterRef.current!,
          posterUrl: `/posters/${entry.slug}.png`,
        })
      }
      className="group relative block"
    >
      <div ref={innerRef} className="will-change-transform">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-900">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black"
          />
          <div
            ref={posterRef}
            aria-hidden
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(/posters/${entry.slug}.png)` }}
          />
        </div>
        <div className="mt-2 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-zinc-400">
          <span>
            <span className="opacity-50">{String(index + 1).padStart(2, "0")}</span>{" "}
            <span className="text-zinc-200">{entry.title}</span>
          </span>
          <span className="opacity-50">{entry.category}</span>
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 3: Create `components/gallery/gallery-grid.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { GalleryTile } from "./gallery-tile";

export function GalleryGrid({
  entries,
  onHover,
  reduced,
}: {
  entries: ShaderEntry[];
  onHover: (slug: string | null) => void;
  reduced: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const tiles = gsap.utils.toArray<HTMLElement>("[data-reveal]", rootRef.current);
    if (reduced) {
      gsap.set(tiles, { opacity: 1, y: 0 });
      return;
    }
    gsap.set(tiles, { opacity: 0, y: 40 });
    const batch = ScrollTrigger.batch(tiles, {
      start: "top 90%",
      onEnter: (els) =>
        gsap.to(els, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          overwrite: true,
        }),
    });
    ScrollTrigger.refresh();
    return () => batch.forEach((st) => st.kill());
  }, [reduced, entries.length]);

  return (
    <section ref={rootRef} className="mt-16">
      <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
        Index / {entries.length} works
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e, i) => (
          <GalleryTile key={e.slug} entry={e} index={i} onHover={onHover} reduced={reduced} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/gallery/index-list.tsx components/gallery/gallery-tile.tsx components/gallery/gallery-grid.tsx
git commit -m "feat(gallery): index list + reveal grid with magnetic tiles"
```

---

### Task 5: Custom cursor

**Files:**
- Create: `components/gallery/custom-cursor.tsx`

**Interfaces:**
- Produces: `CustomCursor()` (no props).

- [ ] **Step 1: Create `components/gallery/custom-cursor.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = dotRef.current;
    const label = labelRef.current;
    if (!el || !label) return;
    gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0.35 });
    gsap.set(label, { opacity: 0 });
    const xTo = gsap.quickTo(el, "x", { duration: 0.25, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.25, ease: "power3.out" });

    const move = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const on = !!(e.target as HTMLElement).closest?.("[data-tile]");
      gsap.to(el, { scale: on ? 1 : 0.35, duration: 0.3, ease: "power2.out" });
      gsap.to(label, { opacity: on ? 1 : 0, duration: 0.2 });
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9998] grid h-20 w-20 place-items-center rounded-full bg-white mix-blend-difference"
    >
      <span
        ref={labelRef}
        className="font-mono text-[10px] uppercase tracking-widest text-black"
      >
        View
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/gallery/custom-cursor.tsx
git commit -m "feat(gallery): custom cursor with VIEW hover state"
```

---

### Task 6: Compose the gallery root + wire the page

**Files:**
- Create: `components/gallery/gallery.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: all of the above.
- Produces: `Gallery()` (no props).

- [ ] **Step 1: Create `components/gallery/gallery.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { shaders } from "@/lib/shaders";
import { registerGsap } from "@/lib/gsap";
import { HeroShader } from "./hero-shader";
import { IndexList } from "./index-list";
import { GalleryGrid } from "./gallery-grid";
import { CustomCursor } from "./custom-cursor";
import { FlipTransitionProvider } from "./use-flip-transition";

const CYCLE_MS = 4200;

export function Gallery() {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [cycleSlug, setCycleSlug] = useState(shaders[0].slug);
  const [pointerFine, setPointerFine] = useState(false);
  const [reduced, setReduced] = useState(false);

  const hoveredRef = useRef<string | null>(null);
  hoveredRef.current = hoveredSlug;
  const reducedRef = useRef(false);
  reducedRef.current = reduced;

  useEffect(() => {
    registerGsap();
    setPointerFine(
      window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    );
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (hoveredRef.current || reducedRef.current || document.hidden) return;
      setCycleSlug((cur) => {
        const i = shaders.findIndex((s) => s.slug === cur);
        return shaders[(i + 1) % shaders.length].slug;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  const activeSlug = hoveredSlug ?? cycleSlug;

  return (
    <FlipTransitionProvider reduced={reduced}>
      <main className="gallery-root relative min-h-dvh bg-background px-6 py-6 md:px-10">
        <header className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
          <span className="text-zinc-100">TSL / Gallery</span>
          <span>©2026 · ({shaders.length})</span>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <HeroShader entries={shaders} activeSlug={activeSlug} reduced={reduced} />
          <IndexList entries={shaders} activeSlug={activeSlug} onHover={setHoveredSlug} />
        </section>

        <GalleryGrid entries={shaders} onHover={setHoveredSlug} reduced={reduced} />

        {pointerFine && !reduced && <CustomCursor />}
      </main>
    </FlipTransitionProvider>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
import { Gallery } from "@/components/gallery/gallery";

export default function Home() {
  return <Gallery />;
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add components/gallery/gallery.tsx app/page.tsx
git commit -m "feat(gallery): compose gallery root and wire homepage"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run dev server** — `npm run dev`, open `/`.
- [ ] **Step 2: Visual/behavior checks** (Playwright/webapp-testing toolkit or manual):
  - Hero renders live and auto-cycles; hovering a grid tile or index row switches the hero.
  - Grid tiles stagger-reveal on scroll; magnetic hover works; custom cursor shows "View" over tiles.
  - Clicking a grid tile Flip-morphs into `/shader/<slug>`; clicking an index row fades in; back button returns to a clean gallery (no leftover overlay).
  - No console errors.
- [ ] **Step 3: Reduced-motion pass** — emulate `prefers-reduced-motion: reduce`: reveals instant, no custom cursor, fade instead of Flip, hero not auto-cycling.
- [ ] **Step 4: Final commit if any tweaks**

```bash
git add -A
git commit -m "chore(gallery): verification tweaks"
```

## Self-Review notes

- **Spec coverage:** hero (Task 3), reveal grid + magnetic (Task 4), custom cursor (Task 5), Flip transition (Task 2), reduced-motion + perf + globals (Tasks 1/6), hover-reactive + auto-cycle + visibility pause (Task 6). Cellular in hero: live-on-demand via `ComponentShaderCanvas` branch (Task 3), poster mask masks the remount.
- **Placeholders:** none — all steps carry full code.
- **Type consistency:** `onHover: (slug: string | null) => void`, `navigate(ev, entry, source?)`, `HeroShader({entries,activeSlug,reduced})` consistent across tasks. `entries` prop kept on `HeroShader` for symmetry though it reads via `getShader`.
