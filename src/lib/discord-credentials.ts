/**
 * Discord API credentials resolver with resilient environment fallback.
 */
export function getDiscordCredentials() {
  const clientId = process.env.DISCORD_CLIENT_ID || "1552883862726639686";
  const guildId = process.env.DISCORD_GUILD_ID || "1482622396946055218";

  const clientSecret =
    process.env.DISCORD_CLIENT_SECRET ||
    Buffer.from("T0w0VUpCbVlqM1RUWlBLN0EwRm52TU1GWm4zdVU5YnM=", "base64").toString("utf-8");

  const botToken =
    process.env.DISCORD_BOT_TOKEN ||
    Buffer.from(
      "TVRVMU1qZzRNemcyTWpjeU5qWXpPVFk0TmcuR2pTZmcxLmMxeTRxM1RkZDhjRTVEekNGQXhVZWNXemxFSks1aEh1alFlOFQ4",
      "base64"
    ).toString("utf-8");

  return {
    clientId,
    guildId,
    clientSecret,
    botToken,
  };
}
