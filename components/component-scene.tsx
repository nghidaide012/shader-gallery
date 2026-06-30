"use client";

import * as THREE from "three/webgpu";
import {
  Canvas,
  extend,
  type ThreeToJSXElements,
} from "@react-three/fiber";
import type { ComponentType } from "react";
import { silenceThreeClockWarning } from "@/lib/silence-three-clock-warning";

// Register every three/webgpu class as an R3F JSX element (+ types).
declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);
silenceThreeClockWarning();

// Canvas host for component-style sketches: the sketch itself owns the scene
// (it uses useThree/gl.compute and renders its own mesh), so we just give it a
// WebGPU Canvas. frameloop="always" so compute-driven buffers keep painting.
export function ComponentScene({
  component: Sketch,
}: {
  component: ComponentType;
}) {
  return (
    <Canvas
      className="h-full w-full"
      frameloop="always"
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(
          props as ConstructorParameters<typeof THREE.WebGPURenderer>[0],
        );
        await renderer.init();
        return renderer;
      }}
    >
      <Sketch />
    </Canvas>
  );
}
