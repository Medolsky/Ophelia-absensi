import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI || `${appUrl}/api/auth/discord/callback`;

  if (!clientId) {
    // If not configured, redirect back to landing page with helper notice
    return NextResponse.redirect(new URL("/?discord_notice=missing_credentials", appUrl));
  }

  const scope = encodeURIComponent("identify guilds guilds.members.read");
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}`;

  return NextResponse.redirect(discordAuthUrl);
}

