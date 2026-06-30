// True if the browser can drive a WebGPURenderer (WebGPU, or a WebGL2/WebGL
// fallback). Returns true during SSR-ish contexts where navigator is present.
export function hasGpu() {
  if (typeof navigator !== "undefined" && "gpu" in navigator) return true;
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas");
  return !!(c.getContext("webgl2") || c.getContext("webgl"));
}
