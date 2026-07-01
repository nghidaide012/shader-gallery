"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register at module-eval time on the client — BEFORE any component effect
// runs. Child effects fire before parent effects in React, so registering
// inside a parent effect would let a child's ScrollTrigger call run against
// an unregistered core (crashes on `gsap.delayedCall`). The `window` guard
// keeps this a no-op during SSR of the client module.
if (typeof window !== "undefined") {
  gsap.registerPlugin(Flip, ScrollTrigger);
}

/** Kept for call sites that want an explicit, idempotent registration hook. */
export function registerGsap() {
  if (typeof window === "undefined") return;
  gsap.registerPlugin(Flip, ScrollTrigger);
}

export { gsap, Flip, ScrollTrigger };
