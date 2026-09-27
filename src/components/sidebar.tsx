"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PermissionLevel } from "@/types";
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
} from "lucide-react";

interface SidebarProps {
  institutionSlug: string;
  permissionLevel: PermissionLevel;
}

export function Sidebar({ institutionSlug, permissionLevel }: SidebarProps) {
  const pathname = usePathname();

  const isLeader = permissionLevel === "LEADER" || permissionLevel === "SUPER_ADMIN";
  const isSuperAdmin = permissionLevel === "SUPER_ADMIN";

  const memberNav = [
    {
      name: "Duty Monitor",
      href: `/institution/${institutionSlug}/duty`,
      icon: Clock,
    },
    {
      name: "Absensi Saya",
      href: `/institution/${institutionSlug}/attendance`,
      icon: CalendarCheck,
    },
    {
      name: "Statistik",
      href: `/institution/${institutionSlug}/statistics`,
      icon: BarChart3,
    },
    {
      name: "Histori Bulanan",
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
      name: "Payroll & Gaji",
      href: `/institution/${institutionSlug}/payroll`,
      icon: Banknote,
    },
    {
      name: "Laporan & Export",
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
      name: "Integrasi FiveM & API",
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

  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-[#252525] bg-[#0c0c0c] p-4 lg:p-6 lg:min-h-[calc(100vh-4rem)]">
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
  );
}
