import { getCurrentUser } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DutyCalendar } from "@/components/duty-calendar";
import { BarChart3, TrendingUp, Calendar, Zap, Award, Flame } from "lucide-react";

export default async function StatisticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) return null;

  const sessions = await DataService.getUserDutySessions(currentUser.id, slug);

  // Compute Weekly Distribution (Last 7 days)
  // Compute Weekly Distribution (Current week Monday - Sunday)
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, ...
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const dayLabels = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
  const weekData = dayLabels.map((dayName, index) => {
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + index);
    const dateStr = targetDate.toISOString().slice(0, 10);

    const daySessions = sessions.filter((s) => s.startedAt.slice(0, 10) === dateStr);
    const daySeconds = daySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const hours = Number((daySeconds / 3600).toFixed(1));
    const h = Math.floor(daySeconds / 3600);
    const m = Math.floor((daySeconds % 3600) / 60);

    return {
      day: dayName,
      hours,
      label: daySeconds > 0 ? `${h}h\u00A0${m.toString().padStart(2, "0")}m` : "OFF",
    };
  });

  const weekTotalSeconds = weekData.reduce((acc, d) => acc + d.hours * 3600, 0);

  // Compute Monthly Stats (PRD Section 12)
  const totalMonthSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const activeDaysSet = new Set(sessions.map((s) => s.startedAt.slice(0, 10)));
  const activeDays = activeDaysSet.size;
  const totalSessions = sessions.length;
  const averagePerDaySeconds = activeDays > 0 ? Math.round(totalMonthSeconds / activeDays) : 0;
  const longestSessionSeconds = sessions.reduce(
    (max, s) => Math.max(max, s.durationSeconds),
    0
  );

  const formatHoursMinutes = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h\u00A0${minutes.toString().padStart(2, "0")}m`;
  };

  const maxWeeklyHours = Math.max(...weekData.map((d) => d.hours), 12);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202020] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <BarChart3 className="h-4 w-4 text-[#FF1E2D]" />
          <span>Analisis Keaktifan Jam Dinas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          Statistik & Performa — {institution.name}
        </h1>
      </div>

      {/* Monthly Highlight Stats (PRD Section 12) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>TOTAL DUTY BULAN INI</span>
            <Award className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2 truncate whitespace-nowrap">
            {formatHoursMinutes(totalMonthSeconds)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>RATA-RATA / HARI</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2 truncate whitespace-nowrap">
            {formatHoursMinutes(averagePerDaySeconds)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>SESI TERPANJANG</span>
            <Flame className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2 truncate whitespace-nowrap">
            {formatHoursMinutes(longestSessionSeconds)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>JUMLAH HARI DINAS</span>
            <Calendar className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-mono font-black text-white mt-2 truncate whitespace-nowrap">
            {activeDays} <span className="text-sm font-sans font-medium text-neutral-400">Hari</span>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown with Visual Bar Chart (PRD Section 11) */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-6 shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
              REKAPITULASI MINGGUAN
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Distribusi Jam Kerja Mingguan
            </h3>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
              TOTAL MINGGU INI
            </span>
            <div className="text-xl sm:text-2xl font-mono font-black text-[#FF1E2D] whitespace-nowrap">
              {formatHoursMinutes(weekTotalSeconds)}
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="overflow-x-auto table-scroll-container pb-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-48 sm:h-56 min-w-[340px] sm:min-w-[420px] pt-6 sm:pt-8 pb-3 sm:pb-4 border-b border-[#222]">
            {weekData.map((d) => {
              const heightPercent = Math.max(10, Math.round((d.hours / maxWeeklyHours) * 100));
              const isOff = d.hours === 0;

              return (
                <div key={d.day} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 mb-1.5 opacity-80 group-hover:opacity-100 group-hover:text-white transition whitespace-nowrap">
                    {d.label}
                  </span>
                  <div className="w-full max-w-[36px] sm:max-w-[48px] bg-[#1a1a1a] rounded-t-xl overflow-hidden flex items-end justify-center h-full">
                    <div
                      style={{ height: `${isOff ? 6 : heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        isOff
                          ? "bg-neutral-800"
                          : "bg-gradient-to-t from-[#8A060D] via-[#E50914] to-[#FF1E2D] shadow-lg glow-red-sm group-hover:brightness-110"
                      }`}
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-neutral-400 mt-2 sm:mt-3 group-hover:text-white transition">
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Calendar View with Badges (PRD Section 13) */}
      <DutyCalendar sessions={sessions} />
    </div>
  );
}
