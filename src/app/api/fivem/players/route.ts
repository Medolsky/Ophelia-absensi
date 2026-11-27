import { NextRequest } from "next/server";
import { FiveMBridge } from "@/lib/fivem-bridge";
import { getFiveMApiSecret } from "@/lib/fivem-config";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

interface IncomingFiveMPlayer {
  discordId: string;
  serverId: number;
  name: string;
  citizenid?: string;
  job?: {
    name: string;
    label: string;
    onduty: boolean;
    grade?: { name: string; level: number };
  };
}

/**
 * POST /api/fivem/players
 *
 * Receives player list from FiveM server Lua script.
 * Accepts secret in JSON body (`secret`) or header (`X-API-Secret`).
 * Automatically stops active attendance for any user no longer online in the FiveM server.
 */
export async function POST(request: NextRequest) {
  try {
    const headerSecret = request.headers.get("x-api-secret");
    const body = (await request.json()) as {
      players?: IncomingFiveMPlayer[];
      secret?: string;
    };
    const { players, secret } = body;

    // Verify shared secret (identik dengan config.lua FiveM)
    const expectedSecret = getFiveMApiSecret();
    const providedSecret = (secret || headerSecret || "").trim();

    if (!providedSecret || providedSecret !== expectedSecret) {
      return Response.json(
        { ok: false, error: "Unauthorized: invalid FIVEM_API_SECRET" },
        { status: 401 }
      );
    }

    // Lua's json.encode({}) encodes an empty array as `{}` — normalize safely to `[]`
    const normalizedPlayers: IncomingFiveMPlayer[] | null = Array.isArray(players)
      ? players
      : players && typeof players === "object" && Object.keys(players).length === 0
      ? []
      : null;

    if (!normalizedPlayers) {
      return Response.json(
        { ok: false, error: "Invalid payload: 'players' must be an array" },
        { status: 400 }
      );
    }

    // Validate each player entry
    for (let i = 0; i < normalizedPlayers.length; i++) {
      const p = normalizedPlayers[i];
      if (!p || !p.discordId || typeof p.discordId !== "string") {
        return Response.json(
          { ok: false, error: `players[${i}].discordId is required and must be a string` },
          { status: 400 }
        );
      }
      if (p.serverId === undefined || typeof p.serverId !== "number" || Number.isNaN(p.serverId)) {
        return Response.json(
          { ok: false, error: `players[${i}].serverId is required and must be a number` },
          { status: 400 }
        );
      }
      if (!p.name || typeof p.name !== "string") {
        return Response.json(
          { ok: false, error: `players[${i}].name is required and must be a string` },
          { status: 400 }
        );
      }
    }

    const result = await FiveMBridge.syncPlayers(normalizedPlayers);

    // Revalidate affected institution routes if any sessions were auto-closed
    if (result.autoClosed > 0) {
      try {
        const affectedSlugs = new Set(
          result.autoClosedSessions
            .map((s) => s.institutionSlug)
            .filter(Boolean) as string[]
        );
        for (const slug of affectedSlugs) {
          revalidatePath(`/institution/${slug}`);
          revalidatePath(`/institution/${slug}/duty`);
          revalidatePath(`/institution/${slug}/live`);
          revalidatePath(`/institution/${slug}/attendance`);
          revalidatePath(`/institution/${slug}/history`);
          revalidatePath(`/institution/${slug}/city`);
        }
        revalidatePath("/", "layout");
      } catch {}
    }

    return Response.json({
      ok: true,
      synced: result.synced,
      wentOffline: result.wentOffline,
      autoClosed: result.autoClosed,
      autoClosedSessions: result.autoClosedSessions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("FiveM player sync error:", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fivem/players
 *
 * Returns currently online FiveM players and bridge connection status.
 */
export async function GET() {
  try {
    const [players, serverStatus] = await Promise.all([
      FiveMBridge.getOnlinePlayers(),
      FiveMBridge.getServerStatus(),
    ]);
    return Response.json({
      ok: true,
      serverConnected: serverStatus.connected,
      lastHeartbeatAt: serverStatus.lastHeartbeatAt,
      players,
      count: players.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("FiveM get players error:", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
