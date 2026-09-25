import { cookies } from "next/headers";
import { SessionUser, PermissionLevel } from "@/types";
import { DEMO_PERSONAS, DEFAULT_INSTITUTIONS } from "./constants";

const COOKIE_NAME = "ophelia_session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie?.value) {
    // If no session is saved yet, start with default Officer John Doe for seamless dev experience
    return DEMO_PERSONAS[0];
  }

  try {
    const parsed = JSON.parse(sessionCookie.value) as SessionUser;
    return parsed;
  } catch {
    return DEMO_PERSONAS[0];
  }
}

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
 */
export async function verifyInstitutionAccess(
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

  // 3. Check Demo Persona mappings
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

  // 4. Check Discord roles against institution mapped roles
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

  // 5. Determine Leader role
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
}
