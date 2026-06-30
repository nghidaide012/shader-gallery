"use client";

import * as THREE from "three/webgpu";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Canvas,
  extend,
  useThree,
  type ThreeToJSXElements,
} from "@react-three/fiber";
import { silenceThreeClockWarning } from "@/lib/silence-three-clock-warning";

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);
silenceThreeClockWarning();

const W = 1024;
const H = 768;

// Captures a component (compute-driven) sketch: mount it live, let its compute
// run for `delayMs`, then snapshot the live scene (the sketch's mesh) into a
// render target and read the pixels back — same readback trick as the colorNode
// capture, but the node is owned by the sketch so we render the whole scene.
function Grabber({
  delayMs,
  onCapture,
  onError,
}: {
  delayMs: number;
  onCapture: (dataUrl: string) => void;
  onError: (message: string) => void;
}) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const rt = new THREE.RenderTarget(W, H, { depthBuffer: false });
        rt.texture.colorSpace = THREE.SRGBColorSpace;
        gl.setRenderTarget(rt);
        await gl.render(scene, camera);
        const data = (await gl.readRenderTargetPixelsAsync(
          rt,
          0,
          0,
          W,
          H,
        )) as Uint8Array;
        gl.setRenderTarget(null);
        if (cancelled) return;

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        const img = ctx.createImageData(W, H);
        // No Y-flip here: the sketch's colorNode already flips Y for the CA
        // time axis, so the readback is already in screen orientation.
        img.data.set(data);
        ctx.putImageData(img, 0, 0);
        onCapture(canvas.toDataURL("image/png"));
        rt.dispose();
      } catch (e) {
        console.error("[capture] component failed:", e);
        onError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      }
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gl, scene, camera, delayMs, onCapture, onError]);

  return null;
}

export function ComponentCapture({
  component: Sketch,
  onCapture,
  delayMs = 9000,
}: {
  component: ComponentType;
  onCapture: (dataUrl: string) => void;
  delayMs?: number;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <div style={{ width: 256, height: 192 }}>
        <Canvas
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
          <Grabber delayMs={delayMs} onCapture={onCapture} onError={setError} />
        </Canvas>
      </div>
      {error ? (
        <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>
          capture error → {error}
        </p>
      ) : (
        <p>rendering… (~{Math.round(delayMs / 1000)}s for compute sketches)</p>
      )}
    </>
  );
}
