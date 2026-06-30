import type { ComponentType } from "react";
import type { ShaderFn } from "@/tsl/types";

export type ShaderEntry = {
  /** URL segment and poster filename (kebab-case). */
  slug: string;
  title: string;
  category: string;
  /**
   * "colorNode" (default): default export is a ShaderFn drawn on a shared
   * fullscreen quad. "component": default export is an R3F component that
   * owns its own scene (e.g. compute-driven sketches), rendered in a Canvas.
   */
  kind?: "colorNode" | "component";
  /** MUST use a literal import specifier so Next can code-split per shader. */
  load: () => Promise<{ default: ShaderFn | ComponentType }>;
};

export const shaders: ShaderEntry[] = [
  {
    slug: "mesh-gradient-1",
    title: "Mesh Gradient 1",
    category: "gradient",
    load: () => import("@/tsl/sketches/mesh_gradient_1"),
  },
  {
    slug: "cellular",
    title: "Cellular",
    category: "automata",
    kind: "component",
    load: () => import("@/tsl/sketches/cellular"),
  },
];

export function getShader(slug: string): ShaderEntry | undefined {
  return shaders.find((s) => s.slug === slug);
}
