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
