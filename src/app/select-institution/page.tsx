import { getCurrentUser, verifyInstitutionAccess, getAllowedInstitutions } from "@/lib/auth";
import { DEFAULT_INSTITUTIONS } from "@/lib/constants";
import { PermissionLevel } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Lock, ArrowRight, CheckCircle, ShieldAlert } from "lucide-react";
import { InstitutionLogo } from "@/components/institution-logo";
import { SyncDiscordRolesButton } from "@/components/sync-discord-roles-button";

export default async function SelectInstitutionPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/");
  }

  // Fast check: get all allowed institutions in one batch
  const allowedInstitutions = await getAllowedInstitutions(currentUser);
  const allowedSlugs = new Set(allowedInstitutions.map((i) => i.slug));

  const institutionsWithAccess = await Promise.all(
    DEFAULT_INSTITUTIONS.map(async (inst) => {
      const isAllowed = allowedSlugs.has(inst.slug);
      let access: { allowed: boolean; permissionLevel: PermissionLevel; reason?: string } = {
        allowed: isAllowed,
        permissionLevel: "MEMBER",
      };
      if (isAllowed) {
        access = await verifyInstitutionAccess(currentUser, inst.slug);
      } else {
        access = {
          allowed: false,
          permissionLevel: "MEMBER",
          reason: `Discord ID Anda tidak memiliki role yang diizinkan untuk mengakses instansi ini.`,
        };
      }
      return {
        ...inst,
        access,
      };
    })
  );

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col justify-between selection:bg-[#E50914] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#202020] bg-[#0c0c0c]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <img
              src="/logos/ophelia-logo.png"
              alt="Ophelia Roleplay"
              className="h-7 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(229,9,20,0.35)]"
            />
            <span className="text-[11px] sm:text-xs text-[#FF1E2D] font-bold px-2 py-0.5 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 hidden sm:inline-block">
              PILIH INSTANSI
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <SyncDiscordRolesButton discordId={currentUser.discordId} variant="compact" />
            <a
              href="/api/auth/discord?prompt=consent"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] transition"
              title="Ganti ke akun Discord lain"
            >
              <span className="hidden xs:inline">Ganti Akun</span>
              <span className="xs:hidden">Ganti</span>
            </a>
            <a
              href="/api/auth/logout"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white bg-[#141414] hover:bg-[#202020] border border-[#282828] transition"
              title="Keluar dari akun ini"
            >
              Keluar
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center w-full">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181818] border border-[#262626] text-xs font-semibold text-neutral-300">
              <CheckCircle className="h-3.5 w-3.5 text-[#FF1E2D]" />
              <span className="truncate max-w-[150px] sm:max-w-none">{currentUser.displayName || currentUser.discordUsername}</span>
            </div>
            {currentUser.discordRoles && currentUser.discordRoles.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[160px] sm:max-w-none">{currentUser.discordRoles.slice(0, 3).join(", ")}{currentUser.discordRoles.length > 3 ? "..." : ""}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            PILIH INSTANSI DINAS
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2">
            Pilih instansi untuk memulai absensi dan memantau tugas kedinasan Anda.
          </p>
        </div>

        {/* Warning if no roles found */}
        {allowedInstitutions.length === 0 && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-800/50 shadow-xl text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm mb-1.5">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>Role Kedinasan Belum Terdeteksi</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-lg mx-auto">
              Akun Discord Anda (<strong>{currentUser.displayName}</strong>) saat ini belum memiliki role kedinasan untuk Polisi, Medis, Mekanik, ataupun Resto di server Discord Ophelia Roleplay.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <SyncDiscordRolesButton discordId={currentUser.discordId} variant="full" />
              <a
                href="/api/auth/discord?prompt=consent"
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-200 bg-[#202020] hover:bg-[#2b2b2b] border border-[#3a3a3a] transition"
              >
                Ganti ke Akun Discord Lain
              </a>
            </div>
          </div>
        )}

        {/* Institutions Grid */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {institutionsWithAccess.map((inst) => {
            const hasAccess = inst.access.allowed;
            const permissionLevel = inst.access.permissionLevel;

            return (
              <div
                key={inst.id}
                className={`relative rounded-2xl border p-4 sm:p-6 transition-all ${
                  hasAccess
                    ? "bg-[#111111] border-[#292929] hover:border-[#E50914] shadow-xl group hover:glow-red-sm"
                    : "bg-[#0d0d0d] border-[#1f1f1f] opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                    <InstitutionLogo
                      logo={inst.logo}
                      name={inst.name}
                      size="lg"
                      className="p-1 sm:p-1.5 rounded-xl bg-[#181818] border border-[#262626] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-white group-hover:text-[#FF1E2D] transition-colors truncate">
                        {inst.name}
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
                        {inst.description}
                      </p>
                    </div>
                  </div>

                  {hasAccess ? (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                      {permissionLevel === "SUPER_ADMIN" ? "SUPER ADMIN" : permissionLevel}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-950/40 text-red-400 font-semibold border border-red-900/40 flex items-center gap-1 shrink-0">
                      <Lock className="h-3 w-3" />
                      <span>TERKUNCI</span>
                    </span>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#202020] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-neutral-400">
                    Role yang dibutuhkan: <br />
                    <span className="text-neutral-300 font-mono">
                      {inst.discordRoleNames?.slice(0, 2).join(", ")}
                    </span>
                  </div>

                  {hasAccess ? (
                    <Link
                      href={`/institution/${inst.slug}/duty`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-md glow-red-sm group-hover:translate-x-0.5 self-start sm:self-auto"
                    >
                      <span>Masuk Instansi</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <div className="text-[11px] text-red-400/80 flex items-center gap-1 font-medium">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Role Discord Tidak Ada</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c1c1c] py-6 text-center text-xs text-neutral-400">
        <p>© 2026 OPHELIA ROLEPLAY. Attendance & Duty Management System.</p>
      </footer>
    </div>
  );
}
