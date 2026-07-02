"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap, Flip } from "@/lib/gsap";
import { MosaicTile } from "./mosaic-tile";

/** Works at these positions become 2×2 features — spread through the wall. */
const isFeatured = (i: number) => i % 7 === 0;

export function MosaicGrid({
  entries,
  flipState,
  reduced,
}: {
  entries: ShaderEntry[];
  /** Flip state captured by the filter handler just before entries change. */
  flipState: MutableRefObject<ReturnType<typeof Flip.getState> | null>;
  reduced: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // One-time reveal on load.
  useEffect(() => {
    if (!rootRef.current || reduced) return;
    const tiles = rootRef.current.querySelectorAll("[data-flip-id]");
    const tween = gsap.fromTo(
      tiles,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: "power2.out", stagger: 0.04 },
    );
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Re-flow the wall from the pre-filter state (captured in the click
  // handler). Runs before paint so tiles morph instead of jumping.
  useLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !rootRef.current) return;
    const targets = rootRef.current.querySelectorAll("[data-flip-id]");
    Flip.from(state, {
      targets,
      duration: 0.5,
      ease: "power2.inOut",
      stagger: 0.015,
      absolute: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" },
        ),
    });
  }, [entries, flipState]);

  return (
    <div
      ref={rootRef}
      className="-mx-6 mt-8 grid grid-flow-dense grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:-mx-10"
    >
      {entries.map((e, i) => (
        <MosaicTile key={e.slug} entry={e} index={i} featured={isFeatured(i)} />
      ))}
    </div>
  );
}
