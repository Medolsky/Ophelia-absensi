"use server";

import { setCurrentUser, logoutUser } from "@/lib/auth";
import { DEMO_PERSONAS } from "@/lib/constants";
import { revalidatePath } from "next/cache";

export async function switchUserPersonaAction(personaId: string) {
  const persona = DEMO_PERSONAS.find((p) => p.id === personaId);
  if (!persona) {
    return { success: false, error: "Persona tidak ditemukan" };
  }

  await setCurrentUser(persona);
  revalidatePath("/", "layout");
  return { success: true, user: persona };
}

export async function logoutAction() {
  await logoutUser();
  revalidatePath("/", "layout");
  return { success: true };
}

export async function syncDiscordRolesAction() {
  const { getCurrentUser } = await import("@/lib/auth");
  const { DataService } = await import("@/lib/data-service");

  const user = await getCurrentUser();
  if (!user || !user.discordId || user.discordId.startsWith("demo-")) {
    return { success: false, error: "Bukan akun Discord resmi atau belum login." };
  }

  const syncedUser = await DataService.syncDiscordUser(user.discordId, true);
  if (!syncedUser) {
    return { success: false, error: "Gagal menyinkronkan data dari Discord." };
  }

  await setCurrentUser(syncedUser);
  revalidatePath("/", "layout");
  return {
    success: true,
    user: syncedUser,
    roles: syncedUser.discordRoles,
    isSuperAdmin: syncedUser.isSuperAdmin,
  };
}
