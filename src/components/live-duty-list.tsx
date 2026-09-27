"use client";

import { useEffect, useState } from "react";
import { DutySessionData } from "@/types";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import { Radio, Clock, Shield, Search } from "lucide-react";

interface LiveDutyListProps {
  initialSessions: DutySessionData[];
  institutionSlug?: string;
}

export function LiveDutyList({ initialSessions, institutionSlug }: LiveDutyListProps) {
  const getMergedWithLocal = (incoming: DutySessionData[]): DutySessionData[] => {
    if (typeof window === "undefined") return incoming;
    try {
      const lastOffDutyStr = localStorage.getItem("ophelia_last_off_duty_timestamp");
      const lastOffDuty = lastOffDutyStr ? parseInt(lastOffDutyStr, 10) : 0;

      const stored =
        localStorage.getItem(`ophelia_active_duty_${institutionSlug}`) ||
        localStorage.getItem("ophelia_current_active_duty");
      if (stored) {
        const parsed = JSON.parse(stored) as DutySessionData;
        const startedAtTime = parsed?.startedAt ? new Date(parsed.startedAt).getTime() : 0;

        // If session started before last off duty, discard it!
        if (lastOffDuty && startedAtTime <= lastOffDuty) {
          localStorage.removeItem(`ophelia_active_duty_${institutionSlug}`);
          localStorage.removeItem("ophelia_current_active_duty");
          return incoming.filter(
            (s) => !lastOffDuty || !s.startedAt || new Date(s.startedAt).getTime() > lastOffDuty
          );
        }

        if (parsed && !parsed.endedAt && parsed.status === "ON_DUTY") {
          const cleanSlug = parsed.institutionSlug?.replace("inst-", "").toLowerCase();
          const targetSlug = institutionSlug?.replace("inst-", "").toLowerCase();
          if (!targetSlug || cleanSlug === targetSlug) {
            const exists = incoming.some(
              (s) => s.id === parsed.id || s.userId === parsed.userId
            );
            if (!exists) {
              return [parsed, ...incoming];
            }
          }
        }
      } else if (lastOffDuty) {
        return incoming.filter(
          (s) => !s.startedAt || new Date(s.startedAt).getTime() > lastOffDuty
        );
      }
    } catch {}
    return incoming;
  };

  const [sessions, setSessions] = useState<DutySessionData[]>(() =>
    getMergedWithLocal(initialSessions)
  );
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Sync with prop updates
  useEffect(() => {
    setSessions(getMergedWithLocal(initialSessions));
  }, [initialSessions]);

  // Periodic polling so changes appear live
  useEffect(() => {
    if (!institutionSlug) return;
    const fetchLive = async () => {
      try {
        const res = await fetch(`/api/integrations/status?view=onduty&institution=${institutionSlug}`);
        const data = await res.json();
        if (Array.isArray(data.data)) {
          setSessions(getMergedWithLocal(data.data));
        }
      } catch {}
    };

    const pollInterval = setInterval(fetchLive, 4000);
    return () => clearInterval(pollInterval);
  }, [institutionSlug]);

  // Listen to ophelia_duty_changed & storage
  useEffect(() => {
    const handleDutyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        status: string;
        session?: DutySessionData;
        institutionSlug?: string;
      }>;
      if (customEvent.detail?.status === "ON_DUTY" && customEvent.detail?.session) {
        const s = customEvent.detail.session;
        const cleanSlug = s.institutionSlug?.replace("inst-", "").toLowerCase();
        const targetSlug = institutionSlug?.replace("inst-", "").toLowerCase();
        if (!targetSlug || cleanSlug === targetSlug) {
          setSessions((prev) => [s, ...prev.filter((x) => x.id !== s.id && x.userId !== s.userId)]);
        }
      } else if (customEvent.detail?.status === "OFF_DUTY") {
        setSessions((prev) => prev.filter((x) => x.institutionSlug !== customEvent.detail?.institutionSlug));
      }
    };

    const handleStorageChange = () => {
      setSessions((prev) => getMergedWithLocal(prev));
    };

    window.addEventListener("ophelia_duty_changed", handleDutyChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("ophelia_duty_changed", handleDutyChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [institutionSlug]);

  // Realtime tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (startedAt: string) => {
    const startMs = new Date(startedAt).getTime();
    const elapsedSecs = Math.max(0, Math.floor((currentTime - startMs) / 1000));
    const hours = Math.floor(elapsedSecs / 3600);
    const minutes = Math.floor((elapsedSecs % 3600) / 60);
    const seconds = elapsedSecs % 60;
    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    const ss = seconds.toString().padStart(2, "0");
    return `${hh}h\u00A0${mm}m\u00A0${ss}s`;
  };

  const filtered = sessions.filter(
    (s) =>
      s.userName?.toLowerCase().includes(search.toLowerCase()) ||
      s.positionName?.toLowerCase().includes(search.toLowerCase()) ||
      s.notes?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari nama petugas, pangkat, atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 shrink-0">
          <span className="h-2 w-2 rounded-full bg-[#FF1E2D] animate-ping" />
          <span>{filtered.length} Petugas Sedang Bertugas</span>
        </div>
      </div>

      {/* Grid of Active Officers */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-12 text-center text-neutral-500">
          <Radio className="h-10 w-10 mx-auto text-neutral-600 mb-2" />
          <div className="text-sm font-semibold text-neutral-300">Tidak Ada Petugas Aktif</div>
          <p className="text-xs text-neutral-500 mt-1">Saat ini belum ada anggota yang sedang bertugas.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl bg-[#141414] border border-[#252525] hover:border-[#E50914]/60 p-5 shadow-xl relative overflow-hidden transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={getDiscordAvatarUrl(
                      session.userId?.replace("discord-", ""),
                      session.userAvatar
                    )}
                    alt={session.userName || "Officer"}
                    className="h-12 w-12 rounded-xl object-cover border border-[#333] shrink-0"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getDiscordAvatarUrl(session.userId?.replace("discord-", ""), null);
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#FF1E2D] transition-colors truncate">
                      {session.userName}
                    </h4>
                    <span className="text-[11px] text-neutral-400 block font-medium truncate">
                      {session.positionName || "Petugas"}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] text-[10px] font-mono border border-[#E50914]/40 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF1E2D] animate-ping" />
                  ONLINE
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-[#202020] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    MULAI TUGAS
                  </div>
                  <div className="font-mono text-neutral-300 mt-0.5 whitespace-nowrap">
                    {new Date(session.startedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    DURASI AKTIF
                  </div>
                  <div className="font-mono font-bold text-[#FF1E2D] mt-0.5 text-sm whitespace-nowrap">
                    {formatElapsed(session.startedAt)}
                  </div>
                </div>
              </div>

              {session.notes && (
                <div className="mt-2 text-[11px] text-neutral-400 bg-[#0d0d0d] p-2 rounded-lg border border-[#1f1f1f] flex items-center gap-1.5 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{session.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
