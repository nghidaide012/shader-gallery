import { shaders } from "@/lib/shaders";
import { ShaderTile } from "@/components/shader-tile";

export default function Home() {
  return (
    <main className="min-h-dvh bg-black px-6 py-16 md:px-12">
      <header className="mb-12">
        <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-zinc-400">
          TSL Shader Gallery
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shaders.map((entry) => (
          <ShaderTile key={entry.slug} entry={entry} />
        ))}
      </div>
    </main>
  );
}
