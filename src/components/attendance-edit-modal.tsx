"use client";

import { useState, useMemo } from "react";
import { correctAttendanceAction } from "@/app/actions/duty-actions";
import { DutySessionData } from "@/types";
import { Edit3, X, AlertCircle, CheckCircle2, Clock, Zap, AlertTriangle } from "lucide-react";

interface AttendanceEditModalProps {
  session: DutySessionData;
  institutionSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated?: (updatedSession: DutySessionData) => void;
}

export function AttendanceEditModal({
  session,
  institutionSlug,
  isOpen,
  onClose,
  onSessionUpdated,
}: AttendanceEditModalProps) {
  // Format ISO to datetime-local input string (YYYY-MM-DDTHH:mm)
  const formatForInput = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const isCurrentlyOnDuty = !session.endedAt && session.status === "ON_DUTY";

  const defaultEnd = session.endedAt || new Date().toISOString();

  const [startTime, setStartTime] = useState(() => formatForInput(session.startedAt));
  const [endTime, setEndTime] = useState(() => formatForInput(defaultEnd));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Compute live duration
  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;

    const totalSeconds = Math.round((end - start) / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) return `${h} jam ${m} menit`;
    if (m > 0) return `${m} menit ${s} detik`;
    return `${s} detik`;
  }, [startTime, endTime]);

  if (!isOpen) return null;

  // Preset helpers
  const setEndTimeToNow = () => {
    setEndTime(formatForInput(new Date().toISOString()));
  };

  const addHoursToEnd = (hours: number) => {
    if (!startTime) return;
    const s = new Date(startTime);
    s.setHours(s.getHours() + hours);
    setEndTime(formatForInput(s.toISOString()));
  };

  const reasonPresets = [
    "Lupa OFF DUTY saat disconnect / DC",
    "Koreksi jam dinas sesuai log radio Discord",
    "Sesi dinas gantung / mati lampu",
    "Koreksi penyesuaian jam oleh Admin",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Format tanggal dan waktu tidak valid.");
      setLoading(false);
      return;
    }

    if (endDate <= startDate) {
      setError("Waktu selesai (End) harus lebih besar dari waktu mulai (Start).");
      setLoading(false);
      return;
    }

    if (!reason.trim()) {
      setError("Alasan koreksi absensi wajib diisi untuk pencatatan Audit Log.");
      setLoading(false);
      return;
    }

    try {
      const res = await correctAttendanceAction({
        institutionSlug,
        dutySessionId: session.id,
        newStart: startDate.toISOString(),
        newEnd: endDate.toISOString(),
        reason: reason.trim(),
      });

      if (res.success) {
        setSuccess(true);
        if (res.session && onSessionUpdated) {
          onSessionUpdated(res.session as DutySessionData);
        }
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setError(res.error || "Gagal menyimpan perubahan.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#292929] shadow-2xl p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="p-2.5 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 text-[#FF1E2D] shrink-0">
            <Edit3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white truncate">Koreksi & Edit Jam Dinas</h3>
            <p className="text-xs text-neutral-400 truncate">
              Petugas: <span className="text-white font-semibold">{session.userName || "Petugas"}</span>
              {session.positionName && (
                <span className="text-neutral-500 font-mono"> ({session.positionName})</span>
              )}
            </p>
          </div>
        </div>

        {/* Warning if still on duty */}
        {isCurrentlyOnDuty && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">Petugas Masih Tercatat ON DUTY (Lupa OFF DUTY)</div>
              <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                Tentukan jam selesai di bawah untuk mengakhiri sesi tugas ini secara manual. Sesi akan otomatis ditutup dan berstatus CORRECTED.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Koreksi absensi berhasil disimpan ke database & audit log.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Waktu Mulai Dinas (Start)
            </label>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none font-mono"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Waktu Selesai Dinas (End)
              </label>
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={setEndTimeToNow}
                  className="px-2 py-0.5 rounded bg-[#1f1f1f] hover:bg-[#E50914] text-[10px] text-neutral-300 hover:text-white transition font-mono"
                  title="Atur ke waktu saat ini"
                >
                  Selesai Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => addHoursToEnd(1)}
                  className="px-1.5 py-0.5 rounded bg-[#1f1f1f] hover:bg-[#282828] text-[10px] text-neutral-300 transition font-mono"
                >
                  +1j
                </button>
                <button
                  type="button"
                  onClick={() => addHoursToEnd(2)}
                  className="px-1.5 py-0.5 rounded bg-[#1f1f1f] hover:bg-[#282828] text-[10px] text-neutral-300 transition font-mono"
                >
                  +2j
                </button>
                <button
                  type="button"
                  onClick={() => addHoursToEnd(4)}
                  className="px-1.5 py-0.5 rounded bg-[#1f1f1f] hover:bg-[#282828] text-[10px] text-neutral-300 transition font-mono"
                >
                  +4j
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none font-mono"
            />
          </div>

          {/* Calculated Duration Indicator */}
          {calculatedDuration && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0e0e0e] border border-[#222] text-xs">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#FF1E2D]" />
                <span>Durasi Hasil Koreksi:</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">{calculatedDuration}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Alasan Koreksi (Wajib untuk Audit Log)
            </label>
            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {reasonPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="px-2 py-1 rounded-lg bg-[#181818] hover:bg-[#242424] border border-[#2b2b2b] text-[10px] text-neutral-300 transition text-left cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={2}
              placeholder="Tulis alasan koreksi..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-[#202020] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-lg glow-red-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Simpan Koreksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
