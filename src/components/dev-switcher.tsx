"use client";

import { useState } from "react";
import { DEMO_PERSONAS } from "@/lib/constants";
import { switchUserPersonaAction } from "@/app/actions/auth-actions";
import { UserCheck, ShieldAlert, ChevronDown, Check, Users } from "lucide-react";
import { SessionUser } from "@/types";

interface DevSwitcherProps {
  currentUser: SessionUser;
}

export function DevSwitcher({ currentUser }: DevSwitcherProps) {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "false") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelectPersona = async (personaId: string) => {
    setLoading(true);
    await switchUserPersonaAction(personaId);
    setLoading(false);
    setIsOpen(false);
    // Reload page to re-run server components and role checks
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] border border-[#252525] text-xs text-neutral-300 hover:text-white transition"
        title="Beralih Role Akun untuk Simulasi (Dev Mode)"
      >
        <Users className="h-3.5 w-3.5 text-[#E50914]" />
        <span className="font-medium hidden sm:inline">Role Switcher:</span>
        <span className="text-white font-semibold truncate max-w-[130px]">
          {currentUser.displayName || currentUser.discordUsername}
        </span>
        <ChevronDown className="h-3 w-3 text-neutral-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#141414] border border-[#2a2a2a] shadow-2xl p-2 z-50">
            <div className="px-3 py-2 border-b border-[#252525] mb-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Simulasi Akun Discord
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E50914]/20 text-[#FF1E2D] font-mono">
                  DEV MODE
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Uji validasi role Discord & hak akses Leader/Member secara instan
              </p>
            </div>

            <div className="space-y-1">
              {DEMO_PERSONAS.map((persona) => {
                const isSelected = persona.id === currentUser.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => handleSelectPersona(persona.id)}
                    disabled={loading}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition ${
                      isSelected
                        ? "bg-[#E50914]/15 border border-[#E50914]/40 text-white"
                        : "hover:bg-[#1f1f1f] text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={persona.discordAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                        alt={persona.displayName}
                        className="h-7 w-7 rounded-full object-cover border border-[#333]"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          {persona.displayName}
                          {persona.isSuperAdmin && (
                            <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400">{persona.roleTitle}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#FF1E2D]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
