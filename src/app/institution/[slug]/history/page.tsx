import { getCurrentUser } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { History, Calendar, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) return null;

  // Monthly archive records as outlined in PRD Section 14
  const historyArchives = [
    {
      monthKey: "2026-09",
      monthName: "September 2026",
      totalHours: "86h 42m",
      activeDays: 18,
      sessions: 31,
      status: "CURRENT",
    },
    {
      monthKey: "2026-08",
      monthName: "Agustus 2026",
      totalHours: "102h 15m",
      activeDays: 22,
      sessions: 38,
      status: "COMPLETED",
    },
    {
      monthKey: "2026-07",
      monthName: "Juli 2026",
      totalHours: "74h 20m",
      activeDays: 16,
      sessions: 26,
      status: "COMPLETED",
    },
    {
      monthKey: "2026-06",
      monthName: "Juni 2026",
      totalHours: "91h 05m",
      activeDays: 20,
      sessions: 34,
      status: "COMPLETED",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202020] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <History className="h-4 w-4 text-[#FF1E2D]" />
          <span>Arsip Histori Kehadiran</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          Histori Absensi Bulanan — {institution.name}
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Data absensi dari bulan-bulan sebelumnya tetap tersimpan secara permanen untuk kebutuhan evaluasi promosi jabatan atau audit dinas.
        </p>
      </div>

      <div className="grid gap-4">
        {historyArchives.map((archive) => (
          <div
            key={archive.monthKey}
            className="rounded-2xl bg-[#111111] border border-[#222] hover:border-[#E50914]/60 p-5 lg:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-center text-[#FF1E2D] group-hover:scale-105 transition-transform shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-[#FF1E2D] transition-colors truncate">
                    {archive.monthName}
                  </h3>
                  {archive.status === "CURRENT" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono border border-[#E50914]/40 shrink-0">
                      PERIODE AKTIF
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
                  <span>{archive.activeDays} Hari Aktif</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{archive.sessions} Sesi Duty</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#1f1f1f]">
              <div className="text-left md:text-right">
                <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                  TOTAL JAM DINAS
                </div>
                <div className="text-2xl font-mono font-black text-white group-hover:text-[#FF1E2D] transition-colors">
                  {archive.totalHours}
                </div>
              </div>

              <Link
                href={`/institution/${slug}/attendance?month=${archive.monthKey}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1a1a1a] hover:bg-[#E50914] border border-[#262626] hover:border-[#E50914] transition shadow-md shrink-0"
              >
                <span>Buka Detail</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
