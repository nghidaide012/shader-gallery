"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = dotRef.current;
    const label = labelRef.current;
    if (!el || !label) return;
    gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0.35 });
    gsap.set(label, { opacity: 0 });
    const xTo = gsap.quickTo(el, "x", { duration: 0.25, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.25, ease: "power3.out" });

    const move = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const on = !!(e.target as HTMLElement).closest?.("[data-tile]");
      gsap.to(el, { scale: on ? 1 : 0.35, duration: 0.3, ease: "power2.out" });
      gsap.to(label, { opacity: on ? 1 : 0, duration: 0.2 });
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9998] grid h-20 w-20 place-items-center rounded-full bg-white mix-blend-difference"
    >
      <span
        ref={labelRef}
        className="font-mono text-[10px] uppercase tracking-widest text-black"
      >
        View
      </span>
    </div>
  );
}
