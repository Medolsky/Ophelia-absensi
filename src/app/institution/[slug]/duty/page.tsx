import { getCurrentUser } from "@/lib/auth";
import { DataService, normalizeInstSlug } from "@/lib/data-service";
import { FiveMBridge } from "@/lib/fivem-bridge";
import { DutyTimer } from "@/components/duty-timer";
import { InstitutionLogo } from "@/components/institution-logo";
import { formatInstitutionMemberName } from "@/lib/member-tag";
import { Clock, Calendar, CheckCircle2, Zap, Layers } from "lucide-react";
import Link from "next/link";
import { FiveMSocietyCard } from "@/components/fivem-society-card";
import { FiveMDataService } from "@/lib/fivem-data-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function computeElapsedSeconds(startedAtIso: string, referenceMs: number): number {
  return Math.max(0, Math.floor((referenceMs - new Date(startedAtIso).getTime()) / 1000));
}

export default async function DutyDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeInstSlug(rawSlug);
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) return null;

  const hasSociety = ["police", "medical", "mechanic", "restaurant"].includes(slug);

  const [activeSession, lastAutoClosedSession, userSessions, societyAccount, playerStatus] =
    await Promise.all([
      DataService.getActiveDutySession(currentUser.id, true),
      DataService.getLatestAutoClosedSession(currentUser.id, slug),
      DataService.getUserDutySessions(currentUser.id, slug),
      hasSociety ? FiveMDataService.getInstitutionSocietyBalance(slug) : Promise.resolve(null),
      FiveMBridge.getPlayerOnlineStatus(currentUser.discordId),
    ]);

  const nowDate = new Date();
  const nowMs = nowDate.getTime();

  // Filter today's sessions
  const todayDateStr = nowDate.toISOString().slice(0, 10);
  const todaySessions = userSessions.filter(
    (s) => s.startedAt.slice(0, 10) === todayDateStr
  );

  // Compute Today's Total Seconds
  const todayTotalSeconds = todaySessions.reduce((acc, s) => {
    if (s.endedAt) return acc + s.durationSeconds;
    return acc + computeElapsedSeconds(s.startedAt, nowMs);
  }, 0);

  // Compute This Month's Total Seconds
  const currentMonthStr = todayDateStr.slice(0, 7);
  const monthSessions = userSessions.filter((s) => s.startedAt.slice(0, 7) === currentMonthStr);
  const monthTotalSeconds = monthSessions.reduce((acc, s) => {
    if (s.endedAt) return acc + s.durationSeconds;
    return acc + computeElapsedSeconds(s.startedAt, nowMs);
  }, 0);

  // Unique active days this month
  const activeDaysSet = new Set(monthSessions.map((s) => s.startedAt.slice(0, 10)));

  const formatHoursMinutes = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h\u00A0${minutes.toString().padStart(2, "0")}m`;
  };

  const activeSessionForThisInst =
    activeSession &&
    (normalizeInstSlug(activeSession.institutionSlug) === slug ||
      normalizeInstSlug(activeSession.institutionId) === slug)
      ? activeSession
      : null;

  const recentAutoClosed =
    !activeSessionForThisInst &&
    lastAutoClosedSession?.endedAt &&
    nowMs - new Date(lastAutoClosedSession.endedAt).getTime() < 2 * 60 * 60 * 1000
      ? lastAutoClosedSession
      : null;

  const initialFiveMStatus = {
    serverConnected: playerStatus.serverConnected,
    lastHeartbeatAt: playerStatus.lastHeartbeatAt,
    playerOnline: playerStatus.isOnline,
    serverId: playerStatus.player?.serverId ?? null,
    playerName: playerStatus.player?.playerName ?? null,
    requireOnlineToStart: process.env.REQUIRE_FIVEM_ONLINE !== "false",
  };

  return (
    <div className="space-y-6">
      {/* Top Greeting & Instansi Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202020] pb-5">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <InstitutionLogo
            logo={institution.logo}
            name={institution.name}
            size="lg"
            className="p-1 rounded-xl bg-[#161616] border border-[#2c2c2c] shadow-lg shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400 truncate">
              Selamat Datang di Portal Dinas
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white mt-0.5 truncate">
              {formatInstitutionMemberName(currentUser.displayName || currentUser.discordUsername, slug)}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: institution.primaryColor || "#E50914" }}
              />
              <span>Divisi: {institution.name}</span>
              <span className="text-neutral-600 hidden xs:inline">•</span>
              <span className="truncate">Discord: @{currentUser.discordUsername}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/institution/${slug}/attendance`}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 bg-[#141414] hover:bg-[#1c1c1c] border border-[#252525] hover:text-white transition text-center"
          >
            Lihat Rekap Absensi
          </Link>
        </div>
      </div>

      {/* Main Duty Timer Hero Component */}
      <DutyTimer
        institutionSlug={slug}
        institutionName={institution.name}
        initialActiveSession={activeSessionForThisInst}
        initialAutoClosedSession={recentAutoClosed}
        initialFiveMStatus={initialFiveMStatus}
        userDisplayName={formatInstitutionMemberName(
          currentUser.displayName || currentUser.discordUsername,
          slug
        )}
      />

      {/* Metric Cards & FiveM Society Kas */}
      <div className={`grid grid-cols-2 ${hasSociety ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3 sm:gap-4`}>
        {hasSociety && (
          <FiveMSocietyCard
            institutionSlug={slug}
            initialAccount={societyAccount}
          />
        )}
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              HARI INI
            </span>
            <Clock className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-2 whitespace-nowrap">
            {formatHoursMinutes(todayTotalSeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 truncate">
            {todaySessions.length} sesi hari ini
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              BULAN INI
            </span>
            <Calendar className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-2 whitespace-nowrap">
            {formatHoursMinutes(monthTotalSeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Total jam bulan berjalan
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              HARI AKTIF
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-2 whitespace-nowrap">
            {activeDaysSet.size} <span className="text-sm font-sans font-medium text-neutral-400">Hari</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Hari bertugas bulan ini
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              TOTAL SESI
            </span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-2 whitespace-nowrap">
            {monthSessions.length} <span className="text-sm font-sans font-medium text-neutral-400">Sesi</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Akumulasi sesi bertugas
          </div>
        </div>
      </div>

      {/* Today's Duty Sessions Log */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#FF1E2D]" />
            <h3 className="text-sm sm:text-base font-bold text-white">Sesi Dinas Hari Ini</h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {nowDate.toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="p-6 sm:p-8 text-center rounded-xl bg-[#0a0a0a] border border-[#1f1f1f]">
            <Clock className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-neutral-300">Belum Ada Sesi Duty Hari Ini</div>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Anda belum mencatat absensi dinas pada hari ini. Tekan tombol START DUTY di atas saat Anda mulai bertugas.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todaySessions.map((session, index) => {
              const sessionNumber = todaySessions.length - index;
              const isSessionActive = !session.endedAt && session.status === "ON_DUTY";
              const isAutoClosed = session.status === "AUTO_CLOSED";

              return (
                <div
                  key={session.id}
                  className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSessionActive
                      ? "bg-[#E50914]/10 border-[#E50914]/40"
                      : isAutoClosed
                      ? "bg-orange-950/15 border-orange-800/40"
                      : "bg-[#141414] border-[#222] hover:border-[#333]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#202020] text-xs font-mono font-bold text-white shrink-0">
                      #{sessionNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex flex-wrap items-center gap-2">
                        <span>Sesi Duty #{sessionNumber}</span>
                        {isSessionActive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono border border-[#E50914]/40 animate-pulse">
                            SEDANG BERJALAN
                          </span>
                        ) : isAutoClosed ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-mono border border-orange-500/30">
                            AUTO STOP (FIVEM)
                          </span>
                        ) : session.status === "CORRECTED" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono border border-amber-500/30">
                            CORRECTED
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                            SELESAI
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">
                        {new Date(session.startedAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ─{" "}
                        {session.endedAt
                          ? new Date(session.endedAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "SEKARANG"}
                        {session.notes && (
                          <span className="text-neutral-500 ml-2 font-sans">• {session.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right sm:border-l sm:border-[#222] sm:pl-4 shrink-0">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                      DURASI
                    </div>
                    <div className="text-sm sm:text-base font-mono font-bold text-white whitespace-nowrap">
                      {isSessionActive
                        ? "Realtime..."
                        : formatHoursMinutes(session.durationSeconds)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
