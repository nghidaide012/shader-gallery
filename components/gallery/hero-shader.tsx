"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
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
    <Link
      href={`/shader/${activeSlug}`}
      data-tile
      className="relative mb-10 block h-[54vh] min-h-[420px] w-full overflow-hidden rounded-lg bg-zinc-950"
    >
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

      {/* Legibility scrim under the title. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-8">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/70">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live preview
          </div>
          <h2 className="font-mono text-4xl font-semibold uppercase leading-none tracking-tight text-white md:text-6xl lg:text-7xl">
            {activeEntry?.title}
          </h2>
        </div>
        <span className="hidden font-mono text-xs uppercase tracking-widest text-white/70 sm:block">
          {activeEntry?.category} →
        </span>
      </div>
    </Link>
  );
}
