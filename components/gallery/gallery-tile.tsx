"use client";

import { useRef } from "react";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap } from "@/lib/gsap";
import { useFlipTransition } from "./use-flip-transition";

export function GalleryTile({
  entry,
  index,
  onHover,
  reduced,
}: {
  entry: ShaderEntry;
  index: number;
  onHover: (slug: string | null) => void;
  reduced: boolean;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const xTo = useRef<((v: number) => void) | null>(null);
  const yTo = useRef<((v: number) => void) | null>(null);
  const { navigate } = useFlipTransition();

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduced || !innerRef.current) return;
    if (!xTo.current) {
      xTo.current = gsap.quickTo(innerRef.current, "x", {
        duration: 0.4,
        ease: "power3.out",
      });
      yTo.current = gsap.quickTo(innerRef.current, "y", {
        duration: 0.4,
        ease: "power3.out",
      });
    }
    const r = e.currentTarget.getBoundingClientRect();
    xTo.current((e.clientX - (r.left + r.width / 2)) * 0.15);
    yTo.current?.((e.clientY - (r.top + r.height / 2)) * 0.15);
  };

  const reset = () => {
    onHover(null);
    xTo.current?.(0);
    yTo.current?.(0);
  };

  return (
    <a
      href={`/shader/${entry.slug}`}
      data-tile
      data-reveal
      onMouseEnter={() => onHover(entry.slug)}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={(ev) =>
        navigate(ev, entry, {
          el: posterRef.current!,
          posterUrl: `/posters/${entry.slug}.png`,
        })
      }
      className="group relative block"
    >
      <div ref={innerRef} className="will-change-transform">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-900">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black"
          />
          <div
            ref={posterRef}
            aria-hidden
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(/posters/${entry.slug}.png)` }}
          />
        </div>
        <div className="mt-2 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-zinc-400">
          <span>
            <span className="opacity-50">
              {String(index + 1).padStart(2, "0")}
            </span>{" "}
            <span className="text-zinc-200">{entry.title}</span>
          </span>
          <span className="opacity-50">{entry.category}</span>
        </div>
      </div>
    </a>
  );
}
