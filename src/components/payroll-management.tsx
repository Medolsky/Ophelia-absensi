"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayrollRecord } from "@/types";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import { updatePositionSalaryAction, togglePayrollStatusAction } from "@/app/actions/payroll-actions";
import {
  Banknote,
  Coins,
  Settings2,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Search,
  Check,
  X,
  Sliders,
} from "lucide-react";

interface PayrollManagementProps {
  institutionSlug: string;
  institutionName: string;
  currencySymbol: string;
  initialRecords: PayrollRecord[];
  initialConfigs: Record<string, { hourlyRate: number; minDutyHours: number }>;
}

export function PayrollManagement({
  institutionSlug,
  institutionName,
  currencySymbol,
  initialRecords,
  initialConfigs,
}: PayrollManagementProps) {
  const router = useRouter();
  const [records, setRecords] = useState<PayrollRecord[]>(initialRecords);
  const [configs, setConfigs] = useState(initialConfigs);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Edit salary config modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>(Object.keys(configs)[0] || "Officer");
  const [editHourlyRate, setEditHourlyRate] = useState<number>(
    configs[Object.keys(configs)[0]]?.hourlyRate || 50000
  );
  const [editMinHours, setEditMinHours] = useState<number>(
    configs[Object.keys(configs)[0]]?.minDutyHours || 15
  );
  const [configLoading, setConfigLoading] = useState(false);

  // Toggle status loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const formatMoney = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString("id-ID")}`;
  };

  const totalPayrollBudget = records.reduce((acc, r) => acc + r.totalSalary, 0);
  const totalAccumulatedHours = records.reduce((acc, r) => acc + r.totalDutyHours, 0);
  const paidCount = records.filter((r) => r.status === "PAID").length;
  const pendingCount = records.length - paidCount;

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.positionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.discordId.includes(searchTerm);
    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    return true;
  });

  const handleSelectPositionToEdit = (pos: string) => {
    setSelectedPosition(pos);
    setEditHourlyRate(configs[pos]?.hourlyRate || 50000);
    setEditMinHours(configs[pos]?.minDutyHours || 15);
  };

  const handleSaveSalaryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      const res = await updatePositionSalaryAction({
        institutionSlug,
        positionName: selectedPosition,
        hourlyRate: Number(editHourlyRate),
        minDutyHours: Number(editMinHours),
      });

      if (res.success) {
        setConfigs({
          ...configs,
          [selectedPosition]: {
            hourlyRate: Number(editHourlyRate),
            minDutyHours: Number(editMinHours),
          },
        });

        // Recalculate records with new rate
        setRecords(
          records.map((r) => {
            if (r.positionName === selectedPosition) {
              const newSalary = Math.round(r.totalDutyHours * Number(editHourlyRate));
              return {
                ...r,
                hourlyRate: Number(editHourlyRate),
                minDutyHours: Number(editMinHours),
                totalSalary: newSalary,
                isEligible: r.totalDutyHours >= Number(editMinHours),
              };
            }
            return r;
          })
        );

        setShowConfigModal(false);
        router.refresh();
      }
    } finally {
      setConfigLoading(false);
    }
  };

  const handleToggleStatus = async (record: PayrollRecord) => {
    const newStatus = record.status === "PAID" ? "PENDING" : "PAID";
    setTogglingId(record.membershipId);

    // Instant optimistic UI update in 0ms!
    const previousRecords = [...records];
    setRecords((prev) =>
      prev.map((r) =>
        r.membershipId === record.membershipId ? { ...r, status: newStatus } : r
      )
    );

    try {
      const res = await togglePayrollStatusAction({
        institutionSlug,
        membershipId: record.membershipId,
        newStatus,
      });

      if (!res.success) {
        // Rollback on server error
        setRecords(previousRecords);
      } else {
        router.refresh();
      }
    } catch {
      setRecords(previousRecords);
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportPayrollCSV = () => {
    const headers = [
      "Member Name",
      "Discord ID",
      "Position",
      "Total Duty Hours",
      `Hourly Rate (${currencySymbol})`,
      `Total Salary (${currencySymbol})`,
      "Min Duty Hours",
      "Status",
    ];
    const rows = records.map((r) => [
      `"${r.memberName}"`,
      `"${r.discordId}"`,
      `"${r.positionName}"`,
      r.totalDutyHours,
      r.hourlyRate,
      r.totalSalary,
      r.minDutyHours,
      r.status,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap_gaji_${institutionSlug}_${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#111111] border border-[#222] p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              TOTAL ANGGARAN GAJI
            </span>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-2 truncate whitespace-nowrap">
            {formatMoney(totalPayrollBudget)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 truncate">Akumulasi periode berjalan</div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-5 shadow-lg relative overflow-hidden group hover:border-[#E50914]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              TOTAL JAM DINAS
            </span>
            <Clock className="h-4 w-4 text-[#FF1E2D]" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-white mt-2 truncate whitespace-nowrap">
            {totalAccumulatedHours.toFixed(1)} <span className="text-sm font-sans font-medium text-neutral-400">Jam</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 truncate">Dari {records.length} anggota instansi</div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              SUDAH DIBAYARKAN
            </span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-white mt-2 truncate whitespace-nowrap">
            {paidCount} <span className="text-sm font-sans font-medium text-neutral-400">/ {records.length} Petugas</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 truncate">{pendingCount} menunggu pembayaran</div>
        </div>

        <div className="rounded-2xl bg-[#111111] border border-[#222] p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              KONFIGURASI TARIF
            </span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-white mt-2 truncate whitespace-nowrap">
            {Object.keys(configs).length} <span className="text-sm font-sans font-medium text-neutral-400">Pangkat</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 truncate">Rate gaji per jabatan</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari nama petugas, pangkat, atau ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#080808] border border-[#252525] text-xs text-neutral-300 p-2.5 rounded-xl outline-none shrink-0"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Menunggu (Pending)</option>
            <option value="PAID">Dibayarkan (Paid)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] transition"
          >
            <Settings2 className="h-4 w-4 text-amber-400" />
            <span>Atur Tarif Gaji Jabatan</span>
          </button>

          <button
            onClick={handleExportPayrollCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-md glow-red-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export Slip Gaji (CSV)</span>
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Nama Anggota</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Jabatan / Pangkat</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Total Jam Duty</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Tarif / Jam</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Gaji</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Status Pembayaran</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Aksi Petinggi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    Tidak ada data payroll yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isPaid = record.status === "PAID";
                  const isToggling = togglingId === record.membershipId;

                  return (
                    <tr key={record.membershipId} className="hover:bg-[#161616] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getDiscordAvatarUrl(record.discordId, record.userAvatar)}
                            alt={record.memberName}
                            className="h-8 w-8 rounded-xl object-cover border border-[#333] shrink-0"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback = getDiscordAvatarUrl(record.discordId, null);
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-[160px] sm:max-w-[200px]">
                              {record.memberName}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-500 truncate max-w-[160px] sm:max-w-[200px]">
                              ID: {record.discordId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-neutral-300 whitespace-nowrap">
                        {record.positionName}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white whitespace-nowrap">
                        {record.totalDutyHours} <span className="text-[10px] text-neutral-500 font-sans">Jam</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-neutral-400 whitespace-nowrap">
                        {formatMoney(record.hourlyRate)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400 text-sm whitespace-nowrap">
                        {formatMoney(record.totalSalary)}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {isPaid ? "SUDAH DIBAYARKAN" : "MENUNGGU CAIR"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(record)}
                          disabled={isToggling}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            isPaid
                              ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm"
                          }`}
                        >
                          {isToggling ? "Menyimpan..." : isPaid ? "Tandai Belum" : "Bayar Gaji"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Config Modal for Leaders & Super Admins */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#2a2a2a] shadow-2xl p-6 relative">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Atur Tarif Gaji per Jam Dinas</h3>
                <p className="text-xs text-neutral-400">Instansi: {institutionName}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-400 my-3">
              Gaji anggota akan dikalkulasikan secara otomatis berdasarkan total jam dinas dikalikan dengan tarif per jam pangkat bersangkutan.
            </p>

            {/* Position Picker Tabs */}
            <div className="flex gap-1.5 overflow-x-auto py-1 mb-4 border-b border-[#252525]">
              {Object.keys(configs).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => handleSelectPositionToEdit(pos)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedPosition === pos
                      ? "bg-amber-500 text-black font-bold shadow-md"
                      : "text-neutral-400 hover:text-white hover:bg-[#202020]"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveSalaryConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Jabatan / Pangkat
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedPosition}
                  className="w-full bg-[#0a0a0a] border border-[#252525] text-xs text-neutral-400 p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Tarif Gaji per Jam ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    required
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                    className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-sm font-mono font-bold text-white pl-12 pr-3 py-2.5 rounded-xl outline-none"
                  />
                </div>
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Contoh: 50.000 = Rp 50.000 / jam tugas dinas
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Target Kuota Minimum Jam Dinas per Bulan
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMinHours}
                    onChange={(e) => setEditMinHours(Number(e.target.value))}
                    className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-sm font-mono font-bold text-white px-3 py-2.5 rounded-xl outline-none"
                  />
                </div>
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Batas jam dinas yang harus dipenuhi sebelum gaji dapat dicairkan
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#252525]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={configLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition shadow-lg disabled:opacity-50"
                >
                  {configLoading ? "Menyimpan..." : "Simpan Tarif Jabatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
