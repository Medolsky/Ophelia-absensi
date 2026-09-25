"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startDutyAction, endDutyAction } from "@/app/actions/duty-actions";
import { Play, Square, Clock, ShieldCheck, AlertCircle, Sparkles, X, Check } from "lucide-react";
import { DutySessionData } from "@/types";

interface DutyTimerProps {
  institutionSlug: string;
  institutionName: string;
  initialActiveSession: DutySessionData | null;
  userDisplayName: string;
}

export function DutyTimer({
  institutionSlug,
  institutionName,
  initialActiveSession,
  userDisplayName,
}: DutyTimerProps) {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<DutySessionData | null>(initialActiveSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState("");
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);

  // Update active session when prop changes
  useEffect(() => {
    setActiveSession(initialActiveSession);
  }, [initialActiveSession]);

  // Realtime Timer based on Server Timestamp
  useEffect(() => {
    if (!activeSession || !activeSession.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(activeSession.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, "0")} : ${minutes
      .toString()
      .padStart(2, "0")} : ${seconds.toString().padStart(2, "0")}`;
  };

  const handleStartDuty = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await startDutyAction(institutionSlug, notes);
      if (res.success && res.session) {
        setActiveSession(res.session);
        setShowNotesInput(false);
        setNotes("");
        router.refresh();
      } else {
        setError(res.error || "Gagal memulai duty.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memulai duty.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEndDuty = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await endDutyAction(institutionSlug);
      if (res.success) {
        setActiveSession(null);
        setShowEndConfirmModal(false);
        router.refresh();
      } else {
        setError(res.error || "Gagal mengakhiri duty.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengakhiri duty.");
    } finally {
      setLoading(false);
    }
  };

  const isOnDuty = !!activeSession;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-[#252525] bg-[#111111] p-6 lg:p-8 shadow-2xl transition-all">
        {/* Background ambient red glow when on duty */}
        {isOnDuty && (
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#E50914]/15 blur-3xl pointer-events-none" />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isOnDuty
                    ? "bg-[#E50914]/20 text-[#FF1E2D] border border-[#E50914]/40 pulse-badge"
                    : "bg-neutral-800/80 text-neutral-400 border border-neutral-700/50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnDuty ? "bg-[#FF1E2D] animate-ping" : "bg-neutral-500"
                  }`}
                />
                {isOnDuty ? "CURRENTLY ON DUTY" : "OFF DUTY"}
              </span>
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#E50914]" /> Server Verified
              </span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              {isOnDuty ? (
                <>
                  Duty Aktif: <span className="text-[#FF1E2D]">{institutionName}</span>
                </>
              ) : (
                <>Siap Bertugas di {institutionName}</>
              )}
            </h2>

            <p className="text-sm text-neutral-400 mt-1">
              {isOnDuty ? (
                <>
                  Mulai duty pada{" "}
                  <span className="text-neutral-200 font-mono">
                    {new Date(activeSession.startedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  . Waktu dihitung dari server authority.
                </>
              ) : (
                `Halo ${userDisplayName}, klik tombol di samping untuk mencatat kehadiran dinas Anda.`
              )}
            </p>
          </div>

          {/* Realtime Digital Clock Display */}
          <div className="flex flex-col items-center md:items-end justify-center">
            <div className="bg-[#080808] border border-[#252525] rounded-xl px-6 py-4 shadow-inner">
              <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider block text-center md:text-right mb-1">
                {isOnDuty ? "DURASI REALTIME" : "STANDBY TIME"}
              </span>
              <div className="font-mono text-3xl lg:text-4xl font-black tracking-wider text-white flex items-center gap-2">
                <Clock className={`h-6 w-6 ${isOnDuty ? "text-[#FF1E2D] animate-pulse" : "text-neutral-600"}`} />
                <span className={isOnDuty ? "text-white text-glow" : "text-neutral-400"}>
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 pt-6 border-t border-[#252525] flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-neutral-500 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#E50914]" />
            <span>Anti-abuse aktif: Maksimal 1 sesi duty simultan per akun</span>
          </div>

          <div className="flex items-center gap-3">
            {!isOnDuty ? (
              <>
                {showNotesInput && (
                  <input
                    type="text"
                    placeholder="Catatan dinas (opsional e.g. Patroli Sektor 4)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white px-3 py-2 rounded-lg outline-none w-64 transition-colors"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setShowNotesInput(!showNotesInput)}
                  className="text-xs text-neutral-400 hover:text-white px-3 py-2 rounded-lg border border-[#252525] hover:bg-[#1a1a1a] transition"
                >
                  {showNotesInput ? "Tutup Catatan" : "+ Tambah Catatan"}
                </button>
                <button
                  type="button"
                  onClick={handleStartDuty}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-[#E50914] hover:bg-[#FF1E2D] active:scale-95 shadow-lg glow-red transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-4 w-4 fill-white" />
                  {loading ? "Menghubungkan Server..." : "START DUTY"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowEndConfirmModal(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-neutral-800 hover:bg-red-700/80 hover:border-red-600 border border-neutral-700 active:scale-95 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="h-4 w-4 fill-white text-white" />
                <span>END DUTY (OFF)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* In-App Confirmation Modal (No native popup blocker issues) */}
      {showEndConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2a2a2a] shadow-2xl p-6 relative">
            <button
              onClick={() => setShowEndConfirmModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-[#FF1E2D]">
                <Square className="h-5 w-5 fill-[#FF1E2D]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Selesaikan Sesi Dinas?</h3>
                <p className="text-xs text-neutral-400">Instansi: {institutionName}</p>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#222] p-4 rounded-xl my-4 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Waktu Mulai:</span>
                <span className="font-mono text-white">
                  {activeSession &&
                    new Date(activeSession.startedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Durasi Berjalan:</span>
                <span className="font-mono font-bold text-[#FF1E2D]">{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 mb-5">
              Apakah Anda yakin ingin menyelesaikan sesi duty ini (OFF DUTY)? Data durasi dinas akan disimpan ke database presensi instansi.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEndConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmEndDuty}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-lg glow-red-sm disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{loading ? "Menyimpan Data..." : "Ya, Selesaikan Dinas"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
