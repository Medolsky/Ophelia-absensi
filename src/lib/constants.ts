import { InstitutionData, SessionUser } from "@/types";

export const DEFAULT_INSTITUTIONS: InstitutionData[] = [
  {
    id: "inst-police",
    name: "Ophelia Police Department",
    slug: "police",
    description: "Ophelia Police Department (OPD) - To Protect and to Serve",
    logo: "/logos/police.jpg",
    primaryColor: "#0066FF",
    currencySymbol: "Rp",
    defaultHourlyRate: 50000,
    status: "ACTIVE",
    discordRoleNames: ["Police", "Police Chief", "Police Commander", "Police Officer"],
  },
  {
    id: "inst-medical",
    name: "Ophelia Medical Center",
    slug: "medical",
    description: "Ophelia Medical Center (OMC) - Care • Professionalism • Dedication",
    logo: "/logos/medical.jpg",
    primaryColor: "#00B4D8",
    currencySymbol: "Rp",
    defaultHourlyRate: 50000,
    status: "ACTIVE",
    discordRoleNames: ["EMS", "EMS Director", "Supervisor", "Paramedic"],
  },
  {
    id: "inst-mechanic",
    name: "Ophelia Custom Garage",
    slug: "mechanic",
    description: "Ophelia Custom Garage (OCG) - Automotive Tuning, Performance & Vehicle Maintenance",
    logo: "/logos/mechanic.png",
    primaryColor: "#FF9900",
    currencySymbol: "Rp",
    defaultHourlyRate: 55000,
    status: "ACTIVE",
    discordRoleNames: ["Mechanic", "Mechanic Owner", "Senior Mechanic", "Apprentice"],
  },
  {
    id: "inst-restaurant",
    name: "Ophelia Restaurant & Lounge",
    slug: "restaurant",
    description: "Ophelia Fine Dining & Lounge - Luxury Culinary & Hospitality Experience",
    logo: "/logos/restaurant.png",
    primaryColor: "#D4AF37",
    currencySymbol: "Rp",
    defaultHourlyRate: 45000,
    status: "ACTIVE",
    discordRoleNames: ["Restaurant", "Restaurant Manager", "Supervisor", "Employee"],
  },
];

export const DEFAULT_POSITION_SALARIES: Record<
  string,
  Record<string, { hourlyRate: number; minDutyHours: number }>
> = {
  police: {
    "Cadet": { hourlyRate: 35000, minDutyHours: 10 },
    "Officer": { hourlyRate: 50000, minDutyHours: 15 },
    "Senior Officer": { hourlyRate: 65000, minDutyHours: 20 },
    "Sergeant": { hourlyRate: 80000, minDutyHours: 25 },
    "Commander": { hourlyRate: 110000, minDutyHours: 30 },
    "Chief of Police": { hourlyRate: 150000, minDutyHours: 30 },
  },
  medical: {
    "Paramedic": { hourlyRate: 45000, minDutyHours: 10 },
    "Doctor": { hourlyRate: 70000, minDutyHours: 15 },
    "Surgeon": { hourlyRate: 95000, minDutyHours: 20 },
    "Director of Emergency Medicine": { hourlyRate: 140000, minDutyHours: 25 },
  },
  mechanic: {
    "Apprentice": { hourlyRate: 35000, minDutyHours: 10 },
    "Mechanic": { hourlyRate: 55000, minDutyHours: 15 },
    "Senior Mechanic": { hourlyRate: 75000, minDutyHours: 20 },
    "Leadhand Mechanic": { hourlyRate: 100000, minDutyHours: 25 },
  },
  restaurant: {
    "Employee": { hourlyRate: 40000, minDutyHours: 10 },
    "Supervisor": { hourlyRate: 60000, minDutyHours: 15 },
    "Restaurant Manager": { hourlyRate: 90000, minDutyHours: 20 },
  },
};

export const DEMO_PERSONAS: (SessionUser & {
  roleTitle: string;
  institutionSlugs: string[];
  roleLevels: Record<string, "MEMBER" | "LEADER" | "SUPER_ADMIN">;
})[] = [
  {
    id: "user-john",
    discordId: "982736410293847101",
    discordUsername: "johndoe_lspd",
    displayName: "Officer John Doe",
    discordAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    discordRoles: ["Police", "Police Officer", "Citizen"],
    isSuperAdmin: false,
    roleTitle: "Officer @ LSPD",
    institutionSlugs: ["police"],
    roleLevels: {
      police: "MEMBER",
    },
  },
  {
    id: "user-gordon",
    discordId: "982736410293847102",
    discordUsername: "chief_gordon",
    displayName: "Chief James Gordon",
    discordAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
    discordRoles: ["Police", "Police Chief", "Mechanic", "Citizen"],
    isSuperAdmin: false,
    roleTitle: "Police Chief & Mechanic Lead",
    institutionSlugs: ["police", "mechanic"],
    roleLevels: {
      police: "LEADER",
      mechanic: "MEMBER",
    },
  },
  {
    id: "user-sarah",
    discordId: "982736410293847103",
    discordUsername: "dr_sarah",
    displayName: "Dr. Sarah Connor",
    discordAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    discordRoles: ["EMS", "EMS Director", "Citizen"],
    isSuperAdmin: false,
    roleTitle: "EMS Director @ Ophelia Medical Center",
    institutionSlugs: ["medical"],
    roleLevels: {
      medical: "LEADER",
    },
  },
  {
    id: "user-alex",
    discordId: "982736410293847104",
    discordUsername: "alex_customs",
    displayName: "Alex Rivera",
    discordAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    discordRoles: ["Mechanic", "Senior Mechanic", "Citizen"],
    isSuperAdmin: false,
    roleTitle: "Senior Mechanic @ Ophelia Custom Garage",
    institutionSlugs: ["mechanic"],
    roleLevels: {
      mechanic: "MEMBER",
    },
  },
  {
    id: "user-marcus",
    discordId: "982736410293847199",
    discordUsername: "marcus_owner",
    displayName: "Marcus Vance",
    discordAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    discordRoles: ["Admin", "Server Owner", "Police", "EMS", "Mechanic", "Restaurant"],
    isSuperAdmin: true,
    roleTitle: "Super Admin / Server Owner",
    institutionSlugs: ["police", "medical", "mechanic", "restaurant"],
    roleLevels: {
      police: "SUPER_ADMIN",
      medical: "SUPER_ADMIN",
      mechanic: "SUPER_ADMIN",
      restaurant: "SUPER_ADMIN",
    },
  },
];
