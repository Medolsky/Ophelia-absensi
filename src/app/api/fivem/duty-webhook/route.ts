import { NextRequest } from "next/server";
import { DataService, normalizeDiscordId } from "@/lib/data-service";
import { FiveMBridge } from "@/lib/fivem-bridge";
import { FIVEM_JOB_TO_INSTITUTION_MAP } from "@/lib/constants";
import { getFiveMApiSecret } from "@/lib/fivem-config";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

type DutyWebhookEvent =
  | "DUTY_ON"
  | "DUTY_OFF"
  | "PLAYER_DROPPED"
  | "PLAYER_UNLOADED"
  | "SERVER_SHUTDOWN";

interface DutyWebhookPayload {
  secret?: string;
  event: DutyWebhookEvent;
  discordId?: string;
  citizenid?: string;
  playerName?: string;
  jobName?: string;
  gradeName?: string;
  gradeLevel?: number;
  serverId?: number;
  timestamp?: number;
  reason?: string;
}

function revalidateInstitutionPages(slug?: string) {
  try {
    if (slug) {
      revalidatePath(`/institution/${slug}`);
      revalidatePath(`/institution/${slug}/duty`);
      revalidatePath(`/institution/${slug}/live`);
      revalidatePath(`/institution/${slug}/attendance`);
      revalidatePath(`/institution/${slug}/history`);
      revalidatePath(`/institution/${slug}/city`);
      revalidatePath(`/institution/${slug}/statistics`);
    }
    revalidatePath("/", "layout");
  } catch {
    // Revalidation can safely no-op outside standard request context
  }
}

export async function POST(request: NextRequest) {
  try {
    const headerSecret = request.headers.get("x-api-secret");
    const body = (await request.json()) as DutyWebhookPayload;

    const expectedSecret = getFiveMApiSecret();

    const providedSecret = (body.secret || headerSecret || "").trim();
    if (!providedSecret || providedSecret !== expectedSecret) {
      return Response.json(
        { ok: false, error: "Unauthorized: Invalid FIVEM_API_SECRET" },
        { status: 401 }
      );
    }

    const { event, discordId, citizenid, playerName, jobName, gradeName } = body;

    // 0. Handle SERVER_SHUTDOWN: Server FiveM restart/shutdown -> auto-stop all active sessions
    if (event === "SERVER_SHUTDOWN") {
      const reason = body.reason || "Auto Stop: Server FiveM restart / shutdown";
      const summary = await FiveMBridge.handleServerShutdown(reason);
      for (const slug of ["police", "medical", "mechanic", "restaurant", "pemerintah"]) {
        revalidateInstitutionPages(slug);
      }

      console.log(
        `[Duty Webhook] SERVER_SHUTDOWN executed — ${summary.closedSessions} duty session(s) auto-stopped.`
      );

      return Response.json({
        ok: true,
        action: "SERVER_SHUTDOWN_PROCESSED",
        playersMarkedOffline: summary.playersMarkedOffline,
        closedSessions: summary.closedSessions,
        reason,
        timestamp: new Date().toISOString(),
      });
    }

    if (!discordId || typeof discordId !== "string") {
      return Response.json(
        { ok: false, error: "Missing or invalid 'discordId'" },
        { status: 400 }
      );
    }

    const cleanDiscordId = normalizeDiscordId(discordId);
    if (!cleanDiscordId) {
      return Response.json(
        { ok: false, error: "Invalid 'discordId' after normalization" },
        { status: 400 }
      );
    }
    const formattedUserId = `discord-${cleanDiscordId}`;

    // 1. Handle PLAYER_DROPPED / PLAYER_UNLOADED: Immediate Auto-Stop when player leaves city or server
    if (event === "PLAYER_DROPPED" || event === "PLAYER_UNLOADED") {
      const defaultReason =
        event === "PLAYER_UNLOADED"
          ? "Keluar kota / kembali ke menu karakter FiveM"
          : "Keluar kota / disconnect dari server FiveM";
      const reasonDetail = body.reason
        ? `${defaultReason} (${body.reason})`
        : defaultReason;

      const disconnectRes = await FiveMBridge.handlePlayerDisconnect({
        discordId: cleanDiscordId,
        reason: reasonDetail,
        jobName,
      });

      if (!disconnectRes.wasOnDuty) {
        return Response.json({
          ok: true,
          action: "PLAYER_OFFLINE_NO_ACTIVE_DUTY",
          discordId: cleanDiscordId,
          message: "Player disconnect / keluar kota dari server FiveM (tidak sedang on-duty).",
          timestamp: new Date().toISOString(),
        });
      }

      revalidateInstitutionPages(disconnectRes.institutionSlug);

      console.log(
        `[Duty Webhook] ${event} auto-stop absensi executed for ${formattedUserId} (${disconnectRes.institutionSlug || "unknown"})`
      );

      return Response.json({
        ok: true,
        action: "DUTY_ENDED_AUTO_OFFLINE",
        discordId: cleanDiscordId,
        sessionId: disconnectRes.session?.id,
        durationSeconds: disconnectRes.session?.durationSeconds,
        status: disconnectRes.session?.status || "AUTO_CLOSED",
        reason: reasonDetail,
        institutionSlug: disconnectRes.institutionSlug,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Handle DUTY_OFF: Player went off-duty or switched away from tracked job in-game
    if (event === "DUTY_OFF") {
      await FiveMBridge.recordHeartbeat();
      const active = await DataService.getActiveDutySession(formattedUserId, true);
      if (!active) {
        return Response.json({
          ok: true,
          action: "NO_ACTIVE_DUTY",
          message: "Tidak ada sesi absensi aktif untuk dihentikan.",
          timestamp: new Date().toISOString(),
        });
      }

      const targetSlug =
        active.institutionSlug ||
        (jobName ? FIVEM_JOB_TO_INSTITUTION_MAP[jobName.toLowerCase()] : undefined);

      const result = await DataService.endDuty({
        userId: active.userId || formattedUserId,
        institutionSlug: targetSlug,
        status: "AUTO_CLOSED",
        reason: body.reason || "Auto Stop: Off-Duty di server FiveM",
      });

      FiveMBridge.invalidateCityStatusCache();
      revalidateInstitutionPages(targetSlug);

      return Response.json({
        ok: true,
        action: "DUTY_ENDED",
        sessionId: result.session?.id,
        durationSeconds: result.session?.durationSeconds,
        status: result.session?.status || "AUTO_CLOSED",
        reason: body.reason || event,
        institutionSlug: targetSlug,
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Handle DUTY_ON: Start attendance from FiveM (explicit command or in-game duty toggle)
    if (event === "DUTY_ON") {
      await FiveMBridge.recordHeartbeat();

      if (!jobName || typeof jobName !== "string") {
        return Response.json(
          { ok: false, error: "Missing or invalid 'jobName' for DUTY_ON" },
          { status: 400 }
        );
      }

      const cleanJob = jobName.toLowerCase().trim();
      const institutionSlug = FIVEM_JOB_TO_INSTITUTION_MAP[cleanJob];

      if (!institutionSlug) {
        return Response.json({
          ok: true,
          ignored: true,
          reason: `Job '${jobName}' bukan instansi yang terdaftar dalam sistem absensi.`,
          timestamp: new Date().toISOString(),
        });
      }

      const active = await DataService.getActiveDutySession(formattedUserId, true);
      if (active && active.status === "ON_DUTY") {
        return Response.json({
          ok: true,
          action: "ALREADY_ON_DUTY",
          sessionId: active.id,
          institutionSlug: active.institutionSlug,
          message: "Anggota sudah dalam status ON DUTY.",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await DataService.startDuty({
        userId: formattedUserId,
        userName: playerName || "Officer / Staff",
        positionName: gradeName || undefined,
        institutionSlug,
        notes: citizenid
          ? `FiveM On-Duty [CID: ${citizenid}]`
          : "FiveM On-Duty",
      });

      if (!result.success) {
        return Response.json(
          { ok: false, error: result.error || "Failed to start duty" },
          { status: 400 }
        );
      }

      FiveMBridge.invalidateCityStatusCache();
      revalidateInstitutionPages(institutionSlug);

      return Response.json({
        ok: true,
        action: "DUTY_STARTED",
        sessionId: result.session?.id,
        institutionSlug,
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json(
      { ok: false, error: `Unsupported event type: '${String(event)}'` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("[FiveM Duty Webhook Error]:", err);
    return Response.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
