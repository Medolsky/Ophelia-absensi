import { DataService } from "./data-service";
import { FiveMBridge } from "./fivem-bridge";
import { CityStatusEntry } from "@/types";
import { getDiscordCredentials } from "./discord-credentials";

const DISCORD_API = "https://discord.com/api/v10";

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  timestamp?: string;
}

/**
 * Discord REST API helper — sends authenticated requests using the bot token.
 */
async function discordFetch(path: string, options: RequestInit = {}) {
  const { botToken } = getDiscordCredentials();
  const token = botToken;

  const res = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Discord API error ${res.status}: ${body}`);
    throw new Error(`Discord API ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Register slash commands with Discord. Run once on setup.
 */
export async function registerSlashCommands(applicationId: string) {
  const commands = [
    {
      name: "members",
      description: "Lihat daftar anggota instansi",
      options: [
        {
          name: "instansi",
          description: "Slug instansi (police, medical, mechanic, restaurant)",
          type: 3, // STRING
          required: true,
          choices: [
            { name: "Police Department", value: "police" },
            { name: "Medical Center", value: "medical" },
            { name: "Custom Garage", value: "mechanic" },
            { name: "Restaurant & Lounge", value: "restaurant" },
          ],
        },
      ],
    },
    {
      name: "onduty",
      description: "Lihat siapa yang sedang ON DUTY",
      options: [
        {
          name: "instansi",
          description: "Filter instansi (opsional)",
          type: 3,
          required: false,
          choices: [
            { name: "Semua Instansi", value: "all" },
            { name: "Police Department", value: "police" },
            { name: "Medical Center", value: "medical" },
            { name: "Custom Garage", value: "mechanic" },
            { name: "Restaurant & Lounge", value: "restaurant" },
          ],
        },
      ],
    },
    {
      name: "incity",
      description: "Lihat siapa yang sedang online di kota (FiveM)",
      options: [
        {
          name: "instansi",
          description: "Filter berdasarkan instansi (opsional)",
          type: 3,
          required: false,
          choices: [
            { name: "Semua", value: "all" },
            { name: "Police Department", value: "police" },
            { name: "Medical Center", value: "medical" },
            { name: "Custom Garage", value: "mechanic" },
            { name: "Restaurant & Lounge", value: "restaurant" },
          ],
        },
      ],
    },
    {
      name: "offduty",
      description: "Lihat player di kota yang BELUM on duty",
    },
    {
      name: "status",
      description: "Overview status semua instansi — anggota, on duty, di kota",
    },
  ];

  return discordFetch(`/applications/${applicationId}/commands`, {
    method: "PUT",
    body: JSON.stringify(commands),
  });
}

/**
 * Send a channel message with embeds.
 */
export async function sendChannelMessage(
  channelId: string,
  content: string,
  embeds?: DiscordEmbed[]
) {
  return discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, embeds }),
  });
}

// --- Embed Builders ---

const COLORS = {
  red: 0xe50914,
  green: 0x00c853,
  blue: 0x0066ff,
  orange: 0xff9900,
  gold: 0xd4af37,
  cyan: 0x00b4d8,
  gray: 0x666666,
};

const INSTITUTION_COLORS: Record<string, number> = {
  police: COLORS.blue,
  medical: COLORS.cyan,
  mechanic: COLORS.orange,
  restaurant: COLORS.gold,
};

const INSTITUTION_TAGS: Record<string, string> = {
  police: "[POLICE]",
  medical: "[MEDIC]",
  mechanic: "[MECHANIC]",
  restaurant: "[RESTO]",
};

function formatDuration(startedAt: string): string {
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  return `${h}j ${m}m`;
}

export async function buildMembersEmbed(institutionSlug: string): Promise<DiscordEmbed> {
  const institution = await DataService.getInstitutionBySlug(institutionSlug);
  const memberships = await DataService.getMemberships(institutionSlug);
  const tag = INSTITUTION_TAGS[institutionSlug] || "[INSTANSI]";

  if (!institution) {
    return {
      title: "[ERROR] Instansi Tidak Ditemukan",
      description: `Slug "${institutionSlug}" tidak valid.`,
      color: COLORS.red,
    };
  }

  const activeMemberships = memberships.filter((m) => m.status === "ACTIVE");

  const memberLines = activeMemberships.map((m, i) => {
    const name = m.user?.displayName || m.user?.discordUsername || "Unknown";
    const pos = m.positionName || "Member";
    const badge = m.permissionLevel === "LEADER" ? " [LEADER]" : "";
    return `\`${(i + 1).toString().padStart(2, "0")}\` ${name}${badge}\n└ ${pos}`;
  });

  return {
    title: `${tag} ${institution.name}`,
    description:
      memberLines.length > 0
        ? memberLines.join("\n\n")
        : "_Belum ada anggota terdaftar._",
    color: INSTITUTION_COLORS[institutionSlug] || COLORS.gray,
    footer: {
      text: `Total: ${activeMemberships.length} anggota aktif • Ophelia Duty System`,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function buildOnDutyEmbed(institutionSlug?: string): Promise<DiscordEmbed> {
  const sessions = await DataService.getLiveOnDuty(institutionSlug || "all");

  const lines = sessions.map((s) => {
    const tag = INSTITUTION_TAGS[s.institutionSlug || ""] || "[DUTY]";
    const dur = formatDuration(s.startedAt);
    const note = s.notes ? ` — _${s.notes}_` : "";
    return `${tag} **${s.userName}**\n└ ${s.positionName || "Petugas"} • Durasi: ${dur}${note}`;
  });

  const title = institutionSlug && institutionSlug !== "all"
    ? `[ON DUTY] ${(await DataService.getInstitutionBySlug(institutionSlug))?.name || institutionSlug}`
    : "[ON DUTY] Semua Instansi";

  return {
    title,
    description:
      lines.length > 0
        ? lines.join("\n\n")
        : "_Tidak ada yang sedang bertugas saat ini._",
    color: COLORS.green,
    footer: {
      text: `${sessions.length} petugas aktif • Ophelia Duty System`,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function buildInCityEmbed(institutionSlug?: string): Promise<DiscordEmbed> {
  const cityStatus = await FiveMBridge.getCityStatus(institutionSlug);

  const onDutyLines: string[] = [];
  const offDutyLines: string[] = [];

  for (const entry of cityStatus) {
    const name = entry.displayName || entry.playerName;
    const dur = entry.joinedAt ? formatDuration(entry.joinedAt) : "?";

    if (entry.isOnDuty) {
      const instTag = INSTITUTION_TAGS[entry.dutyInstitutionSlug || ""] || "[DUTY]";
      onDutyLines.push(
        `[ON DUTY] **${name}** ${instTag}\n└ ${entry.positionName || "Petugas"} • Di kota: ${dur}`
      );
    } else {
      const instTags = entry.memberInstitutions
        .map((s) => INSTITUTION_TAGS[s] || "")
        .filter(Boolean)
        .join(" ");
      offDutyLines.push(
        `[OFF DUTY] **${name}** ${instTags}\n└ Di kota: ${dur} — _Belum on duty_`
      );
    }
  }

  const sections: string[] = [];
  if (onDutyLines.length > 0) {
    sections.push(`**__Sedang Bertugas (${onDutyLines.length})__**\n${onDutyLines.join("\n\n")}`);
  }
  if (offDutyLines.length > 0) {
    sections.push(`**__Di Kota — Off Duty (${offDutyLines.length})__**\n${offDutyLines.join("\n\n")}`);
  }

  return {
    title: "[STATUS KOTA] FiveM Server",
    description:
      sections.length > 0
        ? sections.join("\n\n───────────────\n\n")
        : "_Tidak ada player yang online saat ini._",
    color: COLORS.orange,
    footer: {
      text: `${cityStatus.length} player online • Ophelia × FiveM`,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function buildOffDutyEmbed(): Promise<DiscordEmbed> {
  const cityStatus = await FiveMBridge.getCityStatus();
  const offDutyPlayers = cityStatus.filter((e) => !e.isOnDuty && e.memberInstitutions.length > 0);

  const lines = offDutyPlayers.map((e) => {
    const name = e.displayName || e.playerName;
    const instTags = e.memberInstitutions
      .map((s) => INSTITUTION_TAGS[s] || "")
      .filter(Boolean)
      .join(" ");
    const dur = e.joinedAt ? formatDuration(e.joinedAt) : "?";
    return `[OFF DUTY] **${name}** ${instTags}\n└ Di kota: ${dur} — _Belum mulai duty_`;
  });

  return {
    title: "[PERINGATAN] Anggota Di Kota Belum On Duty",
    description:
      lines.length > 0
        ? lines.join("\n\n")
        : "_Semua anggota di kota sudah on duty, atau tidak ada anggota yang online._",
    color: COLORS.red,
    footer: {
      text: `${offDutyPlayers.length} anggota belum on duty • Ophelia × FiveM`,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function buildStatusOverviewEmbed(): Promise<DiscordEmbed> {
  const slugs = ["police", "medical", "mechanic", "restaurant"];
  const fields: DiscordEmbed["fields"] = [];

  for (const slug of slugs) {
    const inst = await DataService.getInstitutionBySlug(slug);
    if (!inst) continue;

    const members = await DataService.getMemberships(slug);
    const onDuty = await DataService.getLiveOnDuty(slug);
    const cityStatus = await FiveMBridge.getCityStatus(slug);
    const inCity = cityStatus.filter((e) => e.isOnline);
    const offDuty = cityStatus.filter((e) => !e.isOnDuty && e.memberInstitutions.includes(slug));

    const tag = INSTITUTION_TAGS[slug] || "[INSTANSI]";
    fields.push({
      name: `${tag} ${inst.name}`,
      value: [
        `Anggota: **${members.length}**`,
        `On Duty: **${onDuty.length}**`,
        `Di Kota: **${inCity.length}**`,
        `Off Duty: **${offDuty.length}**`,
      ].join("\n"),
      inline: true,
    });
  }

  return {
    title: "[OVERVIEW] Ophelia Status Overview",
    color: COLORS.red,
    fields,
    footer: {
      text: "Ophelia Duty System × FiveM Integration",
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle an incoming Discord interaction (slash command).
 * Returns the response payload to send back.
 */
export async function handleInteraction(interaction: {
  type: number;
  data?: {
    name: string;
    options?: { name: string; value: string }[];
  };
}): Promise<object> {
  // Type 1 = PING
  if (interaction.type === 1) {
    return { type: 1 };
  }

  // Type 2 = APPLICATION_COMMAND
  if (interaction.type === 2 && interaction.data) {
    const { name, options } = interaction.data;
    const getOption = (key: string) => options?.find((o) => o.name === key)?.value;

    let embed: DiscordEmbed;

    switch (name) {
      case "members":
        embed = await buildMembersEmbed(getOption("instansi") || "police");
        break;
      case "onduty":
        embed = await buildOnDutyEmbed(getOption("instansi") || "all");
        break;
      case "incity":
        embed = await buildInCityEmbed(getOption("instansi") || "all");
        break;
      case "offduty":
        embed = await buildOffDutyEmbed();
        break;
      case "status":
        embed = await buildStatusOverviewEmbed();
        break;
      default:
        embed = {
          title: "[ERROR] Command Tidak Dikenal",
          description: `Command "/${name}" belum terdaftar.`,
          color: COLORS.gray,
        };
    }

    return {
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        embeds: [embed],
      },
    };
  }

  return { type: 1 };
}
