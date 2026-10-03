"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionUser, InstitutionData, DutySessionData } from "@/types";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import { logoutAction } from "@/app/actions/auth-actions";
import { endDutyAction } from "@/app/actions/duty-actions";
import { clearClientDutyState } from "@/lib/duty-client";
import { InstitutionLogo } from "./institution-logo";
import { SyncDiscordRolesButton } from "./sync-discord-roles-button";
import { Shield, Radio, LogOut, ChevronDown, Building2, Square, Check, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface NavbarProps {
  currentUser: SessionUser;
  currentInstitution?: InstitutionData | null;
  activeSession?: DutySessionData | null;
  allowedInstitutions: InstitutionData[];
}

export function Navbar({
  currentUser,
  currentInstitution,
  activeSession: initialActiveSession,
  allowedInstitutions,
}: NavbarProps) {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<DutySessionData | null>(initialActiveSession || null);
  const endedSessionIdRef = useRef<string | null>(null);
  const [instMenuOpen, setInstMenuOpen] = useState(false);
  const [quickEndLoading, setQuickEndLoading] = useState(false);
  const [showNavbarEndModal, setShowNavbarEndModal] = useState(false);

  // Sync with prop when server updates, guarding against reviving ended sessions
  useEffect(() => {
    if (initialActiveSession) {
      if (endedSessionIdRef.current && initialActiveSession.id === endedSessionIdRef.current) {
        return;
      }
      setActiveSession(initialActiveSession);
    } else {
      endedSessionIdRef.current = null;
      setActiveSession(null);
    }
  }, [initialActiveSession]);

  // Synchronize state across other components (e.g. DutyTimer)
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
      } else if (customEvent.detail?.status === "ON_DUTY" && customEvent.detail?.session) {
        endedSessionIdRef.current = null;
        setActiveSession(customEvent.detail.session);
      }
    };

    window.addEventListener("ophelia_duty_changed", handleDutyChange);
    return () => window.removeEventListener("ophelia_duty_changed", handleDutyChange);
  }, [activeSession]);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/");
  };

  const handleQuickEndDuty = async () => {
    const targetSlug = activeSession?.institutionSlug || currentInstitution?.slug || "";
    if (activeSession?.id) {
      endedSessionIdRef.current = activeSession.id;
    }

    // Immediate optimistic update and storage cleanup
    clearClientDutyState(targetSlug);
    setActiveSession(null);
    setShowNavbarEndModal(false);
    setQuickEndLoading(true);

    try {
      await endDutyAction(targetSlug);
      router.refresh();
    } catch (err) {
      console.error(err);
      router.refresh();
    } finally {
      setQuickEndLoading(false);
    }
  };

  const isOnDuty = !!activeSession;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#252525] bg-[#0c0c0c]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Brand Logo & Current Institution */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 sm:flex-none">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <img
                src="/logos/ophelia-logo.png"
                alt="Ophelia Roleplay"
                className="h-6 sm:h-8 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(229,9,20,0.35)]"
              />
              <span className="hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E50914]/15 text-[#FF1E2D] border border-[#E50914]/30">
                DUTY
              </span>
            </Link>

            {/* Institution Switcher Dropdown */}
            <div className="relative min-w-0">
              <button
                onClick={() => setInstMenuOpen(!instMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#1f1f1f] border border-[#252525] text-xs font-semibold text-white transition max-w-[130px] xs:max-w-[160px] sm:max-w-none"
              >
                <InstitutionLogo logo={currentInstitution?.logo} name={currentInstitution?.name} size="sm" />
                <span className="truncate max-w-[70px] xs:max-w-[110px] sm:max-w-[180px]">
                  {currentInstitution?.name || "Pilih Instansi"}
                </span>
                <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neutral-400 shrink-0" />
              </button>

              {instMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setInstMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 max-w-[90vw] rounded-xl bg-[#141414] border border-[#2a2a2a] shadow-2xl p-2 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Instansi Tersedia Untuk Anda
                    </div>
                    <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                      {allowedInstitutions.map((inst) => (
                        <Link
                          key={inst.id}
                          href={`/institution/${inst.slug}/duty`}
                          prefetch={false}
                          onClick={() => setInstMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                            inst.slug === currentInstitution?.slug
                              ? "bg-[#E50914]/15 text-white border border-[#E50914]/40"
                              : "text-neutral-300 hover:bg-[#202020] hover:text-white"
                          }`}
                        >
                          <InstitutionLogo logo={inst.logo} name={inst.name} size="sm" />
                          <span className="truncate">{inst.name}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#252525]">
                      <Link
                        href="/select-institution"
                        prefetch={false}
                        onClick={() => setInstMenuOpen(false)}
                        className="block text-center text-xs text-[#FF1E2D] hover:underline py-1"
                      >
                        Lihat Semua Instansi →
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Duty Status Badge & Quick End Duty Button */}
            {isOnDuty ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E50914]/15 text-[#FF1E2D] border border-[#E50914]/40 glow-red-sm">
                  <Radio className="h-3.5 w-3.5 text-[#FF1E2D] animate-pulse" />
                  <span className="truncate max-w-[120px]">ON DUTY: {activeSession.institutionName || "Aktif"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNavbarEndModal(true)}
                  className="px-2 sm:px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-red-700/80 border border-neutral-700 text-white text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  title="Selesaikan Dinas (OFF DUTY)"
                >
                  <Square className="h-3 w-3 fill-white" />
                  <span className="hidden xs:inline">OFF DUTY</span>
                  <span className="xs:hidden">OFF</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-900 text-neutral-400 border border-neutral-800">
                <Radio className="h-3.5 w-3.5 text-neutral-500" />
                <span>OFF DUTY</span>
              </div>
            )}

            {/* User Profile, Sync Roles & Logout */}
            <div className="flex items-center gap-1 sm:gap-1.5 pl-1.5 sm:pl-2 border-l border-[#252525]">
              <SyncDiscordRolesButton discordId={currentUser.discordId} variant="navbar" />
              <img
                src={getDiscordAvatarUrl(currentUser.discordId, currentUser.discordAvatar)}
                alt={currentUser.displayName}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover border border-[#333]"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = getDiscordAvatarUrl(currentUser.discordId, null);
                  if (target.src !== fallback) {
                    target.src = fallback;
                  }
                }}
              />
              <button
                onClick={handleLogout}
                className="p-1 sm:p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition cursor-pointer"
                title="Keluar / Logout"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navbar Quick End Duty Confirmation Modal */}
      {showNavbarEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2a2a2a] shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowNavbarEndModal(false)}
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
                <p className="text-xs text-neutral-400">Instansi: {activeSession?.institutionName}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-400 my-4">
              Apakah Anda yakin ingin menyelesaikan sesi dinas ini?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowNavbarEndModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleQuickEndDuty}
                disabled={quickEndLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-lg glow-red-sm disabled:opacity-50 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{quickEndLoading ? "Menyimpan Data..." : "Ya, Selesaikan Dinas"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
