"use server";

import { getCurrentUser } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { revalidatePath } from "next/cache";
import { InstitutionData, DiscordRoleMappingData } from "@/types";

// Helper to check super admin
async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    throw new Error("Akses ditolak: Hanya Super Admin yang berhak melakukan operasi ini.");
  }
  return user;
}

// --- INSTITUTION ACTIONS ---

export async function createInstitutionAction(data: {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  primaryColor?: string;
  status?: "ACTIVE" | "INACTIVE";
  discordRoleNames?: string[];
}) {
  try {
    await requireSuperAdmin();
    const created = await DataService.createInstitution(data);
    revalidatePath("/admin/institutions");
    revalidatePath("/select-institution");
    revalidatePath("/");
    return { success: true, institution: created };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateInstitutionAction(
  id: string,
  updates: Partial<InstitutionData>
) {
  try {
    await requireSuperAdmin();
    const updated = await DataService.updateInstitution(id, updates);
    if (!updated) {
      return { success: false, error: "Instansi tidak ditemukan." };
    }
    revalidatePath("/admin/institutions");
    revalidatePath("/select-institution");
    revalidatePath(`/institution/${updated.slug}`);
    revalidatePath("/");
    return { success: true, institution: updated };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteInstitutionAction(id: string) {
  try {
    await requireSuperAdmin();
    const deleted = await DataService.deleteInstitution(id);
    if (!deleted) {
      return { success: false, error: "Instansi tidak ditemukan atau gagal dihapus." };
    }
    revalidatePath("/admin/institutions");
    revalidatePath("/select-institution");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// --- DISCORD ROLE MAPPING ACTIONS ---

export async function getRoleMappingsAction() {
  try {
    await requireSuperAdmin();
    const mappings = await DataService.getDiscordRoleMappings();
    return { success: true, mappings };
  } catch (error) {
    return { success: false, error: (error as Error).message, mappings: [] };
  }
}

export async function createRoleMappingAction(data: Omit<DiscordRoleMappingData, "id">) {
  try {
    await requireSuperAdmin();
    const created = await DataService.createDiscordRoleMapping(data);
    revalidatePath("/admin/discord-mapping");
    return { success: true, mapping: created };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateRoleMappingAction(
  id: string,
  updates: Partial<DiscordRoleMappingData>
) {
  try {
    await requireSuperAdmin();
    const updated = await DataService.updateDiscordRoleMapping(id, updates);
    if (!updated) {
      return { success: false, error: "Role mapping tidak ditemukan." };
    }
    revalidatePath("/admin/discord-mapping");
    return { success: true, mapping: updated };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteRoleMappingAction(id: string) {
  try {
    await requireSuperAdmin();
    const deleted = await DataService.deleteDiscordRoleMapping(id);
    if (!deleted) {
      return { success: false, error: "Role mapping tidak ditemukan atau gagal dihapus." };
    }
    revalidatePath("/admin/discord-mapping");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
