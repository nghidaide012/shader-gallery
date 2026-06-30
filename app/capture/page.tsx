"use client";

import { useEffect, useMemo, useState } from "react";
import { shaders } from "@/lib/shaders";
import { ShaderCapture } from "@/components/shader-capture";
import type { ShaderFn } from "@/tsl/types";

// Loads one shader module client-side, then renders it for capture.
function Loader({
  slug,
  onCapture,
}: {
  slug: string;
  onCapture: (dataUrl: string) => void;
}) {
  const [fn, setFn] = useState<ShaderFn | null>(null);
  const entry = useMemo(() => shaders.find((s) => s.slug === slug)!, [slug]);
  useEffect(() => {
    let alive = true;
    entry.load().then((m) => {
      if (alive) setFn(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, [entry]);
  if (!fn) return <p>loading {slug}…</p>;
  return <ShaderCapture shader={fn} onCapture={onCapture} />;
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
        <Loader key={current.slug} slug={current.slug} onCapture={handleCapture} />
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
