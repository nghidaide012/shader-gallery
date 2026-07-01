"use client";

import { useEffect, useRef } from "react";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { GalleryTile } from "./gallery-tile";

export function GalleryGrid({
  entries,
  filterKey,
  onHover,
  reduced,
}: {
  entries: ShaderEntry[];
  /** Changes when the active filter changes — re-triggers the reveal. */
  filterKey: string;
  onHover: (slug: string | null) => void;
  reduced: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Reveal tiles on scroll-in; re-run whenever the filter swaps the tile set.
  useEffect(() => {
    if (!rootRef.current) return;
    const tiles = gsap.utils.toArray<HTMLElement>(
      "[data-reveal]",
      rootRef.current,
    );
    if (reduced) {
      gsap.set(tiles, { opacity: 1, y: 0 });
      return;
    }
    gsap.set(tiles, { opacity: 0, y: 40 });
    const batch = ScrollTrigger.batch(tiles, {
      start: "top 92%",
      onEnter: (els) =>
        gsap.to(els, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.07,
          overwrite: true,
        }),
    });
    ScrollTrigger.refresh();
    return () => batch.forEach((st) => st.kill());
  }, [filterKey, reduced]);

  return (
    <section ref={rootRef}>
      <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
        Index — <span className="tabular-nums text-zinc-300">{entries.length}</span>{" "}
        {filterKey === "all" ? "works" : filterKey}
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map((e, i) => (
          <GalleryTile
            key={e.slug}
            entry={e}
            index={i}
            onHover={onHover}
            reduced={reduced}
          />
        ))}
      </div>
    </section>
  );
}
