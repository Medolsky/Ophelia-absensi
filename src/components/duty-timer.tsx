"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startDutyAction, endDutyAction } from "@/app/actions/duty-actions";
import { clearClientDutyState } from "@/lib/duty-client";
import {
  Play,
  Square,
  Clock,
  AlertCircle,
  X,
  Check,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { DutySessionData } from "@/types";

export interface FiveMClientStatus {
  serverConnected: boolean;
  lastHeartbeatAt: string | null;
  playerOnline: boolean;
  serverId: number | null;
  playerName: string | null;
  requireOnlineToStart: boolean;
}

interface DutyTimerProps {
  institutionSlug: string;
  institutionName: string;
  initialActiveSession: DutySessionData | null;
  initialAutoClosedSession?: DutySessionData | null;
  initialFiveMStatus?: FiveMClientStatus | null;
  userDisplayName: string;
}

function matchesSlug(session: DutySessionData | null | undefined, targetSlug: string): boolean {
  if (!session) return false;
  const cleanTarget = targetSlug.replace(/^inst-/, "").toLowerCase();
  const sSlug = (session.institutionSlug || "").replace(/^inst-/, "").toLowerCase();
  const sId = (session.institutionId || "").replace(/^inst-/, "").toLowerCase();
  return sSlug === cleanTarget || sId === cleanTarget;
}

export function DutyTimer({
  institutionSlug,
  institutionName,
  initialActiveSession,
  initialAutoClosedSession = null,
  initialFiveMStatus = null,
  userDisplayName,
}: DutyTimerProps) {
  const router = useRouter();

  const [activeSession, setActiveSession] = useState<DutySessionData | null>(
    initialActiveSession
  );
  const [nowMs, setNowMs] = useState<number>(() =>
    initialActiveSession?.startedAt
      ? new Date(initialActiveSession.startedAt).getTime()
      : 0
  );
  const [fivemStatus, setFiveMStatus] = useState<FiveMClientStatus | null>(
    initialFiveMStatus
  );
  const [autoStopNotice, setAutoStopNotice] = useState<{
    sessionId: string;
    endedAt?: string | null;
    durationSeconds: number;
    reason: string;
  } | null>(() => {
    if (
      !initialActiveSession &&
      initialAutoClosedSession &&
      initialAutoClosedSession.endedAt
    ) {
      return {
        sessionId: initialAutoClosedSession.id,
        endedAt: initialAutoClosedSession.endedAt,
        durationSeconds: initialAutoClosedSession.durationSeconds || 0,
        reason:
          initialAutoClosedSession.notes ||
          "Absensi otomatis dihentikan karena keluar kota / keluar server FiveM.",
      };
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState("");
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);

  const activeSessionRef = useRef<DutySessionData | null>(initialActiveSession);
  const dismissedNoticeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Clear legacy stale localStorage/cookies whenever server says user is OFF DUTY on initial load
  useEffect(() => {
    if (!initialActiveSession) {
      clearClientDutyState(institutionSlug);
    }
  }, [initialActiveSession, institutionSlug]);

  // Authoritative server sync (detects FiveM Auto-Stop in real-time!)
  const syncDutyWithServer = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/duty/me?institution=${encodeURIComponent(institutionSlug)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.ok) return;

      if (data.fivem) {
        setFiveMStatus(data.fivem as FiveMClientStatus);
      }

      const serverSession: DutySessionData | null =
        data.activeSession && matchesSlug(data.activeSession, institutionSlug)
          ? data.activeSession
          : null;

      const prevSession = activeSessionRef.current;

      if (serverSession) {
        if (!prevSession || prevSession.id !== serverSession.id) {
          setActiveSession(serverSession);
          setAutoStopNotice(null);
          window.dispatchEvent(
            new CustomEvent("ophelia_duty_changed", {
              detail: { status: "ON_DUTY", session: serverSession },
            })
          );
        }
      } else {
        // Server says OFF DUTY! If client previously thought it was ON DUTY, FiveM auto-stopped it!
        if (prevSession) {
          clearClientDutyState(institutionSlug);
          setActiveSession(null);
          setShowEndConfirmModal(false);

          const closed = data.lastAutoClosedSession as DutySessionData | null;
          if (closed && closed.id !== dismissedNoticeIdRef.current) {
            setAutoStopNotice({
              sessionId: closed.id,
              endedAt: closed.endedAt,
              durationSeconds: closed.durationSeconds || 0,
              reason:
                closed.notes ||
                "Absensi otomatis dihentikan karena Anda keluar kota / keluar server FiveM.",
            });
          } else {
            setAutoStopNotice({
              sessionId: prevSession.id,
              endedAt: new Date().toISOString(),
              durationSeconds: Math.max(
                0,
                Math.floor((Date.now() - new Date(prevSession.startedAt).getTime()) / 1000)
              ),
              reason:
                "Absensi otomatis dihentikan karena Anda keluar kota / keluar server FiveM. Silakan mulai absensi lagi saat sudah masuk kota.",
            });
          }

          router.refresh();
        } else {
          // Even if already off duty, surface recent auto-closed notice if not dismissed
          const closed = data.lastAutoClosedSession as DutySessionData | null;
          if (
            closed &&
            closed.endedAt &&
            closed.id !== dismissedNoticeIdRef.current &&
            Date.now() - new Date(closed.endedAt).getTime() < 2 * 60 * 60 * 1000
          ) {
            setAutoStopNotice((prev) =>
              prev?.sessionId === closed.id
                ? prev
                : {
                    sessionId: closed.id,
                    endedAt: closed.endedAt,
                    durationSeconds: closed.durationSeconds || 0,
                    reason:
                      closed.notes ||
                      "Absensi otomatis dihentikan karena keluar kota / keluar server FiveM.",
                  }
            );
          }
        }
      }
    } catch {
      // Ignore transient network errors during background polling
    }
  }, [institutionSlug, router]);

  // Poll every 5s + sync immediately when user returns to tab
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      syncDutyWithServer();
    }, 800);

    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      syncDutyWithServer();
    }, 5000);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        syncDutyWithServer();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [syncDutyWithServer]);

  // Listen to explicit cross-component events (e.g. Navbar Quick End Duty)
  useEffect(() => {
    const handleDutyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        status: string;
        session?: DutySessionData;
      }>;
      if (customEvent.detail?.status === "OFF_DUTY") {
        setActiveSession(null);
      } else if (
        customEvent.detail?.status === "ON_DUTY" &&
        customEvent.detail?.session &&
        matchesSlug(customEvent.detail.session, institutionSlug)
      ) {
        setActiveSession(customEvent.detail.session);
        setAutoStopNotice(null);
      }
    };

    window.addEventListener("ophelia_duty_changed", handleDutyChange);
    return () => {
      window.removeEventListener("ophelia_duty_changed", handleDutyChange);
    };
  }, [institutionSlug]);

  // Realtime stopwatch tick driven purely by interval callback
  useEffect(() => {
    if (!activeSession?.startedAt) return;

    const tick = () => setNowMs(Date.now());
    const immediate = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [activeSession]);

  const elapsedSeconds =
    activeSession?.startedAt && nowMs > 0
      ? Math.max(0, Math.floor((nowMs - new Date(activeSession.startedAt).getTime()) / 1000))
      : 0;

  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    const ss = seconds.toString().padStart(2, "0");
    return `${hh}\u00A0:\u00A0${mm}\u00A0:\u00A0${ss}`;
  };

  const formatDurationShort = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s} detik`;
  };

  const handleStartDuty = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await startDutyAction(institutionSlug, notes);
      if (res.success && res.session) {
        setActiveSession(res.session);
        setNowMs(Date.now());
        setAutoStopNotice(null);
        setShowNotesInput(false);
        setNotes("");

        window.dispatchEvent(
          new CustomEvent("ophelia_duty_changed", {
            detail: { status: "ON_DUTY", session: res.session },
          })
        );
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

    clearClientDutyState(institutionSlug);
    setActiveSession(null);
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
  const blockedByOfflineCity =
    !isOnDuty &&
    fivemStatus?.serverConnected &&
    fivemStatus.requireOnlineToStart &&
    !fivemStatus.playerOnline;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-[#252525] bg-[#111111] p-6 lg:p-8 shadow-2xl transition-all">
        {/* Background ambient red glow when on duty */}
        {isOnDuty && (
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#E50914]/15 blur-3xl pointer-events-none" />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
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

              {/* Live FiveM Server & In-City Status Badge */}
              {fivemStatus && (
                fivemStatus.serverConnected ? (
                  fivemStatus.playerOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Wifi className="h-3 w-3 shrink-0" />
                      <span>
                        DI KOTA FIVEM{fivemStatus.serverId ? ` #${fivemStatus.serverId}` : ""}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <WifiOff className="h-3 w-3 shrink-0" />
                      <span>DI LUAR KOTA (OFFLINE FIVEM)</span>
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-neutral-400 bg-[#181818] border border-[#2a2a2a]">
                    <WifiOff className="h-3 w-3 shrink-0 text-neutral-500" />
                    <span>FIVEM BRIDGE STANDBY</span>
                  </span>
                )
              )}
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
                  <span className="text-neutral-500">
                    {" "}• Otomatis berhenti jika Anda keluar kota / keluar server FiveM
                  </span>
                </>
              ) : (
                `Halo ${userDisplayName}, klik tombol START DUTY setelah masuk kota untuk memulai pencatatan dinas.`
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
                <Clock
                  className={`h-4 w-4 sm:h-6 sm:w-6 shrink-0 ${
                    isOnDuty ? "text-[#FF1E2D] animate-pulse" : "text-neutral-600"
                  }`}
                />
                <span
                  className={`whitespace-nowrap tabular-nums font-mono ${
                    isOnDuty ? "text-white text-glow" : "text-neutral-400"
                  }`}
                >
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Stop Alert Banner when FiveM ended the user's previous session */}
        {autoStopNotice && !isOnDuty && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-200 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <div className="font-bold text-amber-300">
                  Absensi Dihentikan Otomatis oleh Server FiveM
                </div>
                <p className="text-amber-100/80 leading-relaxed">
                  {autoStopNotice.reason}
                  {autoStopNotice.durationSeconds > 0 && (
                    <span className="font-mono text-amber-300">
                      {" "}• Durasi tercatat: {formatDurationShort(autoStopNotice.durationSeconds)}
                    </span>
                  )}
                  . Silakan klik <strong>START DUTY</strong> lagi setelah kembali masuk ke kota.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                dismissedNoticeIdRef.current = autoStopNotice.sessionId;
                setAutoStopNotice(null);
              }}
              className="p-1 rounded-lg text-amber-300/70 hover:text-white hover:bg-amber-900/40 transition shrink-0 cursor-pointer"
              aria-label="Tutup pemberitahuan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Helpful Info when FiveM server is live & user isn't in city */}
        {blockedByOfflineCity && !error && (
          <div className="mt-4 p-3 rounded-xl bg-[#161212] border border-[#3a2222] text-neutral-300 text-xs flex items-center gap-2.5">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Server FiveM terhubung, namun akun Discord Anda belum terdeteksi di dalam kota. Masuk ke server FiveM terlebih dahulu untuk memulai absensi.
            </span>
          </div>
        )}

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

      {/* In-App Confirmation Modal */}
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
                <span className="font-mono font-bold text-[#FF1E2D] whitespace-nowrap">
                  {formatTimer(elapsedSeconds)}
                </span>
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
