import { prisma } from "./prisma";
import { FiveMPlayerData, CityStatusEntry } from "@/types";
import { DataService } from "./data-service";

/**
 * In-memory fallback store for FiveM player state.
 * Same pattern as the rest of Ophelia's high-resilience approach.
 */
const globalFiveM = globalThis as unknown as {
  __fivem_players?: Map<string, FiveMPlayerData>;
};

if (!globalFiveM.__fivem_players) {
  globalFiveM.__fivem_players = new Map();
}

const playerStore = globalFiveM.__fivem_players;

export class FiveMBridge {
  private static async isDatabaseAvailable(): Promise<boolean> {
    try {
      if (!process.env.DATABASE_URL) return false;
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sync full player list pushed from FiveM server.
   * Marks players not in the list as offline.
   */
  static async syncPlayers(
    players: { discordId: string; serverId: number; name: string }[]
  ): Promise<{ synced: number; wentOffline: number }> {
    const now = new Date();
    const incomingIds = new Set(players.map((p) => p.discordId));

    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        let wentOffline = 0;

        // Mark absent players offline
        const result = await prisma.fiveMPlayer.updateMany({
          where: {
            discordId: { notIn: [...incomingIds] },
            isOnline: true,
          },
          data: { isOnline: false, lastSeenAt: now },
        });
        wentOffline = result.count;

        // Upsert each online player
        for (const p of players) {
          await prisma.fiveMPlayer.upsert({
            where: { discordId: p.discordId },
            update: {
              serverId: p.serverId,
              playerName: p.name,
              isOnline: true,
              lastSeenAt: now,
            },
            create: {
              discordId: p.discordId,
              serverId: p.serverId,
              playerName: p.name,
              isOnline: true,
              joinedAt: now,
              lastSeenAt: now,
            },
          });
        }

        return { synced: players.length, wentOffline };
      } catch (err) {
        console.warn("DB syncPlayers error, fallback to memory:", err);
      }
    }

    // In-memory fallback
    let wentOffline = 0;
    for (const [discordId, existing] of playerStore) {
      if (!incomingIds.has(discordId) && existing.isOnline) {
        existing.isOnline = false;
        existing.lastSeenAt = now.toISOString();
        wentOffline++;
      }
    }

    for (const p of players) {
      const existing = playerStore.get(p.discordId);
      if (existing) {
        existing.serverId = p.serverId;
        existing.playerName = p.name;
        existing.isOnline = true;
        existing.lastSeenAt = now.toISOString();
      } else {
        playerStore.set(p.discordId, {
          discordId: p.discordId,
          serverId: p.serverId,
          playerName: p.name,
          isOnline: true,
          joinedAt: now.toISOString(),
          lastSeenAt: now.toISOString(),
        });
      }
    }

    return { synced: players.length, wentOffline };
  }

  /**
   * Get all players currently online in the FiveM server.
   */
  static async getOnlinePlayers(): Promise<FiveMPlayerData[]> {
    const isDb = await this.isDatabaseAvailable();
    if (isDb) {
      try {
        const rows = await prisma.fiveMPlayer.findMany({
          where: { isOnline: true },
          orderBy: { joinedAt: "asc" },
        });
        return rows.map((r) => ({
          discordId: r.discordId,
          serverId: r.serverId,
          playerName: r.playerName,
          isOnline: r.isOnline,
          joinedAt: r.joinedAt.toISOString(),
          lastSeenAt: r.lastSeenAt.toISOString(),
        }));
      } catch (err) {
        console.warn("DB getOnlinePlayers error:", err);
      }
    }

    return [...playerStore.values()].filter((p) => p.isOnline);
  }

  /**
   * Cross-reference online FiveM players with duty sessions and memberships
   * to produce the full "city status" view.
   */
  static async getCityStatus(institutionSlug?: string): Promise<CityStatusEntry[]> {
    const onlinePlayers = await this.getOnlinePlayers();
    const onDutySessions = await DataService.getLiveOnDuty();

    // Build a map of discordId → duty session for fast lookup
    const dutyByDiscordId = new Map<string, {
      institutionName: string;
      institutionSlug: string;
      startedAt: string;
      positionName?: string;
      userName?: string;
      userAvatar?: string | null;
    }>();

    // We need memberships to know which institutions each player belongs to.
    // The memberships store references users by userId, but FiveM gives us discordId.
    // Cross-reference through the membership user objects.
    const allInstitutionSlugs = ["police", "medical", "mechanic", "restaurant"];
    const allMemberships = (
      await Promise.all(allInstitutionSlugs.map((s) => DataService.getMemberships(s)))
    ).flat();

    // Index memberships by discordId
    const membershipsByDiscordId = new Map<string, typeof allMemberships>();
    for (const m of allMemberships) {
      const did = m.user?.discordId;
      if (!did) continue;
      const arr = membershipsByDiscordId.get(did) || [];
      arr.push(m);
      membershipsByDiscordId.set(did, arr);
    }

    // Index duty sessions by looking up the user's discordId through memberships
    for (const session of onDutySessions) {
      // Find the discordId for this userId
      const membership = allMemberships.find((m) => m.userId === session.userId);
      const discordId = membership?.user?.discordId;
      if (discordId) {
        dutyByDiscordId.set(discordId, {
          institutionName: session.institutionName || "",
          institutionSlug: session.institutionSlug || "",
          startedAt: session.startedAt,
          positionName: session.positionName,
          userName: session.userName,
          userAvatar: session.userAvatar,
        });
      }
    }

    const entries: CityStatusEntry[] = onlinePlayers.map((player) => {
      const duty = dutyByDiscordId.get(player.discordId);
      const memberships = membershipsByDiscordId.get(player.discordId) || [];
      const memberUser = memberships[0]?.user;

      return {
        discordId: player.discordId,
        playerName: player.playerName,
        serverId: player.serverId,
        isOnline: player.isOnline,
        joinedAt: player.joinedAt,
        lastSeenAt: player.lastSeenAt,
        isOnDuty: !!duty,
        dutyInstitutionName: duty?.institutionName,
        dutyInstitutionSlug: duty?.institutionSlug,
        dutyStartedAt: duty?.startedAt,
        memberInstitutions: memberships.map((m) => {
          const inst = allInstitutionSlugs.find((s) => {
            const prefix = `inst-${s.substring(0, 4)}`;
            return m.institutionId.includes(s) || m.institutionId.startsWith(prefix);
          });
          return inst || m.institutionId;
        }),
        displayName: memberUser?.displayName || duty?.userName || player.playerName,
        avatar: memberUser?.discordAvatar || duty?.userAvatar || null,
        positionName: duty?.positionName || memberships[0]?.positionName,
      };
    });

    // Filter by institution if requested
    if (institutionSlug && institutionSlug !== "all") {
      return entries.filter(
        (e) =>
          e.dutyInstitutionSlug === institutionSlug ||
          e.memberInstitutions.includes(institutionSlug)
      );
    }

    return entries;
  }

  /**
   * Seed demo FiveM players for development.
   * Called when no real FiveM server is pushing data.
   */
  static seedDemoPlayers(): void {
    const demoPlayers: FiveMPlayerData[] = [
      {
        discordId: "982736410293847101",
        serverId: 1,
        playerName: "John_Doe",
        isOnline: true,
        joinedAt: new Date(Date.now() - 90 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        discordId: "982736410293847105",
        serverId: 2,
        playerName: "Mike_Smith",
        isOnline: true,
        joinedAt: new Date(Date.now() - 120 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        discordId: "982736410293847102",
        serverId: 3,
        playerName: "James_Gordon",
        isOnline: true,
        joinedAt: new Date(Date.now() - 200 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        discordId: "982736410293847103",
        serverId: 4,
        playerName: "Sarah_Connor",
        isOnline: true,
        joinedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        discordId: "982736410293847104",
        serverId: 5,
        playerName: "Alex_Rivera",
        isOnline: true,
        joinedAt: new Date(Date.now() - 160 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        discordId: "982736410293847199",
        serverId: 6,
        playerName: "Marcus_Vance",
        isOnline: true,
        joinedAt: new Date(Date.now() - 300 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      // Non-member civilians
      {
        discordId: "111111111111111111",
        serverId: 7,
        playerName: "RandomCivilian_1",
        isOnline: true,
        joinedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        discordId: "222222222222222222",
        serverId: 8,
        playerName: "RandomCivilian_2",
        isOnline: true,
        joinedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
    ];

    for (const p of demoPlayers) {
      playerStore.set(p.discordId, p);
    }
  }
}
