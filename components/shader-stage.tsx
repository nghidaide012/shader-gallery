"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getShader } from "@/lib/shaders";
import { ShaderCanvas } from "@/components/shader-canvas";
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
  // Load the shader module on the client only — a Fn cannot cross the
  // Server -> Client boundary as a prop, so we resolve it here by slug.
  const [shader, setShader] = useState<ShaderFn | null>(null);
  useEffect(() => {
    let alive = true;
    const entry = getShader(slug);
    if (!entry) return;
    entry.load().then((m) => {
      if (alive) setShader(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <main className="relative h-dvh w-screen bg-black">
      {shader && <ShaderCanvas shader={shader} />}
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
