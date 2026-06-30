"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { getShader } from "@/lib/shaders";
import { ShaderCanvas } from "@/components/shader-canvas";
import { ComponentShaderCanvas } from "@/components/component-shader-canvas";
import type { ShaderFn } from "@/tsl/types";

export function ShaderStage({
  slug,
  title,
  category,
}: {
  slug: string;
  title: string;
  category: string;
}) {
  // Load the sketch module on the client only — a Fn/component cannot cross the
  // Server -> Client boundary as a prop, so we resolve it here by slug.
  const [loaded, setLoaded] = useState<{
    default: ShaderFn | ComponentType;
  } | null>(null);
  const entry = getShader(slug);

  useEffect(() => {
    let alive = true;
    const e = getShader(slug);
    if (!e) return;
    e.load().then((m) => {
      if (alive) setLoaded(m);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <main className="relative h-dvh w-screen bg-black">
      {loaded &&
        (entry?.kind === "component" ? (
          <ComponentShaderCanvas component={loaded.default as ComponentType} />
        ) : (
          <ShaderCanvas shader={loaded.default as ShaderFn} />
        ))}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-6 font-mono text-xs text-white mix-blend-difference">
        <Link href="/" className="pointer-events-auto hover:opacity-60">
          ← gallery
        </Link>
        <span>
          {title} <span className="opacity-50">/ {category}</span>
        </span>
      </header>
    </main>
  );
}
