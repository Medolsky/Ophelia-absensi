import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { ReportGenerator } from "@/components/report-generator";
import { FileSpreadsheet, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function ReportsPage({
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

  const isLeader = access.permissionLevel === "LEADER" || access.permissionLevel === "SUPER_ADMIN";
  if (!isLeader) {
    return (
      <div className="rounded-2xl bg-[#111111] border border-red-900/30 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Akses Terbatas: Hanya Petinggi / Leader</h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
          Fitur pembuatan laporan dan ekspor CSV hanya dapat diakses oleh Petinggi instansi.
        </p>
        <Link
          href={`/institution/${slug}/duty`}
          className="inline-block mt-4 text-xs font-bold text-[#FF1E2D] hover:underline"
        >
          ← Kembali ke Dashboard Dinas
        </Link>
      </div>
    );
  }

  const [memberships, payrollRecords] = await Promise.all([
    DataService.getMemberships(slug),
    DataService.getPayrollRecords(slug),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202020] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <FileSpreadsheet className="h-4 w-4 text-[#FF1E2D]" />
          <span>Ekspor Data & Audit Kinerja</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          Laporan Presensi — {institution.name}
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Generate rekapitulasi jam duty seluruh anggota instansi berdasarkan rentang tanggal kustom untuk kebutuhan arsip dan evaluasi.
        </p>
      </div>

      <ReportGenerator
        memberships={memberships}
        payrollRecords={payrollRecords}
        institutionName={institution.name}
        institutionSlug={slug}
      />
    </div>
  );
}
