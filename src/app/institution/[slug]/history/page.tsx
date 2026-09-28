import { getCurrentUser } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { History, Calendar, Clock, ChevronRight, CheckCircle2, User, Users, Shield, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h\u00A0${m.toString().padStart(2, "0")}m`;
  }
  if (m > 0) {
    return `${m}m\u00A0${s.toString().padStart(2, "0")}s`;
  }
  return `${s}s`;
}

import { cookies } from "next/headers";

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

  // Query institution-wide sessions once, derive personal sessions in memory
  const allSessions = await DataService.getInstitutionDutySessions(slug);
  const cleanId = currentUser.id.replace("discord-", "");
  const mySessions = allSessions.filter(
    (s) =>
      s.userId === currentUser.id ||
      s.userId === cleanId ||
      s.userId === `discord-${cleanId}` ||
      (currentUser.discordId && s.userId === currentUser.discordId)
  );

  // Group duty sessions by month key (YYYY-MM)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthGroups: Record<string, typeof allSessions> = {};
  for (const s of allSessions) {
    const key = s.startedAt.slice(0, 7);
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
    const activeDaysSet = new Set(mSessions.map((s) => s.startedAt.slice(0, 10)));
    const uniqueOfficers = new Set(mSessions.map((s) => s.userId)).size;

    // User's own contribution in this month
    const myMSessions = mySessions.filter((s) => s.startedAt.slice(0, 7) === mKey);
    const myTotalSecs = myMSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

    const [year, month] = mKey.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    const monthName = dateObj.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    return {
      monthKey: mKey,
      monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      totalDuration: formatDuration(totalSecs),
      myTotalDuration: formatDuration(myTotalSecs),
      activeDays: activeDaysSet.size,
      sessionsCount: mSessions.length,
      mySessionsCount: myMSessions.length,
      uniqueOfficers,
      status: mKey === currentMonthKey ? "CURRENT" : "COMPLETED",
    };
  });

  // Recent 15 completed or active duty sessions
  const recentSessions = allSessions.slice(0, 15);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-[#202020] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <History className="h-4 w-4 text-[#FF1E2D]" />
            <span>Arsip Histori Kehadiran</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Histori Absensi — {institution.name}
          </h1>
        </div>

        <Link
          href={`/institution/${slug}/attendance`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#181818] hover:bg-[#E50914] border border-[#2b2b2b] hover:border-[#E50914] transition shadow-md self-start sm:self-auto shrink-0"
        >
          <span>Tabel Absensi Lengkap</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono border border-[#E50914]/40 shrink-0">
                        PERIODE AKTIF
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
                    <span>{archive.activeDays} Hari Aktif</span>
                    <span>•</span>
                    <span>{archive.sessionsCount} Sesi Total</span>
                    <span>•</span>
                    <span className="text-emerald-400">{archive.mySessionsCount} Sesi Saya</span>
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

      {/* Recent Duty Activity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#FF1E2D]" />
            <span>Aktivitas Sesi Dinas Terakhir (Semua Anggota)</span>
          </h2>
          <span className="text-xs font-mono text-neutral-500">
            {recentSessions.length} Sesi Terdata
          </span>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-2xl bg-[#111111] border border-[#222] p-10 text-center text-neutral-500">
            <Clock className="h-8 w-8 mx-auto text-neutral-600 mb-2" />
            <div className="text-sm font-semibold text-neutral-300">Belum Ada Sesi Duty</div>
            <p className="text-xs text-neutral-500 mt-1">
              Sesi on/off duty yang telah dilakukan akan otomatis tercatat dan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#222] bg-[#111111] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-300 min-w-[650px]">
                <thead className="bg-[#161616] text-[11px] uppercase tracking-wider text-neutral-400 font-semibold border-b border-[#252525]">
                  <tr>
                    <th scope="col" className="py-3 px-4">Petugas</th>
                    <th scope="col" className="py-3 px-4">Tanggal</th>
                    <th scope="col" className="py-3 px-4">Jam Mulai</th>
                    <th scope="col" className="py-3 px-4">Jam Selesai</th>
                    <th scope="col" className="py-3 px-4">Durasi</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e] text-xs">
                  {recentSessions.map((session) => {
                    const startObj = new Date(session.startedAt);
                    const isLive = !session.endedAt && session.status === "ON_DUTY";
                    const isMe =
                      session.userId === currentUser.id ||
                      session.userId === currentUser.id.replace("discord-", "") ||
                      session.userId === `discord-${currentUser.discordId}` ||
                      session.userId === currentUser.discordId;

                    return (
                      <tr
                        key={session.id}
                        className={`hover:bg-[#161616] transition-colors ${isMe ? "bg-[#E50914]/5" : ""}`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getDiscordAvatarUrl(
                                session.userId?.replace("discord-", ""),
                                session.userAvatar
                              )}
                              alt={session.userName || "Petugas"}
                              className="h-8 w-8 rounded-lg object-cover border border-[#333] shrink-0"
                              onError={(e) => {
                                const target = e.currentTarget;
                                const fallback = getDiscordAvatarUrl(session.userId?.replace("discord-", ""), null);
                                if (target.src !== fallback) {
                                  target.src = fallback;
                                }
                              }}
                            />
                            <div>
                              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                <span>{session.userName || "Petugas"}</span>
                                {isMe && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                                    SAYA
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-medium">
                                {session.positionName || "Anggota"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-white">
                          {startObj.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-300">
                          {startObj.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-300">
                          {session.endedAt
                            ? new Date(session.endedAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : <span className="text-[#FF1E2D] font-bold animate-pulse">SEDANG DINAS</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-white">
                          {isLive ? (
                            <span className="text-[#FF1E2D] animate-pulse">Running...</span>
                          ) : (
                            formatDuration(session.durationSeconds)
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {session.status === "ON_DUTY" && (
                            <span className="px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono text-[10px] border border-[#E50914]/40">
                              ON DUTY
                            </span>
                          )}
                          {session.status === "COMPLETED" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px] border border-emerald-500/30">
                              COMPLETED
                            </span>
                          )}
                          {session.status === "CORRECTED" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono text-[10px] border border-amber-500/30">
                              CORRECTED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-neutral-400 max-w-[200px] truncate">
                          {session.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
