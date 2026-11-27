import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DataService, normalizeInstSlug } from "@/lib/data-service";
import { FiveMBridge } from "@/lib/fivem-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/duty/me?institution=<slug>
 *
 * Authoritative live status endpoint polled by DutyTimer & Navbar.
 * Returns:
 * - activeSession: current active ON_DUTY session (null if ended or auto-stopped by FiveM)
 * - lastAutoClosedSession: latest AUTO_CLOSED session for user (to show auto-stop alert banner)
 * - fivem: live FiveM server connection & player online status in city
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const rawSlug = request.nextUrl.searchParams.get("institution") || undefined;
    const cleanSlug = rawSlug ? normalizeInstSlug(rawSlug) : undefined;

    const [activeSession, lastAutoClosedSession, playerStatus] = await Promise.all([
      DataService.getActiveDutySession(user.id, true),
      DataService.getLatestAutoClosedSession(user.id, cleanSlug),
      FiveMBridge.getPlayerOnlineStatus(user.discordId),
    ]);

    const requireOnlineToStart = process.env.REQUIRE_FIVEM_ONLINE !== "false";

    return Response.json(
      {
        ok: true,
        activeSession,
        lastAutoClosedSession,
        fivem: {
          serverConnected: playerStatus.serverConnected,
          lastHeartbeatAt: playerStatus.lastHeartbeatAt,
          playerOnline: playerStatus.isOnline,
          serverId: playerStatus.player?.serverId ?? null,
          playerName: playerStatus.player?.playerName ?? null,
          requireOnlineToStart,
        },
        timestamp: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("[API /api/duty/me Error]:", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
