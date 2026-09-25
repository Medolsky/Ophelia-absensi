"use client";

import { useState } from "react";
import { MembershipData } from "@/types";
import { Users, Search, Plus, UserPlus, Check, X, Shield, Clock, Edit2 } from "lucide-react";

interface MemberManagementProps {
  initialMemberships: MembershipData[];
  institutionSlug: string;
}

export function MemberManagementTable({
  initialMemberships,
  institutionSlug,
}: MemberManagementProps) {
  const [members, setMembers] = useState(initialMemberships);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MembershipData | null>(null);

  // Form states
  const [newDiscordId, setNewDiscordId] = useState("");
  const [newPosition, setNewPosition] = useState("Officer");
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");

  const filteredMembers = members.filter(
    (m) =>
      m.user?.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user?.discordUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.positionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user?.discordId.includes(searchTerm)
  );

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscordId) return;

    const newMem: MembershipData = {
      id: `mem-${Date.now()}`,
      userId: `user-${Date.now()}`,
      institutionId: institutionSlug,
      positionName: newPosition,
      permissionLevel: newPosition.toLowerCase().includes("chief") ? "LEADER" : "MEMBER",
      status: newStatus,
      joinedAt: new Date().toISOString(),
      user: {
        id: `user-${Date.now()}`,
        discordId: newDiscordId,
        discordUsername: `user_${newDiscordId.slice(-4)}`,
        displayName: `Anggota Baru (${newDiscordId.slice(-4)})`,
        discordAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      },
    };

    setMembers([newMem, ...members]);
    setShowAddModal(false);
    setNewDiscordId("");
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setMembers(
      members.map((m) =>
        m.id === editingMember.id
          ? {
              ...m,
              positionName: editingMember.positionName,
              status: editingMember.status,
            }
          : m
      )
    );
    setEditingMember(null);
  };

  return (
    <div className="space-y-4">
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

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-md glow-red-sm self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Tambah Anggota</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Anggota</th>
                <th className="py-3.5 px-4">Discord ID</th>
                <th className="py-3.5 px-4">Jabatan / Pangkat</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Bergabung</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredMembers.map((mem) => {
                const statusColor =
                  mem.status === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : mem.status === "SUSPENDED"
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : "bg-neutral-800 text-neutral-400 border-neutral-700";

                return (
                  <tr key={mem.id} className="hover:bg-[#161616] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            mem.user?.discordAvatar ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
                          }
                          alt={mem.user?.displayName || "Member"}
                          className="h-9 w-9 rounded-xl object-cover border border-[#333]"
                        />
                        <div>
                          <div className="font-bold text-white">
                            {mem.user?.displayName || "Anggota"}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            @{mem.user?.discordUsername}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      {mem.user?.discordId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {mem.positionName || "Officer"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${statusColor}`}
                      >
                        {mem.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-400">
                      {new Date(mem.joinedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setEditingMember(mem)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] transition"
                      >
                        <Edit2 className="h-3 w-3 text-[#FF1E2D]" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal (PRD Section 19) */}
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
                  placeholder="Contoh: 982736410293847101"
                  value={newDiscordId}
                  onChange={(e) => setNewDiscordId(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Jabatan / Pangkat
                </label>
                <input
                  type="text"
                  required
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
                />
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
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] shadow-lg glow-red-sm"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal (PRD Section 20 & 21) */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#252525] shadow-2xl p-6 relative">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Edit Anggota: {editingMember.user?.displayName}
            </h3>
            <p className="text-xs text-neutral-400 mb-4 font-mono">
              Discord ID: {editingMember.user?.discordId}
            </p>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Jabatan / Pangkat
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.positionName || ""}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, positionName: e.target.value })
                  }
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Status (PRD: Soft State - Anti Hard Delete)
                </label>
                <select
                  value={editingMember.status}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, status: e.target.value as any })
                  }
                  className="w-full bg-[#080808] border border-[#252525] focus:border-[#E50914] text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
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
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] shadow-lg glow-red-sm"
                >
                  Update Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
