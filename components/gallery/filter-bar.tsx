"use client";

export function FilterBar({
  categories,
  active,
  counts,
  onChange,
}: {
  categories: string[];
  active: string;
  counts: Record<string, number>;
  onChange: (c: string) => void;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-6 mb-10 flex flex-wrap items-center gap-2 bg-background/70 px-6 py-4 backdrop-blur-md md:-mx-10 md:px-10">
      {categories.map((c) => {
        const on = c === active;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`group flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              on
                ? "border-white bg-white text-black"
                : "border-white/15 text-zinc-400 hover:border-white/40 hover:text-white"
            }`}
          >
            <span>{c}</span>
            <span
              className={`tabular-nums ${on ? "text-black/50" : "text-zinc-600 group-hover:text-zinc-400"}`}
            >
              {counts[c]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
