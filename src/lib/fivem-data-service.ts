import { FiveMSocietyAccount, FiveMGamePlayer } from "@/types";
import { FIVEM_SOCIETY_ACCOUNT_MAP } from "./constants";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Baseline fallback data extracted from opheliav2.sql dump.
 * Used if the RDP API Bridge is not yet online or unreachable.
 */
const FALLBACK_SOCIETY_ACCOUNTS: FiveMSocietyAccount[] = [
  {
    accountNumber: "society_police",
    accountName: "Police Kas",
    institutionName: "Ophelia Police Department",
    institutionSlug: "police",
    balance: 305002,
    currency: "Rp",
    type: "shared",
    updatedAt: "2026-08-29T18:23:34.000Z",
  },
  {
    accountNumber: "society_ambulance",
    accountName: "EMS Kas",
    institutionName: "Ophelia Medical Center",
    institutionSlug: "medical",
    balance: 1025700,
    currency: "Rp",
    type: "shared",
    updatedAt: "2026-08-31T16:06:01.000Z",
  },
  {
    accountNumber: "society_mechanic",
    accountName: "Mechanic Kas",
    institutionName: "Ophelia Custom Garage",
    institutionSlug: "mechanic",
    balance: 1092741,
    currency: "Rp",
    type: "shared",
    updatedAt: "2026-09-26T09:35:49.000Z",
  },
  {
    accountNumber: "society_pedagang",
    accountName: "pedagang Kas",
    institutionName: "Ophelia Restaurant & Lounge",
    institutionSlug: "restaurant",
    balance: 899,
    currency: "Rp",
    type: "shared",
    updatedAt: "2026-09-25T17:08:55.000Z",
  },
];

export class FiveMDataService {
  private static getBridgeUrl(): string | null {
    return process.env.FIVEM_BRIDGE_URL || null;
  }

  private static getApiSecret(): string {
    return (
      process.env.FIVEM_API_SECRET ||
      "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"
    );
  }

  /**
   * Helper to perform authenticated GET requests to RDP API Bridge
   */
  private static async fetchFromBridge<T>(endpoint: string): Promise<T | null> {
    const baseUrl = this.getBridgeUrl();
    if (!baseUrl) return null;

    try {
      const url = `${baseUrl.replace(/\/+$/, "")}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const res = await fetch(url, {
        headers: {
          "X-API-Secret": this.getApiSecret(),
          "Accept": "application/json",
        },
        signal: controller.signal,
        next: { revalidate: 30 },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[FiveMDataService] HTTP ${res.status} from ${endpoint}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (err: any) {
      // Don't crash if RDP server is momentarily offline or sleeping
      if (err.name !== "AbortError") {
        console.warn(`[FiveMDataService] Bridge unreachable at ${endpoint}:`, err.message);
      }
      return null;
    }
  }

  /**
   * Get society bank account balances (police, medical, mechanic, restaurant)
   */
  static async getSocietyBankAccounts(): Promise<FiveMSocietyAccount[]> {
    const cacheKey = "society_accounts";
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const bridgeData = await this.fetchFromBridge<{
      ok: boolean;
      accounts: FiveMSocietyAccount[];
    }>("/api/bank-accounts/society");

    if (bridgeData && bridgeData.ok && Array.isArray(bridgeData.accounts)) {
      cache.set(cacheKey, { data: bridgeData.accounts, timestamp: now });
      return bridgeData.accounts;
    }

    // Fallback to opheliav2 baseline data
    return FALLBACK_SOCIETY_ACCOUNTS;
  }

  /**
   * Get single institution society bank balance
   */
  static async getInstitutionSocietyBalance(institutionSlug: string): Promise<FiveMSocietyAccount | null> {
    const clean = institutionSlug.replace("inst-", "").toLowerCase();
    const accounts = await this.getSocietyBankAccounts();
    return accounts.find((a) => a.institutionSlug === clean) || null;
  }

  /**
   * Get all registered in-game players for a specific job (e.g. police, ambulance, mechanic, pedagang)
   */
  static async getPlayersByJob(jobName: string): Promise<FiveMGamePlayer[]> {
    const targetJob = jobName.toLowerCase();
    // Handle alias: restaurant/resto -> pedagang
    const queryJob = targetJob === "restaurant" ? "pedagang" : targetJob;
    const cacheKey = `players_job_${queryJob}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const bridgeData = await this.fetchFromBridge<{
      ok: boolean;
      players: FiveMGamePlayer[];
    }>(`/api/players/by-job/${queryJob}`);

    if (bridgeData && bridgeData.ok && Array.isArray(bridgeData.players)) {
      cache.set(cacheKey, { data: bridgeData.players, timestamp: now });
      return bridgeData.players;
    }

    return [];
  }

  /**
   * Get detailed character profile by Citizen ID
   */
  static async getPlayerDetail(citizenid: string): Promise<any | null> {
    if (!citizenid) return null;
    const cacheKey = `player_detail_${citizenid}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const bridgeData = await this.fetchFromBridge<{
      ok: boolean;
      player: any;
    }>(`/api/player/${encodeURIComponent(citizenid)}`);

    if (bridgeData && bridgeData.ok && bridgeData.player) {
      cache.set(cacheKey, { data: bridgeData.player, timestamp: now });
      return bridgeData.player;
    }

    return null;
  }

  /**
   * Check connection status of the RDP Bridge
   */
  static async checkBridgeHealth(): Promise<{
    connected: boolean;
    bridgeUrl: string | null;
    message: string;
  }> {
    const bridgeUrl = this.getBridgeUrl();
    if (!bridgeUrl) {
      return {
        connected: false,
        bridgeUrl: null,
        message: "FIVEM_BRIDGE_URL belum disetel di .env (berjalan dalam mode offline/fallback).",
      };
    }

    try {
      const url = `${bridgeUrl.replace(/\/+$/, "")}/health`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return {
          connected: true,
          bridgeUrl,
          message: "Terhubung ke API Bridge di server RDP.",
        };
      }
      return {
        connected: false,
        bridgeUrl,
        message: `API Bridge merespon dengan status: ${res.status}`,
      };
    } catch (err: any) {
      return {
        connected: false,
        bridgeUrl,
        message: `Gagal menghubungi API Bridge: ${err.message}`,
      };
    }
  }
}
