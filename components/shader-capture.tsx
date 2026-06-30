"use client";

import * as THREE from "three/webgpu";
import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { ShaderFn } from "@/tsl/types";

const W = 1024;
const H = 768;

// Renders the shader into an offscreen render target using R3F's already-
// initialized WebGPU renderer, then reads the pixels back. A standalone
// renderer (not attached to the DOM) hangs on init; reusing R3F's avoids that.
// frameloop="never" means R3F never auto-renders, so nothing interleaves with
// our manual render-to-target.
function Grabber({
  shader,
  onCapture,
  onError,
}: {
  shader: ShaderFn;
  onCapture: (dataUrl: string) => void;
  onError: (message: string) => void;
}) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        // Give R3F a couple of frames to finish wiring up the renderer.
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        if (cancelled) return;

        // A 2x2 plane at z=0 exactly fills an ortho(-1,1,1,-1) frustum.
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicNodeMaterial();
        material.colorNode = shader() as typeof material.colorNode;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        const scene = new THREE.Scene();
        scene.add(mesh);
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        const rt = new THREE.RenderTarget(W, H, { depthBuffer: false });
        rt.texture.colorSpace = THREE.SRGBColorSpace; // match on-screen look
        gl.setRenderTarget(rt);
        await gl.renderAsync(scene, camera);
        const data = (await gl.readRenderTargetPixelsAsync(
          rt,
          0,
          0,
          W,
          H,
        )) as Uint8Array;
        gl.setRenderTarget(null);
        if (cancelled) return;

        // Readback rows are bottom-to-top; flip vertically into a 2D canvas.
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        const img = ctx.createImageData(W, H);
        for (let y = 0; y < H; y++) {
          const src = (H - 1 - y) * W * 4;
          img.data.set(data.subarray(src, src + W * 4), y * W * 4);
        }
        ctx.putImageData(img, 0, 0);

        onCapture(canvas.toDataURL("image/png"));

        rt.dispose();
        geometry.dispose();
        material.dispose();
      } catch (e) {
        console.error("[capture] failed:", e);
        onError(
          e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gl, shader, onCapture, onError]);

  return null;
}

export function ShaderCapture({
  shader,
  onCapture,
}: {
  shader: ShaderFn;
  onCapture: (dataUrl: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <div style={{ width: 256, height: 192 }}>
        <Canvas
          frameloop="never"
          gl={async (props) => {
            const renderer = new THREE.WebGPURenderer(
              props as ConstructorParameters<typeof THREE.WebGPURenderer>[0],
            );
            await renderer.init();
            return renderer;
          }}
        >
          <Grabber shader={shader} onCapture={onCapture} onError={setError} />
        </Canvas>
      </div>
      {error ? (
        <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>
          capture error → {error}
        </p>
      ) : (
        <p>rendering…</p>
      )}
    </>
  );
}
