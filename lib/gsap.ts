"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register GSAP plugins once, on the client. Safe to call repeatedly. */
export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(Flip, ScrollTrigger);
  registered = true;
}

export { gsap, Flip, ScrollTrigger };
