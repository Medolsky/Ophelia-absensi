"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MembershipData } from "@/types";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import {
  Users,
  Search,
  UserPlus,
  RefreshCw,
  Check,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

interface MemberManagementProps {
  initialMemberships: MembershipData[];
  institutionSlug: string;
}

export function MemberManagementTable({
  initialMemberships,
  institutionSlug,
}: MemberManagementProps) {
  const router = useRouter();
  const [members, setMembers] = useState<MembershipData[]>(initialMemberships);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MembershipData | null>(null);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<MembershipData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Form states
  const [newDiscordId, setNewDiscordId] = useState("");
  const [newPosition, setNewPosition] = useState(
    institutionSlug === "medical"
      ? "Medis"
      : institutionSlug === "mechanic"
      ? "Mekanik"
      : institutionSlug === "restaurant"
      ? "Server Resto"
      : institutionSlug === "pemerintah"
      ? "Staff Pemerintah"
      : "Officer"
  );
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Position options per institution
  const positionOptions: Record<string, string[]> = {
    police: [
      "Cadet",
      "Officer",
      "Highway Patrol",
      "SWAT",
      "Senior Officer",
      "Sergeant",
      "Commander",
      "Chief of Police",
    ],
    medical: [
      "Medis",
      "Paramedic",
      "Doctor",
      "Surgeon",
      "Petinggi Medis",
      "Director of Emergency Medicine",
    ],
    mechanic: [
      "Apprentice",
      "Mekanik",
      "Senior Mechanic",
      "Leadhand Mechanic",
      "Petinggi Bengkel",
    ],
    restaurant: [
      "Server Resto",
      "Employee",
      "Supervisor",
      "Petinggi Resto",
      "Restaurant Manager",
    ],
    pemerintah: [
      "Staff Pemerintah",
      "Petinggi Pemerintah",
    ],
  };

  const currentOptions = positionOptions[institutionSlug] || [
    "Officer",
    "Staff",
    "Petinggi",
  ];

  const filteredMembers = members.filter(
    (m) =>
      m.user?.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user?.discordUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.positionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user?.discordId.includes(searchTerm)
  );

  const handleSyncDiscord = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/institution/${institutionSlug}/sync-discord`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        setMembers(data.members);
        router.refresh();
        setFeedback({
          type: "success",
          message: `Berhasil menyinkronkan ${data.count} anggota dari server Discord.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal menyinkronkan data dari Discord.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan koneksi saat menyinkronkan Discord.",
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscordId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/institution/${institutionSlug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordId: newDiscordId.trim(),
          positionName: newPosition,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success && data.member) {
        setMembers((prev) => [data.member, ...prev.filter((m) => m.id !== data.member.id)]);
        setShowAddModal(false);
        setNewDiscordId("");
        router.refresh();
        setFeedback({
          type: "success",
          message: `Anggota ${data.member.user?.displayName || data.member.user?.discordUsername || data.member.user?.discordId} berhasil ditambahkan.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal menambah anggota.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menambah anggota.",
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setIsSubmitting(true);
    const targetMember = editingMember;
    try {
      const res = await fetch(
        `/api/institution/${institutionSlug}/members/${targetMember.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionName: targetMember.positionName,
            status: targetMember.status,
          }),
        }
      );
      const data = await res.json();
      if (data.success && data.member) {
        setMembers((prev) =>
          prev.map((m) => (m.id === data.member.id ? data.member : m))
        );
        setEditingMember(null);
        router.refresh();
        setFeedback({
          type: "success",
          message: `Data anggota ${data.member.user?.displayName} berhasil diperbarui.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal memperbarui anggota.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat memperbarui anggota.",
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleDeleteMember = async () => {
    if (!confirmDeleteMember) return;

    const memberToDelete = confirmDeleteMember;
    setIsDeleting(true);

    // Optimistic UI removal - instant in 0ms!
    const previousMembers = [...members];
    setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
    setConfirmDeleteMember(null);
    setFeedback({
      type: "success",
      message: `Anggota ${memberToDelete.user?.displayName || memberToDelete.user?.discordUsername} berhasil dikeluarkan dari instansi.`,
    });

    try {
      const res = await fetch(
        `/api/institution/${institutionSlug}/members/${memberToDelete.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (!data.success) {
        // Rollback if server failed
        setMembers(previousMembers);
        setFeedback({
          type: "error",
          message: data.error || "Gagal mengeluarkan anggota dari server.",
        });
      } else {
        router.refresh();
      }
    } catch {
      setMembers(previousMembers);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan koneksi saat menghapus anggota.",
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold border ${
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

      {/* Top action bar */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari nama, username Discord, atau ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Sync Discord Button */}
          <button
            onClick={handleSyncDiscord}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#333] transition shadow-md disabled:opacity-50"
            title="Tarik otomatis seluruh anggota yang memiliki role instansi ini dari Discord server"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-blue-400 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span>{isSyncing ? "Menyinkronkan..." : "Sinkronisasi Discord"}</span>
          </button>

          {/* Add Member Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-md glow-red-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Anggota</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Discord ID</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Jabatan / Pangkat</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tingkat Akses</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Bergabung</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    Tidak ada anggota yang ditemukan. Klik tombol{" "}
                    <span className="font-semibold text-white">Sinkronisasi Discord</span>{" "}
                    untuk menarik data otomatis dari server Discord.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((mem) => {
                  const statusColor =
                    mem.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : mem.status === "SUSPENDED"
                      ? "bg-red-500/15 text-red-400 border-red-500/30"
                      : "bg-neutral-800 text-neutral-400 border-neutral-700";

                  const isLeader =
                    mem.permissionLevel === "LEADER" ||
                    mem.permissionLevel === "SUPER_ADMIN";

                  return (
                    <tr key={mem.id} className="hover:bg-[#161616] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getDiscordAvatarUrl(mem.user?.discordId, mem.user?.discordAvatar)}
                            alt={mem.user?.displayName || "Member"}
                            className="h-9 w-9 rounded-xl object-cover border border-[#333] shrink-0"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback = getDiscordAvatarUrl(mem.user?.discordId, null);
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-[160px] sm:max-w-[220px]">
                              {mem.user?.displayName || "Anggota"}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate max-w-[160px] sm:max-w-[220px]">
                              @{mem.user?.discordUsername}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300 whitespace-nowrap">
                        {mem.user?.discordId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                        <span className="font-semibold text-neutral-200">
                          {mem.positionName || "Officer"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                            isLeader
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {mem.permissionLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${statusColor}`}
                        >
                          {mem.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                        {new Date(mem.joinedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingMember(mem)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] transition"
                            title="Edit Jabatan atau Status"
                          >
                            <Edit2 className="h-3 w-3 text-amber-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteMember(mem)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/40 border border-red-800/30 transition"
                            title="Keluarkan anggota dari instansi"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Tambah Anggota Instansi</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Gunakan Discord User ID anggota yang telah memiliki whitelist server.
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Discord User ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1379103020490555433"
                  value={newDiscordId}
                  onChange={(e) => setNewDiscordId(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Jabatan / Pangkat
                </label>
                <select
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  {currentOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Status Keaktifan
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Aktif)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif)</option>
                  <option value="SUSPENDED">SUSPENDED (Skorsing)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] shadow-lg glow-red-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Anggota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-8">
              <img
                src={getDiscordAvatarUrl(editingMember.user?.discordId, editingMember.user?.discordAvatar)}
                alt={editingMember.user?.displayName || "Member"}
                className="h-10 w-10 rounded-xl object-cover border border-[#333] shrink-0"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = getDiscordAvatarUrl(editingMember.user?.discordId, null);
                  if (target.src !== fallback) {
                    target.src = fallback;
                  }
                }}
              />
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">
                  Edit Anggota: {editingMember.user?.displayName}
                </h3>
                <p className="text-xs text-neutral-400 font-mono truncate">
                  Discord ID: {editingMember.user?.discordId}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Jabatan / Pangkat
                </label>
                <select
                  value={editingMember.positionName || currentOptions[0]}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, positionName: e.target.value })
                  }
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  {currentOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Status (Soft State - Nonaktifkan tanpa hapus histori)
                </label>
                <select
                  value={editingMember.status}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, status: e.target.value as any })
                  }
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Aktif)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif)</option>
                  <option value="SUSPENDED">SUSPENDED (Skorsing)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] shadow-lg glow-red-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Update Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {confirmDeleteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-red-900/50 shadow-2xl p-6 relative">
            <button
              onClick={() => setConfirmDeleteMember(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-500 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Keluarkan Anggota</h3>
                <p className="text-xs text-neutral-400">
                  Konfirmasi pengeluaran dari instansi ini
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-[#0c0c0c] border border-[#222] p-3 rounded-xl mb-4">
              Apakah Anda yakin ingin mengeluarkan{" "}
              <b className="text-white">
                {confirmDeleteMember.user?.displayName || confirmDeleteMember.user?.discordUsername}
              </b>{" "}
              (ID: <span className="font-mono text-neutral-400">{confirmDeleteMember.user?.discordId}</span>) dari daftar keanggotaan instansi?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteMember(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-950/50 transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? "Mengeluarkan..." : "Ya, Keluarkan Anggota"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
