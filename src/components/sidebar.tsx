"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PermissionLevel } from "@/types";
import { useState } from "react";
import {
  Clock,
  CalendarCheck,
  BarChart3,
  History,
  Users,
  Radio,
  FileSpreadsheet,
  Banknote,
  ShieldAlert,
  Sliders,
  Building,
  MapPin,
  Gamepad2,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";

interface SidebarProps {
  institutionSlug: string;
  permissionLevel: PermissionLevel;
}

export function Sidebar({ institutionSlug, permissionLevel }: SidebarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLeader = permissionLevel === "LEADER" || permissionLevel === "SUPER_ADMIN";
  const isSuperAdmin = permissionLevel === "SUPER_ADMIN";

  const memberNav = [
    {
      name: "Duty Monitor",
      href: `/institution/${institutionSlug}/duty`,
      icon: Clock,
    },
    {
      name: "Absensi",
      href: `/institution/${institutionSlug}/attendance`,
      icon: CalendarCheck,
    },
    {
      name: "Statistik",
      href: `/institution/${institutionSlug}/statistics`,
      icon: BarChart3,
    },
    {
      name: "Histori",
      href: `/institution/${institutionSlug}/history`,
      icon: History,
    },
  ];

  const leaderNav = [
    {
      name: "Live On Duty",
      href: `/institution/${institutionSlug}/live`,
      icon: Radio,
    },
    {
      name: "Status Kota",
      href: `/institution/${institutionSlug}/city`,
      icon: MapPin,
    },
    {
      name: "Kelola Anggota",
      href: `/institution/${institutionSlug}/members`,
      icon: Users,
    },
    {
      name: "Payroll",
      href: `/institution/${institutionSlug}/payroll`,
      icon: Banknote,
    },
    {
      name: "Laporan",
      href: `/institution/${institutionSlug}/reports`,
      icon: FileSpreadsheet,
    },
  ];

  const adminNav = [
    {
      name: "Discord Mapping",
      href: `/admin/discord-mapping`,
      icon: Sliders,
    },
    {
      name: "FiveM & API",
      href: `/api-docs/fivem`,
      icon: Gamepad2,
    },
    {
      name: "Kelola Instansi",
      href: `/admin/institutions`,
      icon: Building,
    },
    {
      name: "Audit Log",
      href: `/admin/audit-log`,
      icon: ShieldAlert,
    },
  ];

  const allVisibleItems = [
    ...memberNav,
    ...(isLeader ? leaderNav : []),
    ...(isSuperAdmin ? adminNav : []),
  ];

  const activeItem = allVisibleItems.find((item) => pathname === item.href) || memberNav[0];

  return (
    <>
      {/* MOBILE COMPACT HORIZONTAL NAV (< lg) */}
      <div className="lg:hidden w-full border-b border-[#252525] bg-[#0c0c0c]/95 backdrop-blur-md sticky top-16 z-20 px-3 py-2">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
            <LayoutGrid className="h-3.5 w-3.5 text-[#FF1E2D]" />
            <span>Menu Instansi:</span>
            <span className="text-white font-semibold">{activeItem.name}</span>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#181818] border border-[#2a2a2a] text-[10px] font-bold text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <span>{mobileMenuOpen ? "Tutup Menu" : "Semua Menu"}</span>
            <ChevronDown
              className={`h-3 w-3 text-neutral-400 transition-transform ${
                mobileMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Horizontal Chips Bar for quick access */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap -mx-1 px-1">
          {allVisibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  isActive
                    ? "bg-[#E50914] text-white shadow-md glow-red-sm"
                    : "bg-[#141414] text-neutral-400 hover:text-white border border-[#222]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-neutral-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Collapsible Categorized Drawer on Mobile */}
        {mobileMenuOpen && (
          <div className="mt-2 pt-2 border-t border-[#222] space-y-3 bg-[#111111] p-3 rounded-2xl border border-[#262626] shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Main Portal
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {memberNav.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-[#E50914] text-white"
                          : "text-neutral-400 hover:text-white hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {isLeader && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF1E2D] mb-1.5">
                  Leader & Petinggi
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {leaderNav.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? "bg-[#E50914] text-white"
                            : "text-neutral-400 hover:text-white hover:bg-[#1a1a1a]"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                  Super Admin
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {adminNav.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? "bg-amber-600 text-white"
                            : "text-neutral-400 hover:text-white hover:bg-[#1a1a1a]"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DESKTOP SIDEBAR (>= lg) */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#252525] bg-[#0c0c0c] p-5 min-h-[calc(100vh-4rem)]">
        <div className="space-y-6">
          {/* MAIN SECTION */}
          <div>
            <div className="px-3 text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Main Portal
            </div>
            <nav className="space-y-1">
              {memberNav.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? "bg-[#E50914] text-white shadow-lg glow-red-sm"
                        : "text-neutral-400 hover:text-white hover:bg-[#161616]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-neutral-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* LEADER SECTION */}
          {isLeader && (
            <div className="pt-4 border-t border-[#202020]">
              <div className="px-3 text-[11px] font-bold text-[#FF1E2D] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Petinggi / Leader</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E50914]/20 border border-[#E50914]/40">
                  ACTIVE
                </span>
              </div>
              <nav className="space-y-1">
                {leaderNav.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-[#E50914] text-white shadow-lg glow-red-sm"
                          : "text-neutral-400 hover:text-white hover:bg-[#161616]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-neutral-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* SUPER ADMIN SECTION */}
          {isSuperAdmin && (
            <div className="pt-4 border-t border-[#202020]">
              <div className="px-3 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Super Admin</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                  ROOT
                </span>
              </div>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-amber-600 text-white shadow-lg"
                          : "text-neutral-400 hover:text-white hover:bg-[#161616]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-neutral-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
