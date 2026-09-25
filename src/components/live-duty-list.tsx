"use client";

import { useEffect, useState } from "react";
import { DutySessionData } from "@/types";
import { Radio, Clock, Shield, Search } from "lucide-react";

interface LiveDutyListProps {
  initialSessions: DutySessionData[];
}

export function LiveDutyList({ initialSessions }: LiveDutyListProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

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
    return `${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
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
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari nama petugas, pangkat, atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
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
                <div className="flex items-center gap-3">
                  <img
                    src={
                      session.userAvatar ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
                    }
                    alt={session.userName || "Officer"}
                    className="h-12 w-12 rounded-xl object-cover border border-[#333]"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-[#FF1E2D] transition-colors">
                      {session.userName}
                    </h4>
                    <span className="text-[11px] text-neutral-400 block font-medium">
                      {session.positionName || "Petugas"}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF1E2D] text-[10px] font-mono border border-[#E50914]/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF1E2D] animate-ping" />
                  ONLINE
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-[#202020] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    MULAI TUGAS
                  </div>
                  <div className="font-mono text-neutral-300 mt-0.5">
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
                  <div className="font-mono font-bold text-[#FF1E2D] mt-0.5 text-sm">
                    {formatElapsed(session.startedAt)}
                  </div>
                </div>
              </div>

              {session.notes && (
                <div className="mt-2 text-[11px] text-neutral-400 bg-[#0d0d0d] p-2 rounded-lg border border-[#1f1f1f] truncate">
                  📌 {session.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
