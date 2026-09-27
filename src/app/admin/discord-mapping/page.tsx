import { Sliders, Plus, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";

export default function AdminDiscordMappingPage() {
  const roleMappings = [
    {
      discordRole: "ADMIN",
      roleId: "1482622396954312809",
      institution: "SEMUA INSTANSI (GLOBAL)",
      permission: "SUPER_ADMIN",
      description: "Akses Super Administrator server-wide dan seluruh instansi",
    },
    {
      discordRole: "PIMPINAN",
      roleId: "1482622396954312808",
      institution: "SEMUA INSTANSI (GLOBAL)",
      permission: "SUPER_ADMIN",
      description: "Pimpinan server dengan hak akses manajemen penuh",
    },
    {
      discordRole: "CHIEF OF POLICE",
      roleId: "1482622396954312807",
      institution: "Ophelia Police Department",
      permission: "LEADER",
      description: "Kepala Kepolisian (Manajemen anggota, buku absensi, live monitoring)",
    },
    {
      discordRole: "SWAT",
      roleId: "1508742513874440303",
      institution: "Ophelia Police Department",
      permission: "MEMBER",
      description: "Unit taktis kepolisian SWAT",
    },
    {
      discordRole: "HIGHWAY PATROL",
      roleId: "1508742898194186330",
      institution: "Ophelia Police Department",
      permission: "MEMBER",
      description: "Patroli jalan raya kepolisian",
    },
    {
      discordRole: "OFFICER",
      roleId: "1522915139072950312",
      institution: "Ophelia Police Department",
      permission: "MEMBER",
      description: "Petugas kepolisian aktif",
    },
    {
      discordRole: "PETINGGI MEDIS",
      roleId: "1482622396954312805",
      institution: "Ophelia Medical Center",
      permission: "LEADER",
      description: "Petinggi dan Direktur Medis Rumah Sakit",
    },
    {
      discordRole: "MEDIS",
      roleId: "1482622396946055227",
      institution: "Ophelia Medical Center",
      permission: "MEMBER",
      description: "Dokter dan paramedis medis rumah sakit",
    },
    {
      discordRole: "PETINGGI BENGKEL",
      roleId: "1482622396946055224",
      institution: "Ophelia Custom Garage",
      permission: "LEADER",
      description: "Kepala Mekanik dan Pemilik Bengkel",
    },
    {
      discordRole: "BENGKEL",
      roleId: "1482622396946055223",
      institution: "Ophelia Custom Garage",
      permission: "MEMBER",
      description: "Mekanik dan teknisi modifikasi kendaraan",
    },
    {
      discordRole: "PETINGGI RESTO",
      roleId: "1482622396946055226",
      institution: "Ophelia Restaurant & Lounge",
      permission: "LEADER",
      description: "Manajer dan Supervisor Restoran & Lounge",
    },
    {
      discordRole: "SERVERS RESTO",
      roleId: "1482622396946055225",
      institution: "Ophelia Restaurant & Lounge",
      permission: "MEMBER",
      description: "Staff dan pramusaji restoran",
    },
    {
      discordRole: "PETINGGI PEMERINTAH",
      roleId: "1482622396946055222",
      institution: "Pemerintah Kota Ophelia",
      permission: "LEADER",
      description: "Pejabat dan Petinggi Administrasi Pemerintahan",
    },
    {
      discordRole: "PEMERINTAH",
      roleId: "1482622396946055221",
      institution: "Pemerintah Kota Ophelia",
      permission: "MEMBER",
      description: "Staff operasional pelayanan sipil pemerintah",
    },
    {
      discordRole: "PDM",
      roleId: "1482622396946055219",
      institution: "Dealer Kendaraan PDM",
      permission: "MEMBER",
      description: "Staff dealer kendaraan bermotor",
    },
    {
      discordRole: "TAXI",
      roleId: "1482622396946055220",
      institution: "Layanan Transportasi Kota",
      permission: "MEMBER",
      description: "Driver transportasi umum dan taksi kota",
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-semibold text-emerald-400">
            Guild ID: 1482622396946055218
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Nama Role Discord</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Role ID Discord</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Instansi Target</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Level Permission</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {roleMappings.map((m) => (
                <tr key={m.roleId} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#5865F2]" />
                    <span>{m.discordRole}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                    {m.roleId}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                    {m.institution}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
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
                  <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap">
                    {m.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
