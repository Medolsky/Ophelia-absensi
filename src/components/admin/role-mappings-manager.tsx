"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DiscordRoleMappingData, InstitutionData, PermissionLevel } from "@/types";
import {
  createRoleMappingAction,
  updateRoleMappingAction,
  deleteRoleMappingAction,
} from "@/app/actions/admin-actions";
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  ShieldCheck,
  ShieldAlert,
  Users,
} from "lucide-react";

interface RoleMappingsManagerProps {
  initialMappings: DiscordRoleMappingData[];
  institutions: InstitutionData[];
}

export function RoleMappingsManager({
  initialMappings,
  institutions,
}: RoleMappingsManagerProps) {
  const router = useRouter();
  const [mappings, setMappings] = useState<DiscordRoleMappingData[]>(initialMappings);
  const [searchTerm, setSearchTerm] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("ALL");
  const [permissionFilter, setPermissionFilter] = useState("ALL");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<DiscordRoleMappingData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscordRoleMappingData | null>(null);

  // Form state
  const [formRoleName, setFormRoleName] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formInstitution, setFormInstitution] = useState("SEMUA INSTANSI (GLOBAL)");
  const [formPermission, setFormPermission] = useState<PermissionLevel>("MEMBER");
  const [formDescription, setFormDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const resetForm = () => {
    setFormRoleName("");
    setFormRoleId("");
    setFormInstitution(institutions[0]?.name || "SEMUA INSTANSI (GLOBAL)");
    setFormPermission("MEMBER");
    setFormDescription("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (mapping: DiscordRoleMappingData) => {
    setEditingMapping(mapping);
    setFormRoleName(mapping.discordRole);
    setFormRoleId(mapping.roleId);
    setFormInstitution(mapping.institution);
    setFormPermission(mapping.permission);
    setFormDescription(mapping.description || "");
  };

  // --- CREATE ---
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoleName.trim() || !formRoleId.trim()) return;

    setIsSubmitting(true);
    const tempId = `temp-map-${Date.now()}`;
    const optimisticMapping: DiscordRoleMappingData = {
      id: tempId,
      discordRole: formRoleName.trim().toUpperCase(),
      roleId: formRoleId.trim(),
      institution: formInstitution,
      permission: formPermission,
      description: formDescription.trim(),
    };

    setMappings((prev) => [optimisticMapping, ...prev]);
    setShowCreateModal(false);
    resetForm();
    setFeedback({
      type: "success",
      message: `Role mapping ${optimisticMapping.discordRole} berhasil ditambahkan!`,
    });

    try {
      const res = await createRoleMappingAction({
        discordRole: optimisticMapping.discordRole,
        roleId: optimisticMapping.roleId,
        institution: optimisticMapping.institution,
        permission: optimisticMapping.permission,
        description: optimisticMapping.description,
      });

      if (res.success && res.mapping) {
        setMappings((prev) =>
          prev.map((m) => (m.id === tempId ? res.mapping! : m))
        );
        router.refresh();
      } else {
        setMappings((prev) => prev.filter((m) => m.id !== tempId));
        setFeedback({
          type: "error",
          message: res.error || "Gagal menambahkan mapping role.",
        });
      }
    } catch {
      setMappings((prev) => prev.filter((m) => m.id !== tempId));
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menambahkan mapping role.",
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // --- UPDATE ---
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapping) return;

    setIsSubmitting(true);
    const targetMap = editingMapping;
    const updatedData: Partial<DiscordRoleMappingData> = {
      discordRole: formRoleName.trim().toUpperCase(),
      roleId: formRoleId.trim(),
      institution: formInstitution,
      permission: formPermission,
      description: formDescription.trim(),
    };

    const previousMappings = [...mappings];
    setMappings((prev) =>
      prev.map((m) => (m.id === targetMap.id ? { ...m, ...updatedData } : m))
    );
    setEditingMapping(null);
    setFeedback({
      type: "success",
      message: `Mapping role ${updatedData.discordRole} berhasil diperbarui!`,
    });

    try {
      const res = await updateRoleMappingAction(targetMap.id, updatedData);
      if (res.success && res.mapping) {
        setMappings((prev) =>
          prev.map((m) => (m.id === targetMap.id ? res.mapping! : m))
        );
        router.refresh();
      } else {
        setMappings(previousMappings);
        setFeedback({
          type: "error",
          message: res.error || "Gagal memperbarui mapping role.",
        });
      }
    } catch {
      setMappings(previousMappings);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat memperbarui mapping role.",
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // --- DELETE ---
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    const targetMap = confirmDelete;
    const previousMappings = [...mappings];

    setMappings((prev) => prev.filter((m) => m.id !== targetMap.id));
    setConfirmDelete(null);
    setFeedback({
      type: "success",
      message: `Mapping role ${targetMap.discordRole} berhasil dihapus.`,
    });

    try {
      const res = await deleteRoleMappingAction(targetMap.id);
      if (!res.success) {
        setMappings(previousMappings);
        setFeedback({
          type: "error",
          message: res.error || "Gagal menghapus mapping role.",
        });
      } else {
        router.refresh();
      }
    } catch {
      setMappings(previousMappings);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menghapus mapping role.",
      });
    } finally {
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const filteredMappings = mappings.filter((m) => {
    const matchesSearch =
      m.discordRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.roleId.includes(searchTerm) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.institution.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (institutionFilter !== "ALL" && m.institution !== institutionFilter) {
      return false;
    }
    if (permissionFilter !== "ALL" && m.permission !== permissionFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
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

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#5865F2] hover:bg-[#4752C4] transition shadow-lg self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>+ Tambah Role Mapping</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold border animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
              : "bg-red-950/40 border-red-800/50 text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari nama role, Role ID, atau instansi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <select
            value={institutionFilter}
            onChange={(e) => setInstitutionFilter(e.target.value)}
            className="bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-neutral-300 px-3 py-2.5 rounded-xl outline-none"
          >
            <option value="ALL">Semua Instansi</option>
            <option value="SEMUA INSTANSI (GLOBAL)">SEMUA INSTANSI (GLOBAL)</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.name}>
                {inst.name}
              </option>
            ))}
          </select>

          <select
            value={permissionFilter}
            onChange={(e) => setPermissionFilter(e.target.value)}
            className="bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-neutral-300 px-3 py-2.5 rounded-xl outline-none"
          >
            <option value="ALL">Semua Level</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="LEADER">LEADER</option>
            <option value="MEMBER">MEMBER</option>
          </select>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto w-full table-scroll-container">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Nama Role Discord</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Role ID Discord</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Instansi Target</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Level Permission</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Keterangan</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right sticky right-0 bg-[#161616] z-10 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] border-l border-[#252525]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Tidak ada mapping role yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m) => (
                  <tr key={m.id} className="hover:bg-[#161616] transition-colors group">
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#5865F2] shrink-0" />
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
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold"
                            : m.permission === "LEADER"
                            ? "bg-[#E50914]/20 text-[#FF1E2D] border-[#E50914]/40 font-bold"
                            : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {m.permission}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate">
                      {m.description}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap sticky right-0 bg-[#111111] group-hover:bg-[#161616] z-10 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] border-l border-[#202020] transition-colors">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(m)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3 text-amber-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(m)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/40 border border-red-800/30 transition flex items-center gap-1 cursor-pointer"
                          title="Hapus mapping"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Tambah Role Mapping</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Petakan role Discord server ke instansi dan tingkat akses.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nama Role Discord *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CHIEF OF POLICE"
                  value={formRoleName}
                  onChange={(e) => setFormRoleName(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Role ID Discord (Snowflake ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1482622396954312807"
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value.trim())}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Instansi Target
                </label>
                <select
                  value={formInstitution}
                  onChange={(e) => setFormInstitution(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="SEMUA INSTANSI (GLOBAL)">SEMUA INSTANSI (GLOBAL)</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Level Hak Akses (Permission)
                </label>
                <select
                  value={formPermission}
                  onChange={(e) => setFormPermission(e.target.value as PermissionLevel)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="MEMBER">MEMBER (Anggota Biasa - Akses Duty & Absensi)</option>
                  <option value="LEADER">LEADER (Petinggi Instansi - Manajemen Anggota & Koreksi)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Owner / Admin Server Global)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Keterangan / Deskripsi
                </label>
                <input
                  type="text"
                  placeholder="Keterangan tugas role..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative">
            <button
              onClick={() => setEditingMapping(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Edit Mapping: {editingMapping.discordRole}
            </h3>
            <p className="text-xs text-neutral-400 mb-4 font-mono">
              ID: {editingMapping.roleId}
            </p>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nama Role Discord *
                </label>
                <input
                  type="text"
                  required
                  value={formRoleName}
                  onChange={(e) => setFormRoleName(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Role ID Discord (Snowflake ID) *
                </label>
                <input
                  type="text"
                  required
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value.trim())}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Instansi Target
                </label>
                <select
                  value={formInstitution}
                  onChange={(e) => setFormInstitution(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="SEMUA INSTANSI (GLOBAL)">SEMUA INSTANSI (GLOBAL)</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Level Hak Akses (Permission)
                </label>
                <select
                  value={formPermission}
                  onChange={(e) => setFormPermission(e.target.value as PermissionLevel)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="MEMBER">MEMBER (Anggota Biasa - Akses Duty & Absensi)</option>
                  <option value="LEADER">LEADER (Petinggi Instansi - Manajemen Anggota & Koreksi)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Owner / Admin Server Global)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Keterangan / Deskripsi
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#5865F2] text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMapping(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-red-900/50 shadow-2xl p-6 relative">
            <button
              onClick={() => setConfirmDelete(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-500 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Role Mapping</h3>
                <p className="text-xs text-neutral-400">Konfirmasi tindakan</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-[#0c0c0c] border border-[#222] p-3 rounded-xl mb-4">
              Apakah Anda yakin ingin menghapus mapping role <b className="text-white">{confirmDelete.discordRole}</b> (ID: <span className="font-mono text-neutral-400">{confirmDelete.roleId}</span>)?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-950/50 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Ya, Hapus Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
