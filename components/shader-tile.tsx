import Link from "next/link";
import type { ShaderEntry } from "@/lib/shaders";

export function ShaderTile({ entry }: { entry: ShaderEntry }) {
  return (
    <Link
      href={`/shader/${entry.slug}`}
      className="group relative block aspect-[4/3] overflow-hidden rounded-lg bg-zinc-900"
    >
      {/* Gradient fallback base — shows through when no poster exists yet. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black"
      />
      {/* Poster on top; a missing file simply renders nothing (no broken icon). */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundImage: `url(/posters/${entry.slug}.png)` }}
      />
      <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/70 to-transparent p-4 font-mono text-xs text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        {entry.title} <span className="opacity-50">/ {entry.category}</span>
      </div>
    </Link>
  );
}
