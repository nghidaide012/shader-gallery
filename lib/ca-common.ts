// Reconstructed from how cellular.tsx consumes it — the original ca_common.ts
// was not provided. The framing/letterbox math is best-effort: `scale` zooms
// the grid within the frame (scale < 1 leaves a background margin). If the
// framing looks wrong, replace this file with the original.

/** Max number of composited Wolfram passes the GPU graph builds. */
export const CA_MAX_PASSES = 8;

/** Half-open UV rectangle (grid space) used to mask a pass. */
export type CaPassMaskRegion = {
  start: number; // x0
  end: number; // x1
  yStart?: number; // y0, default 0
  yEnd?: number; // y1, default 1
};

/** Shared framing controls for CA sketches. */
export type CaSketchFraming = {
  /** Background / letterbox colour as [r, g, b] in 0..1. */
  background?: number[];
  /** Uniform grid scale within the frame (1 = fills the frame). */
  scale?: number;
  /** Optional per-axis scale overrides. */
  scaleX?: number;
  scaleY?: number;
};

/** Common props shared by CA sketch components. */
export type CaSketchPropsBase = {
  rows?: number;
  columns?: number;
  exportFilename?: string;
};

export type ResolvedCaFraming = {
  background: number[];
  effectiveScaleX: number;
  effectiveScaleY: number;
};

const DEFAULT_BACKGROUND = [0, 0, 0];

/**
 * Resolves the background colour and effective grid scale.
 * `framing.background` takes precedence over `paramsBackground`; scale defaults
 * to 1 (grid fills the frame).
 */
export function resolveCaFraming(
  framing: CaSketchFraming | undefined,
  paramsBackground: number[] | undefined,
): ResolvedCaFraming {
  const background = framing?.background ?? paramsBackground ?? DEFAULT_BACKGROUND;
  const scale = framing?.scale ?? 1;
  return {
    background,
    effectiveScaleX: framing?.scaleX ?? scale,
    effectiveScaleY: framing?.scaleY ?? scale,
  };
}
