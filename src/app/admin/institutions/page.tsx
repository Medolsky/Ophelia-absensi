import { DataService } from "@/lib/data-service";
import { InstitutionLogo } from "@/components/institution-logo";
import { Building, Plus, CheckCircle, Shield, Edit2 } from "lucide-react";

export default async function AdminInstitutionsPage() {
  const institutions = await DataService.getInstitutions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202020] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Building className="h-4 w-4" />
            <span>Konfigurasi Entitas Roleplay</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Manajemen Instansi
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Daftar seluruh instansi aktif yang terdaftar dalam sistem absensi Discord Ophelia.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 transition shadow-lg self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          <span>+ Buat Instansi Baru</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {institutions.map((inst) => (
          <div
            key={inst.id}
            className="rounded-2xl bg-[#111111] border border-[#252525] p-6 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <InstitutionLogo
                  logo={inst.logo}
                  name={inst.name}
                  size="lg"
                  className="p-1 rounded-xl bg-[#181818] border border-[#262626]"
                />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{inst.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1f1f] text-neutral-400">
                      /{inst.slug}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">{inst.description}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  inst.status === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-neutral-800 text-neutral-400 border-neutral-700"
                }`}
              >
                {inst.status}
              </span>
            </div>

            <div className="mt-5 pt-4 border-t border-[#1f1f1f] space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span>Warna Aksen:</span>
                <div className="flex items-center gap-2 font-mono text-white">
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: inst.primaryColor }}
                  />
                  <span>{inst.primaryColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-neutral-400">
                <span>Role Discord Whitelist:</span>
                <span className="font-mono text-neutral-300">
                  {inst.discordRoleNames?.slice(0, 2).join(", ") || "—"}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1f1f1f] flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] transition flex items-center gap-1.5">
                <Edit2 className="h-3 w-3 text-amber-400" />
                <span>Edit Konfigurasi</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
