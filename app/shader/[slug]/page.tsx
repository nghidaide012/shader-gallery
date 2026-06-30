import { notFound } from "next/navigation";
import { getShader, shaders } from "@/lib/shaders";
import { ShaderStage } from "@/components/shader-stage";

export function generateStaticParams() {
  return shaders.map((s) => ({ slug: s.slug }));
}

export default async function ShaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Next 16: params is a Promise — await it.
  const { slug } = await params;
  const entry = getShader(slug);
  if (!entry) notFound();

  // Pass only serializable strings across the Server -> Client boundary.
  return (
    <ShaderStage slug={entry.slug} title={entry.title} category={entry.category} />
  );
}
