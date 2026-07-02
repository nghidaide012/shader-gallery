"use client";

import Link from "next/link";
import type { ShaderEntry } from "@/lib/shaders";

export function MosaicTile({
  entry,
  index,
  featured,
}: {
  entry: ShaderEntry;
  index: number;
  /** 2×2 tile in the mosaic. */
  featured: boolean;
}) {
  return (
    <Link
      href={`/shader/${entry.slug}`}
      data-flip-id={entry.slug}
      className={`group relative block overflow-hidden bg-zinc-900 ${
        featured ? "col-span-2 row-span-2" : ""
      } aspect-square`}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        style={{ backgroundImage: `url(/posters/${entry.slug}.png)` }}
      />

      {/* Index number — readable over any poster via blend mode. */}
      <span className="absolute left-2 top-2 font-mono text-[10px] tracking-widest text-white mix-blend-difference">
        {String(index + 1).padStart(3, "0")}
      </span>

      {/* Hover overlay with metadata. */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">
          {entry.category}
        </span>
        <span
          className={`font-mono font-semibold uppercase leading-tight tracking-tight text-white ${
            featured ? "text-xl md:text-2xl" : "text-sm md:text-base"
          }`}
        >
          {entry.title}
        </span>
      </div>
    </Link>
  );
}
