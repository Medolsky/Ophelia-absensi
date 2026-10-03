import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_INSTITUTIONS } from "@/lib/constants";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import { Shield, Sparkles, Lock, ArrowRight, Radio, Clock, Users, AlertTriangle } from "lucide-react";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ discord_notice?: string; error?: string; logged_out?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const { discord_notice, error, logged_out } = params;
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col justify-between selection:bg-[#E50914] selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-[#202020] bg-[#0c0c0c]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logos/ophelia-logo.png"
                alt="Ophelia Roleplay"
                className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(229,9,20,0.35)]"
              />
              <span className="text-xs text-[#FF1E2D] font-bold px-2 py-0.5 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 hidden sm:inline-block">
                PORTAL ABSENSI
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#252525]">
                  <img
                    src={getDiscordAvatarUrl(currentUser.discordId, currentUser.discordAvatar)}
                    alt={currentUser.displayName}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-bold text-white leading-none">{currentUser.displayName}</div>
                    <div className="text-[10px] text-neutral-400 font-mono leading-none mt-0.5">@{currentUser.discordUsername}</div>
                  </div>
                </div>
                <Link
                  href="/select-institution"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-md"
                >
                  Dashboard
                </Link>
                <a
                  href="/api/auth/logout"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] border border-[#303030] transition"
                  title="Keluar dari akun Discord ini"
                >
                  Keluar
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/discord"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] transition shadow-lg shadow-[#5865F2]/25 active:scale-95"
              >
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Login Discord</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Logged Out Notice */}
      {logged_out && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-300 font-semibold">
                Sesi Anda telah berhasil diakhiri. Silakan login kembali dengan akun Discord Anda.
              </span>
            </div>
            <a
              href="/api/auth/discord"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] transition shadow-md shrink-0"
            >
              Login Sekarang
            </a>
          </div>
        </div>
      )}

      {/* Discord Notice / Error Alert */}
      {(discord_notice || error) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#1b1212] border border-[#E50914]/50 shadow-2xl flex flex-col sm:flex-row items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-[#FF1E2D] shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>
                  {discord_notice === "missing_credentials"
                    ? "Kredensial Discord Belum Lengkap di Vercel Dashboard"
                    : error === "missing_client_secret"
                    ? "DISCORD_CLIENT_SECRET Belum Diatur di Vercel"
                    : error === "token_exchange_failed"
                    ? "Gagal Pertukaran Kode Discord (Cek Redirect URI & Client Secret)"
                    : `Notice Discord: ${error || discord_notice}`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 font-mono">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {error === "token_exchange_failed"
                  ? "Discord menolak autentikasi. Pastikan Anda sudah menambahkan Redirect URI 'https://ophelia-absensi.vercel.app/api/auth/discord/callback' di Discord Developer Portal."
                  : "Buka Vercel Dashboard → Settings → Environment Variables, pastikan semua variabel Discord sudah dimasukkan lalu lakukan Redeploy."}
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-[#202020] text-neutral-300 hover:text-white border border-[#303030] transition"
                >
                  Buka Discord Developer Portal ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex-1 flex flex-col justify-center">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="mb-2">
              <img
                src="/logos/ophelia-logo.png"
                alt="Ophelia Roleplay"
                className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_0_25px_rgba(229,9,20,0.45)]"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181818] border border-[#262626] text-xs font-semibold text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-[#FF1E2D] animate-ping" />
              <span>Sistem Absensi & Duty Instansi Ophelia RP</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              DISCORD ROLEPLAY <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E50914] via-[#FF1E2D] to-orange-500">
                DUTY ATTENDANCE
              </span>
            </h1>

            <p className="text-base sm:text-lg text-neutral-400 max-w-xl leading-relaxed">
              Platform pencatatan jam dinas real-time dengan sinkronisasi role Discord terintegrasi,
              pemantauan kehadiran live, rekap bulanan, dan sistem penggajian transparan.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              {currentUser ? (
                <>
                  <Link
                    href="/select-institution"
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-xl glow-red active:scale-95 text-center"
                  >
                    <span>Masuk Dashboard Duty</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <div className="flex items-center gap-2.5">
                    <a
                      href="/api/auth/discord?prompt=consent"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-xs text-neutral-200 bg-[#161616] hover:bg-[#222] border border-[#303030] transition shadow-md active:scale-95 text-center"
                      title="Masuk menggunakan akun Discord lain"
                    >
                      <svg className="h-4 w-4 fill-[#5865F2] shrink-0" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      <span>Ganti Akun</span>
                    </a>
                    <a
                      href="/api/auth/logout"
                      className="inline-flex items-center justify-center px-4 py-3.5 rounded-xl font-medium text-xs text-neutral-400 hover:text-white bg-[#141414] hover:bg-[#202020] border border-[#2c2c2c] transition text-center"
                    >
                      <span>Keluar</span>
                    </a>
                  </div>
                </>
              ) : (
                <a
                  href="/api/auth/discord"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-extrabold text-sm sm:text-base text-white bg-[#5865F2] hover:bg-[#4752C4] transition shadow-2xl shadow-[#5865F2]/40 active:scale-95 group text-center"
                >
                  <svg className="h-5 sm:h-6 w-5 sm:w-6 fill-white group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span>Masuk dengan Akun Discord</span>
                </a>
              )}
            </div>

            {/* Active user status pill */}
            {currentUser && (
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400 max-w-full">
                <span className="text-neutral-500 shrink-0">Masuk sebagai:</span>
                <div className="inline-flex items-center gap-2 bg-[#141414] border border-[#252525] px-3 py-1.5 rounded-lg max-w-full min-w-0">
                  <img
                    src={getDiscordAvatarUrl(currentUser.discordId, currentUser.discordAvatar)}
                    alt={currentUser.displayName}
                    className="h-5 w-5 rounded-full object-cover shrink-0"
                  />
                  <span className="text-white font-medium truncate">{currentUser.displayName}</span>
                  <span
                    className="text-[10px] text-[#FF1E2D] font-mono truncate max-w-[130px] sm:max-w-[220px]"
                    title={currentUser.discordRoles.join(", ") || "Member"}
                  >
                    ({currentUser.discordRoles.join(", ") || "Member"})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Card Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#262626] bg-[#111111] p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#202020] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-600 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-600 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-600 inline-block" />
                  <span className="text-xs font-mono text-neutral-500 ml-2">ophelia-duty-v1.0</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#E50914]/20 text-[#FF1E2D] font-mono">
                  LIVE ENGINE
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-[#080808] border border-[#222] p-4 rounded-xl">
                  <div className="text-[11px] text-neutral-500 font-mono">CURRENT DUTY PREVIEW</div>
                  <div className="text-xl font-bold text-white mt-1 flex items-center justify-between">
                    <span>POLICE DEPARTMENT</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                      ACTIVE
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-black text-[#FF1E2D] mt-2 whitespace-nowrap">
                    00&nbsp;:&nbsp;00&nbsp;:&nbsp;00
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#161616] border border-[#222]">
                    <div className="text-neutral-500">TODAY DUTY</div>
                    <div className="text-base font-bold text-white mt-0.5 whitespace-nowrap">00h 00m</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#161616] border border-[#222]">
                    <div className="text-neutral-500">THIS MONTH</div>
                    <div className="text-base font-bold text-[#FF1E2D] mt-0.5 whitespace-nowrap">00h 00m</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c1c1c] py-6 text-center text-xs text-neutral-400">
        <p>© 2026 OPHELIA ROLEPLAY. Attendance & Duty Management System. Built for GTA V RP Community.</p>
      </footer>
    </div>
  );
}
