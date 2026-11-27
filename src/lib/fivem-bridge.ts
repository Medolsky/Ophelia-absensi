import { prisma } from "./prisma";
import { FiveMPlayerData, CityStatusEntry, DutySessionData } from "@/types";
import { DataService, normalizeDiscordId, normalizeInstSlug } from "./data-service";
import { FIVEM_JOB_TO_INSTITUTION_MAP } from "./constants";
import { formatInstitutionMemberName } from "./member-tag";

const HEARTBEAT_SENTINEL_ID = "__fivem_server_heartbeat__";
const SERVER_CONNECTED_TTL_MS = 90 * 1000; // 90 seconds heartbeat tolerance
const PLAYER_STALE_TTL_MS = 180 * 1000; // 3 minutes stale player expiry

export interface FiveMServerStatus {
  connected: boolean;
  lastHeartbeatAt: string | null;
  onlineCount: number;
}

export interface FiveMPlayerOnlineStatus {
  isOnline: boolean;
  player: FiveMPlayerData | null;
  serverConnected: boolean;
  lastHeartbeatAt: string | null;
}

export interface FiveMSyncResult {
  synced: number;
  wentOffline: number;
  autoClosed: number;
  autoClosedSessions: {
    sessionId: string;
    userId: string;
    userName?: string;
    institutionSlug?: string;
    durationSeconds: number;
  }[];
}

/**
 * In-memory fallback store & metadata cache for FiveM player state.
 * Works alongside PostgreSQL for high resilience and extra metadata (citizenid, job).
 */
const globalFiveM = globalThis as unknown as {
  __fivem_players?: Map<string, FiveMPlayerData>;
  __fivem_last_heartbeat?: number;
};

if (!globalFiveM.__fivem_players) {
  globalFiveM.__fivem_players = new Map();
}

const playerStore = globalFiveM.__fivem_players;

export class FiveMBridge {
  private static isDatabaseAvailable(): boolean {
    return !!(
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL
    );
  }

  private static cityStatusCache = new Map<
    string,
    { data: CityStatusEntry[]; timestamp: number }
  >();

  static invalidateCityStatusCache(): void {
    this.cityStatusCache.clear();
  }

  /**
   * Record that the FiveM bridge just communicated with the web server.
   * Persisted via a non-online sentinel row in fivem_players so serverless instances share state.
   */
  static async recordHeartbeat(now: Date = new Date()): Promise<void> {
    globalFiveM.__fivem_last_heartbeat = now.getTime();

    if (this.isDatabaseAvailable()) {
      try {
        await prisma.fiveMPlayer.upsert({
          where: { discordId: HEARTBEAT_SENTINEL_ID },
          update: {
            serverId: 0,
            playerName: "FiveM Server Heartbeat",
            isOnline: false,
            lastSeenAt: now,
          },
          create: {
            discordId: HEARTBEAT_SENTINEL_ID,
            serverId: 0,
            playerName: "FiveM Server Heartbeat",
            isOnline: false,
            joinedAt: now,
            lastSeenAt: now,
          },
        });
      } catch (err) {
        console.warn("[FiveMBridge] Heartbeat DB upsert warning:", err);
      }
    }
  }

  /**
   * Check whether the FiveM server bridge is actively connected (sent a heartbeat recently).
   */
  static async getServerStatus(): Promise<FiveMServerStatus> {
    let lastHeartbeatMs = globalFiveM.__fivem_last_heartbeat || 0;

    if (this.isDatabaseAvailable()) {
      try {
        const sentinel = await prisma.fiveMPlayer.findUnique({
          where: { discordId: HEARTBEAT_SENTINEL_ID },
        });
        if (sentinel?.lastSeenAt) {
          lastHeartbeatMs = Math.max(lastHeartbeatMs, sentinel.lastSeenAt.getTime());
        } else {
          // Fallback: check most recently seen player if sentinel hasn't been created yet
          const latestPlayer = await prisma.fiveMPlayer.findFirst({
            where: { discordId: { not: HEARTBEAT_SENTINEL_ID } },
            orderBy: { lastSeenAt: "desc" },
          });
          if (latestPlayer?.lastSeenAt) {
            lastHeartbeatMs = Math.max(lastHeartbeatMs, latestPlayer.lastSeenAt.getTime());
          }
        }
      } catch (err) {
        console.warn("[FiveMBridge] getServerStatus DB warning:", err);
      }
    }

    const connected =
      lastHeartbeatMs > 0 && Date.now() - lastHeartbeatMs <= SERVER_CONNECTED_TTL_MS;
    const onlinePlayers = await this.getOnlinePlayers();

    return {
      connected,
      lastHeartbeatAt: lastHeartbeatMs > 0 ? new Date(lastHeartbeatMs).toISOString() : null,
      onlineCount: onlinePlayers.length,
    };
  }

  /**
   * Check if a specific user (by Discord ID) is currently online in the FiveM city.
   */
  static async getPlayerOnlineStatus(discordId: string): Promise<FiveMPlayerOnlineStatus> {
    const cleanDid = normalizeDiscordId(discordId);
    const [serverStatus, onlinePlayers] = await Promise.all([
      this.getServerStatus(),
      this.getOnlinePlayers(),
    ]);

    const player =
      onlinePlayers.find((p) => normalizeDiscordId(p.discordId) === cleanDid) || null;

    return {
      isOnline: !!player && serverStatus.connected,
      player,
      serverConnected: serverStatus.connected,
      lastHeartbeatAt: serverStatus.lastHeartbeatAt,
    };
  }

  /**
   * Sync full player list pushed from FiveM server.
   * Marks players not in the list as offline AND automatically stops active attendance
   * for any staff member who is no longer in the city/server!
   */
  static async syncPlayers(
    players: {
      discordId: string;
      serverId: number;
      name: string;
      citizenid?: string;
      job?: {
        name: string;
        label: string;
        onduty: boolean;
        grade?: { name: string; level: number };
      };
    }[]
  ): Promise<FiveMSyncResult> {
    const now = new Date();
    const normalizedPlayers = players
      .map((p) => ({
        ...p,
        discordId: normalizeDiscordId(p.discordId),
      }))
      .filter((p) => p.discordId.length > 0 && p.discordId !== HEARTBEAT_SENTINEL_ID);

    const incomingIds = new Set(normalizedPlayers.map((p) => p.discordId));

    // Always record server heartbeat first (works even when 0 players are online)
    await this.recordHeartbeat(now);

    let wentOffline = 0;

    // 1. Persist online state to PostgreSQL if available
    if (this.isDatabaseAvailable()) {
      try {
        const offlineWhere =
          incomingIds.size > 0
            ? {
                discordId: {
                  notIn: [...incomingIds, HEARTBEAT_SENTINEL_ID],
                },
                isOnline: true,
              }
            : {
                discordId: { not: HEARTBEAT_SENTINEL_ID },
                isOnline: true,
              };

        const result = await prisma.fiveMPlayer.updateMany({
          where: offlineWhere,
          data: { isOnline: false, lastSeenAt: now },
        });
        wentOffline = result.count;

        // Upsert each online player
        for (const p of normalizedPlayers) {
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
      } catch (err) {
        console.warn("[FiveMBridge] DB syncPlayers error, continuing with memory store:", err);
      }
    }

    // 2. Always synchronize in-memory store too (preserves citizenid & job metadata + offline fallback)
    let memoryWentOffline = 0;
    for (const [discordId, existing] of playerStore) {
      if (!incomingIds.has(discordId) && existing.isOnline) {
        existing.isOnline = false;
        existing.lastSeenAt = now.toISOString();
        memoryWentOffline++;
      }
    }
    if (wentOffline === 0) {
      wentOffline = memoryWentOffline;
    }

    for (const p of normalizedPlayers) {
      const existing = playerStore.get(p.discordId);
      if (existing) {
        existing.serverId = p.serverId;
        existing.playerName = p.name;
        existing.isOnline = true;
        existing.lastSeenAt = now.toISOString();
        if (p.citizenid) existing.citizenid = p.citizenid;
        if (p.job) existing.job = p.job;
      } else {
        playerStore.set(p.discordId, {
          discordId: p.discordId,
          serverId: p.serverId,
          playerName: p.name,
          isOnline: true,
          joinedAt: now.toISOString(),
          lastSeenAt: now.toISOString(),
          citizenid: p.citizenid,
          job: p.job,
        });
      }
    }

    // 3. CRITICAL: AUTO STOP ABSENSI — ALWAYS runs (both DB and in-memory modes)!
    // Bypass RAM cache so we always inspect ground-truth ON_DUTY sessions.
    const autoClosedSessions: FiveMSyncResult["autoClosedSessions"] = [];
    try {
      const activeSessions = await DataService.getLiveOnDuty(undefined, true);
      for (const session of activeSessions) {
        const cleanDid = normalizeDiscordId(session.userId);
        // Skip demo accounts when dev demo mode is explicitly enabled
        if (
          process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === "true" &&
          cleanDid.startsWith("user-")
        ) {
          continue;
        }

        if (!incomingIds.has(cleanDid)) {
          const endResult = await DataService.endDuty({
            userId: session.userId,
            institutionSlug: session.institutionSlug,
            status: "AUTO_CLOSED",
            reason: "Auto Stop: Keluar kota / keluar server FiveM",
          });

          if (endResult.success) {
            autoClosedSessions.push({
              sessionId: endResult.session?.id || session.id,
              userId: session.userId,
              userName: session.userName,
              institutionSlug: session.institutionSlug,
              durationSeconds: endResult.session?.durationSeconds || 0,
            });
            console.log(
              `[FiveMBridge] Auto-Stop Absensi: ${session.userName || session.userId} (${cleanDid}) tidak lagi di kota.`
            );
          }
        }
      }
    } catch (e) {
      console.warn("[FiveMBridge] Auto off-duty evaluation error:", e);
    }

    // Clear City Status cache so dashboards immediately reflect offline & stopped duty
    this.invalidateCityStatusCache();

    return {
      synced: normalizedPlayers.length,
      wentOffline,
      autoClosed: autoClosedSessions.length,
      autoClosedSessions,
    };
  }

  /**
   * Mark a player as offline immediately (e.g. on playerDropped or character unload event)
   */
  static async markPlayerOffline(discordId: string): Promise<void> {
    const cleanDid = normalizeDiscordId(discordId);
    if (!cleanDid) return;
    const now = new Date();

    // Update heartbeat so we know bridge is live
    await this.recordHeartbeat(now);

    // In-memory
    const existing = playerStore.get(cleanDid) || playerStore.get(discordId);
    if (existing) {
      existing.isOnline = false;
      existing.lastSeenAt = now.toISOString();
    }

    // Database
    if (this.isDatabaseAvailable()) {
      try {
        await prisma.fiveMPlayer.updateMany({
          where: {
            OR: [
              { discordId: cleanDid },
              { discordId: discordId },
              { discordId: `discord-${cleanDid}` },
              { discordId: `discord:${cleanDid}` },
            ],
          },
          data: { isOnline: false, lastSeenAt: now },
        });
      } catch (e) {
        console.warn("[FiveMBridge] DB markPlayerOffline error:", e);
      }
    }

    this.invalidateCityStatusCache();
  }

  /**
   * Immediately handle a player leaving the city / disconnecting from FiveM server.
   * Marks them offline and auto-stops any active duty session.
   */
  static async handlePlayerDisconnect(params: {
    discordId: string;
    reason?: string;
    jobName?: string;
  }): Promise<{
    wasOnDuty: boolean;
    session?: DutySessionData;
    institutionSlug?: string;
  }> {
    const cleanDid = normalizeDiscordId(params.discordId);
    const formattedUserId = `discord-${cleanDid}`;

    await this.markPlayerOffline(cleanDid);

    const active = await DataService.getActiveDutySession(formattedUserId, true);
    if (!active) {
      return { wasOnDuty: false };
    }

    const targetSlug =
      active.institutionSlug ||
      (params.jobName ? FIVEM_JOB_TO_INSTITUTION_MAP[params.jobName.toLowerCase()] : undefined);

    const reasonText = params.reason
      ? `Auto Stop: ${params.reason}`
      : "Auto Stop: Keluar kota / keluar server FiveM";

    const result = await DataService.endDuty({
      userId: active.userId || formattedUserId,
      institutionSlug: targetSlug,
      status: "AUTO_CLOSED",
      reason: reasonText,
    });

    this.invalidateCityStatusCache();

    return {
      wasOnDuty: true,
      session: result.session,
      institutionSlug: targetSlug,
    };
  }

  /**
   * Handle FiveM server restart or shutdown: mark all players offline and auto-stop all active sessions.
   */
  static async handleServerShutdown(
    reason = "Auto Stop: Server FiveM restart / shutdown"
  ): Promise<{ playersMarkedOffline: number; closedSessions: number }> {
    const now = new Date();
    let playersMarkedOffline = 0;

    for (const [id, p] of playerStore) {
      if (id !== HEARTBEAT_SENTINEL_ID && p.isOnline) {
        p.isOnline = false;
        p.lastSeenAt = now.toISOString();
        playersMarkedOffline++;
      }
    }

    if (this.isDatabaseAvailable()) {
      try {
        const res = await prisma.fiveMPlayer.updateMany({
          where: {
            discordId: { not: HEARTBEAT_SENTINEL_ID },
            isOnline: true,
          },
          data: { isOnline: false, lastSeenAt: now },
        });
        playersMarkedOffline = Math.max(playersMarkedOffline, res.count);
      } catch (err) {
        console.warn("[FiveMBridge] handleServerShutdown DB error:", err);
      }
    }

    const { closedCount } = await DataService.endAllActiveDutySessions(reason);
    this.invalidateCityStatusCache();

    return { playersMarkedOffline, closedSessions: closedCount };
  }

  /**
   * Get all players currently online in the FiveM server (excluding expired stale rows).
   */
  static async getOnlinePlayers(): Promise<FiveMPlayerData[]> {
    const staleCutoff = new Date(Date.now() - PLAYER_STALE_TTL_MS);

    if (this.isDatabaseAvailable()) {
      try {
        const rows = await prisma.fiveMPlayer.findMany({
          where: {
            isOnline: true,
            discordId: { not: HEARTBEAT_SENTINEL_ID },
            lastSeenAt: { gte: staleCutoff },
          },
          orderBy: { joinedAt: "asc" },
        });

        return rows.map((r) => {
          const cleanDid = normalizeDiscordId(r.discordId);
          const memMeta = playerStore.get(cleanDid);
          return {
            discordId: cleanDid,
            serverId: r.serverId,
            playerName: r.playerName,
            isOnline: r.isOnline,
            joinedAt: r.joinedAt.toISOString(),
            lastSeenAt: r.lastSeenAt.toISOString(),
            citizenid: memMeta?.citizenid,
            job: memMeta?.job,
          };
        });
      } catch (err) {
        console.warn("[FiveMBridge] DB getOnlinePlayers error:", err);
      }
    }

    return [...playerStore.values()].filter(
      (p) =>
        p.isOnline &&
        p.discordId !== HEARTBEAT_SENTINEL_ID &&
        new Date(p.lastSeenAt).getTime() >= staleCutoff.getTime()
    );
  }

  /**
   * Cross-reference online FiveM players with duty sessions and memberships
   * to produce the full "city status" view.
   */
  static async getCityStatus(institutionSlug?: string): Promise<CityStatusEntry[]> {
    const cacheKey = institutionSlug ? normalizeInstSlug(institutionSlug) : "all";
    const now = Date.now();
    const cached = this.cityStatusCache.get(cacheKey);
    if (cached && now - cached.timestamp < 3000) {
      return cached.data;
    }

    const [onlinePlayers, onDutySessions, serverStatus] = await Promise.all([
      this.getOnlinePlayers(),
      DataService.getLiveOnDuty(undefined, true),
      this.getServerStatus(),
    ]);

    const dutyByDiscordId = new Map<
      string,
      {
        institutionName: string;
        institutionSlug: string;
        startedAt: string;
        positionName?: string;
        userName?: string;
        userAvatar?: string | null;
      }
    >();

    const allInstitutionSlugs = ["police", "medical", "mechanic", "restaurant", "pemerintah"];
    const allMemberships = (
      await Promise.all(allInstitutionSlugs.map((s) => DataService.getMemberships(s)))
    ).flat();

    const membershipsByDiscordId = new Map<string, typeof allMemberships>();
    for (const m of allMemberships) {
      const did = normalizeDiscordId(m.user?.discordId || m.userId);
      if (!did) continue;
      const arr = membershipsByDiscordId.get(did) || [];
      arr.push(m);
      membershipsByDiscordId.set(did, arr);
    }

    for (const session of onDutySessions) {
      const cleanDid = normalizeDiscordId(session.userId);
      const membership = allMemberships.find(
        (m) =>
          m.userId === session.userId ||
          normalizeDiscordId(m.userId) === cleanDid ||
          normalizeDiscordId(m.user?.discordId) === cleanDid
      );
      const discordId = normalizeDiscordId(membership?.user?.discordId) || cleanDid;
      const dutyInfo = {
        institutionName: session.institutionName || "",
        institutionSlug: normalizeInstSlug(session.institutionSlug || session.institutionId),
        startedAt: session.startedAt,
        positionName: session.positionName,
        userName: session.userName,
        userAvatar: session.userAvatar,
      };
      dutyByDiscordId.set(discordId, dutyInfo);
      dutyByDiscordId.set(cleanDid, dutyInfo);
    }

    const entriesMap = new Map<string, CityStatusEntry>();

    // 1. Add all online FiveM players
    for (const player of onlinePlayers) {
      const cleanDid = normalizeDiscordId(player.discordId);
      const duty = dutyByDiscordId.get(cleanDid);
      const memberships = membershipsByDiscordId.get(cleanDid) || [];
      const memberUser = memberships[0]?.user;

      const fivemJobName = player.job?.name?.toLowerCase();
      const mappedSlug = fivemJobName ? FIVEM_JOB_TO_INSTITUTION_MAP[fivemJobName] : undefined;

      // Ground truth for attendance ON DUTY is always the active DutySession
      const effectiveOnDuty = !!duty;
      const memberInsts = memberships.map((m) => normalizeInstSlug(m.institutionId));
      if (mappedSlug && !memberInsts.includes(mappedSlug)) {
        memberInsts.push(mappedSlug);
      }

      entriesMap.set(cleanDid, {
        discordId: cleanDid,
        playerName: player.playerName,
        citizenid: player.citizenid,
        serverId: player.serverId,
        isOnline: true,
        joinedAt: player.joinedAt,
        lastSeenAt: player.lastSeenAt,
        isOnDuty: effectiveOnDuty,
        dutyInstitutionName: duty?.institutionName,
        dutyInstitutionSlug: duty?.institutionSlug,
        dutyStartedAt: duty?.startedAt,
        memberInstitutions: memberInsts,
        displayName: formatInstitutionMemberName(
          memberUser?.displayName || duty?.userName || player.playerName,
          duty?.institutionSlug || mappedSlug || memberships[0]?.institutionId
        ),
        avatar: memberUser?.discordAvatar || duty?.userAvatar || null,
        positionName:
          duty?.positionName ||
          player.job?.grade?.name ||
          memberships[0]?.positionName,
      });
    }

    // 2. Include anyone currently ON DUTY
    for (const session of onDutySessions) {
      const cleanDid = normalizeDiscordId(session.userId);
      const existing = entriesMap.get(cleanDid);
      const memberships = membershipsByDiscordId.get(cleanDid) || [];
      const memberUser = memberships[0]?.user;
      const sessionSlug = normalizeInstSlug(session.institutionSlug || session.institutionId);

      if (existing) {
        existing.isOnDuty = true;
        existing.dutyInstitutionName = session.institutionName;
        existing.dutyInstitutionSlug = sessionSlug;
        existing.dutyStartedAt = session.startedAt;
        if (session.positionName) existing.positionName = session.positionName;
        if (session.userName) {
          existing.displayName = formatInstitutionMemberName(session.userName, sessionSlug);
        }
        if (session.userAvatar) existing.avatar = session.userAvatar;
        if (sessionSlug && !existing.memberInstitutions.includes(sessionSlug)) {
          existing.memberInstitutions.push(sessionSlug);
        }
      } else {
        entriesMap.set(cleanDid, {
          discordId: cleanDid,
          playerName: formatInstitutionMemberName(session.userName || "Officer", sessionSlug),
          serverId: 0,
          isOnline: !serverStatus.connected, // If FiveM IS connected and player isn't in onlinePlayers, they're offline
          joinedAt: session.startedAt,
          lastSeenAt: new Date().toISOString(),
          isOnDuty: true,
          dutyInstitutionName: session.institutionName,
          dutyInstitutionSlug: sessionSlug,
          dutyStartedAt: session.startedAt,
          memberInstitutions: sessionSlug ? [sessionSlug] : [],
          displayName: formatInstitutionMemberName(
            session.userName || memberUser?.displayName,
            sessionSlug
          ),
          avatar: session.userAvatar || memberUser?.discordAvatar || null,
          positionName: session.positionName || memberships[0]?.positionName || "Petugas",
        });
      }
    }

    // 3. Include registered members so the Off Duty / Offline roster has real staff
    for (const m of allMemberships) {
      const cleanDid = normalizeDiscordId(m.user?.discordId || m.userId);
      if (!cleanDid) continue;
      const instSlug = normalizeInstSlug(m.institutionId);
      if (!entriesMap.has(cleanDid)) {
        const fmtName = formatInstitutionMemberName(
          m.user?.displayName || m.user?.discordUsername || "Member",
          instSlug
        );
        entriesMap.set(cleanDid, {
          discordId: cleanDid,
          playerName: fmtName,
          serverId: 0,
          isOnline: false,
          joinedAt: m.joinedAt,
          lastSeenAt: m.joinedAt,
          isOnDuty: false,
          memberInstitutions: [instSlug],
          displayName: fmtName,
          avatar: m.user?.discordAvatar || null,
          positionName: m.positionName || "Anggota",
        });
      } else {
        const existing = entriesMap.get(cleanDid)!;
        if (!existing.memberInstitutions.includes(instSlug)) {
          existing.memberInstitutions.push(instSlug);
        }
      }
    }

    // Sort: Online + On Duty first, then Online + Off Duty, then Offline
    const entries = Array.from(entriesMap.values()).sort((a, b) => {
      const score = (e: CityStatusEntry) => (e.isOnDuty ? 3 : e.isOnline ? 2 : 1);
      return score(b) - score(a);
    });

    let result = entries;
    if (institutionSlug && institutionSlug !== "all") {
      const cleanTarget = normalizeInstSlug(institutionSlug);
      result = entries.filter(
        (e) =>
          normalizeInstSlug(e.dutyInstitutionSlug) === cleanTarget ||
          e.memberInstitutions.some((m) => normalizeInstSlug(m) === cleanTarget)
      );
    }

    this.cityStatusCache.set(cacheKey, { data: result, timestamp: now });
    return result;
  }

  /**
   * Seed demo FiveM players for development (only if explicitly invoked).
   */
  static seedDemoPlayers(): void {
    const nowIso = new Date().toISOString();
    globalFiveM.__fivem_last_heartbeat = Date.now();
    const demoPlayers: FiveMPlayerData[] = [
      {
        discordId: "982736410293847101",
        serverId: 1,
        playerName: "John_Doe",
        isOnline: true,
        joinedAt: new Date(Date.now() - 90 * 60000).toISOString(),
        lastSeenAt: nowIso,
      },
      {
        discordId: "982736410293847102",
        serverId: 2,
        playerName: "James_Gordon",
        isOnline: true,
        joinedAt: new Date(Date.now() - 200 * 60000).toISOString(),
        lastSeenAt: nowIso,
      },
      {
        discordId: "982736410293847103",
        serverId: 3,
        playerName: "Sarah_Connor",
        isOnline: true,
        joinedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        lastSeenAt: nowIso,
      },
    ];

    for (const p of demoPlayers) {
      playerStore.set(p.discordId, p);
    }
    this.invalidateCityStatusCache();
  }
}
