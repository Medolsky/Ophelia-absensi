"use server";

import { getCurrentUser, verifyInstitutionAccess, isDiscordAdmin } from "@/lib/auth";
import { DataService, normalizeInstSlug } from "@/lib/data-service";
import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";

export async function startDutyAction(institutionSlug: string, notes?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  // PRD Section 6 & 29: Backend verify Discord Role
  const access = await verifyInstitutionAccess(user, institutionSlug);
  if (!access.allowed) {
    return {
      success: false,
      error: access.reason || "403: Anda tidak memiliki wewenang untuk masuk instansi ini.",
    };
  }

  const result = await DataService.startDuty({
    userId: user.id,
    userName: user.displayName || user.discordUsername,
    userAvatar: user.discordAvatar,
    institutionSlug,
    notes,
  });

  if (result.success && result.session) {
    // Persist active duty in cookie so all serverless lambdas receive it
    const cookieStore = await cookies();
    const cookieValue = JSON.stringify(result.session);
    cookieStore.set("ophelia_active_duty", cookieValue, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    cookieStore.set(`ophelia_active_duty_${institutionSlug}`, cookieValue, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    revalidatePath(`/institution/${institutionSlug}`);
    revalidatePath(`/institution/${institutionSlug}/duty`);
    revalidatePath(`/institution/${institutionSlug}/attendance`);
    revalidatePath(`/institution/${institutionSlug}/history`);
    revalidatePath(`/institution/${institutionSlug}/live`);
    revalidatePath(`/institution/${institutionSlug}/city`);
    revalidatePath(`/institution/${institutionSlug}/statistics`);
    revalidatePath("/", "layout");
  }

  return result;
}

export async function endDutyAction(institutionSlug?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  const result = await DataService.endDuty({
    userId: user.id,
    institutionSlug,
  });

  // Always delete all active duty cookies on end duty
  const cookieStore = await cookies();
  cookieStore.delete("ophelia_active_duty");
  cookieStore.delete("ophelia_current_active_duty");

  const allSlugs = [
    institutionSlug,
    institutionSlug ? institutionSlug.replace("inst-", "") : "",
    "police",
    "medical",
    "mechanic",
    "restaurant",
    "pemerintah",
  ].filter(Boolean) as string[];

  allSlugs.forEach((s) => {
    cookieStore.delete(`ophelia_active_duty_${s}`);
    cookieStore.delete(`ophelia_active_duty_inst-${s}`);
  });

  if (institutionSlug) {
    revalidatePath(`/institution/${institutionSlug}`);
    revalidatePath(`/institution/${institutionSlug}/duty`);
    revalidatePath(`/institution/${institutionSlug}/attendance`);
    revalidatePath(`/institution/${institutionSlug}/history`);
    revalidatePath(`/institution/${institutionSlug}/statistics`);
    revalidatePath(`/institution/${institutionSlug}/live`);
    revalidatePath(`/institution/${institutionSlug}/city`);
  }
  revalidatePath("/", "layout");

  return result;
}

export async function correctAttendanceAction(params: {
  institutionSlug: string;
  dutySessionId: string;
  newStart: string;
  newEnd: string;
  reason: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  const cleanSlug = normalizeInstSlug(params.institutionSlug);
  const access = await verifyInstitutionAccess(user, cleanSlug);
  const isAdmin = isDiscordAdmin(user);
  const isLeader = access.permissionLevel === "LEADER" || access.permissionLevel === "SUPER_ADMIN";

  if (!isAdmin && !isLeader) {
    return {
      success: false,
      error: "Hanya Admin Discord atau Petinggi instansi yang dapat melakukan koreksi absensi.",
    };
  }

  if (!params.reason || params.reason.trim().length < 3) {
    return { success: false, error: "Alasan koreksi absensi wajib diisi (minimal 3 karakter)." };
  }

  const result = await DataService.correctAttendance({
    dutySessionId: params.dutySessionId,
    editorId: user.id,
    editorName: user.displayName || user.discordUsername,
    newStart: params.newStart,
    newEnd: params.newEnd,
    reason: params.reason,
  });

  if (result.success) {
    revalidatePath(`/institution/${cleanSlug}`);
    revalidatePath(`/institution/${cleanSlug}/attendance`);
    revalidatePath(`/institution/${cleanSlug}/history`);
    revalidatePath(`/institution/${cleanSlug}/live`);
    revalidatePath(`/institution/${cleanSlug}/members`);
    revalidatePath(`/institution/${cleanSlug}/statistics`);
    revalidatePath("/", "layout");
  }

  return result;
}
