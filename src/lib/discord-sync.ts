import { MembershipData, SessionUser, PermissionLevel } from "@/types";
import { KNOWN_DISCORD_ROLE_IDS } from "./constants";

export interface DiscordMemberInfo {
  id: string;
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  roleIds: string[];
}

export interface MappedInstitutionRole {
  institutionSlug: string;
  institutionName: string;
  positionName: string;
  permissionLevel: PermissionLevel;
}

/**
 * Resolves a Discord avatar URL, falling back to Discord's official default avatar.
 */
export function getDiscordAvatarUrl(
  discordId?: string | null,
  avatarUrl?: string | null
): string {
  if (
    avatarUrl &&
    avatarUrl.trim().length > 0 &&
    !avatarUrl.includes("unsplash.com") &&
    !avatarUrl.includes("ui-avatars.com")
  ) {
    return avatarUrl;
  }
  if (!discordId) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
  try {
    const cleanId = discordId.replace(/\D/g, "");
    const defaultIndex = Number((BigInt(cleanId) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${Math.abs(defaultIndex)}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

/**
 * Remove emojis, special bullets, and excessive spaces from role names.
 * Ensures zero-emoji compliance.
 */
export function cleanRoleName(name: string): string {
  return name
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map Discord role names or IDs to institution positions and permissions
 */
export function mapDiscordRolesToInstitutions(
  roleNames: string[],
  roleIds: string[] = []
): MappedInstitutionRole[] {
  const results: MappedInstitutionRole[] = [];

  const allRoleStrings = [
    ...roleNames.map((r) => cleanRoleName(r).toUpperCase()),
    ...roleNames.map((r) => r.toUpperCase()),
    ...roleIds.map((id) => (KNOWN_DISCORD_ROLE_IDS[id] || "").toUpperCase()),
  ].filter(Boolean);

  const hasAdmin = allRoleStrings.some((r) =>
    r.includes("ADMIN") || r.includes("PIMPINAN") || r.includes("OWNER")
  );

  // 1. Police
  const hasPoliceChief =
    roleIds.includes("1482622396954312807") ||
    allRoleStrings.some((r) => r.includes("CHIEF OF POLICE") || r.includes("POLICE CHIEF") || r.includes("KAPOLRES"));
  const hasSwat =
    roleIds.includes("1508742513874440303") ||
    allRoleStrings.some((r) => r.includes("SWAT"));
  const hasHighway =
    roleIds.includes("1508742898194186330") ||
    allRoleStrings.some((r) => r.includes("HIGHWAY PATROL"));
  const hasOfficer =
    roleIds.includes("1522915139072950312") ||
    allRoleStrings.some((r) => r.includes("OFFICER") || r.includes("POLICE") || r.includes("POLISI") || r.includes("CADET"));

  if (hasPoliceChief) {
    results.push({
      institutionSlug: "police",
      institutionName: "Ophelia Police Department",
      positionName: "Chief of Police",
      permissionLevel: "LEADER",
    });
  } else if (hasSwat) {
    results.push({
      institutionSlug: "police",
      institutionName: "Ophelia Police Department",
      positionName: "SWAT",
      permissionLevel: "MEMBER",
    });
  } else if (hasHighway) {
    results.push({
      institutionSlug: "police",
      institutionName: "Ophelia Police Department",
      positionName: "Highway Patrol",
      permissionLevel: "MEMBER",
    });
  } else if (hasOfficer) {
    results.push({
      institutionSlug: "police",
      institutionName: "Ophelia Police Department",
      positionName: "Officer",
      permissionLevel: "MEMBER",
    });
  }

  // 2. Medical (Medis & EMS)
  const hasPetinggiMedis =
    roleIds.includes("1482622396954312805") ||
    allRoleStrings.some((r) => r.includes("PETINGGI MEDIS") || r.includes("DIRECTOR") || r.includes("CHIEF MEDIC") || r.includes("KADIS KESEHATAN") || r.includes("HEAD MEDIC"));
  const hasMedis =
    roleIds.includes("1482622396946055227") ||
    allRoleStrings.some((r) => r.includes("MEDIS") || r.includes("EMS") || r.includes("DOCTOR") || r.includes("DOKTER") || r.includes("PARAMEDIC") || r.includes("PERAWAT") || r.includes("SURGEON") || r.includes("HOSPITAL") || r.includes("RUMAH SAKIT"));

  if (hasPetinggiMedis) {
    results.push({
      institutionSlug: "medical",
      institutionName: "Ophelia Medical Center",
      positionName: "Petinggi Medis",
      permissionLevel: "LEADER",
    });
  } else if (hasMedis) {
    results.push({
      institutionSlug: "medical",
      institutionName: "Ophelia Medical Center",
      positionName: "Medis",
      permissionLevel: "MEMBER",
    });
  }

  // 3. Mechanic (Bengkel & OCG)
  const hasPetinggiBengkel =
    roleIds.includes("1482622396946055224") ||
    allRoleStrings.some((r) => r.includes("PETINGGI BENGKEL") || r.includes("PETINGGI MEKANIK") || r.includes("HEAD MECHANIC") || r.includes("BENGKEL OWNER") || r.includes("OWNER BENGKEL") || r.includes("LEADHAND MECHANIC"));
  const hasBengkel =
    roleIds.includes("1482622396946055223") ||
    allRoleStrings.some((r) => r.includes("BENGKEL") || r.includes("MECHANIC") || r.includes("MEKANIK") || r.includes("CUSTOM GARAGE") || r.includes("OCG") || r.includes("GARAGE") || r.includes("TUNER") || r.includes("APPRENTICE"));

  if (hasPetinggiBengkel) {
    results.push({
      institutionSlug: "mechanic",
      institutionName: "Ophelia Custom Garage",
      positionName: "Petinggi Bengkel",
      permissionLevel: "LEADER",
    });
  } else if (hasBengkel) {
    results.push({
      institutionSlug: "mechanic",
      institutionName: "Ophelia Custom Garage",
      positionName: "Mekanik",
      permissionLevel: "MEMBER",
    });
  }

  // 4. Restaurant (Resto & Lounge)
  const hasPetinggiResto =
    roleIds.includes("1482622396946055226") ||
    allRoleStrings.some((r) => r.includes("PETINGGI RESTO") || r.includes("RESTAURANT MANAGER") || r.includes("MANAGER RESTO") || r.includes("HEAD CHEF"));
  const hasResto =
    roleIds.includes("1482622396946055225") ||
    allRoleStrings.some((r) => r.includes("SERVERS RESTO") || r.includes("RESTO") || r.includes("RESTAURANT") || r.includes("CHEF") || r.includes("COOK") || r.includes("KITCHEN") || r.includes("BARTENDER") || r.includes("WAITER") || r.includes("WAITRESS") || r.includes("BARISTA") || r.includes("SERVER"));

  if (hasPetinggiResto) {
    results.push({
      institutionSlug: "restaurant",
      institutionName: "Ophelia Restaurant & Lounge",
      positionName: "Petinggi Resto",
      permissionLevel: "LEADER",
    });
  } else if (hasResto) {
    results.push({
      institutionSlug: "restaurant",
      institutionName: "Ophelia Restaurant & Lounge",
      positionName: "Server Resto",
      permissionLevel: "MEMBER",
    });
  }

  // 5. Pemerintah
  const hasPetinggiPemerintah =
    roleIds.includes("1482622396946055222") ||
    allRoleStrings.some((r) => r.includes("PETINGGI PEMERINTAH") || r.includes("WALIKOTA") || r.includes("WAKIL WALIKOTA"));
  const hasPemerintah =
    roleIds.includes("1482622396946055221") ||
    allRoleStrings.some((r) => r.includes("PEMERINTAH") || r.includes("STAFF PEMERINTAH") || r.includes("STAFF SIPIL"));

  if (hasPetinggiPemerintah) {
    results.push({
      institutionSlug: "pemerintah",
      institutionName: "Pemerintah Kota Ophelia",
      positionName: "Petinggi Pemerintah",
      permissionLevel: "LEADER",
    });
  } else if (hasPemerintah) {
    results.push({
      institutionSlug: "pemerintah",
      institutionName: "Pemerintah Kota Ophelia",
      positionName: "Staff Pemerintah",
      permissionLevel: "MEMBER",
    });
  }

  // If user is Admin or Pimpinan, upgrade their permission level across their memberships
  if (hasAdmin) {
    for (const res of results) {
      res.permissionLevel = "LEADER";
    }
  }

  return results;
}

// In-memory cache for Discord Guild Roles to minimize Discord API rate-limiting
let cachedGuildRoles: { roles: Record<string, string>; fetchedAt: number } | null = null;

/**
 * Fetch and cache guild roles map (id -> clean name) with a 5-minute TTL
 */
export async function getGuildRoleMap(): Promise<Record<string, string>> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || "1482622396946055218";
  const now = Date.now();

  if (cachedGuildRoles && now - cachedGuildRoles.fetchedAt < 5 * 60 * 1000) {
    return cachedGuildRoles.roles;
  }

  const roleMap: Record<string, string> = { ...KNOWN_DISCORD_ROLE_IDS };
  if (!botToken || !guildId) return roleMap;

  try {
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    });
    if (rolesRes.ok) {
      const roles: { id: string; name: string }[] = await rolesRes.json();
      roles.forEach((r) => {
        roleMap[r.id] = cleanRoleName(r.name);
      });
      cachedGuildRoles = { roles: roleMap, fetchedAt: now };
    }
  } catch (err) {
    console.warn("getGuildRoleMap error:", err);
  }

  return roleMap;
}

/**
 * Fetch a single member live from Discord API using the Bot token.
 * Returns null if member is not found or credentials are not configured.
 */
export async function fetchDiscordMemberLive(discordId: string): Promise<DiscordMemberInfo | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || "1482622396946055218";

  if (!botToken || !guildId || !discordId) {
    return null;
  }

  const cleanDiscordId = discordId.replace("discord-", "");

  try {
    const roleMap = await getGuildRoleMap();

    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${cleanDiscordId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      }
    );

    if (!memberRes.ok) {
      console.warn(`Discord member fetch for ${cleanDiscordId} returned status ${memberRes.status}`);
      return null;
    }

    const m = await memberRes.json();
    const roleIds: string[] = m.roles || [];
    const roleNames: string[] = roleIds.map((rId) => roleMap[rId] || KNOWN_DISCORD_ROLE_IDS[rId] || rId);

    const avatarUrl = m.avatar
      ? `https://cdn.discordapp.com/guilds/${guildId}/users/${m.user?.id || cleanDiscordId}/avatars/${m.avatar}.png`
      : m.user?.avatar
      ? `https://cdn.discordapp.com/avatars/${m.user?.id || cleanDiscordId}/${m.user.avatar}.png`
      : getDiscordAvatarUrl(cleanDiscordId, null);

    const rawDisplayName = m.nick || m.user?.global_name || m.user?.username || cleanDiscordId;
    const cleanDisplayName =
      rawDisplayName.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim() ||
      m.user?.username ||
      cleanDiscordId;

    return {
      id: `discord-${cleanDiscordId}`,
      discordId: cleanDiscordId,
      username: m.user?.username || cleanDiscordId,
      displayName: cleanDisplayName,
      avatarUrl,
      roles: roleNames,
      roleIds,
    };
  } catch (error) {
    console.error(`fetchDiscordMemberLive error for ${discordId}:`, error);
    return null;
  }
}

/**
 * Fetch all guild members from Discord API using Bot token search
 */
export async function fetchDiscordGuildMembers(): Promise<DiscordMemberInfo[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || "1482622396946055218";

  if (!botToken || !guildId) {
    console.warn("Discord credentials missing for guild member sync.");
    return [];
  }

  try {
    // 1. Fetch guild roles map
    const roleMap = await getGuildRoleMap();

    // 2. Discover members via search with rate-limiting backoff and throttling
    const allFound = new Map<string, any>();
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789_-. !?@#$%^&*()+=~".split("");
    const searchTerms = [...chars, "pol", "ems", "med", "beng", "rest", "orp", "adm", "mek"];

    for (const term of searchTerms) {
      let retries = 3;
      while (retries > 0) {
        try {
          const s = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(
              term
            )}&limit=100`,
            {
              headers: { Authorization: `Bot ${botToken}` },
              cache: "no-store",
            }
          );
          if (s.status === 429) {
            const body = await s.json().catch(() => ({}));
            const retryAfter = (body.retry_after || 1) * 1000 + 200;
            await new Promise((r) => setTimeout(r, retryAfter));
            retries--;
            continue;
          }
          if (s.ok) {
            const list: any[] = await s.json();
            for (const m of list) {
              if (m.user && !m.user.bot) {
                allFound.set(m.user.id, m);
              }
            }
          }
          break;
        } catch (err) {
          console.warn(`Search error for term '${term}':`, err);
          break;
        }
      }
      // Small throttle to stay well below Discord rate limits
      await new Promise((r) => setTimeout(r, 60));
    }

    // Convert to DiscordMemberInfo
    const members: DiscordMemberInfo[] = [];
    for (const [id, m] of allFound) {
      const roleIds: string[] = m.roles || [];
      const roleNames: string[] = roleIds.map((rId) => roleMap[rId] || rId);

      const avatarUrl = m.avatar
        ? `https://cdn.discordapp.com/guilds/${guildId}/users/${m.user.id}/avatars/${m.avatar}.png`
        : m.user.avatar
        ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
        : getDiscordAvatarUrl(m.user.id, null);

      const rawDisplayName = m.nick || m.user.global_name || m.user.username;
      // Clean up emoji from display name if needed, or keep clean nickname
      const cleanDisplayName = rawDisplayName.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim() || m.user.username;

      members.push({
        id: `discord-${m.user.id}`,
        discordId: m.user.id,
        username: m.user.username,
        displayName: cleanDisplayName,
        avatarUrl,
        roles: roleNames,
        roleIds,
      });
    }

    return members;
  } catch (error) {
    console.error("fetchDiscordGuildMembers failed:", error);
    return [];
  }
}
