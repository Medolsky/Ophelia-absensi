import { getCurrentUser } from "@/lib/auth";
import { DataService, normalizeInstSlug } from "@/lib/data-service";
import { History, Calendar, Clock, ChevronRight, Users, Shield, ArrowUpRight, Award, BarChart3 } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HistoryTable } from "@/components/history-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0j 00m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}j\u00A0${m.toString().padStart(2, "0")}m`;
  }
  return `${m}m`;
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeInstSlug(rawSlug);

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/");
  }

  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) {
    redirect("/select-institution");
  }

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

  // Query institution-wide sessions once
  const allSessions = await DataService.getInstitutionDutySessions(slug);

  const cleanId = currentUser.id.replace("discord-", "");
  const cleanDiscordId = currentUser.discordId?.replace("discord-", "");

  const mySessions = allSessions.filter((s) => {
    const sId = s.userId?.replace("discord-", "");
    return (
      s.userId === currentUser.id ||
      sId === cleanId ||
      (cleanDiscordId && sId === cleanDiscordId)
    );
  });

  // Calculate High-End Summary KPI Metrics
  const totalInstitutionSeconds = allSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalMySeconds = mySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const uniqueOfficersCount = new Set(allSessions.map((s) => s.userId?.replace("discord-", ""))).size;

  // Group duty sessions by month key (YYYY-MM)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthGroups: Record<string, typeof allSessions> = {};
  for (const s of allSessions) {
    if (!s.startedAt) continue;
    const rawVal = s.startedAt as unknown;
    let iso = "";
    if (typeof rawVal === "string") {
      iso = rawVal;
    } else if (rawVal instanceof Date) {
      iso = rawVal.toISOString();
    }
    const key = iso.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;

    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(s);
  }

  // Always ensure the active current month is displayed
  if (!monthGroups[currentMonthKey]) {
    monthGroups[currentMonthKey] = [];
  }

  const sortedMonthKeys = Object.keys(monthGroups).sort().reverse();

  const historyArchives = sortedMonthKeys.map((mKey) => {
    const mSessions = monthGroups[mKey] || [];
    const totalSecs = mSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const activeDaysSet = new Set(
      mSessions
        .map((s) => {
          if (!s.startedAt) return "";
          const raw = s.startedAt as unknown;
          return typeof raw === "string"
            ? raw.slice(0, 10)
            : raw instanceof Date
            ? raw.toISOString().slice(0, 10)
            : "";
        })
        .filter(Boolean)
    );
    const uniqueOfficers = new Set(mSessions.map((s) => s.userId?.replace("discord-", ""))).size;

    // User's own contribution in this month
    const myMSessions = mySessions.filter((s) => {
      if (!s.startedAt) return false;
      const raw = s.startedAt as unknown;
      const k = typeof raw === "string"
        ? raw.slice(0, 7)
        : raw instanceof Date
        ? raw.toISOString().slice(0, 7)
        : "";
      return k === mKey;
    });
    const myTotalSecs = myMSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

    const [year, month] = mKey.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    let monthName = mKey;
    try {
      const formatted = dateObj.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      if (formatted && formatted !== "Invalid Date") {
        monthName = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
    } catch {}

    return {
      monthKey: mKey,
      monthName,
      totalDuration: formatDuration(totalSecs),
      myTotalDuration: formatDuration(myTotalSecs),
      activeDays: activeDaysSet.size,
      sessionsCount: mSessions.length,
      mySessionsCount: myMSessions.length,
      uniqueOfficers,
      status: mKey === currentMonthKey ? "CURRENT" : "COMPLETED",
    };
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-[#202020] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <History className="h-4 w-4 text-[#FF1E2D]" />
            <span>Arsip Histori Kehadiran & Jam Dinas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Histori Absensi — {institution.name}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Arsip lengkap sesi kedinasan seluruh petugas dan ringkasan bulanan instansi.
          </p>
        </div>

        <Link
          href={`/institution/${slug}/attendance`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#181818] hover:bg-[#E50914] border border-[#2b2b2b] hover:border-[#E50914] transition shadow-md self-start sm:self-auto shrink-0"
        >
          <span>Tabel Absensi Lengkap</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Total Jam Instansi</span>
            <Clock className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
            {formatDuration(totalInstitutionSeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Akumulasi seluruh sesi</div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Jam Dinas Saya</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
            {formatDuration(totalMySeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Total kontribusi Anda</div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Total Sesi Terdata</span>
            <BarChart3 className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
            {allSessions.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            <span className="text-emerald-400 font-bold">{mySessions.length}</span> sesi milik Anda
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Petugas Terdata</span>
            <Users className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
            {uniqueOfficersCount}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Personel pernah on duty</div>
        </div>
      </div>

      {/* Monthly Archive Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#FF1E2D]" />
          <span>Rekap Bulanan Instansi</span>
        </h2>

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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono border border-[#E50914]/40 font-bold shrink-0">
                        PERIODE AKTIF
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
                    <span>{archive.activeDays} Hari Aktif</span>
                    <span>•</span>
                    <span>{archive.sessionsCount} Sesi Total</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{archive.mySessionsCount} Sesi Saya</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#1f1f1f]">
                <div className="text-left md:text-right">
                  <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                    TOTAL JAM INSTANSI
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-white group-hover:text-[#FF1E2D] transition-colors whitespace-nowrap">
                    {archive.totalDuration}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    Milik Saya: <span className="text-emerald-400 font-bold">{archive.myTotalDuration}</span>
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

      {/* History Log Section with Interactive Client Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#FF1E2D]" />
            <span>Riwayat Aktivitas Sesi Dinas</span>
          </h2>
          <span className="text-xs font-mono text-neutral-500">
            {allSessions.length} Total Sesi
          </span>
        </div>

        <HistoryTable
          sessions={allSessions}
          currentUserId={currentUser.id}
          currentUserDiscordId={currentUser.discordId}
          institutionSlug={slug}
        />
      </div>
    </div>
  );
}
