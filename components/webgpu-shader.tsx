"use client";

import * as THREE from "three/webgpu";
import type { Node } from "three/webgpu";
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";

// Renders a colorNode fullscreen, INSIDE an existing R3F <Canvas>. A unit plane
// scaled to the viewport carries uv 0..1 (three r185's TSL pipeline requires a
// uv attribute). Used by component-style sketches that build their own node.
export function WebGPUShader({ colorNode }: { colorNode: Node }) {
  const { width, height } = useThree((s) => s.viewport);
  const material = useMemo(() => {
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = colorNode as typeof m.colorNode;
    return m;
  }, [colorNode]);

  return (
    <mesh scale={[width, height, 1]} material={material} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
