"use client";

import { useState, useMemo, useEffect } from "react";
import { DutySessionData, PermissionLevel } from "@/types";
import { UserAvatar } from "./user-avatar";
import { AttendanceEditModal } from "./attendance-edit-modal";
import { Search, Clock, ChevronLeft, ChevronRight, User, Users, Filter, Edit3 } from "lucide-react";

interface HistoryTableProps {
  sessions: DutySessionData[];
  currentUserId: string;
  currentUserDiscordId?: string;
  institutionSlug: string;
  userPermission?: PermissionLevel;
  currentUserRoles?: string[];
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}j\u00A0${m.toString().padStart(2, "0")}m`;
  }
  if (m > 0) {
    return `${m}m\u00A0${s.toString().padStart(2, "0")}s`;
  }
  return `${s}s`;
}

function formatSafeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatSafeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function HistoryTable({
  sessions,
  currentUserId,
  currentUserDiscordId,
  institutionSlug,
  userPermission,
  currentUserRoles,
}: HistoryTableProps) {
  const [sessionsList, setSessionsList] = useState<DutySessionData[]>(sessions);
  const [filterMode, setFilterMode] = useState<"ALL" | "MINE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSessionToEdit, setSelectedSessionToEdit] = useState<DutySessionData | null>(null);
  const pageSize = 15;

  useEffect(() => {
    setSessionsList(sessions);
  }, [sessions]);

  // Check if admin or leader can edit attendance
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

  const cleanUserId = currentUserId.replace("discord-", "");
  const cleanDiscordId = currentUserDiscordId?.replace("discord-", "");

  const isUserSession = (session: DutySessionData) => {
    const sId = session.userId?.replace("discord-", "");
    return (
      session.userId === currentUserId ||
      sId === cleanUserId ||
      (cleanDiscordId && sId === cleanDiscordId)
    );
  };

  const filteredSessions = useMemo(() => {
    return sessionsList.filter((s) => {
      // 1. Filter by user mode
      if (filterMode === "MINE" && !isUserSession(s)) {
        return false;
      }

      // 2. Filter by status
      if (statusFilter !== "ALL" && s.status !== statusFilter) {
        return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const userName = (s.userName || "").toLowerCase();
        const posName = (s.positionName || "").toLowerCase();
        const notes = (s.notes || "").toLowerCase();
        const dateStr = formatSafeDate(s.startedAt).toLowerCase();
        return (
          userName.includes(query) ||
          posName.includes(query) ||
          notes.includes(query) ||
          dateStr.includes(query)
        );
      }

      return true;
    });
  }, [sessionsList, filterMode, statusFilter, searchTerm, currentUserId, currentUserDiscordId]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedSessions = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, validPage, pageSize]);

  const mySessionsCount = useMemo(() => {
    return sessionsList.filter(isUserSession).length;
  }, [sessionsList, currentUserId, currentUserDiscordId]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111111] p-3 sm:p-4 rounded-2xl border border-[#222]">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#171717] rounded-xl border border-[#262626] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setFilterMode("ALL");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === "ALL"
                ? "bg-[#E50914] text-white shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Semua Anggota</span>
            <span className="text-[10px] opacity-75 font-mono">({sessionsList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode("MINE");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === "MINE"
                ? "bg-[#E50914] text-white shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Sesi Saya</span>
            <span className="text-[10px] opacity-75 font-mono">({mySessionsCount})</span>
          </button>
        </div>

        {/* Right: Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari nama, jabatan, catatan..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-56 pl-9 pr-3 py-2 sm:py-1.5 rounded-xl bg-[#171717] border border-[#282828] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914] transition"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl bg-[#171717] border border-[#282828] text-xs text-neutral-300 focus:outline-none focus:border-[#E50914] transition"
            >
              <option value="ALL">Semua Status</option>
              <option value="ON_DUTY">On Duty (Aktif)</option>
              <option value="COMPLETED">Completed</option>
              <option value="CORRECTED">Corrected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      {paginatedSessions.length === 0 ? (
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-10 text-center text-neutral-500 shadow-xl">
          <Clock className="h-8 w-8 mx-auto text-neutral-600 mb-2" />
          <div className="text-sm font-semibold text-neutral-300">Tidak Ada Data Histori</div>
          <p className="text-xs text-neutral-500 mt-1">
            {searchTerm || statusFilter !== "ALL" || filterMode === "MINE"
              ? "Tidak ada sesi dinas yang cocok dengan filter pencarian Anda."
              : "Belum ada catatan aktivitas sesi dinas untuk instansi ini."}
          </p>
          {(searchTerm || statusFilter !== "ALL" || filterMode === "MINE") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setFilterMode("ALL");
              }}
              className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold text-neutral-300 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] transition cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#222] bg-[#111111] overflow-hidden shadow-xl">
          {/* MOBILE CARD LIST VIEW (< sm) */}
          <div className="sm:hidden">
            <div className="divide-y divide-[#1e1e1e]">
              {paginatedSessions.map((session) => {
                const isLive = !session.endedAt && session.status === "ON_DUTY";
                const isMe = isUserSession(session);

                return (
                  <div
                    key={session.id}
                    className={`p-4 space-y-3 hover:bg-[#141414] transition-colors ${
                      isMe ? "bg-[#E50914]/5" : ""
                    }`}
                  >
                    {/* User profile row & status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          userId={session.userId}
                          userAvatar={session.userAvatar}
                          name={session.userName}
                          className="h-9 w-9 rounded-xl object-cover border border-[#333] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs flex items-center gap-1.5 truncate">
                            <span className="truncate">{session.userName || "Petugas"}</span>
                            {isMe && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold shrink-0">
                                SAYA
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-medium truncate">
                            {session.positionName || "Anggota"}
                          </div>
                        </div>
                      </div>

                      {session.status === "ON_DUTY" && (
                        <span className="px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono text-[10px] border border-[#E50914]/40 font-semibold shrink-0">
                          ON DUTY
                        </span>
                      )}
                      {session.status === "COMPLETED" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px] border border-emerald-500/30 font-semibold shrink-0">
                          COMPLETED
                        </span>
                      )}
                      {session.status === "CORRECTED" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono text-[10px] border border-amber-500/30 font-semibold shrink-0">
                          CORRECTED
                        </span>
                      )}
                    </div>

                    {/* Duty details row */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#0c0c0c] p-2.5 rounded-xl border border-[#1c1c1c] font-mono">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-sans">
                          TANGGAL & WAKTU
                        </div>
                        <div className="text-neutral-200 mt-0.5 text-[11px]">
                          {formatSafeDate(session.startedAt)}
                        </div>
                        <div className="text-neutral-400 text-[10px]">
                          {formatSafeTime(session.startedAt)} ─ {session.endedAt ? formatSafeTime(session.endedAt) : "SEKARANG"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-sans">
                          DURASI TUGAS
                        </div>
                        <div className="text-white font-bold mt-0.5 text-[12px]">
                          {isLive ? (
                            <span className="text-[#FF1E2D] animate-pulse">Running...</span>
                          ) : (
                            formatDuration(session.durationSeconds)
                          )}
                        </div>
                      </div>
                    </div>

                    {session.notes && (
                      <div className="text-[11px] text-neutral-400 bg-[#161616] p-2 rounded-lg border border-[#222]">
                        <span className="text-neutral-500 text-[10px] block mb-0.5 font-mono">CATATAN:</span>
                        <span>{session.notes}</span>
                      </div>
                    )}

                    {canEdit && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSessionToEdit(session)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#E50914] border border-[#2c2c2c] hover:border-[#E50914] transition cursor-pointer shadow-sm"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Koreksi Jam Dinas</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DESKTOP & TABLET TABLE VIEW (>= sm) */}
          <div className="hidden sm:block overflow-x-auto w-full table-scroll-container">
            <table className="w-full text-left text-sm text-neutral-300 min-w-[720px]">
              <thead className="bg-[#161616] text-[11px] uppercase tracking-wider text-neutral-400 font-semibold border-b border-[#252525]">
                <tr>
                  <th scope="col" className="py-3 px-4">Petugas</th>
                  <th scope="col" className="py-3 px-4">Tanggal</th>
                  <th scope="col" className="py-3 px-4">Jam Mulai</th>
                  <th scope="col" className="py-3 px-4">Jam Selesai</th>
                  <th scope="col" className="py-3 px-4">Durasi</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4">Catatan</th>
                  {canEdit && (
                    <th scope="col" className="py-3 px-4 text-right sticky right-0 bg-[#161616] z-10 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] border-l border-[#252525]">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e] text-xs">
                {paginatedSessions.map((session) => {
                  const isLive = !session.endedAt && session.status === "ON_DUTY";
                  const isMe = isUserSession(session);

                  return (
                    <tr
                      key={session.id}
                      className={`hover:bg-[#161616] transition-colors group ${
                        isMe ? "bg-[#E50914]/5" : ""
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            userId={session.userId}
                            userAvatar={session.userAvatar}
                            name={session.userName}
                            className="h-8 w-8 rounded-lg object-cover border border-[#333] shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{session.userName || "Petugas"}</span>
                              {isMe && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
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
                        {formatSafeDate(session.startedAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-300">
                        {formatSafeTime(session.startedAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-300">
                        {session.endedAt ? (
                          formatSafeTime(session.endedAt)
                        ) : (
                          <span className="text-[#FF1E2D] font-bold animate-pulse inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FF1E2D]" />
                            <span>SEDANG DINAS</span>
                          </span>
                        )}
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
                          <span className="px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] font-mono text-[10px] border border-[#E50914]/40 font-semibold">
                            ON DUTY
                          </span>
                        )}
                        {session.status === "COMPLETED" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px] border border-emerald-500/30 font-semibold">
                            COMPLETED
                          </span>
                        )}
                        {session.status === "CORRECTED" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono text-[10px] border border-amber-500/30 font-semibold">
                            CORRECTED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-400 max-w-[200px] truncate">
                        {session.notes || "—"}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 whitespace-nowrap text-right sticky right-0 bg-[#111111] group-hover:bg-[#161616] z-10 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] border-l border-[#202020] transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedSessionToEdit(session)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#E50914] border border-[#2c2c2c] hover:border-[#E50914] transition cursor-pointer shadow-sm"
                            title="Koreksi / Edit Jam Dinas Petugas"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Koreksi</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-3 sm:p-4 bg-[#141414] border-t border-[#222] flex items-center justify-between gap-3 text-xs text-neutral-400">
              <span className="font-mono">
                Menampilkan {(validPage - 1) * pageSize + 1} -{" "}
                {Math.min(validPage * pageSize, filteredSessions.length)} dari{" "}
                {filteredSessions.length} sesi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-[#2b2b2b] bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-40 disabled:cursor-not-allowed transition text-neutral-300 cursor-pointer"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono px-2 font-bold text-white">
                  {validPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-[#2b2b2b] bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-40 disabled:cursor-not-allowed transition text-neutral-300 cursor-pointer"
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Attendance Modal */}
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
          }}
        />
      )}
    </div>
  );
}
