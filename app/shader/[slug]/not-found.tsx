import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid h-dvh w-screen place-items-center bg-black text-center font-mono text-sm text-zinc-400">
      <div>
        <p className="mb-4">Shader not found.</p>
        <Link href="/" className="text-zinc-200 underline hover:opacity-60">
          ← back to gallery
        </Link>
      </div>
    </main>
  );
}
