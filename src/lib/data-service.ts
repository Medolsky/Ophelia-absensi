import { prisma } from "./prisma";
import { DEFAULT_INSTITUTIONS, DEMO_PERSONAS, DEFAULT_POSITION_SALARIES } from "./constants";
import {
  DutySessionData,
  InstitutionData,
  MembershipData,
  AuditLogData,
  AttendanceEditData,
  DailyDutySummary,
  MonthlyStats,
  PermissionLevel,
  PayrollRecord,
} from "@/types";

// In-Memory Seed State for Development/Fallback
interface StoreState {
  institutions: InstitutionData[];
  memberships: MembershipData[];
  dutySessions: DutySessionData[];
  auditLogs: AuditLogData[];
  attendanceEdits: AttendanceEditData[];
  salaryConfigs: Record<string, Record<string, { hourlyRate: number; minDutyHours: number }>>;
  payrollStatuses: Record<string, { status: "PENDING" | "PAID"; paidAt?: string; paidByName?: string }>;
}

const initialSessions: DutySessionData[] = [
  // Today's multiple sessions for John Doe (as in PRD section 9 & 10)
  {
    id: "ds-101",
    userId: "user-john",
    userName: "Officer John Doe",
    positionName: "Officer",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Police Department",
    startedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    durationSeconds: 3 * 3600,
    status: "COMPLETED",
    notes: "Patrol downtown sector",
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: "ds-102",
    userId: "user-john",
    userName: "Officer John Doe",
    positionName: "Officer",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Police Department",
    startedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    durationSeconds: 5400, // 1h 30m
    status: "COMPLETED",
    notes: "Traffic stop operation",
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Yesterday's session
  {
    id: "ds-100",
    userId: "user-john",
    userName: "Officer John Doe",
    positionName: "Officer",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Police Department",
    startedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
    durationSeconds: 5 * 3600,
    status: "COMPLETED",
    notes: "Bank robbery dispatch",
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
  },
  // Other members currently ON DUTY for Live Monitoring (PRD section 17)
  {
    id: "ds-201",
    userId: "user-mike",
    userName: "Officer Mike Smith",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    positionName: "Sergeant",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Police Department",
    startedAt: new Date(Date.now() - 72 * 60 * 1000).toISOString(), // 1h 12m ago
    endedAt: null,
    durationSeconds: 0,
    status: "ON_DUTY",
    notes: "Highway Patrol Supervisor",
    createdAt: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
  },
  {
    id: "ds-202",
    userId: "user-sarah-officer",
    userName: "Officer Sarah Jenkins",
    userAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    positionName: "Senior Officer",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Police Department",
    startedAt: new Date(Date.now() - 285 * 60 * 1000).toISOString(), // 4h 45m ago
    endedAt: null,
    durationSeconds: 0,
    status: "ON_DUTY",
    notes: "K9 Unit active",
    createdAt: new Date(Date.now() - 285 * 60 * 1000).toISOString(),
  },
  {
    id: "ds-203",
    userId: "user-alex-officer",
    userName: "Officer Alex Mercer",
    userAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
    positionName: "Cadet",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Police Department",
    startedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32m ago
    endedAt: null,
    durationSeconds: 0,
    status: "ON_DUTY",
    notes: "Ride along training",
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
];

const initialMemberships: MembershipData[] = [
  {
    id: "mem-john-pd",
    userId: "user-john",
    institutionId: "inst-police",
    positionName: "Officer",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-01T00:00:00Z",
    user: {
      id: "user-john",
      discordId: "982736410293847101",
      discordUsername: "johndoe_lspd",
      displayName: "Officer John Doe",
      discordAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    },
  },
  {
    id: "mem-mike-pd",
    userId: "user-mike",
    institutionId: "inst-police",
    positionName: "Sergeant",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-07-15T00:00:00Z",
    user: {
      id: "user-mike",
      discordId: "982736410293847105",
      discordUsername: "mikesmith_pd",
      displayName: "Officer Mike Smith",
      discordAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    },
  },
  {
    id: "mem-gordon-pd",
    userId: "user-gordon",
    institutionId: "inst-police",
    positionName: "Chief of Police",
    permissionLevel: "LEADER",
    status: "ACTIVE",
    joinedAt: "2026-06-01T00:00:00Z",
    user: {
      id: "user-gordon",
      discordId: "982736410293847102",
      discordUsername: "chief_gordon",
      displayName: "Chief James Gordon",
      discordAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
    },
  },
  {
    id: "mem-gordon-mech",
    userId: "user-gordon",
    institutionId: "inst-mechanic",
    positionName: "Leadhand Mechanic",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-10T00:00:00Z",
    user: {
      id: "user-gordon",
      discordId: "982736410293847102",
      discordUsername: "chief_gordon",
      displayName: "Chief James Gordon",
      discordAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
    },
  },
  {
    id: "mem-sarah-med",
    userId: "user-sarah",
    institutionId: "inst-medical",
    positionName: "Director of Emergency Medicine",
    permissionLevel: "LEADER",
    status: "ACTIVE",
    joinedAt: "2026-05-12T00:00:00Z",
    user: {
      id: "user-sarah",
      discordId: "982736410293847103",
      discordUsername: "dr_sarah",
      displayName: "Dr. Sarah Connor",
      discordAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    },
  },
  {
    id: "mem-alex-mech",
    userId: "user-alex",
    institutionId: "inst-mechanic",
    positionName: "Senior Mechanic",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-07-01T00:00:00Z",
    user: {
      id: "user-alex",
      discordId: "982736410293847104",
      discordUsername: "alex_customs",
      displayName: "Alex Rivera",
      discordAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    },
  },
];

// Global Memory Store instance
const globalMemoryStore = globalThis as unknown as {
  __ophelia_store?: StoreState;
};

if (!globalMemoryStore.__ophelia_store) {
  globalMemoryStore.__ophelia_store = {
    institutions: [...DEFAULT_INSTITUTIONS],
    memberships: [...initialMemberships],
    dutySessions: [...initialSessions],
    auditLogs: [],
    attendanceEdits: [],
    salaryConfigs: { ...DEFAULT_POSITION_SALARIES },
    payrollStatuses: {},
  };
} else {
  globalMemoryStore.__ophelia_store.institutions = [...DEFAULT_INSTITUTIONS];
  if (!globalMemoryStore.__ophelia_store.salaryConfigs) {
    globalMemoryStore.__ophelia_store.salaryConfigs = { ...DEFAULT_POSITION_SALARIES };
  }
  if (!globalMemoryStore.__ophelia_store.payrollStatuses) {
    globalMemoryStore.__ophelia_store.payrollStatuses = {};
  }
}

const memoryStore = globalMemoryStore.__ophelia_store;

export class DataService {
  /**
   * Check if Postgres is reachable via Prisma
   */
  private static async isDatabaseAvailable(): Promise<boolean> {
    try {
      if (!process.env.DATABASE_URL) return false;
      // Fast check
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // --- INSTITUTIONS ---

  static async getInstitutions(): Promise<InstitutionData[]> {
    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const rows = await prisma.institution.findMany({
          orderBy: { name: "asc" },
          include: { discordRoles: true },
        });
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description || "",
          logo: r.logo || "🏛️",
          primaryColor: r.primaryColor,
          status: r.status as "ACTIVE" | "INACTIVE",
          discordRoleNames: r.discordRoles.map((dr) => dr.name),
        }));
      } catch (err) {
        console.warn("DB query failed, fallback to memory:", err);
      }
    }
    return memoryStore.institutions;
  }

  static async getInstitutionBySlug(slug: string): Promise<InstitutionData | null> {
    const institutions = await this.getInstitutions();
    return institutions.find((i) => i.slug === slug) || null;
  }

  // --- DUTY SESSIONS ---

  /**
   * Get currently active session for a specific user across all institutions
   */
  static async getActiveDutySession(userId: string): Promise<DutySessionData | null> {
    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const active = await prisma.dutySession.findFirst({
          where: {
            userId,
            endedAt: null,
            status: "ON_DUTY",
          },
          include: {
            institution: true,
            user: true,
          },
        });
        if (active) {
          return {
            id: active.id,
            userId: active.userId,
            userName: active.user.displayName || active.user.discordUsername,
            institutionId: active.institutionId,
            institutionSlug: active.institution.slug,
            institutionName: active.institution.name,
            startedAt: active.startedAt.toISOString(),
            endedAt: null,
            durationSeconds: 0,
            status: "ON_DUTY",
            notes: active.notes,
            createdAt: active.createdAt.toISOString(),
          };
        }
        return null;
      } catch (err) {
        console.warn("DB getActiveDutySession fallback:", err);
      }
    }

    const session = memoryStore.dutySessions.find(
      (s) => s.userId === userId && !s.endedAt && s.status === "ON_DUTY"
    );
    return session || null;
  }

  /**
   * Start a new duty session
   */
  static async startDuty(params: {
    userId: string;
    userName: string;
    userAvatar?: string | null;
    positionName?: string;
    institutionSlug: string;
    notes?: string;
  }): Promise<{ success: boolean; session?: DutySessionData; error?: string }> {
    // 1. Anti-Abuse: Check if already ON DUTY in ANY institution
    const existingActive = await this.getActiveDutySession(params.userId);
    if (existingActive) {
      return {
        success: false,
        error: `Anda sudah ON DUTY di instansi ${existingActive.institutionName || "lain"}. Harap OFF DUTY terlebih dahulu.`,
      };
    }

    const institution = await this.getInstitutionBySlug(params.institutionSlug);
    if (!institution) {
      return { success: false, error: "Instansi tidak ditemukan." };
    }

    const now = new Date();
    const isDb = await this.isDatabaseAvailable();

    if (isDb) {
      try {
        const newSession = await prisma.dutySession.create({
          data: {
            userId: params.userId,
            institutionId: institution.id,
            startedAt: now,
            status: "ON_DUTY",
            notes: params.notes || null,
          },
        });

        // Audit Log
        await prisma.auditLog.create({
          data: {
            actorId: params.userId,
            action: "START_DUTY",
            targetType: "DUTY_SESSION",
            targetId: newSession.id,
            newData: JSON.stringify({ institution: institution.name, startedAt: now }),
          },
        });

        return {
          success: true,
          session: {
            id: newSession.id,
            userId: params.userId,
            userName: params.userName,
            institutionId: institution.id,
            institutionSlug: institution.slug,
            institutionName: institution.name,
            startedAt: newSession.startedAt.toISOString(),
            endedAt: null,
            durationSeconds: 0,
            status: "ON_DUTY",
            notes: newSession.notes,
            createdAt: newSession.createdAt.toISOString(),
          },
        };
      } catch (err) {
        console.warn("DB startDuty error, fallback to memory:", err);
      }
    }

    const session: DutySessionData = {
      id: `ds-${Date.now()}`,
      userId: params.userId,
      userName: params.userName,
      userAvatar: params.userAvatar,
      positionName: params.positionName,
      institutionId: institution.id,
      institutionSlug: institution.slug,
      institutionName: institution.name,
      startedAt: now.toISOString(),
      endedAt: null,
      durationSeconds: 0,
      status: "ON_DUTY",
      notes: params.notes || null,
      createdAt: now.toISOString(),
    };

    memoryStore.dutySessions.unshift(session);
    memoryStore.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: params.userId,
      actorName: params.userName,
      action: "START_DUTY",
      targetType: "DUTY_SESSION",
      targetId: session.id,
      newData: JSON.stringify({ institution: institution.name, startedAt: now }),
      createdAt: now.toISOString(),
    });

    return { success: true, session };
  }

  /**
   * End an active duty session (Calculates duration based on server timestamp)
   */
  static async endDuty(params: {
    userId: string;
    institutionSlug: string;
  }): Promise<{ success: boolean; session?: DutySessionData; error?: string }> {
    const active = await this.getActiveDutySession(params.userId);
    if (!active) {
      return { success: false, error: "Tidak ada sesi duty aktif yang sedang berjalan." };
    }

    if (active.institutionSlug !== params.institutionSlug) {
      return {
        success: false,
        error: `Sesi duty aktif Anda berada di ${active.institutionName}, bukan di instansi ini.`,
      };
    }

    const now = new Date();
    const startTime = new Date(active.startedAt);
    const durationSeconds = Math.max(0, Math.round((now.getTime() - startTime.getTime()) / 1000));

    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const updated = await prisma.dutySession.update({
          where: { id: active.id },
          data: {
            endedAt: now,
            durationSeconds,
            status: "COMPLETED",
          },
        });

        // Audit Log
        await prisma.auditLog.create({
          data: {
            actorId: params.userId,
            action: "END_DUTY",
            targetType: "DUTY_SESSION",
            targetId: active.id,
            newData: JSON.stringify({
              endedAt: now,
              durationSeconds,
            }),
          },
        });

        return {
          success: true,
          session: {
            ...active,
            endedAt: now.toISOString(),
            durationSeconds,
            status: "COMPLETED",
          },
        };
      } catch (err) {
        console.warn("DB endDuty error, fallback to memory:", err);
      }
    }

    const index = memoryStore.dutySessions.findIndex((s) => s.id === active.id);
    if (index !== -1) {
      memoryStore.dutySessions[index] = {
        ...memoryStore.dutySessions[index],
        endedAt: now.toISOString(),
        durationSeconds,
        status: "COMPLETED",
      };

      memoryStore.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        actorId: params.userId,
        actorName: active.userName || "User",
        action: "END_DUTY",
        targetType: "DUTY_SESSION",
        targetId: active.id,
        newData: JSON.stringify({ endedAt: now, durationSeconds }),
        createdAt: now.toISOString(),
      });

      return { success: true, session: memoryStore.dutySessions[index] };
    }

    return { success: false, error: "Gagal mengakhiri sesi duty." };
  }

  /**
   * Get duty sessions for a user within an institution
   */
  static async getUserDutySessions(
    userId: string,
    institutionSlug: string
  ): Promise<DutySessionData[]> {
    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const rows = await prisma.dutySession.findMany({
          where: {
            userId,
            institution: { slug: institutionSlug },
          },
          include: { institution: true, user: true },
          orderBy: { startedAt: "desc" },
        });

        return rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          userName: r.user.displayName || r.user.discordUsername,
          institutionId: r.institutionId,
          institutionSlug: r.institution.slug,
          institutionName: r.institution.name,
          startedAt: r.startedAt.toISOString(),
          endedAt: r.endedAt?.toISOString() || null,
          durationSeconds: r.durationSeconds,
          status: r.status as DutySessionData["status"],
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
        }));
      } catch (err) {
        console.warn("DB getUserDutySessions error:", err);
      }
    }

    return memoryStore.dutySessions
      .filter((s) => s.userId === userId && s.institutionSlug === institutionSlug)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  /**
   * Get all live members currently on duty for an institution (or all institutions)
   */
  static async getLiveOnDuty(institutionSlug?: string): Promise<DutySessionData[]> {
    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const rows = await prisma.dutySession.findMany({
          where: {
            endedAt: null,
            status: "ON_DUTY",
            ...(institutionSlug ? { institution: { slug: institutionSlug } } : {}),
          },
          include: { institution: true, user: true },
          orderBy: { startedAt: "asc" },
        });

        return rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          userName: r.user.displayName || r.user.discordUsername,
          userAvatar: r.user.discordAvatar,
          institutionId: r.institutionId,
          institutionSlug: r.institution.slug,
          institutionName: r.institution.name,
          startedAt: r.startedAt.toISOString(),
          endedAt: null,
          durationSeconds: 0,
          status: "ON_DUTY",
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
        }));
      } catch (err) {
        console.warn("DB getLiveOnDuty error:", err);
      }
    }

    return memoryStore.dutySessions.filter((s) => {
      const isLive = !s.endedAt && s.status === "ON_DUTY";
      if (!institutionSlug || institutionSlug === "all") return isLive;
      return isLive && s.institutionSlug === institutionSlug;
    });
  }

  // --- MEMBERSHIP & PERMISSIONS ---

  static async getMemberships(institutionSlug: string): Promise<MembershipData[]> {
    const institution = await this.getInstitutionBySlug(institutionSlug);
    if (!institution) return [];

    return memoryStore.memberships.filter((m) => m.institutionId === institution.id);
  }

  static async getUserPermission(
    userId: string,
    institutionSlug: string
  ): Promise<PermissionLevel> {
    const demoUser = DEMO_PERSONAS.find((p) => p.id === userId);
    if (demoUser) {
      if (demoUser.isSuperAdmin) return "SUPER_ADMIN";
      return demoUser.roleLevels[institutionSlug] || "MEMBER";
    }

    const membership = memoryStore.memberships.find(
      (m) => m.userId === userId && m.institutionId === institutionSlug
    );
    return membership?.permissionLevel || "MEMBER";
  }

  // --- ATTENDANCE CORRECTION ---

  static async correctAttendance(params: {
    dutySessionId: string;
    editorId: string;
    editorName: string;
    newStart: string;
    newEnd: string;
    reason: string;
  }): Promise<{ success: boolean; error?: string }> {
    const targetSession = memoryStore.dutySessions.find((s) => s.id === params.dutySessionId);
    if (!targetSession) {
      return { success: false, error: "Sesi absensi tidak ditemukan." };
    }

    const oldStart = targetSession.startedAt;
    const oldEnd = targetSession.endedAt;

    const startDate = new Date(params.newStart);
    const endDate = new Date(params.newEnd);
    const durationSeconds = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));

    targetSession.startedAt = params.newStart;
    targetSession.endedAt = params.newEnd;
    targetSession.durationSeconds = durationSeconds;
    targetSession.status = "CORRECTED";

    // Attendance edit log
    memoryStore.attendanceEdits.unshift({
      id: `edit-${Date.now()}`,
      dutySessionId: params.dutySessionId,
      editedById: params.editorId,
      editedByName: params.editorName,
      oldStart,
      oldEnd,
      newStart: params.newStart,
      newEnd: params.newEnd,
      reason: params.reason,
      createdAt: new Date().toISOString(),
    });

    // Audit log
    memoryStore.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: params.editorId,
      actorName: params.editorName,
      action: "CORRECT_ATTENDANCE",
      targetType: "DUTY_SESSION",
      targetId: params.dutySessionId,
      oldData: JSON.stringify({ oldStart, oldEnd }),
      newData: JSON.stringify({ newStart: params.newStart, newEnd: params.newEnd, reason: params.reason }),
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }

  // --- SALARY & PAYROLL SYSTEM ---

  static getSalaryConfigs(institutionSlug: string): Record<string, { hourlyRate: number; minDutyHours: number }> {
    const configs = memoryStore.salaryConfigs[institutionSlug] || DEFAULT_POSITION_SALARIES[institutionSlug] || {};
    return configs;
  }

  static async updatePositionSalary(params: {
    institutionSlug: string;
    positionName: string;
    hourlyRate: number;
    minDutyHours: number;
    actorId: string;
    actorName: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!memoryStore.salaryConfigs[params.institutionSlug]) {
      memoryStore.salaryConfigs[params.institutionSlug] = {
        ...(DEFAULT_POSITION_SALARIES[params.institutionSlug] || {}),
      };
    }

    const oldConfig = memoryStore.salaryConfigs[params.institutionSlug][params.positionName] || {
      hourlyRate: 50000,
      minDutyHours: 0,
    };

    memoryStore.salaryConfigs[params.institutionSlug][params.positionName] = {
      hourlyRate: params.hourlyRate,
      minDutyHours: params.minDutyHours,
    };

    // Record audit log
    memoryStore.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: params.actorId,
      actorName: params.actorName,
      action: "UPDATE_SALARY_CONFIG",
      targetType: "POSITION_SALARY",
      targetId: `${params.institutionSlug}:${params.positionName}`,
      oldData: JSON.stringify(oldConfig),
      newData: JSON.stringify({
        hourlyRate: params.hourlyRate,
        minDutyHours: params.minDutyHours,
      }),
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }

  static async getPayrollRecords(institutionSlug: string): Promise<PayrollRecord[]> {
    const institution = await this.getInstitutionBySlug(institutionSlug);
    const memberships = await this.getMemberships(institutionSlug);
    const configs = this.getSalaryConfigs(institutionSlug);

    // Compute payroll per member
    const records: PayrollRecord[] = await Promise.all(
      memberships.map(async (m) => {
        const userSessions = await this.getUserDutySessions(m.userId, institutionSlug);
        const totalDutySeconds = userSessions.reduce(
          (acc, s) => acc + (s.durationSeconds || 0),
          0
        );

        // Fallback default duty hours for realistic demo representation if new user
        const finalDutySeconds = totalDutySeconds > 0 ? totalDutySeconds : (m.positionName?.includes("Chief") || m.positionName?.includes("Director") ? 98 * 3600 + 15 * 60 : 64 * 3600 + 40 * 60);
        const totalDutyHours = Number((finalDutySeconds / 3600).toFixed(1));

        const posName = m.positionName || "Officer";
        const posConfig = configs[posName] || {
          hourlyRate: institution?.defaultHourlyRate || 50000,
          minDutyHours: 15,
        };

        const totalSalary = Math.round(totalDutyHours * posConfig.hourlyRate);
        const isEligible = totalDutyHours >= posConfig.minDutyHours;

        const payStatus = memoryStore.payrollStatuses[m.id] || { status: "PENDING" };

        return {
          membershipId: m.id,
          userId: m.userId,
          memberName: m.user?.displayName || "Anggota",
          discordId: m.user?.discordId || "",
          userAvatar: m.user?.discordAvatar,
          positionName: posName,
          hourlyRate: posConfig.hourlyRate,
          totalDutySeconds: finalDutySeconds,
          totalDutyHours,
          totalSalary,
          minDutyHours: posConfig.minDutyHours,
          isEligible,
          status: payStatus.status,
          paidAt: payStatus.paidAt,
          paidByName: payStatus.paidByName,
        };
      })
    );

    return records;
  }

  static async togglePayrollStatus(params: {
    membershipId: string;
    newStatus: "PENDING" | "PAID";
    actorId: string;
    actorName: string;
  }): Promise<{ success: boolean }> {
    const now = new Date().toISOString();
    memoryStore.payrollStatuses[params.membershipId] = {
      status: params.newStatus,
      paidAt: params.newStatus === "PAID" ? now : undefined,
      paidByName: params.newStatus === "PAID" ? params.actorName : undefined,
    };

    memoryStore.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      actorId: params.actorId,
      actorName: params.actorName,
      action: "UPDATE_PAYROLL_STATUS",
      targetType: "PAYROLL",
      targetId: params.membershipId,
      newData: JSON.stringify({ status: params.newStatus, timestamp: now }),
      createdAt: now,
    });

    return { success: true };
  }

  static async getUserEstimatedSalary(
    userId: string,
    institutionSlug: string
  ): Promise<{
    hourlyRate: number;
    totalHours: number;
    estimatedSalary: number;
    currencySymbol: string;
    minDutyHours: number;
    isEligible: boolean;
  }> {
    const institution = await this.getInstitutionBySlug(institutionSlug);
    const configs = this.getSalaryConfigs(institutionSlug);
    const sessions = await this.getUserDutySessions(userId, institutionSlug);

    const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const totalHours = Number((totalSeconds / 3600).toFixed(1)) || 4.5; // fallback sample if 0

    // Get user position
    const demoUser = DEMO_PERSONAS.find((p) => p.id === userId);
    let posName = "Officer";
    if (demoUser?.roleTitle.includes("Chief")) posName = "Chief of Police";
    else if (demoUser?.roleTitle.includes("Director")) posName = "Director of Emergency Medicine";
    else if (demoUser?.roleTitle.includes("Senior Mechanic")) posName = "Senior Mechanic";
    else if (demoUser?.roleTitle.includes("Manager")) posName = "Restaurant Manager";

    const posConfig = configs[posName] || {
      hourlyRate: institution?.defaultHourlyRate || 50000,
      minDutyHours: 15,
    };

    return {
      hourlyRate: posConfig.hourlyRate,
      totalHours,
      estimatedSalary: Math.round(totalHours * posConfig.hourlyRate),
      currencySymbol: institution?.currencySymbol || "Rp",
      minDutyHours: posConfig.minDutyHours,
      isEligible: totalHours >= posConfig.minDutyHours,
    };
  }

  // --- AUDIT LOGS ---

  static async getAuditLogs(): Promise<AuditLogData[]> {
    return memoryStore.auditLogs;
  }
}
