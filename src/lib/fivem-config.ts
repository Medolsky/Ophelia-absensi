/**
 * Centralized FiveM Integration Configuration
 * Keeps the Web API endpoints, docs, and FiveM Lua resource 100% synchronized.
 */
export const DEFAULT_OPHELIA_APP_URL = "https://ophelia-absensi.vercel.app";

export const DEFAULT_FIVEM_API_SECRET =
  "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e";

export function getOpheliaAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_OPHELIA_APP_URL).replace(/\/+$/, "");
}

export function getFiveMApiSecret(): string {
  return (process.env.FIVEM_API_SECRET || DEFAULT_FIVEM_API_SECRET).trim();
}
