"use client";

import type { ShaderEntry } from "@/lib/shaders";
import { useFlipTransition } from "./use-flip-transition";

export function IndexList({
  entries,
  activeSlug,
  onHover,
}: {
  entries: ShaderEntry[];
  activeSlug: string;
  onHover: (slug: string | null) => void;
}) {
  const { navigate } = useFlipTransition();
  return (
    <ul
      className="flex flex-col justify-center divide-y divide-white/10 font-mono"
      onMouseLeave={() => onHover(null)}
    >
      {entries.map((e, i) => {
        const active = e.slug === activeSlug;
        return (
          <li key={e.slug}>
            <a
              href={`/shader/${e.slug}`}
              data-tile
              onMouseEnter={() => onHover(e.slug)}
              onClick={(ev) => navigate(ev, e)}
              className={`flex items-baseline gap-4 py-3 transition-colors ${
                active ? "text-white" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <span className="text-xs tabular-nums opacity-60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-lg uppercase tracking-tight sm:text-xl">
                {e.title}
              </span>
              <span className="text-[10px] uppercase tracking-widest opacity-50">
                {e.category}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
