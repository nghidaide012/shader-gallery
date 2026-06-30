"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ShaderFn } from "@/tsl/types";

// three/webgpu is strictly client-side — never let it run during SSR.
const ShaderScene = dynamic(
  () => import("./shader-scene").then((m) => m.ShaderScene),
  { ssr: false },
);

function hasGpu() {
  if (typeof navigator !== "undefined" && "gpu" in navigator) return true;
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas");
  return !!(c.getContext("webgl2") || c.getContext("webgl"));
}

export function ShaderCanvas({ shader }: { shader: ShaderFn }) {
  const [state, setState] = useState<"checking" | "ok" | "unsupported">(
    "checking",
  );

  // Runs only on the client; "checking" is the stable SSR/first-paint state.
  useEffect(() => setState(hasGpu() ? "ok" : "unsupported"), []);

  if (state === "unsupported") {
    return (
      <div className="grid h-full w-full place-items-center bg-black text-zinc-400">
        <p className="font-mono text-sm">
          WebGPU / WebGL2 not available in this browser.
        </p>
      </div>
    );
  }

  if (state === "checking") {
    return <div className="h-full w-full bg-black" />;
  }

  return <ShaderScene shader={shader} />;
}
