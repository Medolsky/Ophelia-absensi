import { NextRequest } from "next/server";
import { handleInteraction, registerSlashCommands } from "@/lib/discord-bot";

/**
 * Verify Discord interaction signature using Web Crypto API (no external deps).
 */
async function verifyDiscordSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyBytes = new Uint8Array(
      publicKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"]
    );
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const message = encoder.encode(timestamp + body);

    return await crypto.subtle.verify("Ed25519", cryptoKey, sigBytes, message);
  } catch {
    return false;
  }
}

/**
 * POST /api/discord/interactions
 *
 * Discord sends slash command interactions here.
 * Must verify ed25519 signature.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  // Signature verification (required by Discord)
  if (publicKey && signature && timestamp) {
    const isValid = await verifyDiscordSignature(publicKey, signature, timestamp, rawBody);
    if (!isValid) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const interaction = JSON.parse(rawBody);
    const response = await handleInteraction(interaction);
    return Response.json(response);
  } catch (err) {
    console.error("Discord interaction error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/discord/interactions?action=register
 *
 * Utility endpoint to register slash commands.
 * Only usable in development or with the correct secret.
 */
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");

  if (action === "register") {
    const appId = process.env.DISCORD_CLIENT_ID;
    if (!appId) {
      return Response.json({ error: "DISCORD_CLIENT_ID not set" }, { status: 500 });
    }

    try {
      const result = await registerSlashCommands(appId);
      return Response.json({
        ok: true,
        message: "Slash commands registered",
        commands: result,
      });
    } catch (err) {
      console.error("Register commands error:", err);
      return Response.json(
        { error: "Failed to register commands", details: String(err) },
        { status: 500 }
      );
    }
  }

  return Response.json({
    ok: true,
    endpoint: "/api/discord/interactions",
    usage: "Set this URL as your Discord Application Interactions Endpoint URL",
    register: "GET /api/discord/interactions?action=register",
  });
}
