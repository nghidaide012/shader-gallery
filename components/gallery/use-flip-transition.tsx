"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap, Flip } from "@/lib/gsap";

type Source = { el: HTMLElement; posterUrl: string };
type NavigateFn = (
  ev: React.MouseEvent,
  entry: ShaderEntry,
  source?: Source,
) => void;

const Ctx = createContext<{ navigate: NavigateFn } | null>(null);

export function useFlipTransition() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFlipTransition needs FlipTransitionProvider");
  return ctx;
}

export function FlipTransitionProvider({
  children,
  reduced,
}: {
  children: ReactNode;
  reduced: boolean;
}) {
  const router = useRouter();

  const navigate = useMemo<NavigateFn>(
    () => (ev, entry, source) => {
      // Let modified clicks open a new tab normally.
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
      ev.preventDefault();
      const url = `/shader/${entry.slug}`;

      // Overlay lives on <body> so it outlives the gallery's unmount on nav.
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed",
        zIndex: "9999",
        margin: "0",
        backgroundColor: "#000",
        backgroundSize: "cover",
        backgroundPosition: "center",
      });
      document.body.appendChild(overlay);

      const settle = () =>
        gsap.to(overlay, {
          opacity: 0,
          duration: reduced ? 0.2 : 0.5,
          delay: reduced ? 0.1 : 0.55,
          ease: "power2.out",
          onComplete: () => overlay.remove(),
        });

      if (reduced || !source) {
        Object.assign(overlay.style, {
          inset: "0px",
          width: "100vw",
          height: "100vh",
          opacity: "0",
        });
        if (source) overlay.style.backgroundImage = `url(${source.posterUrl})`;
        gsap.to(overlay, {
          opacity: 1,
          duration: reduced ? 0.15 : 0.35,
          ease: "power2.inOut",
          onComplete: () => {
            router.push(url);
            settle();
          },
        });
        return;
      }

      // Flip morph: place over the tile, capture, expand to fullscreen.
      const r = source.el.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        borderRadius: "6px",
        backgroundImage: `url(${source.posterUrl})`,
      });
      const state = Flip.getState(overlay);
      Object.assign(overlay.style, {
        left: "0px",
        top: "0px",
        width: "100vw",
        height: "100vh",
        borderRadius: "0px",
      });
      Flip.from(state, {
        duration: 0.7,
        ease: "power3.inOut",
        onComplete: () => {
          router.push(url);
          settle();
        },
      });
    },
    [router, reduced],
  );

  return <Ctx.Provider value={{ navigate }}>{children}</Ctx.Provider>;
}
