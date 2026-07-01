"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { shaders } from "@/lib/shaders";
import { HeroShader } from "./hero-shader";
import { FilterBar } from "./filter-bar";
import { GalleryGrid } from "./gallery-grid";
import { CustomCursor } from "./custom-cursor";

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
  const pointerFine = useMediaQuery("(hover: hover) and (pointer: fine)");
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
    () => (category === ALL ? shaders : shaders.filter((s) => s.category === category)),
    [category],
  );

  // Hero preview: hovered tile wins; otherwise auto-cycle the filtered set.
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

  // Change filter + reset the preview to the new set's first item, all in the
  // event handler (no setState-in-effect).
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
    <div className="gallery-root">
      <main className="relative min-h-dvh bg-background px-6 pb-24 pt-6 md:px-10">
        <header className="mb-6 flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
          <span className="text-zinc-100">TSL / Gallery</span>
          <span>
            ©2026 · <span className="tabular-nums">{shaders.length}</span> works
          </span>
        </header>

        {/* Full-width live hero doubling as masthead + hover preview. */}
        <HeroShader activeSlug={activeSlug} reduced={reduced} />

        <FilterBar
          categories={categories}
          active={category}
          counts={counts}
          onChange={handleCategory}
        />

        <GalleryGrid
          entries={filtered}
          filterKey={category}
          onHover={setHoveredSlug}
          reduced={reduced}
        />

        {pointerFine && !reduced && <CustomCursor />}
      </main>
    </div>
  );
}
