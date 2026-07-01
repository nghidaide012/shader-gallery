"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ShaderEntry } from "@/lib/shaders";
import { gsap } from "@/lib/gsap";

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
          delay: reduced ? 0.1 : 0.4,
          ease: "power2.out",
          onComplete: () => overlay.remove(),
        });

      // No source element (rare) → a plain crossfade cover.
      if (!source) {
        Object.assign(overlay.style, {
          inset: "0px",
          width: "100vw",
          height: "100vh",
          opacity: "0",
        });
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

      // Shared-element morph: the overlay is a full-screen node transformed to
      // sit exactly over the clicked tile, then animated back to identity. It
      // still runs under reduced-motion, just quicker — the grow IS the
      // navigation affordance here, not decoration. (Explicit transforms rather
      // than GSAP Flip: Flip's implicit width/height diffing snapped this
      // body-appended fixed node straight to full-screen instead of tweening.)
      const r = source.el.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: "0px",
        top: "0px",
        width: "100vw",
        height: "100vh",
        backgroundImage: `url(${source.posterUrl})`,
        transformOrigin: "top left",
        willChange: "transform",
      });
      gsap.fromTo(
        overlay,
        {
          x: r.left,
          y: r.top,
          scaleX: r.width / window.innerWidth,
          scaleY: r.height / window.innerHeight,
          borderRadius: "6px",
        },
        {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          borderRadius: "0px",
          duration: reduced ? 0.4 : 0.7,
          ease: "power3.inOut",
          onComplete: () => {
            router.push(url);
            settle();
          },
        },
      );
    },
    [router, reduced],
  );

  return <Ctx.Provider value={{ navigate }}>{children}</Ctx.Provider>;
}
