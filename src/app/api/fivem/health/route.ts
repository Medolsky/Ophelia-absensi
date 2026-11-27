import { FiveMBridge } from "@/lib/fivem-bridge";

export const dynamic = "force-dynamic";

/**
 * GET /api/fivem/health
 *
 * Health check endpoint for the FiveM bridge & web dashboard.
 */
export async function GET() {
  const serverStatus = await FiveMBridge.getServerStatus();
  return Response.json({
    ok: true,
    service: "ophelia-fivem-bridge",
    version: "2.0.0",
    serverConnected: serverStatus.connected,
    lastHeartbeatAt: serverStatus.lastHeartbeatAt,
    onlinePlayers: serverStatus.onlineCount,
    timestamp: new Date().toISOString(),
  });
}
