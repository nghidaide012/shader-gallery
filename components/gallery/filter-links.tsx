"use client";

export function FilterLinks({
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
    <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest">
      {categories.map((c) => {
        const on = c === active;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`transition-colors ${
              on ? "text-white" : "text-white/40 hover:text-white/80"
            }`}
          >
            {c}{" "}
            <span
              className={`tabular-nums ${on ? "text-white/50" : "text-white/25"}`}
            >
              {counts[c]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
