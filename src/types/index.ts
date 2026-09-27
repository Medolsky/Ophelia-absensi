export type PermissionLevel = "MEMBER" | "LEADER" | "SUPER_ADMIN";
export type MemberStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type DutyStatus = "ON_DUTY" | "COMPLETED" | "CORRECTED" | "AUTO_CLOSED";

export interface SessionUser {
  id: string;
  discordId: string;
  discordUsername: string;
  displayName: string;
  discordAvatar: string | null;
  discordRoles: string[];
  isSuperAdmin: boolean;
}

export interface InstitutionData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  primaryColor: string;
  currencySymbol?: string;
  defaultHourlyRate?: number;
  status: "ACTIVE" | "INACTIVE";
  discordRoleNames?: string[];
}

export interface PositionData {
  id: string;
  institutionId: string;
  name: string;
  permissionLevel: PermissionLevel;
  sortOrder: number;
  hourlyRate?: number;
  minDutyHours?: number;
}

export interface MembershipData {
  id: string;
  userId: string;
  institutionId: string;
  positionId?: string | null;
  positionName?: string;
  permissionLevel: PermissionLevel;
  hourlyRate?: number;
  status: MemberStatus;
  joinedAt: string;
  leftAt?: string | null;
  user?: {
    id: string;
    discordId: string;
    discordUsername: string;
    displayName: string;
    discordAvatar?: string | null;
  };
}

export interface DutySessionData {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string | null;
  positionName?: string;
  institutionId: string;
  institutionSlug?: string;
  institutionName?: string;
  startedAt: string; // ISO string
  endedAt?: string | null; // ISO string
  durationSeconds: number;
  status: DutyStatus;
  notes?: string | null;
  createdAt: string;
}

export interface AttendanceEditData {
  id: string;
  dutySessionId: string;
  editedById: string;
  editedByName?: string;
  oldStart: string;
  oldEnd?: string | null;
  newStart: string;
  newEnd?: string | null;
  reason: string;
  createdAt: string;
}

export interface AuditLogData {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  oldData?: string | null;
  newData?: string | null;
  createdAt: string;
}

export interface DailyDutySummary {
  date: string; // YYYY-MM-DD
  dayName: string;
  totalSeconds: number;
  sessionsCount: number;
}

export interface MonthlyStats {
  monthName: string;
  year: number;
  totalSeconds: number;
  activeDays: number;
  totalSessions: number;
  averagePerDaySeconds: number;
  longestSessionSeconds: number;
}

// Payroll and Salary Management Types
export interface PositionSalaryConfig {
  positionName: string;
  hourlyRate: number;
  minDutyHours: number;
}

export interface PayrollRecord {
  membershipId: string;
  userId: string;
  memberName: string;
  discordId: string;
  userAvatar?: string | null;
  positionName: string;
  hourlyRate: number;
  totalDutySeconds: number;
  totalDutyHours: number; // decimal hours
  totalSalary: number;
  minDutyHours: number;
  isEligible: boolean;
  status: "PENDING" | "PAID";
  paidAt?: string | null;
  paidByName?: string | null;
}

// FiveM Integration Types
export interface FiveMPlayerData {
  discordId: string;
  serverId: number;
  playerName: string;
  isOnline: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface CityStatusEntry {
  discordId: string;
  playerName: string;
  serverId: number;
  isOnline: boolean;
  joinedAt: string;
  lastSeenAt: string;
  isOnDuty: boolean;
  dutyInstitutionName?: string;
  dutyInstitutionSlug?: string;
  dutyStartedAt?: string;
  memberInstitutions: string[];
  displayName?: string;
  avatar?: string | null;
  positionName?: string;
}

export interface DiscordRoleMappingData {
  id: string;
  discordRole: string;
  roleId: string;
  institution: string;
  permission: PermissionLevel;
  description: string;
}
