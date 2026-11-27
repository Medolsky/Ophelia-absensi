"use server";

import { getCurrentUser, verifyInstitutionAccess, isDiscordAdmin } from "@/lib/auth";
import { DataService, normalizeInstSlug } from "@/lib/data-service";
import { FiveMBridge } from "@/lib/fivem-bridge";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

function clearLegacyDutyCookies(cookieStore: Awaited<ReturnType<typeof cookies>>, institutionSlug?: string) {
  cookieStore.delete("ophelia_active_duty");
  cookieStore.delete("ophelia_current_active_duty");

  const allSlugs = [
    institutionSlug,
    institutionSlug ? normalizeInstSlug(institutionSlug) : "",
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
}

export async function startDutyAction(institutionSlug: string, notes?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  const cleanSlug = normalizeInstSlug(institutionSlug);

  // Backend verify Discord Role
  const access = await verifyInstitutionAccess(user, cleanSlug);
  if (!access.allowed) {
    return {
      success: false,
      error: access.reason || "403: Anda tidak memiliki wewenang untuk masuk instansi ini.",
    };
  }

  // FiveM Online Guard:
  // If the FiveM server bridge is actively connected and strict mode is enabled (default),
  // require the player to be inside the FiveM server/city before starting attendance.
  const requireOnline = process.env.REQUIRE_FIVEM_ONLINE !== "false";
  const isDemoAccount =
    process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true" && user.id.startsWith("user-");

  if (requireOnline && !isDemoAccount) {
    const fivemStatus = await FiveMBridge.getPlayerOnlineStatus(user.discordId);
    if (fivemStatus.serverConnected && !fivemStatus.isOnline) {
      return {
        success: false,
        error:
          "Anda belum terdeteksi masuk kota (server FiveM). Silakan masuk ke server FiveM terlebih dahulu (pastikan akun Discord tertaut di FiveM), lalu tekan START DUTY lagi.",
      };
    }
  }

  const result = await DataService.startDuty({
    userId: user.id,
    userName: user.displayName || user.discordUsername,
    userAvatar: user.discordAvatar,
    institutionSlug: cleanSlug,
    notes,
  });

  if (result.success && result.session) {
    // Clear any legacy duty cookies so server state remains single source of truth
    const cookieStore = await cookies();
    clearLegacyDutyCookies(cookieStore, cleanSlug);

    FiveMBridge.invalidateCityStatusCache();

    revalidatePath(`/institution/${cleanSlug}`);
    revalidatePath(`/institution/${cleanSlug}/duty`);
    revalidatePath(`/institution/${cleanSlug}/attendance`);
    revalidatePath(`/institution/${cleanSlug}/history`);
    revalidatePath(`/institution/${cleanSlug}/live`);
    revalidatePath(`/institution/${cleanSlug}/city`);
    revalidatePath(`/institution/${cleanSlug}/statistics`);
    revalidatePath("/", "layout");
  }

  return result;
}

export async function endDutyAction(institutionSlug?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  const cleanSlug = institutionSlug ? normalizeInstSlug(institutionSlug) : undefined;

  const result = await DataService.endDuty({
    userId: user.id,
    institutionSlug: cleanSlug,
    status: "COMPLETED",
  });

  // Always delete all legacy active duty cookies on end duty
  const cookieStore = await cookies();
  clearLegacyDutyCookies(cookieStore, cleanSlug);

  FiveMBridge.invalidateCityStatusCache();

  if (cleanSlug) {
    revalidatePath(`/institution/${cleanSlug}`);
    revalidatePath(`/institution/${cleanSlug}/duty`);
    revalidatePath(`/institution/${cleanSlug}/attendance`);
    revalidatePath(`/institution/${cleanSlug}/history`);
    revalidatePath(`/institution/${cleanSlug}/statistics`);
    revalidatePath(`/institution/${cleanSlug}/live`);
    revalidatePath(`/institution/${cleanSlug}/city`);
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
    FiveMBridge.invalidateCityStatusCache();

    revalidatePath(`/institution/${cleanSlug}`);
    revalidatePath(`/institution/${cleanSlug}/attendance`);
    revalidatePath(`/institution/${cleanSlug}/history`);
    revalidatePath(`/institution/${cleanSlug}/live`);
    revalidatePath(`/institution/${cleanSlug}/city`);
    revalidatePath(`/institution/${cleanSlug}/members`);
    revalidatePath(`/institution/${cleanSlug}/statistics`);
    revalidatePath("/", "layout");
  }

  return result;
}
