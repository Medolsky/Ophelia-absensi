import { NextRequest, NextResponse } from "next/server";
import { setCurrentUser } from "@/lib/auth";
import { SessionUser } from "@/types";
import { KNOWN_DISCORD_ROLE_IDS } from "@/lib/constants";
import { DataService } from "@/lib/data-service";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", baseUrl));
  }

  const clientId = process.env.DISCORD_CLIENT_ID || "1552883862726639686";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || "1482622396946055218";
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

    // 3. Multi-Layer Guild Roles & Administrator Permission Fetch
    let userRoles: string[] = [];
    let isUserSuperAdmin = false;

    // 3a. Check user's guilds to detect Server Owner or Administrator permissions (0x8)
    try {
      const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (guildsRes.ok) {
        const userGuilds: { id: string; owner: boolean; permissions: string }[] = await guildsRes.json();
        const targetGuild = userGuilds.find((g) => g.id === guildId);
        if (targetGuild) {
          const permBigInt = BigInt(targetGuild.permissions || "0");
          const hasAdminPerm = (permBigInt & BigInt(8)) === BigInt(8);
          if (targetGuild.owner || hasAdminPerm) {
            isUserSuperAdmin = true;
            userRoles.push("ADMIN", "PIMPINAN");
          }
        }
      }
    } catch (e) {
      console.warn("Failed to check user guild permissions:", e);
    }

    // 3b. Fetch user member roles using User OAuth2 Token (guilds.members.read scope)
    try {
      const userMemberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (userMemberRes.ok) {
        const userMemberData: { roles?: string[]; nick?: string } = await userMemberRes.json();
        if (Array.isArray(userMemberData.roles)) {
          for (const roleId of userMemberData.roles) {
            const mappedName = KNOWN_DISCORD_ROLE_IDS[roleId];
            if (mappedName && !userRoles.includes(mappedName)) {
              userRoles.push(mappedName);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch user member with OAuth token:", e);
    }

    // 3c. Fetch via Bot Token if available (for dynamic role resolution)
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
          const rolesRes = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${botToken}` },
          });
          if (rolesRes.ok) {
            const allRoles: { id: string; name: string }[] = await rolesRes.json();
            for (const r of allRoles) {
              if (memberData.roles?.includes(r.id) && !userRoles.includes(r.name)) {
                userRoles.push(r.name);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch guild roles via bot:", err);
      }
    }

    // 3d. Check if user has ADMIN, PIMPINAN, or server admin roles
    if (userRoles.some((r) => /admin|pimpinan|owner|founder/i.test(r))) {
      isUserSuperAdmin = true;
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
      isSuperAdmin: isUserSuperAdmin,
    };

    await setCurrentUser(sessionUser);

    // Auto-sync memberships for this authenticated Discord user
    try {
      await DataService.syncUserFromDiscordRoles(sessionUser);
    } catch (syncErr) {
      console.warn("Failed to auto-sync user memberships on login:", syncErr);
    }

    // Redirect to institution selector
    return NextResponse.redirect(new URL("/select-institution", baseUrl));
  } catch (error) {
    console.error("Discord OAuth error:", error);
    return NextResponse.redirect(new URL("/?error=oauth_exception", baseUrl));
  }
}
