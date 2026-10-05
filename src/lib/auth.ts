import { cookies } from "next/headers";
import { cache } from "react";
import { SessionUser, PermissionLevel } from "@/types";
import { DEMO_PERSONAS, DEFAULT_INSTITUTIONS } from "./constants";
import { DataService, normalizeInstSlug } from "./data-service";

const COOKIE_NAME = "ophelia_session";

export const getCurrentUser = cache(async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie?.value) {
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true") {
      return DEMO_PERSONAS[0];
    }
    return null;
  }

  try {
    let parsed = JSON.parse(sessionCookie.value) as SessionUser;

    // Fast path: if roles are already present in session cookie, return immediately (0ms)
    // Only fetch live from Discord if roles are completely missing
    if (parsed.discordId && !parsed.discordId.startsWith("demo-")) {
      const isMissingRoles = !parsed.discordRoles || parsed.discordRoles.length === 0;
      try {
        const freshUser = await DataService.syncDiscordUser(parsed.discordId, isMissingRoles);
        if (freshUser) {
          if (
            freshUser.displayName !== parsed.displayName ||
            JSON.stringify(freshUser.discordRoles) !== JSON.stringify(parsed.discordRoles) ||
            freshUser.isSuperAdmin !== parsed.isSuperAdmin
          ) {
            parsed = freshUser;
            try {
              await setCurrentUser(freshUser);
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Discord user sync check error:", err);
      }
    }

    return parsed;
  } catch {
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true") {
      return DEMO_PERSONAS[0];
    }
    return null;
  }
});

export async function setCurrentUser(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(user), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function isDiscordAdmin(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const userRoles = user.discordRoles || [];
  return userRoles.some((r) => {
    const raw = String(r).trim();
    if (raw === "1482622396954312809" || raw === "1482622396954312808") return true;
    const norm = raw
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return (
      norm.includes("admin") ||
      norm.includes("administrator") ||
      norm.includes("pimpinan") ||
      norm.includes("owner") ||
      norm.includes("founder") ||
      norm.includes("management") ||
      norm.includes("atasan") ||
      norm.includes("chief") ||
      norm.includes("leader")
    );
  });
}

/**
 * Validate whether the user possesses the Discord role required for an institution.
 * Enforces PRD Section 6 & 29 (Server-side Discord Role Verification)
 * Memoized per request using React cache() to avoid duplicate DB/cookie queries.
 */
export const verifyInstitutionAccess = cache(async function verifyInstitutionAccess(
  user: SessionUser,
  institutionSlug: string
): Promise<{ allowed: boolean; permissionLevel: PermissionLevel; reason?: string }> {
  const cleanSlug = normalizeInstSlug(institutionSlug);

  // 1. Super Admin or Discord Admin always has full access (0ms)
  if (user.isSuperAdmin || isDiscordAdmin(user)) {
    return { allowed: true, permissionLevel: "SUPER_ADMIN" };
  }

  const userRoles = user.discordRoles || [];

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  // Fast Leader role calculation
  const isLeader = userRoles.some((role) => {
    const norm = normalize(role);
    return (
      norm.includes("petinggi") ||
      norm.includes("chief") ||
      norm.includes("director") ||
      norm.includes("pimpinan") ||
      norm.includes("admin") ||
      norm.includes("owner") ||
      norm.includes("manager") ||
      norm.includes("lead")
    );
  });

  // 2. Fast Path: In-Memory Discord role matching against institution roles (0ms, 0 DB roundtrips)
  const institution = DEFAULT_INSTITUTIONS.find(
    (i) => i.slug === cleanSlug || i.slug === institutionSlug || i.id === institutionSlug
  );

  if (institution) {
    const requiredRoles = institution.discordRoleNames || [institution.name];
    const roleMatched = userRoles.some((role) => {
      const normRole = normalize(role);
      return requiredRoles.some((req) => {
        const normReq = normalize(req);
        return (
          normRole === normReq ||
          normRole.includes(normReq) ||
          normReq.includes(normRole)
        );
      });
    });

    if (roleMatched) {
      return {
        allowed: true,
        permissionLevel: isLeader ? "LEADER" : "MEMBER",
      };
    }
  }

  // 3. Check Demo Persona mappings (only if dev demo enabled)
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true") {
    const demoPersona = DEMO_PERSONAS.find((p) => p.discordId === user.discordId || p.id === user.id);
    if (demoPersona) {
      const hasRole = demoPersona.institutionSlugs.includes(cleanSlug);
      if (!hasRole) {
        return {
          allowed: false,
          permissionLevel: "MEMBER",
          reason: `Discord ID Anda tidak memiliki role Discord untuk instansi '${institutionSlug}'.`,
        };
      }
      return {
        allowed: true,
        permissionLevel: demoPersona.roleLevels[cleanSlug] || "MEMBER",
      };
    }
  }

  // 4. Fallback: Check manual/database membership if user has custom DB permissions
  try {
    const userMembership = await DataService.getUserMembership(user.id, cleanSlug);

    if (userMembership) {
      if (userMembership.status === "SUSPENDED") {
        return {
          allowed: false,
          permissionLevel: "MEMBER",
          reason: "Status keanggotaan Anda di instansi ini sedang diskors (SUSPENDED). Silakan hubungi Petinggi instansi.",
        };
      }
      if (userMembership.status === "INACTIVE") {
        return {
          allowed: false,
          permissionLevel: "MEMBER",
          reason: "Status keanggotaan Anda di instansi ini nonaktif (INACTIVE). Silakan hubungi Petinggi instansi.",
        };
      }
      return {
        allowed: true,
        permissionLevel: userMembership.permissionLevel,
      };
    }
  } catch (err) {
    console.warn("verifyInstitutionAccess membership check error:", err);
  }

  if (!institution) {
    return { allowed: false, permissionLevel: "MEMBER", reason: "Instansi tidak valid." };
  }

  const requiredRoles = institution.discordRoleNames || [institution.name];
  return {
    allowed: false,
    permissionLevel: "MEMBER",
    reason: `Discord ID Anda (${user.discordId}) tidak memiliki salah satu role yang diperlukan: ${requiredRoles.join(", ")}`,
  };
});

/**
 * Fast batched query for all institutions a user is allowed to access.
 * Eliminates looping verifyInstitutionAccess over all institutions.
 */
export const getAllowedInstitutions = cache(async function getAllowedInstitutions(
  user: SessionUser
): Promise<typeof DEFAULT_INSTITUTIONS> {
  if (user.isSuperAdmin || isDiscordAdmin(user)) {
    return DEFAULT_INSTITUTIONS;
  }

  const userRoles = user.discordRoles || [];
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  // 1. Fast Path: In-memory Discord role matching (0ms)
  const roleMatchedInstitutions = DEFAULT_INSTITUTIONS.filter((inst) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true") {
      const demoPersona = DEMO_PERSONAS.find((p) => p.discordId === user.discordId || p.id === user.id);
      if (demoPersona && demoPersona.institutionSlugs.includes(inst.slug)) {
        return true;
      }
    }

    const requiredRoles = inst.discordRoleNames || [inst.name];
    return userRoles.some((role) => {
      const normRole = normalize(role);
      return requiredRoles.some((req) => {
        const normReq = normalize(req);
        return (
          normRole === normReq ||
          normRole.includes(normReq) ||
          normReq.includes(normRole)
        );
      });
    });
  });

  // If user has matched institutions by Discord roles, return immediately without touching DB!
  if (roleMatchedInstitutions.length > 0) {
    return roleMatchedInstitutions;
  }

  // 2. Fallback: Check direct database memberships for users without standard role names
  try {
    const userMemberships = await DataService.getUserMemberships(user.id, user.discordId);
    const activeInstIdsOrSlugs = new Set(
      userMemberships
        .filter((m) => m.status === "ACTIVE")
        .flatMap((m) => [m.institutionId, (m as any).institutionSlug].filter(Boolean))
    );

    return DEFAULT_INSTITUTIONS.filter((inst) =>
      activeInstIdsOrSlugs.has(inst.id) || activeInstIdsOrSlugs.has(inst.slug)
    );
  } catch {
    return [];
  }
});
