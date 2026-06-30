"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { hasGpu } from "@/lib/has-gpu";

// three/webgpu is strictly client-side — never let it run during SSR.
const ComponentScene = dynamic(
  () => import("./component-scene").then((m) => m.ComponentScene),
  { ssr: false },
);

export function ComponentShaderCanvas({
  component,
}: {
  component: ComponentType;
}) {
  const [state, setState] = useState<"checking" | "ok" | "unsupported">(
    "checking",
  );
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

  return <ComponentScene component={component} />;
}
