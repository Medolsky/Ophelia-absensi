"use client";

import { useState } from "react";
import { correctAttendanceAction } from "@/app/actions/duty-actions";
import { DutySessionData } from "@/types";
import { Edit3, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface AttendanceEditModalProps {
  session: DutySessionData;
  institutionSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AttendanceEditModal({
  session,
  institutionSlug,
  isOpen,
  onClose,
}: AttendanceEditModalProps) {
  // Format dates for input datetime-local
  const formatForInput = (isoString?: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [startTime, setStartTime] = useState(formatForInput(session.startedAt));
  const [endTime, setEndTime] = useState(formatForInput(session.endedAt || session.startedAt));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      setError("Waktu selesai (End) harus lebih besar dari waktu mulai (Start).");
      setLoading(false);
      return;
    }

    try {
      const res = await correctAttendanceAction({
        institutionSlug,
        dutySessionId: session.id,
        newStart: startDate.toISOString(),
        newEnd: endDate.toISOString(),
        reason,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      } else {
        setError(res.error || "Gagal menyimpan perubahan.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 text-[#FF1E2D]">
            <Edit3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Koreksi Absensi Anggota</h3>
            <p className="text-xs text-neutral-400">
              Anggota: <span className="text-white font-medium">{session.userName || "Petugas"}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Koreksi absensi berhasil disimpan ke Audit Log.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Waktu Mulai (Start)
            </label>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Waktu Selesai (End)
            </label>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Alasan Koreksi (Wajib untuk Audit Log)
            </label>
            <textarea
              required
              rows={3}
              placeholder="Contoh: Petugas lupa OFF DUTY saat DC, koreksi jam selesai sesuai log radio discord."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-lg glow-red-sm disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Koreksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
