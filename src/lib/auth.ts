import { cookies } from "next/headers";
import { cache } from "react";
import { SessionUser, PermissionLevel } from "@/types";
import { DEMO_PERSONAS, DEFAULT_INSTITUTIONS } from "./constants";
import { DataService } from "./data-service";

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

    // Auto-sync Discord user roles if missing or periodically
    if (parsed.discordId && !parsed.discordId.startsWith("demo-")) {
      const isMissingRoles = !parsed.discordRoles || parsed.discordRoles.length === 0;
      try {
        const freshUser = await DataService.syncDiscordUser(parsed.discordId, isMissingRoles);
        if (freshUser) {
          parsed = freshUser;
        }
      } catch (err) {
        console.warn("Background Discord role sync error:", err);
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

/**
 * Validate whether the user possesses the Discord role required for an institution.
 * Enforces PRD Section 6 & 29 (Server-side Discord Role Verification)
 * Memoized per request using React cache() to avoid duplicate DB/cookie queries.
 */
export const verifyInstitutionAccess = cache(async function verifyInstitutionAccess(
  user: SessionUser,
  institutionSlug: string
): Promise<{ allowed: boolean; permissionLevel: PermissionLevel; reason?: string }> {
  // 1. Super Admin always has full access
  if (user.isSuperAdmin) {
    return { allowed: true, permissionLevel: "SUPER_ADMIN" };
  }

  const userRoles = user.discordRoles || [];

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  // 2. Check if user has server-wide Admin / Pimpinan Discord roles
  const hasAdminRole = userRoles.some((r) => {
    const norm = normalize(r);
    return norm === "admin" || norm === "pimpinan" || norm.includes("admin") || norm.includes("owner");
  });

  if (hasAdminRole) {
    return { allowed: true, permissionLevel: "SUPER_ADMIN" };
  }

  // 3. Fast targeted check for user's membership in this institution
  try {
    const userMembership = await DataService.getUserMembership(user.id, institutionSlug);

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

  // 4. Check Demo Persona mappings (only if dev demo enabled)
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true") {
    const demoPersona = DEMO_PERSONAS.find((p) => p.discordId === user.discordId || p.id === user.id);
    if (demoPersona) {
      const hasRole = demoPersona.institutionSlugs.includes(institutionSlug);
      if (!hasRole) {
        return {
          allowed: false,
          permissionLevel: "MEMBER",
          reason: `Discord ID Anda tidak memiliki role Discord untuk instansi '${institutionSlug}'.`,
        };
      }
      return {
        allowed: true,
        permissionLevel: demoPersona.roleLevels[institutionSlug] || "MEMBER",
      };
    }
  }

  // 5. Check Discord roles against institution mapped roles
  const institution = DEFAULT_INSTITUTIONS.find((i) => i.slug === institutionSlug);
  if (!institution) {
    return { allowed: false, permissionLevel: "MEMBER", reason: "Instansi tidak valid." };
  }

  const requiredRoles = institution.discordRoleNames || [institution.name];

  const matched = userRoles.some((role) => {
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

  if (!matched) {
    return {
      allowed: false,
      permissionLevel: "MEMBER",
      reason: `Discord ID Anda (${user.discordId}) tidak memiliki salah satu role yang diperlukan: ${requiredRoles.join(", ")}`,
    };
  }

  // 6. Determine Leader role
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

  return {
    allowed: true,
    permissionLevel: isLeader ? "LEADER" : "MEMBER",
  };
});

/**
 * Fast batched query for all institutions a user is allowed to access.
 * Eliminates looping verifyInstitutionAccess over all institutions.
 */
export const getAllowedInstitutions = cache(async function getAllowedInstitutions(
  user: SessionUser
): Promise<typeof DEFAULT_INSTITUTIONS> {
  if (user.isSuperAdmin) {
    return DEFAULT_INSTITUTIONS;
  }

  const userRoles = user.discordRoles || [];
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const hasAdminRole = userRoles.some((r) => {
    const norm = normalize(r);
    return norm === "admin" || norm === "pimpinan" || norm.includes("admin") || norm.includes("owner");
  });

  if (hasAdminRole) {
    return DEFAULT_INSTITUTIONS;
  }

  // Single fast query for all memberships of this user
  const userMemberships = await DataService.getUserMemberships(user.id, user.discordId);
  const activeInstIdsOrSlugs = new Set(
    userMemberships
      .filter((m) => m.status === "ACTIVE")
      .flatMap((m) => [m.institutionId, (m as any).institutionSlug].filter(Boolean))
  );

  return DEFAULT_INSTITUTIONS.filter((inst) => {
    // 1. Direct active membership
    if (activeInstIdsOrSlugs.has(inst.id) || activeInstIdsOrSlugs.has(inst.slug)) {
      return true;
    }

    // 2. Demo Persona check (if enabled)
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true") {
      const demoPersona = DEMO_PERSONAS.find((p) => p.discordId === user.discordId || p.id === user.id);
      if (demoPersona && demoPersona.institutionSlugs.includes(inst.slug)) {
        return true;
      }
    }

    // 3. Discord role matching
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
});
