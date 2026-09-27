"use client";

import { useState } from "react";
import { MembershipData, DutySessionData, PayrollRecord } from "@/types";
import { FileSpreadsheet, Download, Calendar, Filter } from "lucide-react";

interface ReportGeneratorProps {
  memberships: MembershipData[];
  payrollRecords?: PayrollRecord[];
  institutionName: string;
  institutionSlug: string;
}

export function ReportGenerator({
  memberships,
  payrollRecords = [],
  institutionName,
  institutionSlug,
}: ReportGeneratorProps) {
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-09-30");

  // Dynamic duty summary per member calculated from real records
  const memberReportData = memberships.map((m) => {
    const pRecord = payrollRecords.find(
      (r) => r.membershipId === m.id || r.userId === m.userId
    );
    const totalSeconds = pRecord?.totalDutySeconds || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return {
      memberId: m.id,
      name: m.user?.displayName || m.user?.discordUsername || "Member",
      discordId: m.user?.discordId || "",
      position: m.positionName || "Officer",
      sessions: totalSeconds > 0 ? 1 : 0,
      activeDays: totalSeconds > 0 ? 1 : 0,
      totalHoursStr: `${hours}h\u00A0${minutes.toString().padStart(2, "0")}m`,
      totalHoursNum: pRecord?.totalDutyHours || 0,
    };
  });

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
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#FF1E2D]" />
          <span>Konfigurasi Periode Laporan</span>
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
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
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
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
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-lg glow-red-sm"
            >
              <Download className="h-4 w-4" />
              <span>EXPORT KE CSV (EXCEL)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Report Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="p-4 bg-[#161616] border-b border-[#252525] flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            Hasil Rekapitulasi Presensi: {startDate} s/d {endDate}
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {memberReportData.length} Anggota Terdata
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
