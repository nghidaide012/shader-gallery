"use client";

import * as THREE from "three/webgpu";
import { useMemo } from "react";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import type { ShaderFn } from "@/tsl/types";

// Register every three/webgpu class as an R3F JSX element (+ types).
declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

function FullscreenShader({ shader }: { shader: ShaderFn }) {
  // Build the node material imperatively: colorNode is the shader's Fn output.
  const material = useMemo(() => {
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = shader();
    return m;
  }, [shader]);

  // ScreenQuad draws a fullscreen clip-space triangle; we own the material.
  return (
    <ScreenQuad>
      <primitive object={material} attach="material" />
    </ScreenQuad>
  );
}

export function ShaderScene({ shader }: { shader: ShaderFn }) {
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
      <FullscreenShader shader={shader} />
    </Canvas>
  );
}
