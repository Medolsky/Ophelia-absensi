"use client";

import { useState, useMemo } from "react";
import { DutySessionData, PermissionLevel } from "@/types";
import { AttendanceEditModal } from "./attendance-edit-modal";
import { Search, Filter, Calendar, Edit2, Clock, CheckCircle2 } from "lucide-react";

interface AttendanceTableProps {
  sessions: DutySessionData[];
  institutionSlug: string;
  userPermission: PermissionLevel;
}

export function AttendanceTable({
  sessions,
  institutionSlug,
  userPermission,
}: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedSessionToEdit, setSelectedSessionToEdit] = useState<DutySessionData | null>(null);

  const canEdit = userPermission === "LEADER" || userPermission === "SUPER_ADMIN";

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Search by notes or date
      if (searchTerm) {
        const matchesNote = s.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = s.startedAt.includes(searchTerm);
        if (!matchesNote && !matchesDate) return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && s.status !== statusFilter) {
        return false;
      }

      // Date range filter (PRD section 15)
      const sessionDateStr = s.startedAt.slice(0, 10);
      if (startDate && sessionDateStr < startDate) return false;
      if (endDate && sessionDateStr > endDate) return false;

      return true;
    });
  }, [sessions, searchTerm, statusFilter, startDate, endDate]);

  const totalFilteredSeconds = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  }, [filteredSessions]);

  const formatHoursMinutes = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari catatan tugas / tanggal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none"
            />
          </div>

          {/* Date Range Filters (PRD Section 15) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#080808] border border-[#252525] px-2.5 py-1 rounded-xl">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">FROM:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-300 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#080808] border border-[#252525] px-2.5 py-1 rounded-xl">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">TO:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-300 outline-none"
              />
            </div>

            {(startDate || endDate || searchTerm || statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearchTerm("");
                  setStatusFilter("ALL");
                }}
                className="text-xs text-neutral-400 hover:text-white px-2.5 py-2 rounded-lg border border-[#252525] hover:bg-[#1f1f1f] transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary Stats */}
        <div className="mt-3 pt-3 border-t border-[#1c1c1c] flex flex-wrap items-center justify-between text-xs text-neutral-400">
          <div>
            Menampilkan <span className="text-white font-bold">{filteredSessions.length}</span> sesi
          </div>
          <div>
            Total Durasi Filter:{" "}
            <span className="text-[#FF1E2D] font-mono font-bold">
              {formatHoursMinutes(totalFilteredSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Sessions Table (PRD Section 10) */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Mulai (Start)</th>
                <th className="py-3.5 px-4">Selesai (End)</th>
                <th className="py-3.5 px-4">Durasi</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Keterangan</th>
                {canEdit && <th className="py-3.5 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-12 text-center text-neutral-500">
                    <Clock className="h-8 w-8 mx-auto text-neutral-600 mb-2" />
                    <div>Tidak ada catatan absensi yang sesuai dengan filter.</div>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const startDateObj = new Date(session.startedAt);
                  const isLive = !session.endedAt && session.status === "ON_DUTY";

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-[#161616] transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium text-white">
                        {startDateObj.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {startDateObj.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {session.endedAt
                          ? new Date(session.endedAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "SEDANG DINAS"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {isLive ? (
                          <span className="text-[#FF1E2D] animate-pulse">Running...</span>
                        ) : (
                          formatHoursMinutes(session.durationSeconds)
                        )}
                      </td>
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 text-neutral-400 max-w-[200px] truncate">
                        {session.notes || "—"}
                      </td>
                      {canEdit && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedSessionToEdit(session)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] transition"
                            title="Koreksi Waktu Absensi"
                          >
                            <Edit2 className="h-3 w-3 text-[#FF1E2D]" />
                            <span>Koreksi</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Edit Modal for Leaders */}
      {selectedSessionToEdit && (
        <AttendanceEditModal
          session={selectedSessionToEdit}
          institutionSlug={institutionSlug}
          isOpen={!!selectedSessionToEdit}
          onClose={() => setSelectedSessionToEdit(null)}
        />
      )}
    </div>
  );
}
