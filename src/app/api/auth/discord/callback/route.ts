import { NextRequest, NextResponse } from "next/server";
import { setCurrentUser } from "@/lib/auth";
import { SessionUser } from "@/types";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", baseUrl));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${baseUrl}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?error=misconfigured_credentials", baseUrl));
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", baseUrl));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch Discord User Identity
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const discordUser = await userRes.json();

    // 3. Fetch Guild Roles (if Bot Token and Guild ID are configured)
    let userRoles: string[] = [];
    if (botToken && guildId) {
      try {
        const memberRes = await fetch(
          `https://discord.com/api/guilds/${guildId}/members/${discordUser.id}`,
          {
            headers: { Authorization: `Bot ${botToken}` },
          }
        );
        if (memberRes.ok) {
          const memberData = await memberRes.json();
          // memberData.roles is array of role IDs
          // Fetch guild roles to resolve role names
          const rolesRes = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${botToken}` },
          });
          if (rolesRes.ok) {
            const allRoles: { id: string; name: string }[] = await rolesRes.json();
            userRoles = allRoles
              .filter((r) => memberData.roles.includes(r.id))
              .map((r) => r.name);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch guild roles:", err);
      }
    }

    // 4. Construct user object
    const sessionUser: SessionUser = {
      id: `discord-${discordUser.id}`,
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      displayName: discordUser.global_name || discordUser.username,
      discordAvatar: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
      discordRoles: userRoles,
      isSuperAdmin: false,
    };

    await setCurrentUser(sessionUser);

    // Redirect to institution selector
    return NextResponse.redirect(new URL("/select-institution", baseUrl));
  } catch (error) {
    console.error("Discord OAuth error:", error);
    return NextResponse.redirect(new URL("/?error=oauth_exception", baseUrl));
  }
}
