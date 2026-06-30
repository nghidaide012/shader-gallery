import type { ShaderFn } from "@/tsl/types";

export type ShaderEntry = {
  /** URL segment and poster filename (kebab-case). */
  slug: string;
  title: string;
  category: string;
  /** MUST use a literal import specifier so Next can code-split per shader. */
  load: () => Promise<{ default: ShaderFn }>;
};

export const shaders: ShaderEntry[] = [
  {
    slug: "mesh-gradient-1",
    title: "Mesh Gradient 1",
    category: "gradient",
    load: () => import("@/tsl/sketches/mesh_gradient_1"),
  },
];

export function getShader(slug: string): ShaderEntry | undefined {
  return shaders.find((s) => s.slug === slug);
}
