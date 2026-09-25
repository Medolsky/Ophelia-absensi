import { getCurrentUser } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DutyTimer } from "@/components/duty-timer";
import { InstitutionLogo } from "@/components/institution-logo";
import { Clock, Calendar, CheckCircle2, Award, Zap, Layers, Banknote } from "lucide-react";
import Link from "next/link";

export default async function DutyDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) return null;

  const [activeSession, userSessions, userSalary] = await Promise.all([
    DataService.getActiveDutySession(currentUser.id),
    DataService.getUserDutySessions(currentUser.id, slug),
    DataService.getUserEstimatedSalary(currentUser.id, slug),
  ]);

  // Filter today's sessions
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todaySessions = userSessions.filter(
    (s) => s.startedAt.slice(0, 10) === todayDateStr
  );

  // Compute Today's Total Seconds
  const todayTotalSeconds = todaySessions.reduce((acc, s) => {
    if (s.endedAt) return acc + s.durationSeconds;
    // If active, add elapsed
    const elapsed = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
    return acc + Math.max(0, elapsed);
  }, 0);

  // Compute This Month's Total Seconds
  const currentMonthStr = todayDateStr.slice(0, 7);
  const monthSessions = userSessions.filter((s) => s.startedAt.slice(0, 7) === currentMonthStr);
  const monthTotalSeconds = monthSessions.reduce((acc, s) => acc + s.durationSeconds, 0);

  // Unique active days this month
  const activeDaysSet = new Set(monthSessions.map((s) => s.startedAt.slice(0, 10)));

  const formatHoursMinutes = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  };

  return (
    <div className="space-y-6">
      {/* Top Greeting & Instansi Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202020] pb-5">
        <div className="flex items-center gap-4">
          <InstitutionLogo
            logo={institution.logo}
            name={institution.name}
            size="lg"
            className="p-1 rounded-xl bg-[#161616] border border-[#2c2c2c] shadow-lg"
          />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Selamat Datang di Portal Dinas
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
              {currentUser.displayName || currentUser.discordUsername}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: institution.primaryColor || "#E50914" }}
              />
              <span>Divisi: {institution.name}</span>
              <span className="text-neutral-600">•</span>
              <span>Discord: @{currentUser.discordUsername}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/institution/${slug}/attendance`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 bg-[#141414] hover:bg-[#1c1c1c] border border-[#252525] hover:text-white transition"
          >
            Lihat Rekap Absensi
          </Link>
        </div>
      </div>

      {/* Main Duty Timer Hero Component */}
      <DutyTimer
        institutionSlug={slug}
        institutionName={institution.name}
        initialActiveSession={activeSession?.institutionSlug === slug ? activeSession : null}
        userDisplayName={currentUser.displayName || currentUser.discordUsername}
      />

      {/* Metric Cards (PRD Section 42 & Payroll) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              HARI INI
            </span>
            <Clock className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2">
            {formatHoursMinutes(todayTotalSeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {todaySessions.length} sesi tercatat hari ini
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              BULAN INI
            </span>
            <Calendar className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2">
            {formatHoursMinutes(monthTotalSeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Total jam kerja periode berjalan
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              HARI AKTIF
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2">
            {activeDaysSet.size} <span className="text-sm font-sans font-medium text-neutral-400">Hari</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Presensi keaktifan dinas
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              TOTAL SESI
            </span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2">
            {monthSessions.length} <span className="text-sm font-sans font-medium text-neutral-400">Sesi</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Multiple on/off duty per hari
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 rounded-2xl bg-gradient-to-br from-[#121c15] to-[#111111] border border-emerald-900/40 p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              ESTIMASI GAJI
            </span>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-2">
            {userSalary.currencySymbol} {userSalary.estimatedSalary.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{userSalary.currencySymbol} {userSalary.hourlyRate.toLocaleString("id-ID")}/jam</span>
            {userSalary.isEligible ? (
              <span className="text-[10px] text-emerald-400 font-bold">✓ Target</span>
            ) : (
              <span className="text-[10px] text-amber-400">Min {userSalary.minDutyHours}j</span>
            )}
          </div>
        </div>
      </div>

      {/* Today's Duty Sessions Log (PRD Section 9 & 10) */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#FF1E2D]" />
            <h3 className="text-base font-bold text-white">Sesi Dinas Hari Ini</h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#0a0a0a] border border-[#1f1f1f]">
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

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSessionActive
                      ? "bg-[#E50914]/10 border-[#E50914]/40"
                      : "bg-[#141414] border-[#222] hover:border-[#333]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#202020] text-xs font-mono font-bold text-white shrink-0">
                      #{sessionNumber}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Sesi Duty #{sessionNumber}</span>
                        {isSessionActive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono border border-[#E50914]/40 animate-pulse">
                            SEDANG BERJALAN
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                            SELESAI
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
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
                        {session.notes && <span className="text-neutral-500 ml-2 font-sans">• {session.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-[#222] sm:pl-4">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                      DURASI
                    </div>
                    <div className="text-base font-mono font-bold text-white">
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
