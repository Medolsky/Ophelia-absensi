import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { LiveDutyList } from "@/components/live-duty-list";
import { Radio, Users, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LiveDutyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const access = await verifyInstitutionAccess(currentUser, slug);
  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) return null;

  // Fetch live duty sessions
  const liveSessions = await DataService.getLiveOnDuty(slug);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202020] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF1E2D]">
          <Radio className="h-4 w-4 animate-pulse" />
          <span>Live Monitoring</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          Petugas Sedang Dinas — {institution.name}
        </h1>
      </div>

      <LiveDutyList initialSessions={liveSessions} institutionSlug={slug} />
    </div>
  );
}
