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
    const id = window.setTimeout(
      () => setRenderSlug(activeSlug),
      SWITCH_DEBOUNCE_MS,
    );
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
    return () => {
      t.kill();
    };
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
