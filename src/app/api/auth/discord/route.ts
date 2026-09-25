import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || "http://localhost:3000/api/auth/discord/callback";

  if (!clientId) {
    // If not configured, redirect back to landing page with helper notice
    return NextResponse.redirect(new URL("/?discord_notice=missing_credentials", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  const scope = encodeURIComponent("identify guilds guilds.members.read");
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}`;

  return NextResponse.redirect(discordAuthUrl);
}
