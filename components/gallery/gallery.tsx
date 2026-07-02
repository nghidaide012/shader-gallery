"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { shaders } from "@/lib/shaders";
import { Flip } from "@/lib/gsap";
import { FilterLinks } from "./filter-links";
import { MosaicGrid } from "./mosaic-grid";

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
      category === ALL
        ? shaders
        : shaders.filter((s) => s.category === category),
    [category],
  );

  // Snapshot tile positions before the filter re-renders the wall, so
  // MosaicGrid can Flip-morph from the old layout to the new one.
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);

  function handleCategory(next: string) {
    if (!reduced && typeof document !== "undefined") {
      const tiles = document.querySelectorAll("[data-flip-id]");
      if (tiles.length) flipState.current = Flip.getState(tiles);
    }
    setCategory(next);
  }

  return (
    <main className="min-h-dvh bg-background px-6 pb-16 pt-6 md:px-10">
      <header className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
        <span className="text-zinc-100">TSL — Gallery</span>
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

      <MosaicGrid entries={filtered} flipState={flipState} reduced={reduced} />
    </main>
  );
}
