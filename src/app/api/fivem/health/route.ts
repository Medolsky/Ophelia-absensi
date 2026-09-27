/**
 * GET /api/fivem/health
 *
 * Simple health check endpoint for the FiveM bridge.
 * Returns server status and timestamp.
 */
export async function GET() {
  return Response.json({
    ok: true,
    service: "ophelia-fivem-bridge",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
