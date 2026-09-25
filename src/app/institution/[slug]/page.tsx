import { redirect } from "next/navigation";

export default async function InstitutionRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/institution/${slug}/duty`);
}
