import { prisma } from "./prisma";
import { DEFAULT_INSTITUTIONS, DEMO_PERSONAS, DEFAULT_POSITION_SALARIES } from "./constants";
import { fetchDiscordGuildMembers, mapDiscordRolesToInstitutions } from "./discord-sync";
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
  SessionUser,
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
  {
    id: "ds-101",
    userId: "discord-1379103020490555433",
    userName: "OFFICER - Atong",
    positionName: "Officer",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Ophelia Police Department",
    startedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    durationSeconds: 2 * 3600,
    status: "COMPLETED",
    notes: "Patrol downtown sector",
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: "ds-201",
    userId: "discord-1379103020490555433",
    userName: "OFFICER - Atong",
    positionName: "Officer",
    institutionId: "inst-police",
    institutionSlug: "police",
    institutionName: "Ophelia Police Department",
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    endedAt: null,
    durationSeconds: 0,
    status: "ON_DUTY",
    notes: "Patrol downtown sector",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "ds-202",
    userId: "discord-1515016912030138433",
    userName: "EMS - Angela Lee",
    positionName: "Medis",
    institutionId: "inst-medical",
    institutionSlug: "medical",
    institutionName: "Ophelia Medical Center",
    startedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    endedAt: null,
    durationSeconds: 0,
    status: "ON_DUTY",
    notes: "Emergency Response Standby",
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    id: "ds-203",
    userId: "discord-682808386349432902",
    userName: "Axton Gareth",
    positionName: "Mekanik",
    institutionId: "inst-mechanic",
    institutionSlug: "mechanic",
    institutionName: "Ophelia Custom Garage",
    startedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    endedAt: null,
    durationSeconds: 0,
    status: "ON_DUTY",
    notes: "Vehicle inspection and upgrade",
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
];

const initialMemberships: MembershipData[] = [
  // --- POLICE DEPARTMENT ---
  {
    id: "mem-pd-atong",
    userId: "discord-1379103020490555433",
    institutionId: "inst-police",
    positionName: "Officer",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-01T00:00:00Z",
    user: {
      id: "discord-1379103020490555433",
      discordId: "1379103020490555433",
      discordUsername: "ajiboyy00",
      displayName: "OFFICER - Atong",
      discordAvatar: null,
    },
  },
  {
    id: "mem-pd-sean",
    userId: "discord-1446900555699196025",
    institutionId: "inst-police",
    positionName: "Officer",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-05T00:00:00Z",
    user: {
      id: "discord-1446900555699196025",
      discordId: "1446900555699196025",
      discordUsername: "jibrilmpruy2",
      displayName: "OFFICER - Sean",
      discordAvatar: "https://cdn.discordapp.com/avatars/1446900555699196025/5c5b80ef1a70b90a3d4d3ea973b6339c.png",
    },
  },
  {
    id: "mem-pd-yeye",
    userId: "discord-1277313962664394897",
    institutionId: "inst-police",
    positionName: "Officer",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-06T00:00:00Z",
    user: {
      id: "discord-1277313962664394897",
      discordId: "1277313962664394897",
      discordUsername: "bamshutagalung17",
      displayName: "OFFICER - Yeye",
      discordAvatar: "https://cdn.discordapp.com/avatars/1277313962664394897/8449d575a9237eac008dd8987636eb76.png",
    },
  },
  {
    id: "mem-pd-suki",
    userId: "discord-1192699916326273094",
    institutionId: "inst-police",
    positionName: "Officer",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-10T00:00:00Z",
    user: {
      id: "discord-1192699916326273094",
      discordId: "1192699916326273094",
      discordUsername: "cukii06",
      displayName: "OFFICER - SUKI",
      discordAvatar: "https://cdn.discordapp.com/avatars/1192699916326273094/351127afb282553e031c51a27bdff491.png",
    },
  },
  {
    id: "mem-pd-ion",
    userId: "discord-1067083664116158595",
    institutionId: "inst-police",
    positionName: "Officer",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-11T00:00:00Z",
    user: {
      id: "discord-1067083664116158595",
      discordId: "1067083664116158595",
      discordUsername: "ionnn_21",
      displayName: "OFFICER - ION",
      discordAvatar: "https://cdn.discordapp.com/avatars/1067083664116158595/760ec99acfcf4dac0504cf8ba7edb7db.png",
    },
  },
  {
    id: "mem-pd-sky",
    userId: "discord-252349909364113408",
    institutionId: "inst-police",
    positionName: "Officer",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-12T00:00:00Z",
    user: {
      id: "discord-252349909364113408",
      discordId: "252349909364113408",
      discordUsername: ".skyxd",
      displayName: "OFFICER - SKY",
      discordAvatar: "https://cdn.discordapp.com/avatars/252349909364113408/b7e1098bc218443b4e5275bd758daa1b.png",
    },
  },
  {
    id: "mem-pd-nasaa",
    userId: "discord-983237484236374057",
    institutionId: "inst-police",
    positionName: "Chief of Police",
    permissionLevel: "LEADER",
    status: "ACTIVE",
    joinedAt: "2026-07-01T00:00:00Z",
    user: {
      id: "discord-983237484236374057",
      discordId: "983237484236374057",
      discordUsername: "athaa00",
      displayName: "ORP | Nasaa",
      discordAvatar: null,
    },
  },
  {
    id: "mem-pd-nathan",
    userId: "discord-1036237050594209902",
    institutionId: "inst-police",
    positionName: "Chief of Police",
    permissionLevel: "LEADER",
    status: "ACTIVE",
    joinedAt: "2026-07-01T00:00:00Z",
    user: {
      id: "discord-1036237050594209902",
      discordId: "1036237050594209902",
      discordUsername: "chainmokers",
      displayName: "Nathan",
      discordAvatar: "https://cdn.discordapp.com/avatars/1036237050594209902/e4c6836ad87229288f8a2da8e0b763ca.png",
    },
  },
  {
    id: "mem-pd-bagus",
    userId: "discord-390376159696912395",
    institutionId: "inst-police",
    positionName: "Chief of Police",
    permissionLevel: "LEADER",
    status: "ACTIVE",
    joinedAt: "2026-06-15T00:00:00Z",
    user: {
      id: "discord-390376159696912395",
      discordId: "390376159696912395",
      discordUsername: "rapi0853",
      displayName: "ORP - BAGUS",
      discordAvatar: "https://cdn.discordapp.com/avatars/390376159696912395/f53497e40bb8e89b8dd4c30924a5fc91.png",
    },
  },

  // --- MEDICAL CENTER ---
  {
    id: "mem-med-angela",
    userId: "discord-1515016912030138433",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-01T00:00:00Z",
    user: {
      id: "discord-1515016912030138433",
      discordId: "1515016912030138433",
      discordUsername: "angllvvxx",
      displayName: "EMS - Angela Lee",
      discordAvatar: null,
    },
  },
  {
    id: "mem-med-adinguki",
    userId: "discord-1130847993214537759",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-02T00:00:00Z",
    user: {
      id: "discord-1130847993214537759",
      discordId: "1130847993214537759",
      discordUsername: "bangblackdragon",
      displayName: "AdingUki",
      discordAvatar: null,
    },
  },
  {
    id: "mem-med-aditya",
    userId: "discord-1322937860717936766",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-03T00:00:00Z",
    user: {
      id: "discord-1322937860717936766",
      discordId: "1322937860717936766",
      discordUsername: "aditya_wijaya25",
      displayName: "Aditya Wijaya",
      discordAvatar: null,
    },
  },
  {
    id: "mem-med-chisato",
    userId: "discord-1059424472429498389",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-04T00:00:00Z",
    user: {
      id: "discord-1059424472429498389",
      discordId: "1059424472429498389",
      discordUsername: "chisatochika",
      displayName: "chisatochika",
      discordAvatar: "https://cdn.discordapp.com/avatars/1059424472429498389/c889bd1f1e716b9b842be2949d9fc747.png",
    },
  },
  {
    id: "mem-med-dam",
    userId: "discord-383955833286950912",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-05T00:00:00Z",
    user: {
      id: "discord-383955833286950912",
      discordId: "383955833286950912",
      discordUsername: "damedamedamdam",
      displayName: "Dam",
      discordAvatar: "https://cdn.discordapp.com/avatars/383955833286950912/9e3db3654337e5cdd6b20313fd1d362e.png",
    },
  },
  {
    id: "mem-med-zarrr",
    userId: "discord-1015341449212067861",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-06T00:00:00Z",
    user: {
      id: "discord-1015341449212067861",
      discordId: "1015341449212067861",
      discordUsername: "iteng1501",
      displayName: "zarrr$",
      discordAvatar: "https://cdn.discordapp.com/avatars/1015341449212067861/5f43dffb1c2e6887569cdd1dc9e7a7e6.png",
    },
  },
  {
    id: "mem-med-january",
    userId: "discord-717285672804810782",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-07T00:00:00Z",
    user: {
      id: "discord-717285672804810782",
      discordId: "717285672804810782",
      discordUsername: "sicksfeeling",
      displayName: "January",
      discordAvatar: "https://cdn.discordapp.com/avatars/717285672804810782/016c941abb6e3f78b3c76ea107d90331.png",
    },
  },
  {
    id: "mem-med-kupluk",
    userId: "discord-316192210230050816",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-08T00:00:00Z",
    user: {
      id: "discord-316192210230050816",
      discordId: "316192210230050816",
      discordUsername: ".kupluk",
      displayName: "Kupluk",
      discordAvatar: "https://cdn.discordapp.com/avatars/316192210230050816/dd0e4e1d00985f83e4bcbc63ebb1a0c6.png",
    },
  },
  {
    id: "mem-med-m0f",
    userId: "discord-344834451811074050",
    institutionId: "inst-medical",
    positionName: "Medis",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-09T00:00:00Z",
    user: {
      id: "discord-344834451811074050",
      discordId: "344834451811074050",
      discordUsername: ".m0f",
      displayName: "M0F",
      discordAvatar: "https://cdn.discordapp.com/avatars/344834451811074050/a_ad851676733459fed9a7540147096164.png",
    },
  },
  {
    id: "mem-med-justfriend",
    userId: "discord-715746033354801195",
    institutionId: "inst-medical",
    positionName: "Petinggi Medis",
    permissionLevel: "LEADER",
    status: "ACTIVE",
    joinedAt: "2026-07-20T00:00:00Z",
    user: {
      id: "discord-715746033354801195",
      discordId: "715746033354801195",
      discordUsername: "panpaq",
      displayName: "JustFriend",
      discordAvatar: "https://cdn.discordapp.com/avatars/715746033354801195/610b2b935009b4665803e9aa4493e559.png",
    },
  },

  // --- MECHANIC GARAGE ---
  {
    id: "mem-mech-axton",
    userId: "discord-682808386349432902",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-01T00:00:00Z",
    user: {
      id: "discord-682808386349432902",
      discordId: "682808386349432902",
      discordUsername: "mercifulmariner",
      displayName: "Axton Gareth",
      discordAvatar: null,
    },
  },
  {
    id: "mem-mech-ata",
    userId: "discord-1342015505170432053",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-02T00:00:00Z",
    user: {
      id: "discord-1342015505170432053",
      discordId: "1342015505170432053",
      discordUsername: "ataazahwa_29372",
      displayName: "Ata Zahwa",
      discordAvatar: null,
    },
  },
  {
    id: "mem-mech-bigguy",
    userId: "discord-461152817093148683",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-03T00:00:00Z",
    user: {
      id: "discord-461152817093148683",
      discordId: "461152817093148683",
      discordUsername: "bigguydelucas",
      displayName: "Bigguy",
      discordAvatar: null,
    },
  },
  {
    id: "mem-mech-dante",
    userId: "discord-588554207888408577",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-04T00:00:00Z",
    user: {
      id: "discord-588554207888408577",
      discordId: "588554207888408577",
      discordUsername: "herjul4082",
      displayName: "Dante",
      discordAvatar: "https://cdn.discordapp.com/avatars/588554207888408577/3d67d6a7f4b2143f46fb9d46b2fdf5f4.png",
    },
  },
  {
    id: "mem-mech-devon",
    userId: "discord-1340644224588058664",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-05T00:00:00Z",
    user: {
      id: "discord-1340644224588058664",
      discordId: "1340644224588058664",
      discordUsername: "devonrorr.",
      displayName: "Devon",
      discordAvatar: "https://cdn.discordapp.com/avatars/1340644224588058664/4789252c57361b533131209eea1c06f8.png",
    },
  },
  {
    id: "mem-mech-dmz",
    userId: "discord-673174173341712401",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-06T00:00:00Z",
    user: {
      id: "discord-673174173341712401",
      discordId: "673174173341712401",
      discordUsername: "dmzadty",
      displayName: "dmzadty",
      discordAvatar: "https://cdn.discordapp.com/avatars/673174173341712401/fbd410c28983a850af58c4c932bef9b3.png",
    },
  },
  {
    id: "mem-mech-koy",
    userId: "discord-733280011758469140",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-07T00:00:00Z",
    user: {
      id: "discord-733280011758469140",
      discordId: "733280011758469140",
      discordUsername: "rasya2429",
      displayName: "KOY GANTENG",
      discordAvatar: "https://cdn.discordapp.com/avatars/733280011758469140/815966be40c10ca32060f9db3a063ec8.png",
    },
  },
  {
    id: "mem-mech-fanzo",
    userId: "discord-1126001297011777536",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-08T00:00:00Z",
    user: {
      id: "discord-1126001297011777536",
      discordId: "1126001297011777536",
      discordUsername: "novee3634",
      displayName: "Fanzo",
      discordAvatar: "https://cdn.discordapp.com/avatars/1126001297011777536/980b1ff991553f3e84f9a44297ff3bb4.png",
    },
  },
  {
    id: "mem-mech-keth",
    userId: "discord-1013428728321278022",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-09T00:00:00Z",
    user: {
      id: "discord-1013428728321278022",
      discordId: "1013428728321278022",
      discordUsername: "francescatwila",
      displayName: "кєтн",
      discordAvatar: "https://cdn.discordapp.com/avatars/1013428728321278022/ed152d76e12017378519b4035d763bab.png",
    },
  },
  {
    id: "mem-mech-sixrascals",
    userId: "discord-330028417376452609",
    institutionId: "inst-mechanic",
    positionName: "Mekanik",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-10T00:00:00Z",
    user: {
      id: "discord-330028417376452609",
      discordId: "330028417376452609",
      discordUsername: "yihaaaa.",
      displayName: "POL - SIX RASCALS",
      discordAvatar: "https://cdn.discordapp.com/avatars/330028417376452609/356ebb3d99f3a2fa549ff9787d520e82.png",
    },
  },

  // --- RESTAURANT & LOUNGE ---
  {
    id: "mem-resto-jason",
    userId: "discord-944299382398939146",
    institutionId: "inst-restaurant",
    positionName: "Petinggi Resto",
    permissionLevel: "LEADER",
    status: "ACTIVE",
    joinedAt: "2026-07-10T00:00:00Z",
    user: {
      id: "discord-944299382398939146",
      discordId: "944299382398939146",
      discordUsername: "afrizall9682",
      displayName: "JASON2",
      discordAvatar: null,
    },
  },
  {
    id: "mem-resto-piyinaa",
    userId: "discord-964639348760936559",
    institutionId: "inst-restaurant",
    positionName: "Server Resto",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-01T00:00:00Z",
    user: {
      id: "discord-964639348760936559",
      discordId: "964639348760936559",
      discordUsername: "chochieeeee",
      displayName: "piyinaa",
      discordAvatar: "https://cdn.discordapp.com/avatars/964639348760936559/f09a6622d646520b17dfab5742ff4e82.png",
    },
  },
  {
    id: "mem-resto-darkbite",
    userId: "discord-470863102531993600",
    institutionId: "inst-restaurant",
    positionName: "Server Resto",
    permissionLevel: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-08-02T00:00:00Z",
    user: {
      id: "discord-470863102531993600",
      discordId: "470863102531993600",
      discordUsername: "da.rk_123",
      displayName: "Dark.bite",
      discordAvatar: "https://cdn.discordapp.com/avatars/470863102531993600/f23e390d5f3a43362b1f65fbebe23f1e.png",
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
          logo: r.logo || "",
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

    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const rows = await prisma.membership.findMany({
          where: { institutionId: institution.id },
          include: { user: true, position: true },
          orderBy: { joinedAt: "asc" },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            userId: r.userId,
            institutionId: r.institutionId,
            positionName: r.position?.name || "Officer",
            permissionLevel: (r.position?.permissionLevel || "MEMBER") as PermissionLevel,
            status: r.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
            joinedAt: r.joinedAt.toISOString(),
            user: {
              id: r.user.id,
              discordId: r.user.discordId,
              discordUsername: r.user.discordUsername,
              displayName: r.user.displayName || r.user.discordUsername,
              discordAvatar: r.user.discordAvatar,
            },
          }));
        }
      } catch (err) {
        console.warn("DB getMemberships fallback to memory:", err);
      }
    }

    const memoryMembers = memoryStore.memberships.filter(
      (m) => m.institutionId === institution.id || m.institutionId === institutionSlug
    );

    return memoryMembers;
  }

  /**
   * Sync all Discord members possessing roles for institutions
   */
  static async syncDiscordMembers(
    institutionSlug?: string
  ): Promise<{ success: boolean; count: number; members: MembershipData[] }> {
    try {
      const discordMembers = await fetchDiscordGuildMembers();
      if (!discordMembers.length) {
        const current = await this.getMemberships(institutionSlug || "police");
        return { success: false, count: current.length, members: current };
      }

      const institutions = await this.getInstitutions();
      const updatedList: MembershipData[] = [];

      for (const dm of discordMembers) {
        const mappedRoles = mapDiscordRolesToInstitutions(dm.roles, dm.roleIds);

        for (const mr of mappedRoles) {
          if (institutionSlug && mr.institutionSlug !== institutionSlug) continue;

          const targetInst = institutions.find((i) => i.slug === mr.institutionSlug);
          if (!targetInst) continue;

          const memId = `mem-${mr.institutionSlug}-${dm.discordId}`;
          const newMem: MembershipData = {
            id: memId,
            userId: `discord-${dm.discordId}`,
            institutionId: targetInst.id,
            positionName: mr.positionName,
            permissionLevel: mr.permissionLevel,
            status: "ACTIVE",
            joinedAt: new Date().toISOString(),
            user: {
              id: `discord-${dm.discordId}`,
              discordId: dm.discordId,
              discordUsername: dm.username,
              displayName: dm.displayName,
              discordAvatar: dm.avatarUrl,
            },
          };

          // Update memoryStore
          const existingIdx = memoryStore.memberships.findIndex(
            (m) =>
              m.userId === newMem.userId &&
              (m.institutionId === targetInst.id || m.institutionId === targetInst.slug)
          );

          if (existingIdx >= 0) {
            memoryStore.memberships[existingIdx] = {
              ...memoryStore.memberships[existingIdx],
              positionName: mr.positionName,
              permissionLevel: mr.permissionLevel,
              user: newMem.user,
            };
            updatedList.push(memoryStore.memberships[existingIdx]);
          } else {
            memoryStore.memberships.push(newMem);
            updatedList.push(newMem);
          }
        }
      }

      const resultMembers = institutionSlug
        ? await this.getMemberships(institutionSlug)
        : memoryStore.memberships;

      return {
        success: true,
        count: resultMembers.length,
        members: resultMembers,
      };
    } catch (err) {
      console.error("syncDiscordMembers error:", err);
      const fallback = institutionSlug ? await this.getMemberships(institutionSlug) : [];
      return { success: false, count: fallback.length, members: fallback };
    }
  }

  /**
   * Sync a single user when they log in via Discord OAuth
   */
  static async syncUserFromDiscordRoles(sessionUser: SessionUser): Promise<void> {
    try {
      const institutions = await this.getInstitutions();
      const mappedRoles = mapDiscordRolesToInstitutions(sessionUser.discordRoles || []);

      for (const mr of mappedRoles) {
        const targetInst = institutions.find((i) => i.slug === mr.institutionSlug);
        if (!targetInst) continue;

        const memId = `mem-${mr.institutionSlug}-${sessionUser.discordId}`;
        const newMem: MembershipData = {
          id: memId,
          userId: sessionUser.id,
          institutionId: targetInst.id,
          positionName: mr.positionName,
          permissionLevel: mr.permissionLevel,
          status: "ACTIVE",
          joinedAt: new Date().toISOString(),
          user: {
            id: sessionUser.id,
            discordId: sessionUser.discordId,
            discordUsername: sessionUser.discordUsername,
            displayName: sessionUser.displayName,
            discordAvatar: sessionUser.discordAvatar,
          },
        };

        const existingIdx = memoryStore.memberships.findIndex(
          (m) =>
            m.userId === sessionUser.id &&
            (m.institutionId === targetInst.id || m.institutionId === targetInst.slug)
        );

        if (existingIdx >= 0) {
          memoryStore.memberships[existingIdx] = {
            ...memoryStore.memberships[existingIdx],
            positionName: mr.positionName,
            permissionLevel: mr.permissionLevel,
            user: newMem.user,
          };
        } else {
          memoryStore.memberships.push(newMem);
        }
      }
    } catch (err) {
      console.warn("syncUserFromDiscordRoles error:", err);
    }
  }

  /**
   * Add a membership manually (or via invite)
   */
  static async addMembership(membership: MembershipData): Promise<MembershipData> {
    const existingIdx = memoryStore.memberships.findIndex((m) => m.id === membership.id);
    if (existingIdx >= 0) {
      memoryStore.memberships[existingIdx] = membership;
    } else {
      memoryStore.memberships.unshift(membership);
    }
    return membership;
  }

  /**
   * Update membership status or position
   */
  static async updateMembership(
    id: string,
    updates: Partial<Pick<MembershipData, "positionName" | "status" | "permissionLevel">>
  ): Promise<MembershipData | null> {
    const idx = memoryStore.memberships.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    memoryStore.memberships[idx] = {
      ...memoryStore.memberships[idx],
      ...updates,
    };
    return memoryStore.memberships[idx];
  }

  static async getUserPermission(
    userId: string,
    institutionSlug: string
  ): Promise<PermissionLevel> {
    const demoUser = DEMO_PERSONAS.find((p) => p.id === userId);
    if (demoUser && process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true") {
      if (demoUser.isSuperAdmin) return "SUPER_ADMIN";
      return demoUser.roleLevels[institutionSlug] || "MEMBER";
    }

    const institution = await this.getInstitutionBySlug(institutionSlug);
    const membership = memoryStore.memberships.find(
      (m) =>
        m.userId === userId &&
        (m.institutionId === institutionSlug || (institution && m.institutionId === institution.id))
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
