"use client";

import { useEffect, useState, useCallback } from "react";
import { CityStatusEntry } from "@/types";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import {
  MapPin,
  Search,
  Shield,
  ShieldOff,
  RefreshCw,
  Gamepad2,
  Building2,
  Wifi,
  WifiOff,
} from "lucide-react";

interface CityStatusPanelProps {
  institutionSlug: string;
}

type FilterMode = "all" | "online" | "onduty" | "offduty";

interface ServerConnectionMeta {
  connected: boolean;
  lastHeartbeatAt: string | null;
  onlineCount: number;
}

const INSTITUTION_COLORS: Record<string, string> = {
  police: "#0066FF",
  medical: "#00B4D8",
  mechanic: "#FF9900",
  restaurant: "#D4AF37",
  pemerintah: "#059669",
};

const INSTITUTION_NAMES: Record<string, string> = {
  police: "Police Dept",
  medical: "Medical Center",
  mechanic: "Custom Garage",
  restaurant: "Restaurant",
  pemerintah: "Pemerintah Kota",
};

export function CityStatusPanel({ institutionSlug }: CityStatusPanelProps) {
  const [players, setPlayers] = useState<CityStatusEntry[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerConnectionMeta | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const fetchCityStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/integrations/status?view=incity&institution=${encodeURIComponent(institutionSlug)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.data)) {
        setPlayers(data.data);
      }
      if (data.serverStatus) {
        setServerStatus(data.serverStatus);
      }
    } catch (err) {
      console.error("Failed to fetch city status:", err);
    } finally {
      setLoading(false);
    }
  }, [institutionSlug]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      fetchCityStatus();
    }, 0);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchCityStatus();
    }, 6000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchCityStatus]);

  // Refetch on duty change or tab focus
  useEffect(() => {
    const handleRefresh = () => {
      fetchCityStatus();
    };
    window.addEventListener("ophelia_duty_changed", handleRefresh);
    window.addEventListener("focus", handleRefresh);
    return () => {
      window.removeEventListener("ophelia_duty_changed", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [fetchCityStatus]);

  useEffect(() => {
    const initClock = setTimeout(() => setCurrentTime(Date.now()), 0);
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => {
      clearTimeout(initClock);
      clearInterval(timer);
    };
  }, []);

  const formatElapsed = (iso: string) => {
    if (currentTime <= 0) return "00h\u00A000m\u00A000s";
    const elapsed = Math.max(0, Math.floor((currentTime - new Date(iso).getTime()) / 1000));
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    return `${hh}h\u00A0${mm}m\u00A0${ss}s`;
  };

  const filtered = players.filter((p) => {
    const matchesSearch =
      p.playerName.toLowerCase().includes(search.toLowerCase()) ||
      p.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      p.positionName?.toLowerCase().includes(search.toLowerCase());

    if (filter === "online") return matchesSearch && p.isOnline;
    if (filter === "onduty") return matchesSearch && p.isOnDuty;
    if (filter === "offduty") return matchesSearch && !p.isOnDuty;
    return matchesSearch;
  });

  const onlineInCityCount = players.filter((p) => p.isOnline).length;
  const onDutyCount = players.filter((p) => p.isOnDuty).length;
  const offDutyCount = players.filter((p) => !p.isOnDuty).length;

  const accentColor = INSTITUTION_COLORS[institutionSlug] || "#E50914";

  return (
    <div className="space-y-4">
      {/* FiveM Server Bridge Status Banner */}
      {serverStatus && (
        <div
          className={`rounded-2xl border p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
            serverStatus.connected
              ? "bg-emerald-950/25 border-emerald-800/40 text-emerald-300"
              : "bg-[#141414] border-[#252525] text-neutral-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {serverStatus.connected ? (
              <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="h-4 w-4 text-neutral-500 shrink-0" />
            )}
            <span className="font-semibold">
              {serverStatus.connected
                ? "FiveM Bridge Terhubung — Auto-Stop Absensi Aktif"
                : "FiveM Bridge Belum Terhubung — Pasang resource ophelia-bridge di server FiveM"}
            </span>
          </div>
          {serverStatus.lastHeartbeatAt && (
            <span className="font-mono text-[11px] opacity-80">
              Sync terakhir:{" "}
              {new Date(serverStatus.lastHeartbeatAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] uppercase tracking-wider mb-1">
            <Gamepad2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Online Di Kota</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {onlineInCityCount}
            <span className="text-xs font-normal text-neutral-500 ml-1.5">
              / {players.length} terdaftar
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase tracking-wider mb-1">
            <Shield className="h-3.5 w-3.5" />
            <span>On Duty</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {onDutyCount}
          </div>
        </div>
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-4">
          <div className="flex items-center gap-2 text-red-400 text-[10px] uppercase tracking-wider mb-1">
            <ShieldOff className="h-3.5 w-3.5" />
            <span>Off Duty</span>
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {offDutyCount}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari player, nama, jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080808] border border-[#252525] focus:border-[color:var(--accent)] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none transition-colors"
            style={{ "--accent": accentColor } as React.CSSProperties}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "online", "onduty", "offduty"] as FilterMode[]).map((mode) => {
            const isActive = filter === mode;
            const label =
              mode === "all"
                ? "Semua"
                : mode === "online"
                ? "Di Kota"
                : mode === "onduty"
                ? "On Duty"
                : "Off Duty";
            return (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? "text-white shadow-lg"
                    : "bg-[#1a1a1a] text-neutral-500 hover:text-white hover:bg-[#222]"
                }`}
                style={isActive ? { backgroundColor: accentColor } : undefined}
              >
                {label}
              </button>
            );
          })}

          <button
            onClick={fetchCityStatus}
            className="p-2 rounded-lg bg-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Player Grid */}
      {loading ? (
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-12 text-center">
          <RefreshCw className="h-8 w-8 mx-auto text-neutral-600 mb-3 animate-spin" />
          <div className="text-sm font-semibold text-neutral-300">
            Memuat data kota...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-12 text-center">
          <MapPin className="h-10 w-10 mx-auto text-neutral-600 mb-2" />
          <div className="text-sm font-semibold text-neutral-300">
            Tidak Ada Player
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {filter !== "all"
              ? "Tidak ada player yang cocok dengan filter ini."
              : "Belum ada player yang online di FiveM server."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <div
              key={entry.discordId}
              className="rounded-2xl bg-[#141414] border border-[#252525] hover:border-opacity-60 p-5 shadow-xl relative overflow-hidden transition-all group"
              style={{
                borderColor: entry.isOnDuty ? `${accentColor}33` : "#252525",
              }}
            >
              {entry.isOnDuty && (
                <div
                  className="absolute top-0 right-0 w-24 h-24 opacity-[0.06] rounded-full blur-2xl"
                  style={{ backgroundColor: accentColor }}
                />
              )}

              <div className="flex items-start justify-between gap-3 relative">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <img
                      src={getDiscordAvatarUrl(entry.discordId, entry.avatar)}
                      alt={entry.displayName || entry.playerName}
                      className="h-12 w-12 rounded-xl object-cover border border-[#333]"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getDiscordAvatarUrl(entry.discordId, null);
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#141414] ${
                        entry.isOnDuty
                          ? "bg-emerald-400"
                          : entry.isOnline
                          ? "bg-amber-400"
                          : "bg-neutral-600"
                      }`}
                      title={
                        entry.isOnDuty
                          ? "On Duty di Kota"
                          : entry.isOnline
                          ? "Online di Kota (Off Duty)"
                          : "Offline (Di Luar Kota)"
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-opacity-90 transition-colors truncate">
                      {entry.displayName || entry.playerName}
                    </h4>
                    <span className="text-[11px] text-neutral-400 block font-medium truncate">
                      {entry.positionName || entry.playerName}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border shrink-0 ${
                    entry.isOnDuty
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : entry.isOnline
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-neutral-800/80 text-neutral-400 border-neutral-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      entry.isOnDuty
                        ? "bg-emerald-400 animate-pulse"
                        : entry.isOnline
                        ? "bg-amber-400"
                        : "bg-neutral-500"
                    }`}
                  />
                  {entry.isOnDuty ? "ON DUTY" : entry.isOnline ? "DI KOTA" : "OFFLINE"}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-[#202020] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    SERVER ID
                  </div>
                  <div className="font-mono text-neutral-300 mt-0.5">
                    {entry.isOnline && entry.serverId > 0 ? `#${entry.serverId}` : "—"}
                  </div>
                </div>

                {entry.citizenid && (
                  <div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider text-center">
                      CITIZEN ID
                    </div>
                    <div className="font-mono text-neutral-300 mt-0.5 text-xs text-center font-medium bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2a2a2a]">
                      {entry.citizenid}
                    </div>
                  </div>
                )}

                {entry.isOnDuty && entry.dutyStartedAt && (
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                      DURASI DUTY
                    </div>
                    <div
                      className="font-mono font-bold mt-0.5 text-sm truncate whitespace-nowrap"
                      style={{ color: accentColor }}
                    >
                      {formatElapsed(entry.dutyStartedAt)}
                    </div>
                  </div>
                )}
              </div>

              {entry.isOnDuty && entry.dutyInstitutionName && (
                <div className="mt-2 text-[11px] text-neutral-400 bg-[#0d0d0d] p-2 rounded-lg border border-[#1f1f1f] flex items-center gap-1.5 min-w-0">
                  <Building2 className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{entry.dutyInstitutionName}</span>
                </div>
              )}

              {!entry.isOnDuty && entry.memberInstitutions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.memberInstitutions.map((slug) => (
                    <span
                      key={slug}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-400"
                    >
                      {INSTITUTION_NAMES[slug] || slug}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
