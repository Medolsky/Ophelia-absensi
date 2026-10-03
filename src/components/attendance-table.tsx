"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DutySessionData, PermissionLevel } from "@/types";
import { AttendanceEditModal } from "./attendance-edit-modal";
import {
  Search,
  Calendar,
  Edit2,
  Clock,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
} from "lucide-react";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import { UserAvatar } from "./user-avatar";

interface AttendanceTableProps {
  sessions: DutySessionData[];
  institutionSlug: string;
  userPermission: PermissionLevel;
  currentUserId?: string;
  currentUserRoles?: string[];
  initialMonth?: string;
}

export function AttendanceTable({
  sessions,
  institutionSlug,
  userPermission,
  currentUserId,
  currentUserRoles,
  initialMonth,
}: AttendanceTableProps) {
  const router = useRouter();
  const [sessionsList, setSessionsList] = useState<DutySessionData[]>(sessions);
  const [viewMode, setViewMode] = useState<"ALL" | "MINE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) {
      return `${initialMonth}-01`;
    }
    return "";
  });
  const [endDate, setEndDate] = useState<string>(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) {
      const [year, month] = initialMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return `${initialMonth}-${String(lastDay).padStart(2, "0")}`;
    }
    return "";
  });
  const [selectedSessionToEdit, setSelectedSessionToEdit] = useState<DutySessionData | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Sync if parent updates
  useEffect(() => {
    setSessionsList(sessions);
  }, [sessions]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, searchTerm, statusFilter, startDate, endDate, pageSize]);

  const hasAdminRole = (currentUserRoles || []).some((r) => {
    const raw = String(r).trim();
    if (raw === "1482622396954312809" || raw === "1482622396954312808") return true;
    const norm = raw.toLowerCase().replace(/[^\w\s]/gi, "").trim();
    return (
      norm.includes("admin") ||
      norm.includes("administrator") ||
      norm.includes("pimpinan") ||
      norm.includes("owner") ||
      norm.includes("founder") ||
      norm.includes("management") ||
      norm.includes("atasan") ||
      norm.includes("chief") ||
      norm.includes("leader")
    );
  });

  const canEdit = userPermission === "LEADER" || userPermission === "SUPER_ADMIN" || hasAdminRole;

  const filteredSessions = useMemo(() => {
    const cleanId = currentUserId ? currentUserId.replace("discord-", "") : "";
    return sessionsList.filter((s) => {
      // Filter by My Attendance vs All
      if (viewMode === "MINE" && currentUserId) {
        const matchesUser =
          s.userId === currentUserId ||
          s.userId === cleanId ||
          s.userId === `discord-${cleanId}`;
        if (!matchesUser) return false;
      }

      // Search by notes, date, officer name, or position
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesNote = s.notes?.toLowerCase().includes(term);
        const matchesDate = s.startedAt.includes(term);
        const matchesName = s.userName?.toLowerCase().includes(term);
        const matchesPos = s.positionName?.toLowerCase().includes(term);
        if (!matchesNote && !matchesDate && !matchesName && !matchesPos) return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && s.status !== statusFilter) {
        return false;
      }

      // Date range filter
      const sessionDateStr = s.startedAt.slice(0, 10);
      if (startDate && sessionDateStr < startDate) return false;
      if (endDate && sessionDateStr > endDate) return false;

      return true;
    });
  }, [sessionsList, viewMode, currentUserId, searchTerm, statusFilter, startDate, endDate]);

  const totalFilteredSeconds = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  }, [filteredSessions]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedSessions = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredSessions.slice(startIndex, startIndex + pageSize);
  }, [filteredSessions, safePage, pageSize]);

  const formatHoursMinutes = (secs: number) => {
    if (!secs || secs <= 0) return "0s";
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}h\u00A0${minutes.toString().padStart(2, "0")}m`;
    }
    if (minutes > 0) {
      return `${minutes}m\u00A0${seconds.toString().padStart(2, "0")}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="space-y-4">
      {/* View Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setViewMode("ALL")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            viewMode === "ALL"
              ? "bg-[#E50914] text-white shadow-lg glow-red-sm"
              : "bg-[#141414] hover:bg-[#1f1f1f] text-neutral-400 hover:text-white border border-[#252525]"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Semua Anggota</span>
        </button>
        <button
          onClick={() => setViewMode("MINE")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            viewMode === "MINE"
              ? "bg-[#E50914] text-white shadow-lg glow-red-sm"
              : "bg-[#141414] hover:bg-[#1f1f1f] text-neutral-400 hover:text-white border border-[#252525]"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Absensi Saya</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari nama petugas, pangkat, catatan tugas, atau tanggal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none transition-colors"
            />
          </div>

          {/* Status & Date Range Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#080808] border border-[#252525] text-xs text-neutral-300 px-3 py-2 rounded-xl outline-none flex-1 sm:flex-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="ON_DUTY">ON DUTY</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CORRECTED">CORRECTED</option>
            </select>

            <div className="flex items-center gap-1.5 bg-[#080808] border border-[#252525] px-2.5 py-1.5 rounded-xl flex-1 sm:flex-none min-w-[130px]">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">DARI:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-300 outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#080808] border border-[#252525] px-2.5 py-1.5 rounded-xl flex-1 sm:flex-none min-w-[130px]">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">SAMPAI:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-300 outline-none w-full"
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
                className="text-xs text-neutral-400 hover:text-white px-2.5 py-2 rounded-xl border border-[#252525] hover:bg-[#1f1f1f] transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary Stats */}
        <div className="mt-3 pt-3 border-t border-[#1c1c1c] flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <div>
            Menampilkan <span className="text-white font-bold">{filteredSessions.length}</span> sesi {viewMode === "MINE" ? "(Absensi Saya)" : "(Semua Anggota)"}
          </div>
          <div>
            Total Durasi Filter:{" "}
            <span className="text-[#FF1E2D] font-mono font-bold whitespace-nowrap">
              {formatHoursMinutes(totalFilteredSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Sessions Table with Horizontal Scroll Guard & Swipe indicator */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="sm:hidden px-3.5 py-1.5 bg-[#161616] border-b border-[#242424] text-[10px] text-neutral-400 flex items-center justify-between font-mono">
          <span>👉 Geser tabel ke samping untuk melihat detail</span>
          <span className="text-[#FF1E2D] font-bold">SWIPE</span>
        </div>
        <div className="overflow-x-auto w-full table-scroll-container">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Petugas</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Mulai (Start)</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Selesai (End)</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Durasi</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Keterangan</th>
                {canEdit && <th className="py-3.5 px-4 whitespace-nowrap text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {paginatedSessions.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-12 text-center text-neutral-500">
                    <Clock className="h-8 w-8 mx-auto text-neutral-600 mb-2" />
                    <div>Tidak ada catatan absensi yang sesuai dengan filter.</div>
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session) => {
                  const startDateObj = new Date(session.startedAt);
                  const isLive = !session.endedAt && session.status === "ON_DUTY";

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-[#161616] transition-colors group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            userId={session.userId}
                            userAvatar={session.userAvatar}
                            name={session.userName}
                            className="h-8 w-8 rounded-lg object-cover border border-[#333] shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white text-xs">{session.userName || "Petugas"}</div>
                            <div className="text-[10px] text-neutral-400 font-medium">{session.positionName || "Anggota"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-white">
                        {startDateObj.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-neutral-300">
                        {startDateObj.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-neutral-300">
                        {session.endedAt
                          ? new Date(session.endedAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "SEDANG DINAS"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-white">
                        {isLive ? (
                          <span className="text-[#FF1E2D] animate-pulse">Running...</span>
                        ) : (
                          formatHoursMinutes(session.durationSeconds)
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
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
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 max-w-[200px] truncate">
                        {session.notes || "-"}
                      </td>
                      {canEdit && (
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSessionToEdit(session)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#2c2c2c] transition cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
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

        {/* Agency-Grade Pagination Bar */}
        {filteredSessions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 bg-[#141414] border-t border-[#222] text-xs">
            <div className="flex items-center gap-2 text-neutral-400">
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-[#0c0c0c] border border-[#2a2a2a] text-white px-2 py-1 rounded-lg text-xs outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-neutral-500 hidden sm:inline">|</span>
              <span className="text-neutral-400">
                Menampilkan <span className="text-white font-medium">{(safePage - 1) * pageSize + 1}</span>–
                <span className="text-white font-medium">{Math.min(safePage * pageSize, filteredSessions.length)}</span> dari{" "}
                <span className="text-white font-medium">{filteredSessions.length}</span> sesi
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg border border-[#2a2a2a] text-neutral-400 hover:text-white hover:bg-[#202020] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg border border-[#2a2a2a] text-neutral-400 hover:text-white hover:bg-[#202020] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 py-1 text-xs font-mono font-bold text-white bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg">
                {safePage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg border border-[#2a2a2a] text-neutral-400 hover:text-white hover:bg-[#202020] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg border border-[#2a2a2a] text-neutral-400 hover:text-white hover:bg-[#202020] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Edit Modal for Leaders */}
      {selectedSessionToEdit && (
        <AttendanceEditModal
          session={selectedSessionToEdit}
          institutionSlug={institutionSlug}
          isOpen={!!selectedSessionToEdit}
          onClose={() => setSelectedSessionToEdit(null)}
          onSessionUpdated={(updated) => {
            setSessionsList((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
