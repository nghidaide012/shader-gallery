"use client";

// TEMPORARY: Task 3 preview — renders the example shader fullscreen to verify
// the shared canvas. Replaced by the gallery grid in Task 6.
import { ShaderCanvas } from "@/components/shader-canvas";
import meshGradient1 from "@/tsl/sketches/mesh_gradient_1";

export default function Home() {
  return (
    <main className="h-dvh w-screen bg-black">
      <ShaderCanvas shader={meshGradient1} />
    </main>
  );
}
