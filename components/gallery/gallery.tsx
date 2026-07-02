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
      category === ALL
        ? shaders
        : shaders.filter((s) => s.category === category),
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
    const list =
      next === ALL ? shaders : shaders.filter((s) => s.category === next);
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
