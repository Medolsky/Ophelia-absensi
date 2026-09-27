--[[
  OPHELIA BRIDGE — Server Script
  Jangan edit file ini, edit config.lua saja.
]]

-- ============================================================
-- Default Fallback Config (sinkron dengan web .env)
-- ============================================================
Config = Config or {}
Config.OpheliaURL   = (Config.OpheliaURL and Config.OpheliaURL ~= "") and Config.OpheliaURL or "https://ophelia-absensi.vercel.app"
Config.Secret       = (Config.Secret and Config.Secret ~= "" and Config.Secret ~= "GANTI_DENGAN_SECRET_DARI_ADMIN_WEB") and Config.Secret or "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"
Config.SyncInterval = Config.SyncInterval or 30000
Config.Debug        = (Config.Debug ~= nil) and Config.Debug or true
Config.MaxRetries   = Config.MaxRetries or 3
Config.RetryDelay   = Config.RetryDelay or 5000

-- ============================================================
-- Helpers
-- ============================================================

local syncCount     = 0
local failCount     = 0
local lastSyncTime  = 0
local isConnected   = false

local function log(msg)
  print("[Ophelia] " .. msg)
end

local function debug(msg)
  if Config.Debug then
    print("[Ophelia][DEBUG] " .. msg)
  end
end

local function getDiscordId(playerId)
  local identifiers = GetPlayerIdentifiers(playerId)
  for _, id in ipairs(identifiers) do
    if string.find(id, "discord:") then
      return string.gsub(id, "discord:", "")
    end
  end
  return nil
end

local function getPlayerList()
  local players = {}
  local skipped = 0
  for _, playerId in ipairs(GetPlayers()) do
    local discordId = getDiscordId(playerId)
    if discordId then
      table.insert(players, {
        discordId = discordId,
        serverId  = tonumber(playerId),
        name      = GetPlayerName(playerId),
      })
    else
      skipped = skipped + 1
    end
  end
  if skipped > 0 then
    debug(skipped .. " player(s) tidak punya Discord ID (skip)")
  end
  return players
end

-- ============================================================
-- Core Sync
-- ============================================================

local function doSync(attempt)
  attempt = attempt or 1
  local players = getPlayerList()

  local payload = json.encode({
    players = players,
    secret  = Config.Secret,
  })

  local endpoint = Config.OpheliaURL .. "/api/fivem/players"
  debug("Sending " .. #players .. " players to " .. endpoint .. " (attempt " .. attempt .. ")")

  PerformHttpRequest(
    endpoint,
    function(statusCode, responseText, headers)
      if statusCode == 200 then
        syncCount = syncCount + 1
        failCount = 0
        lastSyncTime = os.time()
        isConnected = true

        if Config.Debug then
          local data = json.decode(responseText)
          debug("[OK] Synced " .. #players .. " players | " ..
            (data and data.wentOffline or 0) .. " went offline | " ..
            "Total syncs: " .. syncCount)
        else
          if syncCount % 10 == 1 then
            log("Synced " .. #players .. " players (sync #" .. syncCount .. ")")
          end
        end

      elseif statusCode == 401 then
        isConnected = false
        log("[ERROR] AUTH ERROR — Secret key salah! Cek Config.Secret di config.lua")
        log("   Secret harus sama dengan FIVEM_API_SECRET di web server")

      elseif statusCode == 400 then
        log("[ERROR] BAD REQUEST — Format data salah: " .. tostring(responseText))

      else
        failCount = failCount + 1
        isConnected = false
        log("[WARN] Sync gagal — HTTP " .. tostring(statusCode) ..
          " (attempt " .. attempt .. "/" .. Config.MaxRetries .. ")")

        -- Retry
        if attempt < Config.MaxRetries then
          debug("Retry dalam " .. (Config.RetryDelay / 1000) .. " detik...")
          SetTimeout(Config.RetryDelay, function()
            doSync(attempt + 1)
          end)
        else
          log("[ERROR] Sync gagal setelah " .. Config.MaxRetries .. " percobaan. Skip sampai interval berikutnya.")
        end
      end
    end,
    "POST",
    payload,
    { ["Content-Type"] = "application/json" }
  )
end

-- ============================================================
-- Health Check — Test koneksi ke Ophelia
-- ============================================================

local function healthCheck()
  local endpoint = Config.OpheliaURL .. "/api/fivem/players"
  debug("Health check ke " .. endpoint)

  PerformHttpRequest(
    endpoint,
    function(statusCode, responseText, headers)
      if statusCode == 200 then
        isConnected = true
        local data = json.decode(responseText)
        log("[OK] Koneksi ke Ophelia berhasil!")
        log("   URL: " .. Config.OpheliaURL)
        log("   Players online di Ophelia: " .. (data and data.count or "?"))
      else
        isConnected = false
        log("[ERROR] Health check gagal — HTTP " .. tostring(statusCode))
        if statusCode == nil or statusCode == 0 then
          log("   Kemungkinan URL salah atau server tidak bisa diakses")
          log("   Cek: " .. Config.OpheliaURL)
        end
      end
    end,
    "GET",
    "",
    {}
  )
end

-- ============================================================
-- Main Sync Loop
-- ============================================================

CreateThread(function()
  -- Startup
  log("╔════════════════════════════════════════════════════════╗")
  log("║        OPHELIA BRIDGE v1.0.0 — Starting               ║")
  log("╚════════════════════════════════════════════════════════╝")
  log("  Dashboard : " .. Config.OpheliaURL)
  log("  Interval  : " .. (Config.SyncInterval / 1000) .. " detik")
  log("  Debug     : " .. tostring(Config.Debug))
  log("  Retries   : " .. Config.MaxRetries .. "x")
  log("")

  -- Wait for server to fully start
  Wait(5000)

  -- Health check dulu
  healthCheck()
  Wait(3000)

  -- Main loop
  log("[INFO] Sync loop started")
  while true do
    doSync()
    Wait(Config.SyncInterval)
  end
end)

-- ============================================================
-- Event Handlers — Instant sync on connect/disconnect
-- ============================================================

AddEventHandler("playerConnecting", function(playerName, setKickReason, deferrals)
  debug("Player connecting: " .. playerName)
  SetTimeout(3000, function()
    doSync()
  end)
end)

AddEventHandler("playerDropped", function(reason)
  local playerName = GetPlayerName(source) or "Unknown"
  debug("Player dropped: " .. playerName .. " (" .. reason .. ")")
  SetTimeout(1000, function()
    doSync()
  end)
end)

-- ============================================================
-- Server Commands (untuk admin server)
-- ============================================================

-- /ophelia_status — Cek status koneksi
RegisterCommand("ophelia_status", function(source, args, rawCommand)
  if source ~= 0 then return end -- server console only
  log("===================================")
  log("  Status: " .. (isConnected and "CONNECTED (ONLINE)" or "DISCONNECTED (OFFLINE)"))
  log("  URL: " .. Config.OpheliaURL)
  log("  Total syncs: " .. syncCount)
  log("  Failed: " .. failCount)
  if lastSyncTime > 0 then
    log("  Last sync: " .. os.date("%H:%M:%S", lastSyncTime))
  end
  log("  Players with Discord: " .. #getPlayerList() .. "/" .. #GetPlayers())
  log("===================================")
end, true)

-- /ophelia_sync — Force sync sekarang
RegisterCommand("ophelia_sync", function(source, args, rawCommand)
  if source ~= 0 then return end
  log("[ACTION] Force sync triggered...")
  doSync()
end, true)

-- /ophelia_health — Test koneksi
RegisterCommand("ophelia_health", function(source, args, rawCommand)
  if source ~= 0 then return end
  log("[ACTION] Running health check...")
  healthCheck()
end, true)

-- /ophelia_debug — Toggle debug mode
RegisterCommand("ophelia_debug", function(source, args, rawCommand)
  if source ~= 0 then return end
  Config.Debug = not Config.Debug
  log("Debug mode: " .. (Config.Debug and "ON" or "OFF"))
end, true)

log("[OK] ophelia-bridge resource loaded — waiting for startup...")
