import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// DEV-ONLY: writes a captured shader frame to public/posters/<slug>.png.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Disabled in production", { status: 404 });
  }

  const { slug, dataUrl } = (await req.json()) as {
    slug?: string;
    dataUrl?: string;
  };
  if (
    !slug ||
    !/^[a-z0-9-]+$/.test(slug) ||
    !dataUrl?.startsWith("data:image/png;base64,")
  ) {
    return new Response("Bad request", { status: 400 });
  }

  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const dir = path.join(process.cwd(), "public", "posters");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${slug}.png`), buffer);

  return Response.json({ ok: true, slug });
}
