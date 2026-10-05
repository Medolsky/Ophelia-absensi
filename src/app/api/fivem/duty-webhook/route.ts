import { NextRequest } from "next/server";
import { DataService } from "@/lib/data-service";
import { FIVEM_JOB_TO_INSTITUTION_MAP } from "@/lib/constants";
import { revalidatePath } from "next/cache";

interface DutyWebhookPayload {
  secret?: string;
  event: "DUTY_ON" | "DUTY_OFF" | "PLAYER_DROPPED";
  discordId: string;
  citizenid?: string;
  playerName?: string;
  jobName: string;
  gradeName?: string;
  gradeLevel?: number;
  serverId?: number;
  timestamp?: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const headerSecret = request.headers.get("x-api-secret");
    const body = (await request.json()) as DutyWebhookPayload;

    const expectedSecret =
      process.env.FIVEM_API_SECRET ||
      "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e";

    const providedSecret = body.secret || headerSecret;
    if (providedSecret !== expectedSecret) {
      return Response.json(
        { ok: false, error: "Unauthorized: Invalid FIVEM_API_SECRET" },
        { status: 401 }
      );
    }

    const { event, discordId, citizenid, playerName, jobName, gradeName } = body;

    if (!discordId || typeof discordId !== "string") {
      return Response.json(
        { ok: false, error: "Missing or invalid 'discordId'" },
        { status: 400 }
      );
    }

    if (!jobName || typeof jobName !== "string") {
      return Response.json(
        { ok: false, error: "Missing or invalid 'jobName'" },
        { status: 400 }
      );
    }

    // Map job name to Ophelia institution slug
    const cleanJob = jobName.toLowerCase();
    const institutionSlug = FIVEM_JOB_TO_INSTITUTION_MAP[cleanJob];

    if (!institutionSlug) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: `Job '${jobName}' is not an attendance-tracked institution.`,
      });
    }

    const cleanDiscordId = discordId.replace("discord-", "");
    const formattedUserId = `discord-${cleanDiscordId}`;

    if (event === "DUTY_ON") {
      // Check existing active duty to avoid duplicate
      const active = await DataService.getActiveDutySession(formattedUserId);
      if (active && active.status === "ON_DUTY") {
        return Response.json({
          ok: true,
          action: "ALREADY_ON_DUTY",
          sessionId: active.id,
          message: "User is already on duty in this or another institution.",
        });
      }

      const result = await DataService.startDuty({
        userId: formattedUserId,
        userName: playerName || "Officer / Staff",
        positionName: gradeName || "Staff",
        institutionSlug,
        notes: citizenid
          ? `Auto FiveM On-Duty [CID: ${citizenid}]`
          : `Auto FiveM On-Duty`,
      });

      if (!result.success) {
        return Response.json(
          { ok: false, error: result.error || "Failed to start duty" },
          { status: 400 }
        );
      }

      // Revalidate cache paths
      try {
        revalidatePath(`/institution/${institutionSlug}`);
        revalidatePath(`/institution/${institutionSlug}/duty`);
        revalidatePath(`/institution/${institutionSlug}/live`);
        revalidatePath(`/institution/${institutionSlug}/attendance`);
        revalidatePath(`/institution/${institutionSlug}/city`);
      } catch (e) {
        // Safe in API context
      }

      return Response.json({
        ok: true,
        action: "DUTY_STARTED",
        sessionId: result.session?.id,
        institutionSlug,
        timestamp: new Date().toISOString(),
      });
    } else if (event === "DUTY_OFF" || event === "PLAYER_DROPPED") {
      const active = await DataService.getActiveDutySession(formattedUserId);
      if (!active) {
        return Response.json({
          ok: true,
          action: "NO_ACTIVE_DUTY",
          message: "No active duty session found to end.",
        });
      }

      const result = await DataService.endDuty({
        userId: formattedUserId,
        institutionSlug,
      });

      try {
        revalidatePath(`/institution/${institutionSlug}`);
        revalidatePath(`/institution/${institutionSlug}/duty`);
        revalidatePath(`/institution/${institutionSlug}/live`);
        revalidatePath(`/institution/${institutionSlug}/attendance`);
        revalidatePath(`/institution/${institutionSlug}/city`);
      } catch (e) {
        // Safe in API context
      }

      return Response.json({
        ok: true,
        action: "DUTY_ENDED",
        sessionId: result.session?.id,
        durationSeconds: result.session?.durationSeconds,
        reason: body.reason || event,
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json(
      { ok: false, error: `Unsupported event type: '${event}'` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[FiveM Duty Webhook Error]:", err);
    return Response.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
