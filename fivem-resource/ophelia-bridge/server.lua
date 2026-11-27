--[[
  =====================================================================
    OPHELIA BRIDGE v2.0.0 — Universal Server Script
    Mendukung: QBox (qbx_core), QBCore (qb-core), ESX, dan Standalone
    Fitur utama:
      1. Instant Auto-Stop Absensi saat player keluar server (playerDropped)
      2. Instant Auto-Stop Absensi saat player keluar kota / logout multicharacter
      3. Periodic Heartbeat Sync (termasuk saat 0 player online) sebagai pengaman ganda
      4. Auto-Stop semua sesi aktif saat server shutdown / restart (txAdmin)
      5. Optional command /absensi start | stop di dalam game
  =====================================================================
]]

Config = Config or {}

-- Backward compatibility dengan config.lua versi lama (Config.WebhookURL / Config.APISecret)
local function normalizeBaseUrl(rawUrl)
    if type(rawUrl) ~= "string" or rawUrl == "" then
        return "https://ophelia-absensi.vercel.app"
    end
    local clean = rawUrl:gsub("/+$", "")
    clean = clean:gsub("/api/fivem$", "")
    return clean
end

local rawUrl = Config.OpheliaURL or Config.WebhookURL or "https://ophelia-absensi.vercel.app"
local rawSecret = Config.Secret or Config.APISecret or "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"
if rawSecret == "" or rawSecret == "GANTI_DENGAN_SECRET_DARI_ADMIN_WEB" then
    rawSecret = "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"
end

Config.OpheliaURL             = normalizeBaseUrl(rawUrl)
Config.Secret                 = rawSecret
Config.Framework              = Config.Framework or "auto"
Config.AutoStopOnDisconnect   = Config.AutoStopOnDisconnect ~= false
Config.AutoStopOnCharUnload   = Config.AutoStopOnCharUnload ~= false
Config.RequireLoadedCharacter = Config.RequireLoadedCharacter ~= false
Config.AutoStopOnOffDuty      = Config.AutoStopOnOffDuty ~= false
Config.AutoStartOnInGameDuty  = Config.AutoStartOnInGameDuty == true
Config.AutoStopAllOnShutdown  = Config.AutoStopAllOnShutdown ~= false
Config.EnableInGameCommands   = Config.EnableInGameCommands ~= false

-- Support SyncInterval dalam detik (v1 lama <= 300) maupun milidetik (>= 1000)
if type(Config.SyncInterval) ~= "number" or Config.SyncInterval <= 0 then
    Config.SyncInterval = 15000
elseif Config.SyncInterval < 1000 then
    Config.SyncInterval = Config.SyncInterval * 1000
end
if Config.SyncInterval < 10000 then
    Config.SyncInterval = 10000
end

Config.MaxRetries = Config.MaxRetries or 3
Config.RetryDelay = Config.RetryDelay or 3000
Config.Debug      = Config.Debug == true
Config.TrackedJobs = Config.TrackedJobs or {
    ['police']     = 'police',
    ['ambulance']  = 'medical',
    ['ems']        = 'medical',
    ['mechanic']   = 'mechanic',
    ['pedagang']   = 'restaurant',
    ['resto']      = 'restaurant',
    ['pemerintah'] = 'pemerintah',
}

-- ============================================================
-- Runtime State & Framework Detection
-- ============================================================

local FrameworkName = "standalone"
local QBCore = nil
local ESX = nil

-- Cache player aktif agar saat playerDropped/OnPlayerUnload kita PASTI masih punya Discord ID,
-- meskipun framework (QBCore/ESX) sudah menghapus object player lebih dulu!
local ActivePlayers = {}   -- [src] = { discordId, serverId, name, citizenid, jobName, gradeName, gradeLevel, onduty, charLoaded }
local RecentDropSent = {}  -- [discordId] = os.time() untuk mencegah double webhook dalam 3 detik

local syncCount = 0
local failCount = 0
local autoClosedTotal = 0
local lastSyncTime = 0
local isConnected = false

local function log(msg)
    print("^2[Ophelia Bridge]^7 " .. tostring(msg))
end

local function warnLog(msg)
    print("^3[Ophelia Bridge][WARN]^7 " .. tostring(msg))
end

local function errLog(msg)
    print("^1[Ophelia Bridge][ERROR]^7 " .. tostring(msg))
end

local function debugLog(msg)
    if Config.Debug then
        print("^5[Ophelia Bridge][DEBUG]^7 " .. tostring(msg))
    end
end

local function detectFramework()
    local mode = string.lower(tostring(Config.Framework or "auto"))

    if mode == "standalone" then
        FrameworkName = "standalone"
        return
    end

    if (mode == "auto" or mode == "qbox") and GetResourceState("qbx_core") == "started" then
        FrameworkName = "qbox"
        local ok, core = pcall(function() return exports["qb-core"]:GetCoreObject() end)
        if ok and core then QBCore = core end
        return
    end

    if (mode == "auto" or mode == "qbcore") and GetResourceState("qb-core") == "started" then
        local ok, core = pcall(function() return exports["qb-core"]:GetCoreObject() end)
        if ok and core then
            QBCore = core
            FrameworkName = "qbcore"
            return
        end
    end

    if (mode == "auto" or mode == "esx") and GetResourceState("es_extended") == "started" then
        local ok, obj = pcall(function() return exports["es_extended"]:getSharedObject() end)
        if ok and obj then
            ESX = obj
            FrameworkName = "esx"
            return
        end
    end

    FrameworkName = "standalone"
end

-- ============================================================
-- Player Identity & Framework Extractors
-- ============================================================

local function getDiscordId(src)
    local numSrc = tonumber(src)
    if not numSrc then return nil end

    -- Coba GetPlayerIdentifierByType terlebih dahulu (lebih cepat di artefak FiveM modern)
    if GetPlayerIdentifierByType then
        local ok, ident = pcall(GetPlayerIdentifierByType, numSrc, "discord")
        if ok and type(ident) == "string" and ident ~= "" then
            local clean = ident:gsub("^discord:", "")
            if clean ~= "" then return clean end
        end
    end

    -- Fallback: iterasi GetPlayerIdentifiers
    local ok, identifiers = pcall(GetPlayerIdentifiers, numSrc)
    if ok and type(identifiers) == "table" then
        for _, id in ipairs(identifiers) do
            if type(id) == "string" and string.sub(id, 1, 8) == "discord:" then
                return string.sub(id, 9)
            end
        end
    end

    -- Fallback terakhir dari cache
    local cached = ActivePlayers[numSrc]
    if cached and cached.discordId then
        return cached.discordId
    end

    return nil
end

local function extractFrameworkPlayer(src)
    local numSrc = tonumber(src)
    if not numSrc then return nil end

    if FrameworkName == "qbox" then
        local ok, player = pcall(function() return exports.qbx_core:GetPlayer(numSrc) end)
        if ok and player and player.PlayerData then
            local pData = player.PlayerData
            local charinfo = pData.charinfo or {}
            local job = pData.job or {}
            local fullName = (charinfo.firstname and charinfo.lastname)
                and (tostring(charinfo.firstname) .. " " .. tostring(charinfo.lastname))
                or GetPlayerName(numSrc)
            return {
                charLoaded = true,
                name = fullName or ("Player #" .. numSrc),
                citizenid = pData.citizenid,
                job = {
                    name = job.name or "unemployed",
                    label = job.label or "Civilian",
                    onduty = job.onduty == true,
                    grade = {
                        name = (job.grade and job.grade.name) or "Staff",
                        level = tonumber(job.grade and job.grade.level) or 0,
                    },
                },
            }
        end
        return { charLoaded = false }
    end

    if FrameworkName == "qbcore" and QBCore then
        local ok, player = pcall(function() return QBCore.Functions.GetPlayer(numSrc) end)
        if ok and player and player.PlayerData then
            local pData = player.PlayerData
            local charinfo = pData.charinfo or {}
            local job = pData.job or {}
            local fullName = (charinfo.firstname and charinfo.lastname)
                and (tostring(charinfo.firstname) .. " " .. tostring(charinfo.lastname))
                or GetPlayerName(numSrc)
            return {
                charLoaded = true,
                name = fullName or ("Player #" .. numSrc),
                citizenid = pData.citizenid,
                job = {
                    name = job.name or "unemployed",
                    label = job.label or "Civilian",
                    onduty = job.onduty == true,
                    grade = {
                        name = (job.grade and job.grade.name) or "Staff",
                        level = tonumber(job.grade and job.grade.level) or 0,
                    },
                },
            }
        end
        return { charLoaded = false }
    end

    if FrameworkName == "esx" and ESX then
        local ok, xPlayer = pcall(function() return ESX.GetPlayerFromId(numSrc) end)
        if ok and xPlayer then
            local job = xPlayer.getJob and xPlayer.getJob() or xPlayer.job or {}
            local pName = (xPlayer.getName and xPlayer.getName()) or GetPlayerName(numSrc)
            local rawJobName = job.name or "unemployed"
            -- Konvensi ESX off-duty: "offpolice", "offambulance", dst.
            local isOffJob = string.sub(rawJobName, 1, 3) == "off"
            return {
                charLoaded = true,
                name = pName or ("Player #" .. numSrc),
                citizenid = xPlayer.identifier,
                job = {
                    name = rawJobName,
                    label = job.label or rawJobName,
                    onduty = not isOffJob,
                    grade = {
                        name = job.grade_label or job.grade_name or "Staff",
                        level = tonumber(job.grade) or 0,
                    },
                },
            }
        end
        return { charLoaded = false }
    end

    -- Standalone mode
    return {
        charLoaded = true,
        name = GetPlayerName(numSrc) or ("Player #" .. numSrc),
        citizenid = nil,
        job = nil,
    }
end

local function refreshPlayerCache(src)
    local numSrc = tonumber(src)
    if not numSrc then return nil end

    local discordId = getDiscordId(numSrc)
    if not discordId then return nil end

    local fwInfo = extractFrameworkPlayer(numSrc)
    local existing = ActivePlayers[numSrc] or {}

    local entry = {
        discordId  = discordId,
        serverId   = numSrc,
        name       = (fwInfo and fwInfo.name) or existing.name or GetPlayerName(numSrc) or ("Player #" .. numSrc),
        citizenid  = (fwInfo and fwInfo.citizenid) or existing.citizenid,
        job        = (fwInfo and fwInfo.job) or existing.job,
        charLoaded = fwInfo and fwInfo.charLoaded == true or false,
    }

    ActivePlayers[numSrc] = entry
    return entry
end

local function notifyPlayer(src, message, msgType)
    local numSrc = tonumber(src)
    if not numSrc or numSrc == 0 then return end

    if FrameworkName == "qbcore" or FrameworkName == "qbox" then
        TriggerClientEvent("QBCore:Notify", numSrc, message, msgType or "primary")
    elseif FrameworkName == "esx" then
        TriggerClientEvent("esx:showNotification", numSrc, message)
    else
        TriggerClientEvent("chat:addMessage", numSrc, {
            color = msgType == "error" and { 229, 9, 20 } or { 16, 185, 129 },
            multiline = true,
            args = { "[Ophelia Absensi]", message },
        })
    end
end

-- ============================================================
-- HTTP Transport with Retry
-- ============================================================

local function postJson(path, rawJsonPayload, attempt, callback)
    attempt = attempt or 1
    local url = Config.OpheliaURL .. path

    PerformHttpRequest(url, function(statusCode, responseText, _headers)
        if statusCode == 200 then
            isConnected = true
            failCount = 0
            if callback then
                callback(true, statusCode, responseText)
            end
            return
        end

        if statusCode == 401 then
            isConnected = false
            errLog("HTTP 401 Unauthorized pada " .. path .. " — Cek Config.Secret di config.lua (harus sama dengan FIVEM_API_SECRET di .env web)!")
            if callback then
                callback(false, statusCode, responseText)
            end
            return
        end

        if statusCode == 400 then
            errLog("HTTP 400 Bad Request pada " .. path .. ": " .. tostring(responseText))
            if callback then
                callback(false, statusCode, responseText)
            end
            return
        end

        failCount = failCount + 1
        if attempt < Config.MaxRetries then
            warnLog(("Request %s gagal (HTTP %s) — retry %d/%d dalam %ds..."):format(
                path, tostring(statusCode), attempt, Config.MaxRetries, math.floor(Config.RetryDelay / 1000)
            ))
            SetTimeout(Config.RetryDelay, function()
                postJson(path, rawJsonPayload, attempt + 1, callback)
            end)
        else
            isConnected = false
            errLog(("Request %s gagal setelah %d percobaan (HTTP %s). Cek koneksi server ke %s"):format(
                path, Config.MaxRetries, tostring(statusCode), Config.OpheliaURL
            ))
            if callback then
                callback(false, statusCode, responseText)
            end
        end
    end, "POST", rawJsonPayload, {
        ["Content-Type"] = "application/json",
        ["X-API-Secret"] = Config.Secret,
    })
end

local function sendDutyWebhook(payload, callback)
    payload.secret = Config.Secret
    payload.timestamp = os.time()
    local encoded = json.encode(payload)
    debugLog(("Mengirim webhook %s untuk discord:%s"):format(tostring(payload.event), tostring(payload.discordId or "ALL")))
    postJson("/api/fivem/duty-webhook", encoded, 1, callback)
end

-- ============================================================
-- Core Sync: Kirim Semua Pemain Online (termasuk 0 pemain!)
-- ============================================================

local function buildOnlinePlayerList()
    local players = {}
    local activeIds = {}
    local skippedNoDiscord = 0
    local skippedNotLoaded = 0

    for _, rawSrc in ipairs(GetPlayers()) do
        local numSrc = tonumber(rawSrc)
        if numSrc then
            activeIds[numSrc] = true
            local entry = refreshPlayerCache(numSrc)
            if not entry or not entry.discordId then
                skippedNoDiscord = skippedNoDiscord + 1
            elseif FrameworkName ~= "standalone" and Config.RequireLoadedCharacter and not entry.charLoaded then
                skippedNotLoaded = skippedNotLoaded + 1
            else
                local payloadItem = {
                    discordId = entry.discordId,
                    serverId  = numSrc,
                    name      = entry.name,
                }
                if entry.citizenid then payloadItem.citizenid = entry.citizenid end
                if entry.job then payloadItem.job = entry.job end
                table.insert(players, payloadItem)
            end
        end
    end

    -- Bersihkan cache player yang sudah tidak ada di GetPlayers()
    for cachedSrc, _ in pairs(ActivePlayers) do
        if not activeIds[cachedSrc] then
            ActivePlayers[cachedSrc] = nil
        end
    end

    if skippedNoDiscord > 0 then
        debugLog(skippedNoDiscord .. " player tidak memiliki identifier Discord (skip)")
    end
    if skippedNotLoaded > 0 then
        debugLog(skippedNotLoaded .. " player masih di menu karakter / belum spawn (tidak dihitung di kota)")
    end

    return players
end

local function syncAllPlayers(reasonTag)
    local players = buildOnlinePlayerList()

    -- PENTING: Di Lua, json.encode({}) menjadi "{}" bukan "[]"
    -- Maka saat #players == 0 kita format JSON array [] secara eksplisit!
    local rawPayload
    if #players == 0 then
        rawPayload = ('{"secret":%s,"players":[]}'):format(json.encode(Config.Secret))
    else
        rawPayload = json.encode({
            secret  = Config.Secret,
            players = players,
        })
    end

    debugLog(("Sync %d player online (%s)..."):format(#players, tostring(reasonTag or "interval")))

    postJson("/api/fivem/players", rawPayload, 1, function(ok, _status, responseText)
        if not ok then return end

        syncCount = syncCount + 1
        lastSyncTime = os.time()

        local decoded = nil
        if responseText and responseText ~= "" then
            local parseOk, data = pcall(json.decode, responseText)
            if parseOk then decoded = data end
        end

        local wentOffline = (decoded and decoded.wentOffline) or 0
        local autoClosed = (decoded and decoded.autoClosed) or 0

        if autoClosed > 0 then
            autoClosedTotal = autoClosedTotal + autoClosed
            log(("Auto-Stop Absensi: %d sesi otomatis dihentikan karena keluar kota/server!"):format(autoClosed))
        end

        if Config.Debug then
            debugLog(("[OK] Synced %d player | %d offline | %d auto-stopped | total sync #%d"):format(
                #players, wentOffline, autoClosed, syncCount
            ))
        elseif syncCount == 1 or syncCount % 20 == 0 then
            log(("Synced %d player online (sync #%d)"):format(#players, syncCount))
        end
    end)
end

local function healthCheck()
    local url = Config.OpheliaURL .. "/api/fivem/health"
    PerformHttpRequest(url, function(statusCode, responseText)
        if statusCode == 200 then
            isConnected = true
            log("Koneksi ke Web Absensi BERHASIL! (" .. Config.OpheliaURL .. ")")
            debugLog("Health response: " .. tostring(responseText))
        else
            isConnected = false
            errLog(("Health check gagal (HTTP %s) ke %s"):format(tostring(statusCode), url))
            if not statusCode or statusCode == 0 then
                errLog("Pastikan URL benar dan server FiveM dapat mengakses domain web (outbound HTTPS/HTTP).")
            end
        end
    end, "GET", "", { ["Accept"] = "application/json" })
end

-- ============================================================
-- Instant Auto-Stop Dispatcher (Disconnect & Keluar Kota)
-- ============================================================

local function triggerInstantAutoStop(src, eventType, reasonText)
    local numSrc = tonumber(src)
    if not numSrc then return end

    local cached = ActivePlayers[numSrc]
    local discordId = (cached and cached.discordId) or getDiscordId(numSrc)
    local playerName = (cached and cached.name) or GetPlayerName(numSrc) or ("Player #" .. numSrc)
    local citizenid = cached and cached.citizenid or nil
    local jobName = (cached and cached.job and cached.job.name) or nil

    -- Hapus dari cache jika disconnect, atau tandai charLoaded = false jika unload multichar
    if eventType == "PLAYER_DROPPED" then
        ActivePlayers[numSrc] = nil
    elseif cached then
        cached.charLoaded = false
    end

    if not discordId then
        debugLog(("Skip %s untuk %s (#%d): tidak memiliki Discord ID."):format(eventType, playerName, numSrc))
        return
    end

    -- Deduplikasi jika OnPlayerUnload & playerDropped keduanya terpanggil bersamaan (< 3 detik)
    local now = os.time()
    if RecentDropSent[discordId] and (now - RecentDropSent[discordId]) < 3 then
        debugLog(("Deduplikasi %s untuk discord:%s (sudah dikirim baru saja)"):format(eventType, discordId))
        return
    end
    RecentDropSent[discordId] = now

    log(("Auto-Stop dipicu (%s) untuk %s [discord:%s] — Alasan: %s"):format(
        eventType, playerName, discordId, tostring(reasonText or "Keluar kota")
    ))

    sendDutyWebhook({
        event      = eventType,
        discordId  = discordId,
        citizenid  = citizenid,
        serverId   = numSrc,
        playerName = playerName,
        jobName    = jobName or "unknown",
        reason     = reasonText or "Keluar kota / keluar server FiveM",
    }, function(ok, _status, body)
        if ok and body then
            local parseOk, data = pcall(json.decode, body)
            if parseOk and data and data.action == "DUTY_ENDED_AUTO_OFFLINE" then
                autoClosedTotal = autoClosedTotal + 1
                log(("Sesi absensi %s berhasil di-AUTO STOP (durasi: %ss). Harus mulai ulang saat masuk kota."):format(
                    playerName, tostring(data.durationSeconds or 0)
                ))
            end
        end
    end)

    -- Jalankan sync daftar player 1.5 detik kemudian agar Status Kota langsung update
    SetTimeout(1500, function()
        syncAllPlayers(eventType)
    end)
end

-- ============================================================
-- Event Hooks — Connect, Disconnect, Character Unload, Duty
-- ============================================================

-- 1. Player masuk server -> simpan cache & sync
AddEventHandler("playerJoining", function()
    local src = source
    SetTimeout(2000, function()
        refreshPlayerCache(src)
        syncAllPlayers("playerJoining")
    end)
end)

-- 2. Player disconnect / keluar server -> INSTANT AUTO STOP ABSENSI!
AddEventHandler("playerDropped", function(reason)
    local src = source
    if not Config.AutoStopOnDisconnect then return end
    triggerInstantAutoStop(src, "PLAYER_DROPPED", reason or "Keluar dari server FiveM")
end)

-- 3. QBCore / QBox: Character loaded & unloaded (keluar kota / multicharacter)
AddEventHandler("QBCore:Server:PlayerLoaded", function(Player)
    local src = Player and Player.PlayerData and Player.PlayerData.source
    if not src then return end
    refreshPlayerCache(src)
    SetTimeout(1000, function()
        syncAllPlayers("QBCore:PlayerLoaded")
    end)
end)

AddEventHandler("QBCore:Server:OnPlayerUnload", function(src)
    if not Config.AutoStopOnCharUnload then return end
    triggerInstantAutoStop(src, "PLAYER_UNLOADED", "Keluar kota / kembali ke menu karakter")
end)

AddEventHandler("qbx_core:server:onPlayerUnload", function(src)
    if not Config.AutoStopOnCharUnload then return end
    triggerInstantAutoStop(src, "PLAYER_UNLOADED", "Keluar kota / kembali ke menu karakter")
end)

-- 4. ESX: Character loaded & logout / dropped
AddEventHandler("esx:playerLoaded", function(playerId)
    refreshPlayerCache(playerId)
    SetTimeout(1000, function()
        syncAllPlayers("esx:playerLoaded")
    end)
end)

AddEventHandler("esx:onPlayerLogout", function(playerId)
    if not Config.AutoStopOnCharUnload then return end
    triggerInstantAutoStop(playerId, "PLAYER_UNLOADED", "Keluar kota / logout karakter ESX")
end)

AddEventHandler("esx:playerDropped", function(playerId, reason)
    if not Config.AutoStopOnDisconnect then return end
    triggerInstantAutoStop(playerId, "PLAYER_DROPPED", reason or "Keluar dari server FiveM")
end)

-- 5. QBCore / QBox: Perubahan status Duty & Job di game
local function handleJobOrDutyChange(src, jobData)
    local numSrc = tonumber(src)
    if not numSrc then return end

    local entry = refreshPlayerCache(numSrc)
    if not entry or not entry.discordId then return end

    local job = jobData or entry.job
    if not job then return end

    local jobName = string.lower(tostring(job.name or ""))
    local isTracked = Config.TrackedJobs[jobName] ~= nil
    local isOnDuty = job.onduty == true

    -- Jika ganti ke job non-instansi atau off-duty -> auto stop absensi jika Config.AutoStopOnOffDuty aktif
    if Config.AutoStopOnOffDuty and (not isTracked or not isOnDuty) then
        sendDutyWebhook({
            event      = "DUTY_OFF",
            discordId  = entry.discordId,
            citizenid  = entry.citizenid,
            serverId   = numSrc,
            playerName = entry.name,
            jobName    = jobName,
            reason     = not isTracked
                and ("Auto Stop: Berganti pekerjaan ke " .. jobName)
                or "Auto Stop: Off-Duty di dalam server FiveM",
        })
        return
    end

    -- Hanya auto-start jika Config.AutoStartOnInGameDuty = true
    if Config.AutoStartOnInGameDuty and isTracked and isOnDuty then
        sendDutyWebhook({
            event      = "DUTY_ON",
            discordId  = entry.discordId,
            citizenid  = entry.citizenid,
            serverId   = numSrc,
            playerName = entry.name,
            jobName    = jobName,
            gradeName  = (job.grade and job.grade.name) or "Staff",
            gradeLevel = tonumber(job.grade and job.grade.level) or 0,
        })
    end
end

AddEventHandler("QBCore:Server:OnJobUpdate", function(src, newJob)
    handleJobOrDutyChange(src, newJob)
end)

AddEventHandler("QBCore:Server:SetDuty", function(src, onDuty)
    local entry = refreshPlayerCache(src)
    if not entry then return end
    local job = entry.job or {}
    job.onduty = onDuty == true
    handleJobOrDutyChange(src, job)
end)

AddEventHandler("esx:setJob", function(playerId, job)
    if not job then return end
    local rawName = string.lower(tostring(job.name or ""))
    local isOff = string.sub(rawName, 1, 3) == "off"
    handleJobOrDutyChange(playerId, {
        name = rawName,
        label = job.label or rawName,
        onduty = not isOff,
        grade = { name = job.grade_label or "Staff", level = tonumber(job.grade) or 0 },
    })
end)

-- 6. Server Shutdown / Restart via txAdmin -> Auto-Stop semua sesi aktif!
AddEventHandler("txAdmin:events:serverShuttingDown", function(eventData)
    if not Config.AutoStopAllOnShutdown then return end
    local msg = (eventData and eventData.message) or "Server FiveM restart / shutdown"
    log("Server sedang shutdown/restart — menghentikan semua sesi absensi aktif...")
    sendDutyWebhook({
        event  = "SERVER_SHUTDOWN",
        reason = "Auto Stop: " .. tostring(msg),
    })
end)

-- ============================================================
-- In-Game Player Command: /absensi start | /absensi stop
-- ============================================================

if Config.EnableInGameCommands then
    RegisterCommand("absensi", function(source, args)
        if source == 0 then
            log("Gunakan ophelia_status / ophelia_sync / ophelia_health di server console.")
            return
        end

        local action = string.lower(tostring(args[1] or ""))
        local entry = refreshPlayerCache(source)

        if not entry or not entry.discordId then
            notifyPlayer(source, "Akun Discord kamu belum tertaut di FiveM. Hubungkan Discord di Settings FiveM terlebih dahulu.", "error")
            return
        end

        if action == "start" or action == "on" or action == "mulai" then
            local jobName = entry.job and string.lower(tostring(entry.job.name or "")) or ""
            -- Di mode standalone, izinkan argumen kedua: /absensi start police
            if (jobName == "" or not Config.TrackedJobs[jobName]) and args[2] then
                jobName = string.lower(tostring(args[2]))
            end

            if not Config.TrackedJobs[jobName] then
                notifyPlayer(source, "Job kamu tidak terdaftar di sistem absensi. Gunakan portal web atau /absensi start <police|ambulance|mechanic|resto>", "error")
                return
            end

            sendDutyWebhook({
                event      = "DUTY_ON",
                discordId  = entry.discordId,
                citizenid  = entry.citizenid,
                serverId   = tonumber(source),
                playerName = entry.name,
                jobName    = jobName,
                gradeName  = (entry.job and entry.job.grade and entry.job.grade.name) or "Staff",
                gradeLevel = (entry.job and entry.job.grade and entry.job.grade.level) or 0,
            }, function(ok, _status, body)
                if not ok then
                    notifyPlayer(source, "Gagal menghubungi web absensi. Coba lagi.", "error")
                    return
                end
                local parseOk, data = pcall(json.decode, body or "{}")
                if parseOk and data and data.action == "ALREADY_ON_DUTY" then
                    notifyPlayer(source, "Absensi kamu sudah aktif (ON DUTY).", "primary")
                elseif parseOk and data and data.ok then
                    notifyPlayer(source, "Absensi ON DUTY berhasil dimulai! Akan otomatis stop jika kamu keluar kota/server.", "success")
                else
                    notifyPlayer(source, "Gagal memulai absensi: " .. tostring(data and data.error or "Unknown"), "error")
                end
            end)
        elseif action == "stop" or action == "off" or action == "selesai" then
            sendDutyWebhook({
                event      = "DUTY_OFF",
                discordId  = entry.discordId,
                citizenid  = entry.citizenid,
                serverId   = tonumber(source),
                playerName = entry.name,
                jobName    = entry.job and entry.job.name or "unknown",
                reason     = "Diakhiri manual melalui /absensi stop di FiveM",
            }, function(ok, _status, body)
                if not ok then
                    notifyPlayer(source, "Gagal menghubungi web absensi.", "error")
                    return
                end
                local parseOk, data = pcall(json.decode, body or "{}")
                if parseOk and data and data.action == "NO_ACTIVE_DUTY" then
                    notifyPlayer(source, "Kamu sedang tidak ON DUTY.", "primary")
                else
                    notifyPlayer(source, "Absensi OFF DUTY berhasil dihentikan.", "success")
                end
            end)
        else
            notifyPlayer(source, "Penggunaan: /absensi start | /absensi stop (atau mulai lewat web dashboard)", "primary")
        end
    end, false)
end

-- ============================================================
-- Server Console Admin Commands
-- ============================================================

RegisterCommand("ophelia_status", function(source)
    if source ~= 0 then return end
    local onlineWithDiscord = #buildOnlinePlayerList()
    log("===================================================")
    log("  OPHELIA BRIDGE v2.0.0 — STATUS")
    log("  Koneksi      : " .. (isConnected and "^2CONNECTED^7" or "^1DISCONNECTED^7"))
    log("  Dashboard    : " .. Config.OpheliaURL)
    log("  Framework    : " .. FrameworkName)
    log("  Total Sync   : " .. tostring(syncCount) .. " (gagal: " .. tostring(failCount) .. ")")
    log("  Auto-Stopped : " .. tostring(autoClosedTotal) .. " sesi")
    log("  Last Sync    : " .. (lastSyncTime > 0 and os.date("%H:%M:%S", lastSyncTime) or "belum pernah"))
    log("  Player Aktif : " .. tostring(onlineWithDiscord) .. " / " .. tostring(#GetPlayers()) .. " total")
    log("===================================================")
end, true)

RegisterCommand("ophelia_sync", function(source)
    if source ~= 0 then return end
    log("Memicu sinkronisasi manual sekarang...")
    syncAllPlayers("manual_console")
end, true)

RegisterCommand("opheliasync", function(source)
    if source == 0 or (QBCore and QBCore.Functions.HasPermission(source, "admin")) then
        log("Memicu sinkronisasi manual sekarang...")
        syncAllPlayers("manual_admin")
    else
        notifyPlayer(source, "Kamu tidak memiliki izin admin.", "error")
    end
end, false)

RegisterCommand("ophelia_health", function(source)
    if source ~= 0 then return end
    log("Menjalankan health check ke " .. Config.OpheliaURL .. "...")
    healthCheck()
end, true)

RegisterCommand("ophelia_debug", function(source)
    if source ~= 0 then return end
    Config.Debug = not Config.Debug
    log("Debug mode: " .. (Config.Debug and "ON" or "OFF"))
end, true)

RegisterCommand("ophelia_testdrop", function(source, args)
    if source ~= 0 then return end
    local targetId = tonumber(args[1])
    if not targetId then
        log("Penggunaan: ophelia_testdrop <serverId>")
        return
    end
    triggerInstantAutoStop(targetId, "PLAYER_DROPPED", "Simulasi keluar kota (ophelia_testdrop)")
end, true)

-- ============================================================
-- Startup & Main Heartbeat Sync Thread
-- ============================================================

CreateThread(function()
    Wait(2500)
    detectFramework()

    log("========================================================")
    log("  OPHELIA BRIDGE v2.0.0 — Attendance & Auto-Stop Engine ")
    log("========================================================")
    log("  Dashboard      : " .. Config.OpheliaURL)
    log("  Framework      : " .. FrameworkName)
    log("  Sync Interval  : " .. math.floor(Config.SyncInterval / 1000) .. " detik")
    log("  Auto-Stop Exit : " .. tostring(Config.AutoStopOnDisconnect))
    log("  Auto-Stop Char : " .. tostring(Config.AutoStopOnCharUnload))
    log("  Auto-Stop Duty : " .. tostring(Config.AutoStopOnOffDuty))
    log("  InGame Command : " .. tostring(Config.EnableInGameCommands))

    -- Cache semua player yang sudah online saat resource di-restart
    for _, rawSrc in ipairs(GetPlayers()) do
        refreshPlayerCache(tonumber(rawSrc))
    end

    healthCheck()
    Wait(2000)

    -- Sync pertama langsung dijalankan saat startup
    syncAllPlayers("startup")

    -- Loop heartbeat utama
    while true do
        Wait(Config.SyncInterval)
        local ok, err = pcall(syncAllPlayers, "periodic")
        if not ok then
            errLog("Error saat syncAllPlayers: " .. tostring(err))
        end
    end
end)
