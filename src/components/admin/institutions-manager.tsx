"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InstitutionData } from "@/types";
import { InstitutionLogo } from "@/components/institution-logo";
import {
  createInstitutionAction,
  updateInstitutionAction,
  deleteInstitutionAction,
} from "@/app/actions/admin-actions";
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Palette,
  ExternalLink,
  Shield,
  Tag,
} from "lucide-react";

interface InstitutionsManagerProps {
  initialInstitutions: InstitutionData[];
}

const COLOR_PRESETS = [
  { name: "Crimson Red", hex: "#E50914" },
  { name: "Police Blue", hex: "#1D4ED8" },
  { name: "Medical Cyan", hex: "#06B6D4" },
  { name: "Mechanic Amber", hex: "#D97706" },
  { name: "Restaurant Green", hex: "#059669" },
  { name: "Government Purple", hex: "#7C3AED" },
  { name: "Gold / Yellow", hex: "#F59E0B" },
];

export function InstitutionsManager({ initialInstitutions }: InstitutionsManagerProps) {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<InstitutionData[]>(initialInstitutions);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<InstitutionData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<InstitutionData | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLogo, setFormLogo] = useState("");
  const [formColor, setFormColor] = useState("#E50914");
  const [formRoles, setFormRoles] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const resetForm = () => {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormLogo("");
    setFormColor("#E50914");
    setFormRoles("");
    setFormStatus("ACTIVE");
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (inst: InstitutionData) => {
    setEditingInstitution(inst);
    setFormName(inst.name);
    setFormSlug(inst.slug);
    setFormDescription(inst.description || "");
    setFormLogo(inst.logo || "");
    setFormColor(inst.primaryColor || "#E50914");
    setFormRoles(inst.discordRoleNames?.join(", ") || "");
    setFormStatus(inst.status);
  };

  const handleNameChange = (val: string, isCreate: boolean) => {
    setFormName(val);
    if (isCreate) {
      const slugified = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormSlug(slugified);
    }
  };

  // --- CREATE ---
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) return;

    setIsSubmitting(true);
    const roleArray = formRoles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    // Optimistic item
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: InstitutionData = {
      id: tempId,
      name: formName.trim(),
      slug: formSlug.trim(),
      description: formDescription.trim(),
      logo: formLogo.trim() || "/logos/ophelia-logo.png",
      primaryColor: formColor,
      status: formStatus,
      discordRoleNames: roleArray,
    };

    setInstitutions((prev) => [optimisticItem, ...prev]);
    setShowCreateModal(false);
    resetForm();
    setFeedback({
      type: "success",
      message: `Instansi ${optimisticItem.name} berhasil dibuat!`,
    });

    try {
      const res = await createInstitutionAction({
        name: optimisticItem.name,
        slug: optimisticItem.slug,
        description: optimisticItem.description,
        logo: optimisticItem.logo,
        primaryColor: optimisticItem.primaryColor,
        status: optimisticItem.status,
        discordRoleNames: optimisticItem.discordRoleNames,
      });

      if (res.success && res.institution) {
        setInstitutions((prev) =>
          prev.map((i) => (i.id === tempId ? res.institution! : i))
        );
        router.refresh();
      } else {
        // Rollback
        setInstitutions((prev) => prev.filter((i) => i.id !== tempId));
        setFeedback({
          type: "error",
          message: res.error || "Gagal membuat instansi.",
        });
      }
    } catch {
      setInstitutions((prev) => prev.filter((i) => i.id !== tempId));
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat membuat instansi.",
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // --- UPDATE ---
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstitution) return;

    setIsSubmitting(true);
    const targetInst = editingInstitution;
    const roleArray = formRoles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    const updatedData: Partial<InstitutionData> = {
      name: formName.trim(),
      description: formDescription.trim(),
      logo: formLogo.trim() || "/logos/ophelia-logo.png",
      primaryColor: formColor,
      status: formStatus,
      discordRoleNames: roleArray,
    };

    const previousInstitutions = [...institutions];

    // Optimistic update
    setInstitutions((prev) =>
      prev.map((i) => (i.id === targetInst.id ? { ...i, ...updatedData } : i))
    );
    setEditingInstitution(null);
    setFeedback({
      type: "success",
      message: `Konfigurasi instansi ${updatedData.name} berhasil diperbarui!`,
    });

    try {
      const res = await updateInstitutionAction(targetInst.id, updatedData);
      if (res.success && res.institution) {
        setInstitutions((prev) =>
          prev.map((i) => (i.id === targetInst.id ? res.institution! : i))
        );
        router.refresh();
      } else {
        setInstitutions(previousInstitutions);
        setFeedback({
          type: "error",
          message: res.error || "Gagal memperbarui instansi.",
        });
      }
    } catch {
      setInstitutions(previousInstitutions);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan koneksi saat memperbarui instansi.",
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // --- DELETE ---
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    const targetInst = confirmDelete;
    const previousInstitutions = [...institutions];

    // Optimistic removal
    setInstitutions((prev) => prev.filter((i) => i.id !== targetInst.id));
    setConfirmDelete(null);
    setFeedback({
      type: "success",
      message: `Instansi ${targetInst.name} berhasil dihapus dari sistem.`,
    });

    try {
      const res = await deleteInstitutionAction(targetInst.id);
      if (!res.success) {
        setInstitutions(previousInstitutions);
        setFeedback({
          type: "error",
          message: res.error || "Gagal menghapus instansi dari server.",
        });
      } else {
        router.refresh();
      }
    } catch {
      setInstitutions(previousInstitutions);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menghapus instansi.",
      });
    } finally {
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.description?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && inst.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
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
            Tambah, konfigurasi, dan kelola instansi yang terhubung dengan portal absensi Discord Ophelia.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 transition shadow-lg self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>+ Buat Instansi Baru</span>
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
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari nama instansi, slug, atau deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-neutral-300 px-3 py-2.5 rounded-xl outline-none"
          >
            <option value="ALL">Semua Status ({institutions.length})</option>
            <option value="ACTIVE">Aktif ({institutions.filter((i) => i.status === "ACTIVE").length})</option>
            <option value="INACTIVE">Nonaktif ({institutions.filter((i) => i.status === "INACTIVE").length})</option>
          </select>
        </div>
      </div>

      {/* Institutions Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredInstitutions.length === 0 ? (
          <div className="col-span-2 py-12 text-center rounded-2xl bg-[#111111] border border-[#222] text-neutral-400 text-xs">
            Tidak ada instansi yang cocok dengan filter pencarian.
          </div>
        ) : (
          filteredInstitutions.map((inst) => (
            <div
              key={inst.id}
              className="rounded-2xl bg-[#111111] border border-[#252525] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <InstitutionLogo
                      logo={inst.logo}
                      name={inst.name}
                      size="lg"
                      className="p-1 rounded-xl bg-[#181818] border border-[#262626] shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                        <span className="truncate">{inst.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1f1f] text-neutral-400">
                          /{inst.slug}
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{inst.description}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
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
                    <span className="font-mono text-neutral-300 text-right truncate max-w-[200px]">
                      {inst.discordRoleNames && inst.discordRoleNames.length > 0
                        ? inst.discordRoleNames.join(", ")
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#1f1f1f] flex items-center justify-between gap-2">
                <a
                  href={`/institution/${inst.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition"
                >
                  <span>Buka Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(inst)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3 text-amber-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setConfirmDelete(inst)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/40 border border-red-800/30 transition flex items-center gap-1.5 cursor-pointer"
                    title="Hapus instansi"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Buat Instansi Baru</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Daftarkan entitas roleplay baru ke portal absensi Ophelia.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nama Instansi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dinas Pemadam Kebakaran"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value, true)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  URL Slug (Identitas Route) *
                </label>
                <div className="flex items-center gap-1 bg-[#080808] border border-[#252525] px-2.5 rounded-xl">
                  <span className="text-xs text-neutral-500 font-mono">/institution/</span>
                  <input
                    type="text"
                    required
                    placeholder="damkar"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 bg-transparent py-2.5 text-xs text-amber-400 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Deskripsi Instansi
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi tugas dan tanggung jawab..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  URL Logo / Gambar
                </label>
                <input
                  type="text"
                  placeholder="/logos/police.jpg atau https://..."
                  value={formLogo}
                  onChange={(e) => setFormLogo(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Warna Identitas Aksen
                </label>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setFormColor(p.hex)}
                      className={`h-6 w-6 rounded-full border transition-transform ${
                        formColor === p.hex ? "scale-125 border-white ring-2 ring-white/30" : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Role Discord Whitelist (Pisahkan Koma)
                </label>
                <input
                  type="text"
                  placeholder="DAMKAR, KEPALA DAMKAR, RESCUE"
                  value={formRoles}
                  onChange={(e) => setFormRoles(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Status Operasional
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Aktif & Dapat Diakses)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif / Ditutup Sementara)</option>
                </select>
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
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Buat Instansi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingInstitution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingInstitution(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Edit Konfigurasi: {editingInstitution.name}
            </h3>
            <p className="text-xs text-neutral-400 mb-4 font-mono">
              Slug: /{editingInstitution.slug}
            </p>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nama Instansi *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Deskripsi Instansi
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  URL Logo / Gambar
                </label>
                <input
                  type="text"
                  value={formLogo}
                  onChange={(e) => setFormLogo(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Warna Identitas Aksen
                </label>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setFormColor(p.hex)}
                      className={`h-6 w-6 rounded-full border transition-transform ${
                        formColor === p.hex ? "scale-125 border-white ring-2 ring-white/30" : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Role Discord Whitelist (Pisahkan Koma)
                </label>
                <input
                  type="text"
                  value={formRoles}
                  onChange={(e) => setFormRoles(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Status Operasional
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-amber-500 text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Aktif & Dapat Diakses)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif / Ditutup Sementara)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInstitution(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg disabled:opacity-50"
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
                <h3 className="text-base font-bold text-white">Hapus Instansi</h3>
                <p className="text-xs text-neutral-400">Konfirmasi tindakan destruktif</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-[#0c0c0c] border border-[#222] p-3 rounded-xl mb-4">
              Apakah Anda yakin ingin menghapus instansi <b className="text-white">{confirmDelete.name}</b> (/{confirmDelete.slug})?
              Data keanggotaan dan histori tugas instansi ini mungkin tidak dapat diakses lagi.
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
                <span>Ya, Hapus Instansi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
