"use client";

import { useEffect, useState } from "react";
import { FiveMSocietyAccount } from "@/types";
import { Wallet, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";

interface FiveMSocietyCardProps {
  institutionSlug: string;
  initialAccount?: FiveMSocietyAccount | null;
  accentColor?: string;
}

export function FiveMSocietyCard({
  institutionSlug,
  initialAccount = null,
  accentColor = "#E50914",
}: FiveMSocietyCardProps) {
  const [account, setAccount] = useState<FiveMSocietyAccount | null>(initialAccount);
  const [loading, setLoading] = useState(!initialAccount);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBalance = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/fivem/game-data?type=society-accounts&slug=${institutionSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.account) {
          setAccount(data.account);
        }
      }
    } catch (err) {
      console.error("Failed to fetch society balance:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialAccount) {
      fetchBalance();
    }
  }, [institutionSlug, initialAccount]);

  if (!account && !loading) {
    return null; // Don't render for institutions without society accounts (like pemerintah)
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 lg:p-5 shadow-lg relative overflow-hidden group hover:border-[#333] transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            KAS INSTANSI IN-GAME
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            FIVEM
          </span>
        </div>

        <button
          onClick={fetchBalance}
          disabled={isRefreshing}
          title="Segarkan Saldo Kas"
          className="text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-[#202020] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-baseline justify-between mt-2">
        <div className="text-2xl sm:text-3xl font-mono font-black text-white whitespace-nowrap">
          {loading ? (
            <span className="text-neutral-600 animate-pulse">Memuat...</span>
          ) : (
            formatRupiah(account?.balance || 0)
          )}
        </div>
      </div>

      <div className="text-[11px] text-neutral-500 mt-1.5 flex items-center justify-between">
        <span className="font-mono text-neutral-400">
          {account?.accountNumber || `society_${institutionSlug}`}
        </span>
        <span className="text-[10px] text-neutral-500">
          {account?.updatedAt
            ? `Sync: ${new Date(account.updatedAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Live"}
        </span>
      </div>
    </div>
  );
}
