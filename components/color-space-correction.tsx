"use client";

import * as THREE from "three/webgpu";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

// Matches the fragments-boilerplate color pipeline. The sketches tone-map
// themselves (e.g. tanh), so the renderer must NOT add ACES tone mapping or
// sRGB encoding on top — R3F's defaults do both, which lifts shadows and
// washes the image out. Render inside a Canvas.
export function ColorSpaceCorrection() {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  useEffect(() => {
    gl.outputColorSpace = THREE.LinearSRGBColorSpace;
    gl.toneMapping = THREE.NoToneMapping;
  }, [gl]);
  return null;
}
