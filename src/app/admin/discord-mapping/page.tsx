import { Sliders, Plus, ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminDiscordMappingPage() {
  const roleMappings = [
    {
      discordRole: "@Police",
      roleId: "982736410293847001",
      institution: "Police Department",
      permission: "MEMBER",
      description: "Akses dasar anggota kepolisian LSPD",
    },
    {
      discordRole: "@Police Chief",
      roleId: "982736410293847002",
      institution: "Police Department",
      permission: "LEADER",
      description: "Petinggi polisi (Buku absensi, live monitoring, koreksi)",
    },
    {
      discordRole: "@Police Commander",
      roleId: "982736410293847003",
      institution: "Police Department",
      permission: "LEADER",
      description: "Komandan regu operasional kepolisian",
    },
    {
      discordRole: "@EMS",
      roleId: "982736410293847010",
      institution: "Medical Department",
      permission: "MEMBER",
      description: "Tenaga medis paramedis & dokter umum",
    },
    {
      discordRole: "@EMS Director",
      roleId: "982736410293847011",
      institution: "Medical Department",
      permission: "LEADER",
      description: "Direktur rumah sakit & kepala divisi medis",
    },
    {
      discordRole: "@Mechanic",
      roleId: "982736410293847020",
      institution: "Los Santos Customs",
      permission: "MEMBER",
      description: "Mekanik bengkel & teknisi modifikasi",
    },
    {
      discordRole: "@Server Owner / Admin",
      roleId: "982736410293847099",
      institution: "SEMUA INSTANSI",
      permission: "SUPER_ADMIN",
      description: "Akses penuh konfigurasi sistem dan audit log global",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202020] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Sliders className="h-4 w-4" />
            <span>Integrasi Guild Discord</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Mapping Role Discord
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Hubungkan role Discord server ke instansi dan level hak akses tanpa perlu mengubah kode sumber.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 transition shadow-lg self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          <span>+ Tambah Mapping Role</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Nama Role Discord</th>
                <th className="py-3.5 px-4">Role ID Discord</th>
                <th className="py-3.5 px-4">Instansi Target</th>
                <th className="py-3.5 px-4">Level Permission</th>
                <th className="py-3.5 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {roleMappings.map((m) => (
                <tr key={m.roleId} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#5865F2]" />
                    <span>{m.discordRole}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-400">{m.roleId}</td>
                  <td className="py-3.5 px-4 font-medium text-white">{m.institution}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        m.permission === "SUPER_ADMIN"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : m.permission === "LEADER"
                          ? "bg-[#E50914]/20 text-[#FF1E2D] border-[#E50914]/40"
                          : "bg-neutral-800 text-neutral-300 border-neutral-700"
                      }`}
                    >
                      {m.permission}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-400">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
