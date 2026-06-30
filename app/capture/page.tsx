"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { shaders, type ShaderEntry } from "@/lib/shaders";
import { ShaderCapture } from "@/components/shader-capture";
import { ComponentCapture } from "@/components/component-capture";
import type { ShaderFn } from "@/tsl/types";

// Loads one sketch module client-side, then renders the matching capture path:
// colorNode sketches render their node to a target; component sketches run live
// and snapshot the scene.
function Loader({
  entry,
  onCapture,
}: {
  entry: ShaderEntry;
  onCapture: (dataUrl: string) => void;
}) {
  const [mod, setMod] = useState<{ default: ShaderFn | ComponentType } | null>(
    null,
  );
  useEffect(() => {
    let alive = true;
    entry.load().then((m) => {
      if (alive) setMod(m);
    });
    return () => {
      alive = false;
    };
  }, [entry]);

  if (!mod) return <p>loading {entry.slug}…</p>;
  if (entry.kind === "component") {
    return (
      <ComponentCapture
        component={mod.default as ComponentType}
        onCapture={onCapture}
      />
    );
  }
  return <ShaderCapture shader={mod.default as ShaderFn} onCapture={onCapture} />;
}

export default function CapturePage() {
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  if (process.env.NODE_ENV === "production") {
    return (
      <p style={{ fontFamily: "monospace" }}>Capture is disabled in production.</p>
    );
  }

  const current = shaders[index];

  async function handleCapture(dataUrl: string) {
    const slug = shaders[index].slug;
    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, dataUrl }),
    });
    setLog((l) => [...l, `${slug}: ${res.ok ? "saved" : "FAILED " + res.status}`]);
    setIndex((i) => i + 1);
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "monospace",
        color: "#ddd",
        background: "#000",
        minHeight: "100dvh",
      }}
    >
      <h1>
        Poster capture ({index}/{shaders.length})
      </h1>
      {/* key forces a fresh canvas per shader so each captures cleanly */}
      {current ? (
        <Loader key={current.slug} entry={current} onCapture={handleCapture} />
      ) : (
        <p>Done.</p>
      )}
      <ul>
        {log.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </main>
  );
}
