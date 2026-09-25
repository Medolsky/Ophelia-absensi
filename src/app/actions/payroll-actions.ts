"use server";

import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { revalidatePath } from "next/cache";

export async function updatePositionSalaryAction(params: {
  institutionSlug: string;
  positionName: string;
  hourlyRate: number;
  minDutyHours: number;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  // Must be LEADER or SUPER_ADMIN
  const access = await verifyInstitutionAccess(user, params.institutionSlug);
  if (access.permissionLevel !== "LEADER" && access.permissionLevel !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Hanya Petinggi (Leader) atau Super Admin yang dapat mengatur tarif gaji jabatan.",
    };
  }

  if (params.hourlyRate < 0) {
    return { success: false, error: "Tarif gaji per jam tidak boleh bernilai negatif." };
  }

  const result = await DataService.updatePositionSalary({
    institutionSlug: params.institutionSlug,
    positionName: params.positionName,
    hourlyRate: params.hourlyRate,
    minDutyHours: params.minDutyHours,
    actorId: user.id,
    actorName: user.displayName || user.discordUsername,
  });

  if (result.success) {
    revalidatePath(`/institution/${params.institutionSlug}/payroll`);
    revalidatePath(`/institution/${params.institutionSlug}/duty`);
  }

  return result;
}

export async function togglePayrollStatusAction(params: {
  institutionSlug: string;
  membershipId: string;
  newStatus: "PENDING" | "PAID";
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Harap login terlebih dahulu." };
  }

  const access = await verifyInstitutionAccess(user, params.institutionSlug);
  if (access.permissionLevel !== "LEADER" && access.permissionLevel !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "Hanya Petinggi atau Super Admin yang dapat mengubah status pembayaran gaji.",
    };
  }

  const result = await DataService.togglePayrollStatus({
    membershipId: params.membershipId,
    newStatus: params.newStatus,
    actorId: user.id,
    actorName: user.displayName || user.discordUsername,
  });

  if (result.success) {
    revalidatePath(`/institution/${params.institutionSlug}/payroll`);
  }

  return result;
}
