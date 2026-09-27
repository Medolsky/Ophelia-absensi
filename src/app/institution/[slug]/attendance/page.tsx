import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { AttendanceTable } from "@/components/attendance-table";
import { CalendarCheck, ShieldAlert } from "lucide-react";

import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AttendancePage({
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

  // Inject active duty from cookie if present
  const cookieStore = await cookies();
  const dutyCookie =
    cookieStore.get(`ophelia_active_duty_${slug}`) ||
    cookieStore.get("ophelia_active_duty");
  if (dutyCookie?.value) {
    try {
      const parsed = JSON.parse(dutyCookie.value);
      if (parsed && !parsed.endedAt && parsed.status === "ON_DUTY") {
        DataService.injectActiveDutySession(parsed);
      }
    } catch {}
  }

  // Retrieve all sessions for this institution
  const allSessions = await DataService.getInstitutionDutySessions(slug);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202020] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <CalendarCheck className="h-4 w-4 text-[#FF1E2D]" />
          <span>Buku Absensi & Rekap Sesi Dinas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          Daftar Absensi — {institution.name}
        </h1>
      </div>

      <AttendanceTable
        sessions={allSessions}
        institutionSlug={slug}
        userPermission={access.permissionLevel}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
