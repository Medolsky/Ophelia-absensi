import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, ShieldAlert, ArrowLeft, Sliders, Building, History } from "lucide-react";
import { DevSwitcher } from "@/components/dev-switcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");

  if (!currentUser.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-[#111111] border border-red-900/40 p-8 text-center shadow-2xl">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-[#FF1E2D] mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">403: Akses Super Admin Diperlukan</h2>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Hanya akun dengan hak akses Super Admin / Server Owner yang dapat mengakses panel konfigurasi sistem ini.
            Gunakan <b>Role Switcher</b> di kanan atas dan pilih <b>Marcus Vance (Super Admin)</b> untuk menguji panel ini.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/select-institution"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-md glow-red-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Portal Instansi</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col selection:bg-[#E50914] selection:text-white">
      {/* Admin Topbar */}
      <header className="sticky top-0 z-30 border-b border-[#252525] bg-[#0c0c0c]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logos/ophelia-logo.png"
                alt="Ophelia Roleplay"
                className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]"
              />
              <span className="text-xs text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 hidden sm:inline-block">
                ADMIN CONSOLE
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/select-institution"
              className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#252525] hover:bg-[#1a1a1a] transition"
            >
              ← Keluar ke Portal
            </Link>
            <DevSwitcher currentUser={currentUser} />
          </div>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="border-b border-[#202020] bg-[#101010]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 py-2 overflow-x-auto">
          <Link
            href="/admin/institutions"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#1c1c1c] transition"
          >
            <Building className="h-4 w-4" />
            <span>Manajemen Instansi</span>
          </Link>
          <Link
            href="/admin/discord-mapping"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#1c1c1c] transition"
          >
            <Sliders className="h-4 w-4" />
            <span>Mapping Role Discord</span>
          </Link>
          <Link
            href="/admin/audit-log"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#1c1c1c] transition"
          >
            <History className="h-4 w-4" />
            <span>Audit Log Sistem</span>
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
