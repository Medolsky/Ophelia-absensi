"use server";

import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { revalidatePath } from "next/cache";

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

  if (result.success) {
    revalidatePath(`/institution/${institutionSlug}`);
    revalidatePath(`/institution/${institutionSlug}/duty`);
    revalidatePath(`/institution/${institutionSlug}/attendance`);
    revalidatePath(`/institution/${institutionSlug}/live`);
  }

  return result;
}

export async function endDutyAction(institutionSlug: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  const result = await DataService.endDuty({
    userId: user.id,
    institutionSlug,
  });

  if (result.success) {
    revalidatePath(`/institution/${institutionSlug}`);
    revalidatePath(`/institution/${institutionSlug}/duty`);
    revalidatePath(`/institution/${institutionSlug}/attendance`);
    revalidatePath(`/institution/${institutionSlug}/statistics`);
    revalidatePath(`/institution/${institutionSlug}/live`);
  }

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

  // PRD Section 22: Must be LEADER or SUPER_ADMIN to correct attendance
  const access = await verifyInstitutionAccess(user, params.institutionSlug);
  if (access.permissionLevel !== "LEADER" && access.permissionLevel !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Hanya Petinggi (Leader) atau Super Admin yang dapat melakukan koreksi absensi.",
    };
  }

  if (!params.reason || params.reason.trim().length < 5) {
    return { success: false, error: "Alasan koreksi absensi wajib diisi (minimal 5 karakter)." };
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
    revalidatePath(`/institution/${params.institutionSlug}/attendance`);
    revalidatePath(`/institution/${params.institutionSlug}/members`);
  }

  return result;
}
