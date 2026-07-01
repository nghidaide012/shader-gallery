"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { shaders } from "@/lib/shaders";
import { registerGsap } from "@/lib/gsap";
import { HeroShader } from "./hero-shader";
import { IndexList } from "./index-list";
import { GalleryGrid } from "./gallery-grid";
import { CustomCursor } from "./custom-cursor";
import { FlipTransitionProvider } from "./use-flip-transition";

const CYCLE_MS = 4200;

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
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [cycleSlug, setCycleSlug] = useState(shaders[0].slug);
  const pointerFine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Mirror latest values into refs (in an effect, never during render) so the
  // stable auto-cycle interval can read them without being torn down.
  const hoveredRef = useRef<string | null>(null);
  const reducedRef = useRef(false);
  useEffect(() => {
    hoveredRef.current = hoveredSlug;
    reducedRef.current = reduced;
  });

  useEffect(() => {
    registerGsap();
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
          <HeroShader
            entries={shaders}
            activeSlug={activeSlug}
            reduced={reduced}
          />
          <IndexList
            entries={shaders}
            activeSlug={activeSlug}
            onHover={setHoveredSlug}
          />
        </section>

        <GalleryGrid entries={shaders} onHover={setHoveredSlug} reduced={reduced} />

        {pointerFine && !reduced && <CustomCursor />}
      </main>
    </FlipTransitionProvider>
  );
}
