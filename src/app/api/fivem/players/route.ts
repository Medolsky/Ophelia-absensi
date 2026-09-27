import { NextRequest } from "next/server";
import { FiveMBridge } from "@/lib/fivem-bridge";

/**
 * POST /api/fivem/players
 *
 * Receives player list from FiveM server Lua script.
 * Body: { players: [{ discordId, serverId, name }], secret: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { players, secret } = body;

    // Verify shared secret (identik dengan config.lua FiveM)
    const expectedSecret =
      process.env.FIVEM_API_SECRET ||
      "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e";
    if (secret !== expectedSecret) {
      return Response.json(
        { ok: false, error: "Unauthorized: invalid FIVEM_API_SECRET" },
        { status: 401 }
      );
    }

    if (!Array.isArray(players)) {
      return Response.json(
        { ok: false, error: "Invalid payload: 'players' must be an array" },
        { status: 400 }
      );
    }

    // Validate each player entry
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.discordId || typeof p.discordId !== "string") {
        return Response.json(
          { ok: false, error: `players[${i}].discordId is required and must be a string` },
          { status: 400 }
        );
      }
      if (p.serverId === undefined || typeof p.serverId !== "number") {
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

    const result = await FiveMBridge.syncPlayers(players);

    return Response.json({
      ok: true,
      synced: result.synced,
      wentOffline: result.wentOffline,
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
 * Returns currently online FiveM players.
 * Also used by the Lua script as a health check.
 */
export async function GET() {
  try {
    const players = await FiveMBridge.getOnlinePlayers();
    return Response.json({
      ok: true,
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
