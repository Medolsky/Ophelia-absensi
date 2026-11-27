import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService, normalizeInstSlug } from "@/lib/data-service";
import { LiveDutyList } from "@/components/live-duty-list";
import { Radio } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LiveDutyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeInstSlug(rawSlug);
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const access = await verifyInstitutionAccess(currentUser, slug);
  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) return null;

  // Fetch authoritative live duty sessions directly from server/DB
  const liveSessions = await DataService.getLiveOnDuty(slug, true);

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

      <LiveDutyList
        initialSessions={liveSessions}
        institutionSlug={slug}
        userPermission={access.permissionLevel}
        currentUserRoles={currentUser.discordRoles}
      />
    </div>
  );
}
