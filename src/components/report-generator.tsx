"use client";

import { useState, useMemo } from "react";
import { MembershipData, DutySessionData } from "@/types";
import { FileSpreadsheet, Download, Calendar, Filter } from "lucide-react";

interface ReportGeneratorProps {
  memberships: MembershipData[];
  sessions?: DutySessionData[];
  institutionName: string;
  institutionSlug: string;
}

export function ReportGenerator({
  memberships,
  sessions = [],
  institutionName,
  institutionSlug,
}: ReportGeneratorProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(currentYear, today.getMonth() + 1, 0).getDate();

  const [startDate, setStartDate] = useState(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-${currentMonth}-${String(lastDay).padStart(2, "0")}`);

  // Dynamic duty summary per member calculated from real duty sessions within selected date range
  const memberReportData = useMemo(() => {
    return memberships.map((m) => {
      const cleanUserId = m.userId?.replace("discord-", "");
      const discordId = m.user?.discordId || "";

      // Match member sessions within date range
      const memberSessions = sessions.filter((s) => {
        const sUserId = s.userId?.replace("discord-", "");
        const matchesUser =
          s.userId === m.userId ||
          sUserId === cleanUserId ||
          (discordId && sUserId === discordId);
        if (!matchesUser) return false;

        const sessionDate = (s.startedAt || "").slice(0, 10);
        if (startDate && sessionDate < startDate) return false;
        if (endDate && sessionDate > endDate) return false;
        return true;
      });

      const totalSeconds = memberSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      const uniqueActiveDays = new Set(
        memberSessions.map((s) => (s.startedAt || "").slice(0, 10)).filter(Boolean)
      ).size;

      return {
        memberId: m.id,
        name: m.user?.displayName || m.user?.discordUsername || "Member",
        discordId: m.user?.discordId || "",
        position: m.positionName || "Officer",
        sessions: memberSessions.length,
        activeDays: uniqueActiveDays,
        totalHoursStr: `${hours}h\u00A0${minutes.toString().padStart(2, "0")}m`,
        totalSeconds,
      };
    });
  }, [memberships, sessions, startDate, endDate]);

  const handleExportCSV = () => {
    const headers = ["Member Name", "Discord ID", "Position", "Sessions", "Active Days", "Total Duty Hours"];
    const rows = memberReportData.map((d) => [
      `"${d.name}"`,
      `"${d.discordId}"`,
      `"${d.position}"`,
      d.sessions,
      d.activeDays,
      `"${d.totalHoursStr}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `laporan_absensi_${institutionSlug}_${startDate}_to_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Parameter Selection Card */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 sm:p-6 shadow-xl">
        <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#FF1E2D]" />
          <span>Konfigurasi Periode Laporan</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-neutral-400 mb-1.5">
              DARI TANGGAL (START)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-neutral-400 mb-1.5">
              HINGGA TANGGAL (END)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExportCSV}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-lg glow-red-sm cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>EXPORT KE CSV (EXCEL)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Report Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-[#161616] border-b border-[#252525] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            Hasil Rekapitulasi Presensi: {startDate} s/d {endDate}
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {memberReportData.length} Anggota Terdata
          </span>
        </div>

        {/* MOBILE CARD LIST VIEW (< sm) */}
        <div className="sm:hidden">
          {memberReportData.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-neutral-500">
              Tidak ada data absensi untuk rentang tanggal yang dipilih.
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e1e]">
              {memberReportData.map((d) => (
                <div key={d.memberId} className="p-4 space-y-2 hover:bg-[#141414] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-xs">{d.name}</div>
                      <div className="text-[10px] text-neutral-400">{d.position}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider text-neutral-500">TOTAL JAM</div>
                      <div className="text-sm font-mono font-bold text-[#FF1E2D]">{d.totalHoursStr}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400 bg-[#0c0c0c] p-2 rounded-lg border border-[#1a1a1a]">
                    <span>{d.sessions} Sesi Dinas</span>
                    <span>•</span>
                    <span>{d.activeDays} Hari Aktif</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DESKTOP & TABLET TABLE VIEW (>= sm) */}
        <div className="hidden sm:block overflow-x-auto table-scroll-container">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="bg-[#121212] border-b border-[#222] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Nama Anggota</th>
                <th className="py-3 px-4 whitespace-nowrap">Jabatan</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Jumlah Sesi</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Hari Aktif</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Jam Dinas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {memberReportData.map((d) => (
                <tr key={d.memberId} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">{d.name}</td>
                  <td className="py-3.5 px-4 text-neutral-300 whitespace-nowrap">{d.position}</td>
                  <td className="py-3.5 px-4 text-center font-mono text-neutral-300 whitespace-nowrap">
                    {d.sessions}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-neutral-300 whitespace-nowrap">
                    {d.activeDays}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#FF1E2D] whitespace-nowrap">
                    {d.totalHoursStr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
