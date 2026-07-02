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
