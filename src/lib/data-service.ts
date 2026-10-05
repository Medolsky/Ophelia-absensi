import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { DEFAULT_INSTITUTIONS, DEMO_PERSONAS, DEFAULT_POSITION_SALARIES } from "./constants";
import { fetchDiscordGuildMembers, mapDiscordRolesToInstitutions, getDiscordAvatarUrl, fetchDiscordMemberLive } from "./discord-sync";
import { formatInstitutionMemberName } from "./member-tag";
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
  DiscordRoleMappingData,
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
  roleMappings: DiscordRoleMappingData[];
}

const initialSessions: DutySessionData[] = [];

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
      displayName: "OPD - Atong",
      discordAvatar: "https://cdn.discordapp.com/avatars/1379103020490555433/bae8bfb17bb812fb21dff07b2141e273.png",
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
      displayName: "OPD - Sean",
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
      displayName: "OPD - Yeye",
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
      displayName: "OPD - SUKI",
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
      displayName: "OPD - ION",
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
      displayName: "OPD - SKY",
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
      displayName: "OPD - Nasaa",
      discordAvatar: "https://cdn.discordapp.com/avatars/983237484236374057/74ba611fe6b8ba7c10b747ae721ac8aa.png",
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
      displayName: "OPD - Nathan",
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
      displayName: "OPD - BAGUS",
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
      displayName: "OMC - Angela Lee",
      discordAvatar: "https://cdn.discordapp.com/avatars/1515016912030138433/77686f0158e57b004671dae529cddedd.png",
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
      displayName: "OMC - AdingUki",
      discordAvatar: "https://cdn.discordapp.com/avatars/1130847993214537759/1bfaae4d16f5408a0fca20dfdbf2b6bf.png",
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
      displayName: "OMC - Aditya Wijaya",
      discordAvatar: "https://cdn.discordapp.com/avatars/1322937860717936766/add0f21040ee83976a33853aa37757e5.png",
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
      displayName: "OMC - chisatochika",
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
      displayName: "OMC - Dam",
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
      displayName: "OMC - zarrr$",
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
      displayName: "OMC - January",
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
      displayName: "OMC - Kupluk",
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
      displayName: "OMC - M0F",
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
      displayName: "OMC - JustFriend",
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
      displayName: "OCG - Axton Gareth",
      discordAvatar: "https://cdn.discordapp.com/avatars/682808386349432902/946e602c0b23a837154371c8155e6974.png",
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
      displayName: "OCG - Ata Zahwa",
      discordAvatar: "https://cdn.discordapp.com/avatars/1342015505170432053/660be92c49a2170a19774fee4b996080.png",
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
      displayName: "OCG - Bigguy",
      discordAvatar: "https://cdn.discordapp.com/avatars/461152817093148683/cb09b64cf63e86b8c3f46ed2c3449c23.png",
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
      displayName: "OCG - Dante",
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
      displayName: "OCG - Devon",
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
      displayName: "OCG - dmzadty",
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
      displayName: "OCG - KOY GANTENG",
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
      displayName: "OCG - Fanzo",
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
      displayName: "OCG - кєтн",
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
      displayName: "OCG - SIX RASCALS",
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
      displayName: "RESTO - JASON2",
      discordAvatar: "https://cdn.discordapp.com/avatars/944299382398939146/f18c94d15c26076a27e9d635450f9d7b.png",
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
      displayName: "RESTO - piyinaa",
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
      displayName: "RESTO - Dark.bite",
      discordAvatar: "https://cdn.discordapp.com/avatars/470863102531993600/f23e390d5f3a43362b1f65fbebe23f1e.png",
    },
  },
];

export const DEFAULT_ROLE_MAPPINGS: DiscordRoleMappingData[] = [
  {
    id: "role-map-01",
    discordRole: "ADMIN",
    roleId: "1482622396954312809",
    institution: "SEMUA INSTANSI (GLOBAL)",
    permission: "SUPER_ADMIN",
    description: "Akses Super Administrator server-wide dan seluruh instansi",
  },
  {
    id: "role-map-02",
    discordRole: "PIMPINAN",
    roleId: "1482622396954312808",
    institution: "SEMUA INSTANSI (GLOBAL)",
    permission: "SUPER_ADMIN",
    description: "Pimpinan server dengan hak akses manajemen penuh",
  },
  {
    id: "role-map-03",
    discordRole: "CHIEF OF POLICE",
    roleId: "1482622396954312807",
    institution: "Ophelia Police Department",
    permission: "LEADER",
    description: "Kepala Kepolisian (Manajemen anggota, buku absensi, live monitoring)",
  },
  {
    id: "role-map-04",
    discordRole: "SWAT",
    roleId: "1508742513874440303",
    institution: "Ophelia Police Department",
    permission: "MEMBER",
    description: "Unit taktis kepolisian SWAT",
  },
  {
    id: "role-map-05",
    discordRole: "HIGHWAY PATROL",
    roleId: "1508742898194186330",
    institution: "Ophelia Police Department",
    permission: "MEMBER",
    description: "Patroli jalan raya kepolisian",
  },
  {
    id: "role-map-06",
    discordRole: "OFFICER",
    roleId: "1522915139072950312",
    institution: "Ophelia Police Department",
    permission: "MEMBER",
    description: "Petugas kepolisian aktif",
  },
  {
    id: "role-map-07",
    discordRole: "PETINGGI MEDIS",
    roleId: "1482622396954312805",
    institution: "Ophelia Medical Center",
    permission: "LEADER",
    description: "Petinggi dan Direktur Medis Rumah Sakit",
  },
  {
    id: "role-map-08",
    discordRole: "MEDIS",
    roleId: "1482622396946055227",
    institution: "Ophelia Medical Center",
    permission: "MEMBER",
    description: "Dokter dan paramedis medis rumah sakit",
  },
  {
    id: "role-map-09",
    discordRole: "PETINGGI BENGKEL",
    roleId: "1482622396946055224",
    institution: "Ophelia Custom Garage",
    permission: "LEADER",
    description: "Kepala Mekanik dan Pemilik Bengkel",
  },
  {
    id: "role-map-10",
    discordRole: "BENGKEL",
    roleId: "1482622396946055223",
    institution: "Ophelia Custom Garage",
    permission: "MEMBER",
    description: "Mekanik dan teknisi modifikasi kendaraan",
  },
  {
    id: "role-map-11",
    discordRole: "PETINGGI RESTO",
    roleId: "1482622396946055226",
    institution: "Ophelia Restaurant & Lounge",
    permission: "LEADER",
    description: "Manajer dan Supervisor Restoran & Lounge",
  },
  {
    id: "role-map-12",
    discordRole: "SERVERS RESTO",
    roleId: "1482622396946055225",
    institution: "Ophelia Restaurant & Lounge",
    permission: "MEMBER",
    description: "Staff dan pramusaji restoran",
  },
  {
    id: "role-map-13",
    discordRole: "PETINGGI PEMERINTAH",
    roleId: "1482622396946055222",
    institution: "Pemerintah Kota Ophelia",
    permission: "LEADER",
    description: "Pejabat dan Petinggi Administrasi Pemerintahan",
  },
  {
    id: "role-map-14",
    discordRole: "PEMERINTAH",
    roleId: "1482622396946055221",
    institution: "Pemerintah Kota Ophelia",
    permission: "MEMBER",
    description: "Staff operasional pelayanan sipil pemerintah",
  },
];

// Global Memory Store instance with File-backed Persistence
const globalMemoryStore = globalThis as unknown as {
  __ophelia_store?: StoreState;
};

function getPersistFilePath(): string {
  return path.join(process.cwd(), "data", "ophelia-db.json");
}

function persistStore(): void {
  try {
    if (!globalMemoryStore.__ophelia_store) return;
    const filePath = getPersistFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(globalMemoryStore.__ophelia_store, null, 2), "utf-8");
  } catch {
    try {
      if (!globalMemoryStore.__ophelia_store) return;
      const tmpPath = path.join("/tmp", "ophelia-db.json");
      fs.writeFileSync(tmpPath, JSON.stringify(globalMemoryStore.__ophelia_store, null, 2), "utf-8");
    } catch {}
  }
}

function loadPersistedStore(): Partial<StoreState> | null {
  try {
    const filePath = getPersistFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
    const tmpPath = path.join("/tmp", "ophelia-db.json");
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

const savedData = loadPersistedStore();

function mergeMemberships(base: MembershipData[], overlay: MembershipData[]): MembershipData[] {
  const merged = new Map(base.map((m) => [m.id, { ...m }]));
  for (const om of overlay) {
    const existing = merged.get(om.id);
    if (existing) {
      if (om.user) {
        existing.user = {
          ...existing.user,
          ...om.user,
          displayName: formatInstitutionMemberName(
            om.user.displayName || existing.user?.displayName,
            existing.institutionId
          ),
        };
      }
      if (om.positionName) existing.positionName = om.positionName;
      if (om.permissionLevel) existing.permissionLevel = om.permissionLevel;
      if (om.status) existing.status = om.status;
    } else {
      const copy = { ...om };
      if (copy.user) {
        copy.user = {
          ...copy.user,
          displayName: formatInstitutionMemberName(copy.user.displayName, copy.institutionId),
        };
      }
      merged.set(om.id, copy);
    }
  }
  return Array.from(merged.values());
}

if (!globalMemoryStore.__ophelia_store) {
  const baseMemberships = [...initialMemberships];
  const mergedMemberships = savedData?.memberships?.length
    ? mergeMemberships(baseMemberships, savedData.memberships)
    : baseMemberships;

  globalMemoryStore.__ophelia_store = {
    institutions: savedData?.institutions?.length ? savedData.institutions : [...DEFAULT_INSTITUTIONS],
    memberships: mergedMemberships,
    dutySessions: savedData?.dutySessions || [],
    auditLogs: savedData?.auditLogs || [],
    attendanceEdits: savedData?.attendanceEdits || [],
    salaryConfigs: savedData?.salaryConfigs || { ...DEFAULT_POSITION_SALARIES },
    payrollStatuses: savedData?.payrollStatuses || {},
    roleMappings: savedData?.roleMappings?.length ? savedData.roleMappings : [...DEFAULT_ROLE_MAPPINGS],
  };
} else {
  if (!globalMemoryStore.__ophelia_store.institutions || globalMemoryStore.__ophelia_store.institutions.length === 0) {
    globalMemoryStore.__ophelia_store.institutions = savedData?.institutions?.length ? savedData.institutions : [...DEFAULT_INSTITUTIONS];
  }
  if (!globalMemoryStore.__ophelia_store.memberships || globalMemoryStore.__ophelia_store.memberships.length === 0) {
    const baseMemberships = [...initialMemberships];
    globalMemoryStore.__ophelia_store.memberships = savedData?.memberships?.length
      ? mergeMemberships(baseMemberships, savedData.memberships)
      : baseMemberships;
  } else if (savedData?.memberships?.length) {
    globalMemoryStore.__ophelia_store.memberships = mergeMemberships(
      globalMemoryStore.__ophelia_store.memberships,
      savedData.memberships
    );
  }
  if (!globalMemoryStore.__ophelia_store.dutySessions || globalMemoryStore.__ophelia_store.dutySessions.length === 0) {
    globalMemoryStore.__ophelia_store.dutySessions = savedData?.dutySessions || [];
  }
  if (!globalMemoryStore.__ophelia_store.auditLogs) {
    globalMemoryStore.__ophelia_store.auditLogs = savedData?.auditLogs || [];
  }
  if (!globalMemoryStore.__ophelia_store.attendanceEdits) {
    globalMemoryStore.__ophelia_store.attendanceEdits = savedData?.attendanceEdits || [];
  }
  if (!globalMemoryStore.__ophelia_store.salaryConfigs) {
    globalMemoryStore.__ophelia_store.salaryConfigs = savedData?.salaryConfigs || { ...DEFAULT_POSITION_SALARIES };
  }
  if (!globalMemoryStore.__ophelia_store.payrollStatuses) {
    globalMemoryStore.__ophelia_store.payrollStatuses = savedData?.payrollStatuses || {};
  }
  if (!globalMemoryStore.__ophelia_store.roleMappings) {
    globalMemoryStore.__ophelia_store.roleMappings = savedData?.roleMappings?.length ? savedData.roleMappings : [...DEFAULT_ROLE_MAPPINGS];
  }
}

const memoryStore = globalMemoryStore.__ophelia_store;

function reloadPersistedSessions(): void {
  try {
    const current = loadPersistedStore();
    if (current?.dutySessions && Array.isArray(current.dutySessions)) {
      const diskSessions = current.dutySessions;
      if (diskSessions.length > 0) {
        const existingMap = new Map(memoryStore.dutySessions.map((s) => [s.id, s]));
        for (const ds of diskSessions) {
          existingMap.set(ds.id, ds);
        }
        memoryStore.dutySessions = Array.from(existingMap.values());
      }
    }
    if (current?.memberships && Array.isArray(current.memberships)) {
      const existingMap = new Map(memoryStore.memberships.map((m) => [m.id, m]));
      for (const dm of current.memberships) {
        const existing = existingMap.get(dm.id);
        if (existing) {
          if (dm.user) {
            existing.user = {
              ...existing.user,
              ...dm.user,
              displayName: formatInstitutionMemberName(
                dm.user.displayName || existing.user?.displayName,
                existing.institutionId
              ),
            };
          }
          if (dm.positionName) existing.positionName = dm.positionName;
          if (dm.permissionLevel) existing.permissionLevel = dm.permissionLevel;
          if (dm.status) existing.status = dm.status;
        } else {
          const copy = { ...dm };
          if (copy.user) {
            copy.user = {
              ...copy.user,
              displayName: formatInstitutionMemberName(copy.user.displayName, copy.institutionId),
            };
          }
          memoryStore.memberships.push(copy);
          existingMap.set(dm.id, copy);
        }
      }
    }
  } catch {}
}

export function normalizeInstSlug(slugOrId?: string): string {
  if (!slugOrId) return "";
  const cleaned = slugOrId.replace(/^inst-/, "").toLowerCase().trim();
  if (cleaned === "polisi") return "police";
  if (cleaned === "medis") return "medical";
  if (cleaned === "mekanik" || cleaned === "bengkel") return "mechanic";
  if (cleaned === "resto" || cleaned === "restoran") return "restaurant";
  if (cleaned === "pemerintah" || cleaned === "pemkot") return "government";
  return cleaned;
}

function matchesInstitution(
  session: { institutionSlug?: string; institutionId?: string },
  targetSlugOrId?: string
): boolean {
  if (!targetSlugOrId || targetSlugOrId === "all") return true;
  const target = normalizeInstSlug(targetSlugOrId);
  const sessionSlug = normalizeInstSlug(session.institutionSlug);
  const sessionId = normalizeInstSlug(session.institutionId);
  return sessionSlug === target || sessionId === target;
}

export class DataService {
  /**
   * Check if Postgres connection is configured
   */
  private static isDatabaseAvailable(): boolean {
    return !!(
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL
    );
  }

  private static institutionsCache: { data: InstitutionData[]; timestamp: number } | null = null;
  private static inFlightInstitutions: Promise<InstitutionData[]> | null = null;

  private static membershipsCache = new Map<string, { data: MembershipData[]; timestamp: number }>();
  private static inFlightMemberships = new Map<string, Promise<MembershipData[]>>();

  private static userMembershipsCache = new Map<string, { data: MembershipData[]; timestamp: number }>();
  private static inFlightUserMemberships = new Map<string, Promise<MembershipData[]>>();

  private static institutionSessionsCache = new Map<string, { data: DutySessionData[]; timestamp: number }>();
  private static inFlightInstitutionSessions = new Map<string, Promise<DutySessionData[]>>();

  private static liveSessionsCache = new Map<string, { data: DutySessionData[]; timestamp: number }>();
  private static inFlightLiveSessions = new Map<string, Promise<DutySessionData[]>>();

  private static activeSessionsCache = new Map<string, { data: DutySessionData | null; timestamp: number }>();
  private static inFlightActiveSessions = new Map<string, Promise<DutySessionData | null>>();

  private static userLastSyncMap = new Map<string, number>();
  private static userSyncInFlightMap = new Map<string, Promise<SessionUser | null>>();

  // --- CACHE INVALIDATION HELPERS ---
  static invalidateDutySessionsCache(institutionSlug?: string) {
    if (institutionSlug) {
      const cleanSlug = institutionSlug.replace("inst-", "").toLowerCase();
      this.institutionSessionsCache.delete(cleanSlug);
      this.liveSessionsCache.delete(cleanSlug);
      this.liveSessionsCache.delete("all");
    } else {
      this.institutionSessionsCache.clear();
      this.liveSessionsCache.clear();
    }
  }

  static invalidateActiveSession(userId?: string) {
    if (userId) {
      const cleanId = userId.replace("discord-", "");
      this.activeSessionsCache.delete(cleanId);
      this.activeSessionsCache.delete(userId);
      this.activeSessionsCache.delete(`discord-${cleanId}`);
    } else {
      this.activeSessionsCache.clear();
    }
  }

  static invalidateMembershipsCache(institutionSlug?: string) {
    if (institutionSlug) {
      const cleanSlug = institutionSlug.replace("inst-", "").toLowerCase();
      this.membershipsCache.delete(cleanSlug);
    } else {
      this.membershipsCache.clear();
    }
    this.userMembershipsCache.clear();
  }

  static invalidateUserMembershipsCache(userId?: string) {
    if (userId) {
      const cleanId = userId.replace("discord-", "");
      this.userMembershipsCache.delete(cleanId);
      this.userMembershipsCache.delete(userId);
      this.userMembershipsCache.delete(`discord-${cleanId}`);
    } else {
      this.userMembershipsCache.clear();
    }
  }

  static invalidateInstitutionsCache() {
    this.institutionsCache = null;
  }

  private static lastGuildSyncTime = new Map<string, number>();
  private static guildSyncInFlight = new Map<string, Promise<any>>();

  /**
   * Auto-sync Discord members for an institution if last sync was more than 45 seconds ago.
   * Debounced to ensure automatic real-time sync when roles are updated in Discord.
   */
  static async autoSyncDiscordMembersIfNeeded(institutionSlug?: string): Promise<void> {
    const slug = institutionSlug ? institutionSlug.replace("inst-", "").toLowerCase() : "all";
    const now = Date.now();
    const lastSync = this.lastGuildSyncTime.get(slug) || 0;

    // Throttle to 45 seconds to avoid unnecessary API requests
    if (now - lastSync < 45000) {
      return;
    }

    const inFlight = this.guildSyncInFlight.get(slug);
    if (inFlight) {
      return inFlight;
    }

    const syncPromise = (async () => {
      try {
        await this.syncDiscordMembers(institutionSlug);
        this.lastGuildSyncTime.set(slug, Date.now());
      } catch (err) {
        console.warn(`autoSyncDiscordMembersIfNeeded error for ${slug}:`, err);
      } finally {
        this.guildSyncInFlight.delete(slug);
      }
    })();

    this.guildSyncInFlight.set(slug, syncPromise);
    return syncPromise;
  }

  // --- INSTITUTIONS ---

  static async getInstitutions(): Promise<InstitutionData[]> {
    const now = Date.now();
    if (this.institutionsCache && now - this.institutionsCache.timestamp < 600000) {
      return this.institutionsCache.data;
    }

    if (this.inFlightInstitutions) {
      return this.inFlightInstitutions;
    }

    const fetchPromise = (async () => {
      const isDb = this.isDatabaseAvailable();
      if (isDb) {
        try {
          const rows = await prisma.institution.findMany({
            orderBy: { name: "asc" },
            include: { discordRoles: true },
          });
          const result = rows.map((r) => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            description: r.description || "",
            logo: r.logo || "",
            primaryColor: r.primaryColor,
            status: r.status as "ACTIVE" | "INACTIVE",
            discordRoleNames: r.discordRoles.map((dr) => dr.name),
          }));
          this.institutionsCache = { data: result, timestamp: Date.now() };
          return result;
        } catch (err) {
          console.warn("DB query failed, fallback to memory:", err);
        }
      }
      return memoryStore.institutions;
    })();

    this.inFlightInstitutions = fetchPromise;
    try {
      return await fetchPromise;
    } finally {
      this.inFlightInstitutions = null;
    }
  }

  static async getInstitutionBySlug(slug: string): Promise<InstitutionData | null> {
    const cleanSlug = normalizeInstSlug(slug);
    const institutions = await this.getInstitutions();
    return (
      institutions.find(
        (i) =>
          i.slug === cleanSlug ||
          i.slug === slug ||
          i.id === slug ||
          i.id === `inst-${cleanSlug}` ||
          normalizeInstSlug(i.slug) === cleanSlug
      ) || null
    );
  }

  static async createInstitution(data: {
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    primaryColor?: string;
    status?: "ACTIVE" | "INACTIVE";
    discordRoleNames?: string[];
  }): Promise<InstitutionData> {
    const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    const id = `inst-${cleanSlug}-${Date.now().toString().slice(-4)}`;
    const newInst: InstitutionData = {
      id,
      name: data.name.trim(),
      slug: cleanSlug,
      description: data.description?.trim() || "",
      logo: data.logo?.trim() || "/logos/ophelia-logo.png",
      primaryColor: data.primaryColor || "#E50914",
      status: data.status || "ACTIVE",
      discordRoleNames: data.discordRoleNames || [],
    };

    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const created = await prisma.institution.create({
          data: {
            id: newInst.id,
            name: newInst.name,
            slug: newInst.slug,
            description: newInst.description,
            logo: newInst.logo,
            primaryColor: newInst.primaryColor,
            status: newInst.status,
          },
        });
        newInst.id = created.id;
      } catch (err) {
        console.warn("DB create institution failed, using memory:", err);
      }
    }

    const existingIdx = memoryStore.institutions.findIndex((i) => i.slug === newInst.slug);
    if (existingIdx >= 0) {
      memoryStore.institutions[existingIdx] = newInst;
    } else {
      memoryStore.institutions.push(newInst);
    }
    this.institutionsCache = null;
    return newInst;
  }

  static async updateInstitution(
    id: string,
    updates: Partial<InstitutionData>
  ): Promise<InstitutionData | null> {
    const isDb = this.isDatabaseAvailable();
    if (isDb) {
      try {
        await prisma.institution.update({
          where: { id },
          data: {
            name: updates.name,
            description: updates.description,
            logo: updates.logo,
            primaryColor: updates.primaryColor,
            status: updates.status,
          },
        });
      } catch (err) {
        console.warn("DB update institution failed, using memory:", err);
      }
    }

    const idx = memoryStore.institutions.findIndex((i) => i.id === id || i.slug === id);
    if (idx === -1) return null;

    memoryStore.institutions[idx] = {
      ...memoryStore.institutions[idx],
      ...updates,
    };
    this.institutionsCache = null;
    return memoryStore.institutions[idx];
  }

  static async deleteInstitution(id: string): Promise<boolean> {
    const isDb = this.isDatabaseAvailable();
    if (isDb) {
      try {
        await prisma.institution.delete({ where: { id } });
      } catch (err) {
        console.warn("DB delete institution failed, using memory:", err);
      }
    }

    const idx = memoryStore.institutions.findIndex((i) => i.id === id || i.slug === id);
    if (idx !== -1) {
      memoryStore.institutions.splice(idx, 1);
      this.institutionsCache = null;
      return true;
    }
    return false;
  }

  // --- DUTY SESSIONS ---

  /**
   * Get currently active session for a specific user across all institutions
   */
  static async getActiveDutySession(userId: string): Promise<DutySessionData | null> {
    const cleanId = userId.replace("discord-", "");
    const now = Date.now();
    const cached = this.activeSessionsCache.get(cleanId);
    if (cached && now - cached.timestamp < 60000) {
      return cached.data;
    }

    const inFlight = this.inFlightActiveSessions.get(cleanId);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      const isDb = await this.isDatabaseAvailable();
      if (isDb) {
        try {
          const active = await prisma.dutySession.findFirst({
            where: {
              OR: [
                { userId },
                { userId: cleanId },
                { userId: `discord-${cleanId}` },
                { user: { discordId: cleanId } },
              ],
              endedAt: null,
              status: "ON_DUTY",
            },
            include: {
              institution: true,
              user: true,
            },
          });
          const stamp = Date.now();
          if (active) {
            const res: DutySessionData = {
              id: active.id,
              userId: active.userId,
              userName: formatInstitutionMemberName(active.user.displayName || active.user.discordUsername, active.institution.slug),
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
            this.activeSessionsCache.set(cleanId, { data: res, timestamp: stamp });
            this.activeSessionsCache.set(userId, { data: res, timestamp: stamp });
            return res;
          }
          // DB is online and query succeeded: ground truth is user is OFF DUTY
          this.activeSessionsCache.set(cleanId, { data: null, timestamp: stamp });
          this.activeSessionsCache.set(userId, { data: null, timestamp: stamp });
          return null;
        } catch (err) {
          console.warn("DB getActiveDutySession fallback:", err);
        }
      }

      reloadPersistedSessions();
      const session = memoryStore.dutySessions.find(
        (s) =>
          (s.userId === userId ||
            s.userId === cleanId ||
            s.userId === `discord-${cleanId}`) &&
          !s.endedAt &&
          s.status === "ON_DUTY"
      );
      const result = session
        ? {
            ...session,
            userName: formatInstitutionMemberName(session.userName, session.institutionSlug),
          }
        : null;
      const stamp = Date.now();
      this.activeSessionsCache.set(cleanId, { data: result, timestamp: stamp });
      this.activeSessionsCache.set(userId, { data: result, timestamp: stamp });
      return result;
    })();

    this.inFlightActiveSessions.set(cleanId, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightActiveSessions.delete(cleanId);
    }
  }

  /**
   * Inject active duty session into serverless memory store
   */
  static injectActiveDutySession(session: DutySessionData): void {
    if (!session || session.endedAt || session.status !== "ON_DUTY") return;
    const cleanSessionSlug = normalizeInstSlug(session.institutionSlug || session.institutionId);
    const cleanId = session.userId.replace("discord-", "");
    const now = Date.now();
    this.activeSessionsCache.set(cleanId, { data: session, timestamp: now });
    this.activeSessionsCache.set(session.userId, { data: session, timestamp: now });

    const existing = memoryStore.dutySessions.find((s) => s.id === session.id);
    if (!existing) {
      memoryStore.dutySessions.unshift({
        ...session,
        institutionSlug: session.institutionSlug || cleanSessionSlug,
      });
      persistStore();
    } else {
      existing.status = "ON_DUTY";
      existing.endedAt = null;
    }
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
    reloadPersistedSessions();

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

    // Resolve user's actual position if not provided
    let positionName = params.positionName;
    const cleanId = params.userId.replace("discord-", "");
    if (!positionName) {
      const memberships = await this.getMemberships(institution.slug);
      const userMem = memberships.find(
        (m) =>
          m.userId === params.userId ||
          m.userId === cleanId ||
          m.userId === `discord-${cleanId}` ||
          m.user?.discordId === cleanId
      );
      if (userMem?.positionName) {
        positionName = userMem.positionName;
      }
    }

    // Ensure user is recorded in institution memberships
    const existingMembership = memoryStore.memberships.find(
      (m) =>
        matchesInstitution({ institutionSlug: m.institutionId }, institution.slug) &&
        (m.userId === params.userId ||
          m.userId === cleanId ||
          m.userId === `discord-${cleanId}` ||
          m.user?.discordId === cleanId)
    );

    const formattedUserName = formatInstitutionMemberName(params.userName, institution.slug);

    if (!existingMembership) {
      const defaultRoleName =
        institution.slug === "police"
          ? "Kadet Polisi"
          : institution.slug === "medical"
          ? "Medis Pemula"
          : institution.slug === "mechanic"
          ? "Mekanik Magang"
          : "Staff";
      memoryStore.memberships.push({
        id: `mem-${institution.slug}-${cleanId}`,
        userId: params.userId,
        institutionId: institution.id,
        positionName: positionName || defaultRoleName,
        permissionLevel: "MEMBER",
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        user: {
          id: params.userId,
          discordId: cleanId,
          discordUsername: params.userName,
          displayName: formattedUserName,
          discordAvatar: params.userAvatar || null,
        },
      });
      persistStore();
    }

    const now = new Date();
    const isDb = await this.isDatabaseAvailable();

    if (isDb) {
      try {
        // Ensure user exists in database first to satisfy foreign key constraint
        const dbUser = await prisma.user.upsert({
          where: { discordId: cleanId },
          update: {
            discordUsername: params.userName,
            displayName: formattedUserName,
            discordAvatar: params.userAvatar || null,
          },
          create: {
            id: params.userId,
            discordId: cleanId,
            discordUsername: params.userName,
            displayName: formattedUserName,
            discordAvatar: params.userAvatar || null,
          },
        });

        const newSession = await prisma.dutySession.create({
          data: {
            userId: dbUser.id,
            institutionId: institution.id,
            startedAt: now,
            status: "ON_DUTY",
            notes: params.notes || null,
          },
        });

        // Audit Log
        try {
          await prisma.auditLog.create({
            data: {
              actorId: dbUser.id,
              action: "START_DUTY",
              targetType: "DUTY_SESSION",
              targetId: newSession.id,
              newData: JSON.stringify({ institution: institution.name, startedAt: now }),
            },
          });
        } catch (auditErr) {
          console.warn("DB auditLog error:", auditErr);
        }

        const sessionResult: DutySessionData = {
          id: newSession.id,
          userId: params.userId,
          userName: formattedUserName,
          userAvatar: params.userAvatar,
          positionName,
          institutionId: institution.id,
          institutionSlug: institution.slug,
          institutionName: institution.name,
          startedAt: newSession.startedAt.toISOString(),
          endedAt: null,
          durationSeconds: 0,
          status: "ON_DUTY",
          notes: newSession.notes,
          createdAt: newSession.createdAt.toISOString(),
        };

        // Also add to memoryStore to keep synchronized
        memoryStore.dutySessions.unshift(sessionResult);
        persistStore();

        // Invalidate duty sessions and active session caches
        this.invalidateDutySessionsCache(institution.slug);
        this.invalidateActiveSession(params.userId);

        return {
          success: true,
          session: sessionResult,
        };
      } catch (err) {
        console.warn("DB startDuty error, fallback to memory:", err);
      }
    }

    const session: DutySessionData = {
      id: `ds-${Date.now()}`,
      userId: params.userId,
      userName: formattedUserName,
      userAvatar: params.userAvatar,
      positionName,
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
      actorName: formattedUserName,
      action: "START_DUTY",
      targetType: "DUTY_SESSION",
      targetId: session.id,
      newData: JSON.stringify({ institution: institution.name, startedAt: now }),
      createdAt: now.toISOString(),
    });

    persistStore();

    this.invalidateDutySessionsCache(institution.slug);
    this.invalidateActiveSession(params.userId);

    return { success: true, session };
  }

  /**
   * End an active duty session (Calculates duration based on server timestamp)
   */
  static async endDuty(params: {
    userId: string;
    institutionSlug?: string;
  }): Promise<{ success: boolean; session?: DutySessionData; error?: string }> {
    const active = await this.getActiveDutySession(params.userId);
    const cleanId = params.userId.replace("discord-", "");
    const now = new Date();
    let completedSession: DutySessionData | undefined;

    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: params.userId },
              { discordId: cleanId },
              { id: `discord-${cleanId}` },
            ],
          },
        });

        const userFilter = [
          { userId: params.userId },
          { userId: cleanId },
          { userId: `discord-${cleanId}` },
          { user: { discordId: cleanId } },
          ...(dbUser ? [{ userId: dbUser.id }] : []),
          ...(active ? [{ id: active.id }] : []),
        ];

        // 1. Close ALL open duty sessions for this user in PostgreSQL
        const openSessions = await prisma.dutySession.findMany({
          where: {
            OR: userFilter,
            endedAt: null,
            status: "ON_DUTY",
          },
          include: { institution: true, user: true },
        });

        for (const s of openSessions) {
          const durationSeconds = Math.max(
            0,
            Math.round((now.getTime() - new Date(s.startedAt).getTime()) / 1000)
          );
          await prisma.dutySession.update({
            where: { id: s.id },
            data: {
              endedAt: now,
              durationSeconds,
              status: "COMPLETED",
            },
          });

          if (!completedSession) {
            completedSession = {
              id: s.id,
              userId: s.userId,
              userName: s.user.displayName || s.user.discordUsername,
              institutionId: s.institutionId,
              institutionSlug: s.institution.slug,
              institutionName: s.institution.name,
              startedAt: s.startedAt.toISOString(),
              endedAt: now.toISOString(),
              durationSeconds,
              status: "COMPLETED",
              notes: s.notes,
              createdAt: s.createdAt.toISOString(),
            };
          }
        }

        // 2. Audit Log
        if (dbUser && openSessions.length > 0) {
          try {
            await prisma.auditLog.create({
              data: {
                actorId: dbUser.id,
                action: "END_DUTY",
                targetType: "DUTY_SESSION",
                targetId: openSessions[0].id,
                newData: JSON.stringify({
                  endedAt: now,
                  sessionsClosed: openSessions.length,
                }),
              },
            });
          } catch {}
        }
      } catch (err) {
        console.warn("DB endDuty error, fallback to memory:", err);
      }
    }

    // 3. Comprehensive memory cleanup: mark all matching open sessions for this user as completed
    memoryStore.dutySessions.forEach((s) => {
      const isUserMatch =
        s.userId === params.userId ||
        s.userId === cleanId ||
        s.userId === `discord-${cleanId}` ||
        (active && s.id === active.id);

      if (isUserMatch && !s.endedAt && s.status === "ON_DUTY") {
        const start = new Date(s.startedAt);
        const duration = Math.max(0, Math.round((now.getTime() - start.getTime()) / 1000));
        s.endedAt = now.toISOString();
        s.durationSeconds = duration;
        s.status = "COMPLETED";
        if (!completedSession) {
          completedSession = { ...s };
        }
      }
    });

    // Always persist changes to disk
    persistStore();

    this.invalidateDutySessionsCache(params.institutionSlug);
    this.invalidateActiveSession(params.userId);

    if (completedSession) {
      memoryStore.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        actorId: params.userId,
        actorName: completedSession.userName || "User",
        action: "END_DUTY",
        targetType: "DUTY_SESSION",
        targetId: completedSession.id,
        newData: JSON.stringify({ endedAt: now, durationSeconds: completedSession.durationSeconds }),
        createdAt: now.toISOString(),
      });
      persistStore();
      return { success: true, session: completedSession };
    }

    if (active) {
      const start = new Date(active.startedAt);
      const duration = Math.max(0, Math.round((now.getTime() - start.getTime()) / 1000));
      return {
        success: true,
        session: {
          ...active,
          endedAt: now.toISOString(),
          durationSeconds: duration,
          status: "COMPLETED",
        },
      };
    }

    // If no active session was found, user is already off duty
    return { success: true };
  }

  /**
   * Get all duty sessions for an institution (all officers/members)
   */
  static async getInstitutionDutySessions(institutionSlug: string): Promise<DutySessionData[]> {
    const cleanSlug = normalizeInstSlug(institutionSlug);
    const now = Date.now();
    const cached = this.institutionSessionsCache.get(cleanSlug);
    if (cached && now - cached.timestamp < 60000) {
      return cached.data;
    }

    const inFlight = this.inFlightInstitutionSessions.get(cleanSlug);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      const institution = await this.getInstitutionBySlug(cleanSlug);
      const isDb = await this.isDatabaseAvailable();
      if (isDb && institution) {
        try {
          const [rows, members] = await Promise.all([
            prisma.dutySession.findMany({
              where: {
                OR: [
                  { institutionId: institution.id },
                  { institutionId: institution.slug },
                  { institutionId: `inst-${cleanSlug}` },
                ],
              },
              include: { institution: true, user: true },
              orderBy: { startedAt: "desc" },
            }),
            this.getMemberships(institutionSlug),
          ]);

          const posMap = new Map<string, string>();
          for (const m of members) {
            if (m.positionName) {
              posMap.set(m.userId, m.positionName);
              posMap.set(m.userId.replace("discord-", ""), m.positionName);
              if (m.user?.discordId) posMap.set(m.user.discordId, m.positionName);
            }
          }

          const defaultPos = cleanSlug.includes("med")
            ? "Medis"
            : cleanSlug.includes("mech") || cleanSlug.includes("bengkel")
            ? "Mekanik"
            : cleanSlug.includes("resto")
            ? "Server Resto"
            : cleanSlug.includes("pemerintah")
            ? "Staff Sipil"
            : "Officer";

          const result: DutySessionData[] = rows.map((r) => {
            const cleanUId = r.userId.replace("discord-", "");
            const pos = posMap.get(r.userId) || posMap.get(cleanUId) || posMap.get(r.user.discordId) || defaultPos;
            return {
              id: r.id,
              userId: r.userId,
              userName: formatInstitutionMemberName(r.user.displayName || r.user.discordUsername, cleanSlug),
              userAvatar: r.user.discordAvatar,
              positionName: pos,
              institutionId: r.institutionId,
              institutionSlug: r.institution.slug,
              institutionName: r.institution.name,
              startedAt: r.startedAt.toISOString(),
              endedAt: r.endedAt ? r.endedAt.toISOString() : null,
              durationSeconds: r.durationSeconds,
              status: r.status as DutySessionData["status"],
              notes: r.notes,
              createdAt: r.createdAt.toISOString(),
            };
          });

          this.institutionSessionsCache.set(cleanSlug, { data: result, timestamp: Date.now() });
          return result;
        } catch (err) {
          console.warn("DB getInstitutionDutySessions error:", err);
        }
      }

      reloadPersistedSessions();
      const memoryResult = memoryStore.dutySessions
        .filter((s) => matchesInstitution(s, institutionSlug))
        .map((s) => ({
          ...s,
          userName: formatInstitutionMemberName(s.userName, s.institutionSlug || cleanSlug),
        }))
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      this.institutionSessionsCache.set(cleanSlug, { data: memoryResult, timestamp: Date.now() });
      return memoryResult;
    })();

    this.inFlightInstitutionSessions.set(cleanSlug, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightInstitutionSessions.delete(cleanSlug);
    }
  }

  /**
   * Get duty sessions for a user within an institution
   */
  static async getUserDutySessions(
    userId: string,
    institutionSlug: string
  ): Promise<DutySessionData[]> {
    const cleanId = userId.replace("discord-", "");
    const cleanSlug = normalizeInstSlug(institutionSlug);

    // Fast path: reuse or populate the institution's sessions cache
    const all = await this.getInstitutionDutySessions(cleanSlug);
    return all.filter(
      (s) =>
        s.userId === userId ||
        s.userId === cleanId ||
        s.userId === `discord-${cleanId}` ||
        s.userName === cleanId
    );
  }

  /**
   * Get all live members currently on duty for an institution (or all institutions)
   */
  static async getLiveOnDuty(institutionSlug?: string): Promise<DutySessionData[]> {
    const cleanSlug = institutionSlug ? institutionSlug.replace("inst-", "").toLowerCase() : "all";
    const now = Date.now();
    const cached = this.liveSessionsCache.get(cleanSlug);
    if (cached && now - cached.timestamp < 30000) {
      return cached.data;
    }

    const inFlight = this.inFlightLiveSessions.get(cleanSlug);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      const isDb = await this.isDatabaseAvailable();
      if (isDb) {
        try {
          const rows = await prisma.dutySession.findMany({
            where: {
              endedAt: null,
              status: "ON_DUTY",
              ...(institutionSlug && institutionSlug !== "all"
                ? {
                    institution: {
                      OR: [
                        { slug: cleanSlug },
                        { slug: institutionSlug },
                        { slug: `inst-${cleanSlug}` },
                        { id: cleanSlug },
                        { id: institutionSlug },
                        { id: `inst-${cleanSlug}` },
                      ],
                    },
                  }
                : {}),
            },
            include: { institution: true, user: true },
            orderBy: { startedAt: "asc" },
          });

          // Resolve position names from cached memberships
          const posMap = new Map<string, string>();
          if (institutionSlug && institutionSlug !== "all") {
            const members = await this.getMemberships(cleanSlug);
            for (const m of members) {
              if (m.positionName) {
                posMap.set(m.userId, m.positionName);
                posMap.set(m.userId.replace("discord-", ""), m.positionName);
                if (m.user?.discordId) posMap.set(m.user.discordId, m.positionName);
              }
            }
          }

          const defaultPos = cleanSlug.includes("med")
            ? "Medis"
            : cleanSlug.includes("mech") || cleanSlug.includes("bengkel")
            ? "Mekanik"
            : cleanSlug.includes("resto")
            ? "Server Resto"
            : cleanSlug.includes("pemerintah")
            ? "Staff Sipil"
            : "Officer";

          const result: DutySessionData[] = rows.map((r) => {
            const cleanUId = r.userId.replace("discord-", "");
            const pos =
              posMap.get(r.userId) ||
              posMap.get(cleanUId) ||
              posMap.get(r.user.discordId) ||
              defaultPos;

            return {
              id: r.id,
              userId: r.userId,
              userName: formatInstitutionMemberName(r.user.displayName || r.user.discordUsername, r.institution.slug),
              userAvatar: r.user.discordAvatar,
              positionName: pos,
              institutionId: r.institutionId,
              institutionSlug: r.institution.slug,
              institutionName: r.institution.name,
              startedAt: r.startedAt.toISOString(),
              endedAt: null,
              durationSeconds: 0,
              status: "ON_DUTY",
              notes: r.notes,
              createdAt: r.createdAt.toISOString(),
            };
          });
          this.liveSessionsCache.set(cleanSlug, { data: result, timestamp: Date.now() });
          return result;
        } catch (err) {
          console.warn("DB getLiveOnDuty error:", err);
        }
      }

      reloadPersistedSessions();
      const memoryResult = memoryStore.dutySessions
        .filter((s) => {
          const isLive = !s.endedAt && s.status === "ON_DUTY";
          if (!isLive) return false;
          return matchesInstitution(s, institutionSlug);
        })
        .map((s) => ({
          ...s,
          userName: formatInstitutionMemberName(s.userName, s.institutionSlug || cleanSlug),
        }));
      this.liveSessionsCache.set(cleanSlug, { data: memoryResult, timestamp: Date.now() });
      return memoryResult;
    })();

    this.inFlightLiveSessions.set(cleanSlug, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightLiveSessions.delete(cleanSlug);
    }
  }

  // --- MEMBERSHIP & PERMISSIONS ---

  /**
   * Fast targeted lookup for a single user's membership in an institution.
   * Avoids loading all members of the institution.
   */
  static async getUserMembership(
    userId: string,
    institutionSlug: string
  ): Promise<MembershipData | null> {
    const cleanId = userId.replace("discord-", "");
    const cleanSlug = normalizeInstSlug(institutionSlug);

    // 1. Check membershipsCache if already loaded (0ms)
    const cached = this.membershipsCache.get(cleanSlug);
    if (cached && Date.now() - cached.timestamp < 300000) {
      const found = cached.data.find(
        (m) =>
          m.userId === userId ||
          m.userId === cleanId ||
          m.userId === `discord-${cleanId}` ||
          m.user?.discordId === cleanId
      );
      if (found) return found;
    }

    // 2. Check userMembershipsCache if already loaded (0ms)
    const userCached = this.userMembershipsCache.get(cleanId);
    if (userCached && Date.now() - userCached.timestamp < 300000) {
      const found = userCached.data.find(
        (m) =>
          normalizeInstSlug(m.institutionId) === cleanSlug ||
          normalizeInstSlug((m as any).institutionSlug || "") === cleanSlug
      );
      if (found) return found;
    }

    // 3. Fast check from in-memory seed/store (0ms)
    const memoryMembers = memoryStore.memberships.filter(
      (m) => normalizeInstSlug(m.institutionId) === cleanSlug || m.institutionId === institutionSlug
    );
    const memFound = memoryMembers.find(
      (m) =>
        m.userId === userId ||
        m.userId === cleanId ||
        m.userId === `discord-${cleanId}` ||
        m.user?.discordId === cleanId
    );
    if (memFound) return memFound;

    const institution = await this.getInstitutionBySlug(institutionSlug);
    if (!institution) return null;

    const isDb = this.isDatabaseAvailable();
    if (isDb) {
      try {
        const row = await prisma.membership.findFirst({
          where: {
            institutionId: institution.id,
            OR: [
              { userId },
              { userId: cleanId },
              { userId: `discord-${cleanId}` },
              { user: { discordId: cleanId } },
            ],
          },
          include: { user: true, position: true },
        });

        if (row) {
          return {
            id: row.id,
            userId: row.userId,
            institutionId: row.institutionId,
            positionName: row.position?.name || (cleanSlug.includes("med") ? "Medis" : cleanSlug.includes("mech") || cleanSlug.includes("bengkel") ? "Mekanik" : cleanSlug.includes("resto") ? "Server Resto" : cleanSlug.includes("pemerintah") ? "Staff Sipil" : "Officer"),
            permissionLevel: (row.position?.permissionLevel || "MEMBER") as PermissionLevel,
            status: row.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
            joinedAt: row.joinedAt.toISOString(),
            user: {
              id: row.user.id,
              discordId: row.user.discordId,
              discordUsername: row.user.discordUsername,
              displayName: formatInstitutionMemberName(row.user.displayName || row.user.discordUsername, cleanSlug),
              discordAvatar: row.user.discordAvatar,
            },
          };
        }
      } catch (err) {
        console.warn("DB getUserMembership error:", err);
      }
    }

    return null;
  }

  /**
   * Fast query for all active memberships belonging to a single user across all institutions.
   * Replaces looping verifyInstitutionAccess over all institutions.
   */
  static async getUserMemberships(
    userId: string,
    discordId?: string
  ): Promise<MembershipData[]> {
    const cleanId = (discordId || userId).replace("discord-", "");
    const now = Date.now();
    const cached = this.userMembershipsCache.get(cleanId);
    if (cached && now - cached.timestamp < 300000) {
      return cached.data;
    }

    const inFlight = this.inFlightUserMemberships.get(cleanId);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      const isDb = this.isDatabaseAvailable();
      if (isDb) {
        try {
          const rows = await prisma.membership.findMany({
            where: {
              OR: [
                { userId },
                { userId: cleanId },
                { userId: `discord-${cleanId}` },
                { user: { discordId: cleanId } },
              ],
            },
            include: { user: true, position: true, institution: true },
          });

          if (rows.length > 0) {
            const result: MembershipData[] = rows.map((r) => ({
              id: r.id,
              userId: r.userId,
              institutionId: r.institutionId,
              positionName: r.position?.name || (r.institution.slug.includes("med") ? "Medis" : r.institution.slug.includes("mech") || r.institution.slug.includes("bengkel") ? "Mekanik" : r.institution.slug.includes("resto") ? "Server Resto" : r.institution.slug.includes("pemerintah") ? "Staff Sipil" : "Officer"),
              permissionLevel: (r.position?.permissionLevel || "MEMBER") as PermissionLevel,
              status: r.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
              joinedAt: r.joinedAt.toISOString(),
              user: {
                id: r.user.id,
                discordId: r.user.discordId,
                discordUsername: r.user.discordUsername,
                displayName: formatInstitutionMemberName(r.user.displayName || r.user.discordUsername, r.institution?.slug || r.institutionId),
                discordAvatar: r.user.discordAvatar,
              },
            }));
            this.userMembershipsCache.set(cleanId, { data: result, timestamp: Date.now() });
            this.userMembershipsCache.set(userId, { data: result, timestamp: Date.now() });
            return result;
          }
        } catch (err) {
          console.warn("DB getUserMemberships error:", err);
        }
      }

      const memList = memoryStore.memberships
        .filter(
          (m) =>
            m.userId === userId ||
            m.userId === cleanId ||
            m.userId === `discord-${cleanId}` ||
            m.user?.discordId === cleanId
        )
        .map((m) => ({
          ...m,
          user: m.user
            ? {
                ...m.user,
                displayName: formatInstitutionMemberName(m.user.displayName || m.user.discordUsername, m.institutionId),
              }
            : undefined,
        }));
      this.userMembershipsCache.set(cleanId, { data: memList, timestamp: Date.now() });
      this.userMembershipsCache.set(userId, { data: memList, timestamp: Date.now() });
      return memList;
    })();

    this.inFlightUserMemberships.set(cleanId, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightUserMemberships.delete(cleanId);
    }
  }

  static async getMemberships(institutionSlug: string): Promise<MembershipData[]> {
    const cleanSlug = normalizeInstSlug(institutionSlug);
    const now = Date.now();
    const cached = this.membershipsCache.get(cleanSlug);
    if (cached && now - cached.timestamp < 300000) {
      return cached.data;
    }

    const inFlight = this.inFlightMemberships.get(cleanSlug);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      const institution = await this.getInstitutionBySlug(cleanSlug);
      if (!institution) return [];

      const isDb = this.isDatabaseAvailable();
      if (isDb) {
        try {
          const rows = await prisma.membership.findMany({
            where: {
              OR: [
                { institutionId: institution.id },
                { institutionId: institution.slug },
                { institutionId: `inst-${cleanSlug}` },
              ],
            },
            include: { user: true, position: true },
            orderBy: { joinedAt: "asc" },
          });
          if (rows.length > 0) {
            const result = rows.map((r) => ({
              id: r.id,
              userId: r.userId,
              institutionId: r.institutionId,
              positionName: r.position?.name || (cleanSlug.includes("med") ? "Medis" : cleanSlug.includes("mech") || cleanSlug.includes("bengkel") ? "Mekanik" : cleanSlug.includes("resto") ? "Server Resto" : cleanSlug.includes("pemerintah") ? "Staff Sipil" : "Officer"),
              permissionLevel: (r.position?.permissionLevel || "MEMBER") as PermissionLevel,
              status: r.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
              joinedAt: r.joinedAt.toISOString(),
              user: {
                id: r.user.id,
                discordId: r.user.discordId,
                discordUsername: r.user.discordUsername,
                displayName: formatInstitutionMemberName(r.user.displayName || r.user.discordUsername, cleanSlug),
                discordAvatar: r.user.discordAvatar,
              },
            }));
            this.membershipsCache.set(cleanSlug, { data: result, timestamp: Date.now() });
            return result;
          }
        } catch (err) {
          console.warn("DB getMemberships fallback to memory:", err);
        }
      }

      const memoryMembers = memoryStore.memberships
        .filter(
          (m) => normalizeInstSlug(m.institutionId) === cleanSlug || m.institutionId === institution.id || m.institutionId === institutionSlug
        )
        .map((m) => ({
          ...m,
          user: m.user
            ? {
                ...m.user,
                displayName: formatInstitutionMemberName(m.user.displayName || m.user.discordUsername, cleanSlug),
              }
            : undefined,
        }));
      this.membershipsCache.set(cleanSlug, { data: memoryMembers, timestamp: Date.now() });
      return memoryMembers;
    })();

    this.inFlightMemberships.set(cleanSlug, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlightMemberships.delete(cleanSlug);
    }
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
      const isDb = this.isDatabaseAvailable();

      for (const dm of discordMembers) {
        const mappedRoles = mapDiscordRolesToInstitutions(dm.roles, dm.roleIds);

        for (const mr of mappedRoles) {
          if (institutionSlug && mr.institutionSlug !== institutionSlug) continue;

          const targetInst = institutions.find((i) => i.slug === mr.institutionSlug);
          if (!targetInst) continue;

          const memId = `mem-${mr.institutionSlug}-${dm.discordId}`;
          const formattedName = formatInstitutionMemberName(dm.displayName, mr.institutionSlug);
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
              displayName: formattedName,
              discordAvatar: getDiscordAvatarUrl(dm.discordId, dm.avatarUrl),
            },
          };

          // 1. If PostgreSQL DB is available, persist user and membership
          if (isDb) {
            try {
              const dbUser = await prisma.user.upsert({
                where: { discordId: dm.discordId },
                update: {
                  discordUsername: dm.username,
                  displayName: formattedName,
                  discordAvatar: dm.avatarUrl,
                  discordRoles: dm.roles,
                },
                create: {
                  id: `discord-${dm.discordId}`,
                  discordId: dm.discordId,
                  discordUsername: dm.username,
                  displayName: formattedName,
                  discordAvatar: dm.avatarUrl,
                  discordRoles: dm.roles,
                },
              });

              let positionId: string | null = null;
              try {
                const pos = await prisma.position.findFirst({
                  where: {
                    institutionId: targetInst.id,
                    name: { equals: mr.positionName, mode: "insensitive" },
                  },
                });
                if (pos) {
                  positionId = pos.id;
                } else {
                  const createdPos = await prisma.position.create({
                    data: {
                      institutionId: targetInst.id,
                      name: mr.positionName,
                      permissionLevel: mr.permissionLevel,
                    },
                  });
                  positionId = createdPos.id;
                }
              } catch (posErr) {
                console.warn("Position link error in syncDiscordMembers:", posErr);
              }

              await prisma.membership.upsert({
                where: {
                  userId_institutionId: {
                    userId: dbUser.id,
                    institutionId: targetInst.id,
                  },
                },
                update: {
                  status: "ACTIVE",
                  positionId: positionId || undefined,
                },
                create: {
                  userId: dbUser.id,
                  institutionId: targetInst.id,
                  status: "ACTIVE",
                  positionId: positionId || undefined,
                },
              });
            } catch (dbErr) {
              console.warn("syncDiscordMembers DB upsert error:", dbErr);
            }
          }

          // 2. Update memoryStore
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
          } else {
            memoryStore.memberships.push(newMem);
          }
        }
      }

      // Invalidate caches
      if (institutionSlug) {
        this.invalidateMembershipsCache(institutionSlug);
      } else {
        this.invalidateMembershipsCache();
      }

      persistStore();

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
   * Sync a user live from Discord API, persist to DB, and update memberships.
   * Debounced per user to prevent redundant Discord API traffic.
   */
  static async syncDiscordUser(discordId: string, force = false): Promise<SessionUser | null> {
    const cleanDiscordId = discordId.replace("discord-", "");
    if (!cleanDiscordId || cleanDiscordId.startsWith("demo-")) return null;

    const now = Date.now();
    const lastSync = this.userLastSyncMap.get(cleanDiscordId) || 0;

    // Debounce to 15s unless force requested
    if (!force && now - lastSync < 15000) {
      return null;
    }

    // Deduplicate in-flight requests
    const inFlight = this.userSyncInFlightMap.get(cleanDiscordId);
    if (inFlight) {
      return inFlight;
    }

    const syncPromise = (async (): Promise<SessionUser | null> => {
      try {
        const liveMember = await fetchDiscordMemberLive(cleanDiscordId);
        if (!liveMember) {
          return null;
        }

        const isSuperAdmin = liveMember.roles.some((r) =>
          /admin|pimpinan|owner|founder|management/i.test(r)
        );

        const sessionUser: SessionUser = {
          id: `discord-${cleanDiscordId}`,
          discordId: cleanDiscordId,
          discordUsername: liveMember.username,
          displayName: liveMember.displayName || liveMember.username,
          discordAvatar: liveMember.avatarUrl,
          discordRoles: liveMember.roles,
          isSuperAdmin,
        };

        // Sync memberships and DB User record
        await this.syncUserFromDiscordRoles(sessionUser);

        this.userLastSyncMap.set(cleanDiscordId, Date.now());
        this.invalidateMembershipsCache();

        return sessionUser;
      } catch (err) {
        console.error(`DataService.syncDiscordUser error for ${cleanDiscordId}:`, err);
        return null;
      } finally {
        this.userSyncInFlightMap.delete(cleanDiscordId);
      }
    })();

    this.userSyncInFlightMap.set(cleanDiscordId, syncPromise);
    return syncPromise;
  }

  /**
   * Sync a single user when they log in via Discord OAuth or refresh roles
   */
  static async syncUserFromDiscordRoles(sessionUser: SessionUser): Promise<void> {
    try {
      const institutions = await this.getInstitutions();
      const mappedRoles = mapDiscordRolesToInstitutions(sessionUser.discordRoles || []);

      const isDb = this.isDatabaseAvailable();
      if (isDb) {
        try {
          const dbUser = await prisma.user.upsert({
            where: { discordId: sessionUser.discordId },
            update: {
              discordUsername: sessionUser.discordUsername,
              displayName: sessionUser.displayName || sessionUser.discordUsername,
              discordAvatar: sessionUser.discordAvatar || null,
              discordRoles: sessionUser.discordRoles || [],
              isSuperAdmin: sessionUser.isSuperAdmin || false,
            },
            create: {
              id: sessionUser.id,
              discordId: sessionUser.discordId,
              discordUsername: sessionUser.discordUsername,
              displayName: sessionUser.displayName || sessionUser.discordUsername,
              discordAvatar: sessionUser.discordAvatar || null,
              discordRoles: sessionUser.discordRoles || [],
              isSuperAdmin: sessionUser.isSuperAdmin || false,
            },
          });

          for (const mr of mappedRoles) {
            const targetInst = institutions.find((i) => i.slug === mr.institutionSlug);
            if (!targetInst) continue;

            // Link positionId if available
            let positionId: string | null = null;
            try {
              const pos = await prisma.position.findFirst({
                where: {
                  institutionId: targetInst.id,
                  name: { equals: mr.positionName, mode: "insensitive" },
                },
              });
              if (pos) {
                positionId = pos.id;
              } else {
                const createdPos = await prisma.position.create({
                  data: {
                    institutionId: targetInst.id,
                    name: mr.positionName,
                    permissionLevel: mr.permissionLevel,
                  },
                });
                positionId = createdPos.id;
              }
            } catch (posErr) {
              console.warn("Position link error:", posErr);
            }

            await prisma.membership.upsert({
              where: {
                userId_institutionId: {
                  userId: dbUser.id,
                  institutionId: targetInst.id,
                },
              },
              update: {
                status: "ACTIVE",
                positionId: positionId || undefined,
              },
              create: {
                userId: dbUser.id,
                institutionId: targetInst.id,
                status: "ACTIVE",
                positionId: positionId || undefined,
              },
            });
          }
        } catch (dbErr) {
          console.warn("syncUserFromDiscordRoles DB error:", dbErr);
        }
      }

      for (const mr of mappedRoles) {
        const targetInst = institutions.find((i) => i.slug === mr.institutionSlug);
        if (!targetInst) continue;

        const memId = `mem-${mr.institutionSlug}-${sessionUser.discordId}`;
        const formattedName = formatInstitutionMemberName(sessionUser.displayName, mr.institutionSlug);
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
            displayName: formattedName,
            discordAvatar: getDiscordAvatarUrl(sessionUser.discordId, sessionUser.discordAvatar),
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
            status: "ACTIVE",
            user: newMem.user,
          };
        } else {
          memoryStore.memberships.push(newMem);
        }
      }

      this.invalidateMembershipsCache();
      persistStore();
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

  static async deleteMembership(id: string): Promise<boolean> {
    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        await prisma.membership.delete({ where: { id } });
      } catch (err) {
        console.warn("DB delete membership failed, using memory:", err);
      }
    }
    const idx = memoryStore.memberships.findIndex((m) => m.id === id);
    if (idx !== -1) {
      memoryStore.memberships.splice(idx, 1);
      return true;
    }
    return false;
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
  }): Promise<{ success: boolean; session?: DutySessionData; error?: string }> {
    const isDb = await this.isDatabaseAvailable();
    const startDate = new Date(params.newStart);
    const endDate = new Date(params.newEnd);
    const durationSeconds = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));

    let updatedSession: DutySessionData | null = null;
    let targetInstSlug: string | undefined;

    if (isDb) {
      try {
        const existing = await prisma.dutySession.findUnique({
          where: { id: params.dutySessionId },
          include: { institution: true, user: true },
        });

        if (existing) {
          targetInstSlug = existing.institution.slug;
          const oldStart = existing.startedAt.toISOString();
          const oldEnd = existing.endedAt ? existing.endedAt.toISOString() : null;

          const updated = await prisma.dutySession.update({
            where: { id: params.dutySessionId },
            data: {
              startedAt: startDate,
              endedAt: endDate,
              durationSeconds,
              status: "CORRECTED",
              notes: params.reason ? `Koreksi: ${params.reason}` : existing.notes,
            },
            include: { institution: true, user: true },
          });

          // Log attendance edit in DB
          try {
            const cleanEditorId = params.editorId.replace("discord-", "");
            const editorUser = await prisma.user.findFirst({
              where: {
                OR: [
                  { id: params.editorId },
                  { discordId: cleanEditorId },
                  { discordId: params.editorId },
                ],
              },
            });

            if (editorUser) {
              await prisma.attendanceEdit.create({
                data: {
                  dutySessionId: params.dutySessionId,
                  editedById: editorUser.id,
                  oldStart: new Date(oldStart),
                  oldEnd: oldEnd ? new Date(oldEnd) : null,
                  newStart: startDate,
                  newEnd: endDate,
                  reason: params.reason,
                },
              });

              await prisma.auditLog.create({
                data: {
                  actorId: editorUser.id,
                  action: "CORRECT_ATTENDANCE",
                  targetType: "DUTY_SESSION",
                  targetId: params.dutySessionId,
                  oldData: JSON.stringify({ oldStart, oldEnd }),
                  newData: JSON.stringify({
                    newStart: params.newStart,
                    newEnd: params.newEnd,
                    reason: params.reason,
                  }),
                },
              });
            }
          } catch (logErr) {
            console.warn("DB attendanceEdit log error:", logErr);
          }

          updatedSession = {
            id: updated.id,
            userId: updated.userId,
            userName: updated.user.displayName || updated.user.discordUsername,
            userAvatar: updated.user.discordAvatar,
            institutionId: updated.institutionId,
            institutionSlug: updated.institution.slug,
            institutionName: updated.institution.name,
            startedAt: updated.startedAt.toISOString(),
            endedAt: updated.endedAt ? updated.endedAt.toISOString() : null,
            durationSeconds: updated.durationSeconds,
            status: "CORRECTED",
            notes: updated.notes,
            createdAt: updated.createdAt.toISOString(),
          };
        }
      } catch (err) {
        console.warn("DB correctAttendance error:", err);
      }
    }

    // Memory Store update and fallback
    reloadPersistedSessions();
    const memSession = memoryStore.dutySessions.find((s) => s.id === params.dutySessionId);
    if (memSession) {
      targetInstSlug = memSession.institutionSlug || targetInstSlug;
      const oldStart = memSession.startedAt;
      const oldEnd = memSession.endedAt;

      memSession.startedAt = params.newStart;
      memSession.endedAt = params.newEnd;
      memSession.durationSeconds = durationSeconds;
      memSession.status = "CORRECTED";
      if (params.reason) {
        memSession.notes = `Koreksi: ${params.reason}`;
      }

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

      persistStore();
      if (!updatedSession) {
        updatedSession = memSession;
      }
    } else if (updatedSession) {
      memoryStore.dutySessions.unshift(updatedSession);
      persistStore();
    }

    if (!updatedSession) {
      return { success: false, error: "Sesi absensi tidak ditemukan." };
    }

    // Invalidate caches across the board
    if (targetInstSlug) {
      this.invalidateDutySessionsCache(targetInstSlug);
    }
    this.activeSessionsCache.delete(updatedSession.userId);
    this.activeSessionsCache.delete(updatedSession.userId.replace("discord-", ""));
    this.liveSessionsCache.clear();

    return { success: true, session: updatedSession };
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

    // Fetch ALL sessions for this institution in ONE single query (or from RAM cache)
    const allInstitutionSessions = await this.getInstitutionDutySessions(institutionSlug);

    // Group sessions by userId and cleanId in memory in O(N)
    const sessionsByUser = new Map<string, DutySessionData[]>();
    for (const session of allInstitutionSessions) {
      const uId = session.userId;
      const cleanUId = uId.replace("discord-", "");

      let list = sessionsByUser.get(uId);
      if (!list) {
        list = [];
        sessionsByUser.set(uId, list);
      }
      list.push(session);

      if (cleanUId !== uId) {
        let cleanList = sessionsByUser.get(cleanUId);
        if (!cleanList) {
          cleanList = [];
          sessionsByUser.set(cleanUId, cleanList);
        }
        cleanList.push(session);
      }
    }

    // Map memberships with 0 additional database queries!
    const records: PayrollRecord[] = memberships.map((m) => {
      const cleanId = m.userId.replace("discord-", "");
      const userSessions =
        sessionsByUser.get(m.userId) ||
        (m.user?.discordId ? sessionsByUser.get(m.user.discordId) : null) ||
        sessionsByUser.get(cleanId) ||
        [];

      const totalDutySeconds = userSessions.reduce(
        (acc, s) => acc + (s.durationSeconds || 0),
        0
      );

      const totalDutyHours = Number((totalDutySeconds / 3600).toFixed(1));

      const defaultPos = institutionSlug.includes("med") ? "Medis" : institutionSlug.includes("mech") || institutionSlug.includes("bengkel") ? "Mekanik" : institutionSlug.includes("resto") ? "Server Resto" : institutionSlug.includes("pemerintah") ? "Staff Sipil" : "Officer";
      const posName = m.positionName || defaultPos;
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
        totalDutySeconds,
        totalDutyHours,
        totalSalary,
        minDutyHours: posConfig.minDutyHours,
        isEligible,
        status: payStatus.status,
        paidAt: payStatus.paidAt,
        paidByName: payStatus.paidByName,
      };
    });

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
    institutionSlug: string,
    existingSessions?: DutySessionData[]
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
    const sessions = existingSessions || (await this.getUserDutySessions(userId, institutionSlug));

    const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const totalHours = Number((totalSeconds / 3600).toFixed(1));

    // Get user position from actual membership directly
    const userMem = await this.getUserMembership(userId, institutionSlug);
    const defaultPos = institutionSlug.includes("med") ? "Medis" : institutionSlug.includes("mech") || institutionSlug.includes("bengkel") ? "Mekanik" : institutionSlug.includes("resto") ? "Server Resto" : institutionSlug.includes("pemerintah") ? "Staff Sipil" : "Officer";
    const posName = userMem?.positionName || defaultPos;

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

  // --- DISCORD ROLE MAPPINGS ---

  static async getDiscordRoleMappings(): Promise<DiscordRoleMappingData[]> {
    return memoryStore.roleMappings || DEFAULT_ROLE_MAPPINGS;
  }

  static async createDiscordRoleMapping(
    data: Omit<DiscordRoleMappingData, "id">
  ): Promise<DiscordRoleMappingData> {
    if (!memoryStore.roleMappings) {
      memoryStore.roleMappings = [...DEFAULT_ROLE_MAPPINGS];
    }
    const id = `role-map-${Date.now()}`;
    const newMapping: DiscordRoleMappingData = {
      ...data,
      id,
      discordRole: data.discordRole.trim(),
      roleId: data.roleId.trim(),
      description: data.description.trim(),
    };
    memoryStore.roleMappings.unshift(newMapping);
    return newMapping;
  }

  static async updateDiscordRoleMapping(
    id: string,
    updates: Partial<DiscordRoleMappingData>
  ): Promise<DiscordRoleMappingData | null> {
    if (!memoryStore.roleMappings) {
      memoryStore.roleMappings = [...DEFAULT_ROLE_MAPPINGS];
    }
    const idx = memoryStore.roleMappings.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    memoryStore.roleMappings[idx] = {
      ...memoryStore.roleMappings[idx],
      ...updates,
    };
    return memoryStore.roleMappings[idx];
  }

  static async deleteDiscordRoleMapping(id: string): Promise<boolean> {
    if (!memoryStore.roleMappings) {
      memoryStore.roleMappings = [...DEFAULT_ROLE_MAPPINGS];
    }
    const idx = memoryStore.roleMappings.findIndex((m) => m.id === id);
    if (idx !== -1) {
      memoryStore.roleMappings.splice(idx, 1);
      return true;
    }
    return false;
  }
}
