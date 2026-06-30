"use client";

import * as THREE from "three/webgpu";
import { useMemo } from "react";
import {
  Canvas,
  extend,
  useThree,
  type ThreeToJSXElements,
} from "@react-three/fiber";
import type { ShaderFn } from "@/tsl/types";

// Register every three/webgpu class as an R3F JSX element (+ types).
declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

function FullscreenShader({ shader }: { shader: ShaderFn }) {
  // A unit plane scaled to the camera's visible size fills the viewport.
  // (planeGeometry has a `uv` attribute, which the 0.185 TSL pipeline
  // requires — drei's ScreenQuad has none and renders flat.)
  const { width, height } = useThree((s) => s.viewport);
  const material = useMemo(() => {
    const m = new THREE.MeshBasicNodeMaterial();
    // ShaderFn is intentionally loose (sketches are @ts-nocheck); cast to the
    // material's own colorNode type so this stays valid across @types/three.
    m.colorNode = shader() as typeof m.colorNode;
    return m;
  }, [shader]);

  return (
    <mesh scale={[width, height, 1]} material={material} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
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
