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
