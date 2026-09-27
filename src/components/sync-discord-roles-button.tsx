"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check, Sparkles } from "lucide-react";
import { syncDiscordRolesAction } from "@/app/actions/auth-actions";

interface SyncDiscordRolesButtonProps {
  discordId?: string;
  variant?: "navbar" | "full" | "compact";
  className?: string;
}

export function SyncDiscordRolesButton({
  discordId,
  variant = "navbar",
  className = "",
}: SyncDiscordRolesButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Background auto-sync when window regains focus (e.g., user returns from Discord)
  useEffect(() => {
    if (!discordId || discordId.startsWith("demo-")) return;

    let debounceTimer: NodeJS.Timeout;
    const handleFocus = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetch("/api/auth/discord/sync", { method: "POST" })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              router.refresh();
            }
          })
          .catch(() => {});
      }, 500);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearTimeout(debounceTimer);
    };
  }, [discordId, router]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSuccessNotice(null);

    try {
      const res = await syncDiscordRolesAction();
      if (res.success && res.roles) {
        const roleSummary = res.roles.length > 0 ? res.roles.join(", ") : "Tidak ada role";
        setSuccessNotice(`Role diperbarui: ${roleSummary}`);
        setTimeout(() => setSuccessNotice(null), 4000);
        router.refresh();
      } else {
        setSuccessNotice(res.error || "Gagal memperbarui");
        setTimeout(() => setSuccessNotice(null), 3500);
      }
    } catch {
      setSuccessNotice("Gagal menghubungi server");
      setTimeout(() => setSuccessNotice(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  if (variant === "full") {
    return (
      <div className="relative inline-flex flex-col items-center">
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] hover:border-red-500/50 transition-all shadow-lg cursor-pointer disabled:opacity-60 ${className}`}
        >
          <RefreshCw className={`h-4 w-4 text-red-500 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Memeriksa Discord..." : "Perbarui Role Discord"}</span>
        </button>

        {successNotice && (
          <div className="absolute top-full mt-2 z-50 whitespace-nowrap px-3 py-1.5 rounded-lg bg-black/90 border border-neutral-700 text-[11px] font-medium text-emerald-400 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1">
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400" />
              {successNotice}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#161616] hover:bg-[#202020] text-neutral-300 border border-[#2e2e2e] hover:border-neutral-500 transition-all cursor-pointer disabled:opacity-50 ${className}`}
          title="Klik untuk sinkronisasi role Discord terbaru"
        >
          <RefreshCw className={`h-3 w-3 text-[#FF1E2D] ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : "Sync Role"}</span>
        </button>

        {successNotice && (
          <div className="absolute right-0 top-full mt-2 z-50 whitespace-nowrap px-3 py-1 rounded-md bg-neutral-950 border border-neutral-700 text-[10px] text-emerald-400 shadow-xl backdrop-blur-sm animate-in fade-in">
            {successNotice}
          </div>
        )}
      </div>
    );
  }

  // Default "navbar" variant
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleManualSync}
        disabled={isSyncing}
        className={`p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition cursor-pointer group disabled:opacity-50 ${className}`}
        title="Sinkronkan Role Discord Terbaru"
      >
        <RefreshCw
          className={`h-4 w-4 ${
            isSyncing
              ? "animate-spin text-emerald-400"
              : "group-hover:rotate-180 transition-transform duration-500"
          }`}
        />
      </button>

      {successNotice && (
        <div className="absolute right-0 top-full mt-2 z-50 whitespace-nowrap px-3 py-1.5 rounded-lg bg-neutral-950/95 border border-neutral-800 text-[11px] font-medium text-emerald-400 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        </div>
      )}
    </div>
  );
}
