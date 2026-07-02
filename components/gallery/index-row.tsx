"use client";

import Link from "next/link";
import type { ShaderEntry } from "@/lib/shaders";

export function IndexRow({
  entry,
  index,
  live,
  onHover,
}: {
  entry: ShaderEntry;
  index: number;
  /** This work is playing on the backdrop right now. */
  live: boolean;
  onHover: (slug: string | null) => void;
}) {
  return (
    <li className="index-row border-b border-white/10 first:border-t">
      <Link
        href={`/shader/${entry.slug}`}
        onMouseEnter={() => onHover(entry.slug)}
        onFocus={() => onHover(entry.slug)}
        onBlur={() => onHover(null)}
        className="group flex items-baseline gap-4 py-4 md:gap-8 md:py-5"
      >
        <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-white/35 md:w-12">
          {String(index + 1).padStart(3, "0")}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono font-semibold uppercase leading-none tracking-tight text-white [font-size:clamp(1.5rem,4vw,3.25rem)]">
          {entry.title}
        </span>
        <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-widest text-white/45 sm:block">
          {entry.category}
        </span>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest">
          {live ? (
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              live
            </span>
          ) : (
            <span className="text-white/45 transition-colors group-hover:text-white">
              ↗
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
