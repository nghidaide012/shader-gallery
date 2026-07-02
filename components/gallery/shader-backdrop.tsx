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
