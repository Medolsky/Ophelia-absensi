"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { startDutyAction, endDutyAction } from "@/app/actions/duty-actions";
import { clearClientDutyState } from "@/lib/duty-client";
import { Play, Square, Clock, AlertCircle, X, Check } from "lucide-react";
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

  const getStoredActiveSession = (): DutySessionData | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored =
        localStorage.getItem(`ophelia_active_duty_${institutionSlug}`) ||
        localStorage.getItem("ophelia_current_active_duty");
      if (stored) {
        const parsed = JSON.parse(stored) as DutySessionData;
        if (parsed && !parsed.endedAt && parsed.status === "ON_DUTY") {
          const cleanSlug = parsed.institutionSlug?.replace("inst-", "").toLowerCase();
          const targetSlug = institutionSlug.replace("inst-", "").toLowerCase();
          if (cleanSlug === targetSlug) {
            return parsed;
          }
        }
      }
    } catch {}
    return null;
  };

  const [activeSession, setActiveSession] = useState<DutySessionData | null>(
    () => initialActiveSession || getStoredActiveSession()
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState("");
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const endedSessionIdRef = useRef<string | null>(null);

  // Update active session when prop changes, avoiding reviving an ended session from stale cache
  useEffect(() => {
    if (initialActiveSession) {
      if (endedSessionIdRef.current && initialActiveSession.id === endedSessionIdRef.current) {
        return;
      }
      setActiveSession(initialActiveSession);
      try {
        const json = JSON.stringify(initialActiveSession);
        localStorage.setItem(`ophelia_active_duty_${institutionSlug}`, json);
        localStorage.setItem("ophelia_current_active_duty", json);
        document.cookie = `ophelia_active_duty_${institutionSlug}=${encodeURIComponent(json)}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `ophelia_active_duty=${encodeURIComponent(json)}; path=/; max-age=604800; SameSite=Lax`;
      } catch {}
    } else {
      // Server returned null. DO NOT wipe client session unless the user explicitly ended it!
      if (endedSessionIdRef.current) {
        setActiveSession(null);
        return;
      }
      const local = getStoredActiveSession();
      if (local && local.id !== endedSessionIdRef.current) {
        setActiveSession(local);
      } else {
        setActiveSession(null);
      }
    }
  }, [initialActiveSession, institutionSlug]);

  // Synchronize state across other components (e.g. Navbar & other tabs)
  useEffect(() => {
    const handleDutyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        status: string;
        session?: DutySessionData;
        institutionSlug?: string;
      }>;
      if (customEvent.detail?.status === "OFF_DUTY") {
        if (activeSession?.id) {
          endedSessionIdRef.current = activeSession.id;
        }
        setActiveSession(null);
        setElapsedSeconds(0);
      } else if (customEvent.detail?.status === "ON_DUTY" && customEvent.detail?.session) {
        const s = customEvent.detail.session;
        const cleanSlug = s.institutionSlug?.replace("inst-", "").toLowerCase();
        const targetSlug = institutionSlug.replace("inst-", "").toLowerCase();
        if (cleanSlug === targetSlug) {
          endedSessionIdRef.current = null;
          setActiveSession(s);
        }
      }
    };

    const handleStorageChange = () => {
      const current = getStoredActiveSession();
      if (current && current.id !== endedSessionIdRef.current) {
        setActiveSession(current);
      } else if (!current && !endedSessionIdRef.current) {
        setActiveSession(null);
      }
    };

    window.addEventListener("ophelia_duty_changed", handleDutyChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("ophelia_duty_changed", handleDutyChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [activeSession, institutionSlug]);

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
    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    const ss = seconds.toString().padStart(2, "0");
    return `${hh}\u00A0:\u00A0${mm}\u00A0:\u00A0${ss}`;
  };

  const handleStartDuty = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await startDutyAction(institutionSlug, notes);
      if (res.success && res.session) {
        endedSessionIdRef.current = null;
        setActiveSession(res.session);
        setShowNotesInput(false);
        setNotes("");

        // Persist to localStorage and cookies for seamless tab restore
        try {
          const json = JSON.stringify(res.session);
          localStorage.setItem(`ophelia_active_duty_${institutionSlug}`, json);
          localStorage.setItem("ophelia_current_active_duty", json);
          document.cookie = `ophelia_active_duty_${institutionSlug}=${encodeURIComponent(json)}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `ophelia_active_duty=${encodeURIComponent(json)}; path=/; max-age=604800; SameSite=Lax`;
        } catch {}

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ophelia_duty_changed", {
              detail: { status: "ON_DUTY", session: res.session },
            })
          );
        }
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
    if (activeSession?.id) {
      endedSessionIdRef.current = activeSession.id;
    }

    // Clear client persistence completely
    clearClientDutyState(institutionSlug);

    // Immediate optimistic update
    setActiveSession(null);
    setElapsedSeconds(0);
    setShowEndConfirmModal(false);

    try {
      const res = await endDutyAction(institutionSlug);
      if (res.success) {
        router.refresh();
      } else {
        if (!res.error?.includes("Tidak ada sesi duty")) {
          setError(res.error || "Gagal mengakhiri duty.");
        }
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("End duty error:", err);
      router.refresh();
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
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              {isOnDuty ? (
                <>
                  Duty Aktif: <span className="text-[#FF1E2D]">{institutionName}</span>
                </>
              ) : (
                <>Siap Bertugas di {institutionName}</>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              {isOnDuty ? (
                <>
                  Mulai duty pada{" "}
                  <span className="text-neutral-200 font-mono">
                    {new Date(activeSession.startedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              ) : (
                `Halo ${userDisplayName}, klik tombol di samping untuk mencatat kehadiran dinas Anda.`
              )}
            </p>
          </div>

          {/* Realtime Digital Clock Display */}
          <div className="w-full md:w-auto shrink-0 flex flex-col items-center md:items-end justify-center">
            <div className="w-full sm:w-auto bg-[#080808] border border-[#252525] rounded-xl px-3.5 sm:px-6 py-3 sm:py-4 shadow-inner min-w-0 sm:min-w-[240px]">
              <span className="text-[11px] sm:text-xs text-neutral-500 font-medium uppercase tracking-wider block text-center md:text-right mb-1">
                {isOnDuty ? "DURASI REALTIME" : "STANDBY TIME"}
              </span>
              <div className="font-mono text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight sm:tracking-wider text-white flex items-center justify-center md:justify-end gap-1.5 sm:gap-2.5 select-none">
                <Clock className={`h-4 w-4 sm:h-6 sm:w-6 shrink-0 ${isOnDuty ? "text-[#FF1E2D] animate-pulse" : "text-neutral-600"}`} />
                <span className={`whitespace-nowrap tabular-nums font-mono ${isOnDuty ? "text-white text-glow" : "text-neutral-400"}`}>
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
        <div className="mt-6 pt-6 border-t border-[#252525] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {!isOnDuty ? (
              <>
                {showNotesInput && (
                  <input
                    type="text"
                    placeholder="Catatan dinas (opsional e.g. Patroli Sektor 4)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white px-3 py-2.5 rounded-lg outline-none w-full sm:w-64 transition-colors"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setShowNotesInput(!showNotesInput)}
                  className="text-xs text-neutral-400 hover:text-white px-3 py-2.5 rounded-lg border border-[#252525] hover:bg-[#1a1a1a] transition text-center cursor-pointer"
                >
                  {showNotesInput ? "Tutup Catatan" : "+ Tambah Catatan"}
                </button>
                <button
                  type="button"
                  onClick={handleStartDuty}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-[#E50914] hover:bg-[#FF1E2D] active:scale-95 shadow-lg glow-red transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <Play className="h-4 w-4 fill-white shrink-0" />
                  <span>{loading ? "Menghubungkan Server..." : "START DUTY"}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowEndConfirmModal(true)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-neutral-800 hover:bg-red-700/80 hover:border-red-600 border border-neutral-700 active:scale-95 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Square className="h-4 w-4 fill-white text-white shrink-0" />
                <span>END DUTY (OFF)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* In-App Confirmation Modal (No native popup blocker issues) */}
      {showEndConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2a2a2a] shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowEndConfirmModal(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-3 pr-8">
              <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-[#FF1E2D] shrink-0">
                <Square className="h-5 w-5 fill-[#FF1E2D]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">Selesaikan Sesi Dinas?</h3>
                <p className="text-xs text-neutral-400 truncate">Instansi: {institutionName}</p>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#222] p-3.5 sm:p-4 rounded-xl my-4 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Waktu Mulai:</span>
                <span className="font-mono text-white">
                  {activeSession?.startedAt
                    ? new Date(activeSession.startedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Durasi Berjalan:</span>
                <span className="font-mono font-bold text-[#FF1E2D] whitespace-nowrap">{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 mb-5">
              Apakah Anda yakin ingin menyelesaikan sesi dinas ini?
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEndConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmEndDuty}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-lg glow-red-sm disabled:opacity-50 text-center"
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
