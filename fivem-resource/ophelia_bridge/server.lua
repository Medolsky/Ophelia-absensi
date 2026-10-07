local QBCore = nil

-- Safely obtain QBCore object
CreateThread(function()
    while QBCore == nil do
        TriggerEvent('QBCore:GetObject', function(obj) QBCore = obj end)
        if QBCore == nil then
            local success, core = pcall(function()
                return exports['qb-core']:GetCoreObject()
            end)
            if success and core then
                QBCore = core
            end
        end
        Wait(500)
    end
    print('^2[Ophelia Bridge]^7 Successfully initialized with QBCore!')
end)

-- Helper: Extract Discord ID from player identifiers
local function GetPlayerDiscordId(src)
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if string.sub(id, 1, string.len("discord:")) == "discord:" then
            return string.sub(id, 9) -- Remove "discord:" prefix
        end
    end
    return nil
end

-- Helper: Safe HTTP Request
local function SendWebhook(endpoint, payload, callback)
    local url = Config.WebhookURL .. endpoint
    local jsonPayload = json.encode(payload)

    PerformHttpRequest(url, function(statusCode, responseText, headers)
        if Config.Debug then
            print(('[Ophelia Bridge] HTTP %s => Status: %s | Resp: %s'):format(endpoint, statusCode, tostring(responseText)))
        end
        if callback then
            callback(statusCode, responseText)
        end
    end, 'POST', jsonPayload, {
        ['Content-Type'] = 'application/json',
        ['X-API-Secret'] = Config.APISecret
    })
end

-- Sync All Online Players to Next.js
local function SyncAllPlayers()
    if not QBCore then return end

    local players = {}
    local onlineQBPlayers = QBCore.Functions.GetQBPlayers()

    for src, Player in pairs(onlineQBPlayers) do
        local discordId = GetPlayerDiscordId(src)
        if discordId and Player and Player.PlayerData then
            local pData = Player.PlayerData
            local jobData = pData.job or {}
            local charinfo = pData.charinfo or {}

            table.insert(players, {
                discordId = discordId,
                serverId = tonumber(src),
                name = (charinfo.firstname and charinfo.lastname) and (charinfo.firstname .. ' ' .. charinfo.lastname) or GetPlayerName(src),
                citizenid = pData.citizenid,
                job = {
                    name = jobData.name,
                    label = jobData.label,
                    onduty = jobData.onduty or false,
                    grade = {
                        name = jobData.grade and jobData.grade.name or "Staff",
                        level = jobData.grade and jobData.grade.level or 0
                    }
                }
            })
        end
    end

    if #players > 0 or Config.Debug then
        SendWebhook('/players', {
            secret = Config.APISecret,
            players = players
        }, function(status, response)
            if status ~= 200 and Config.Debug then
                print('^1[Ophelia Bridge] Player sync failed with status: ' .. tostring(status) .. '^7')
            end
        end)
    end
end

-- Hook: On Job or Duty Status Update
RegisterNetEvent('QBCore:Server:OnJobUpdate', function(src, newJob)
    if not src or not newJob then return end
    local Player = QBCore and QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local discordId = GetPlayerDiscordId(src)
    if not discordId then return end

    local pData = Player.PlayerData
    local charinfo = pData.charinfo or {}
    local charName = (charinfo.firstname and charinfo.lastname) and (charinfo.firstname .. ' ' .. charinfo.lastname) or GetPlayerName(src)

    local isTracked = Config.TrackedJobs[newJob.name] ~= nil
    if not isTracked then return end

    local eventType = newJob.onduty and "DUTY_ON" or "DUTY_OFF"

    SendWebhook('/duty-webhook', {
        secret = Config.APISecret,
        event = eventType,
        discordId = discordId,
        citizenid = pData.citizenid,
        serverId = tonumber(src),
        playerName = charName,
        jobName = newJob.name,
        gradeName = newJob.grade and newJob.grade.name or "Staff",
        gradeLevel = newJob.grade and newJob.grade.level or 0,
        onduty = newJob.onduty or false,
        timestamp = os.time()
    }, function(status)
        if Config.Debug then
            print(('[Ophelia Bridge] Duty webhook sent for %s (%s): %s'):format(charName, newJob.name, eventType))
        end
    end)
end)

-- Hook: When a player drops / disconnects (Instant Auto Off-Duty)
AddEventHandler('playerDropped', function(reason)
    local src = source
    local discordId = GetPlayerDiscordId(src)
    if not discordId then return end

    local citizenid = nil
    local jobName = nil
    if QBCore then
        local Player = QBCore.Functions.GetPlayer(src)
        if Player and Player.PlayerData then
            citizenid = Player.PlayerData.citizenid
            if Player.PlayerData.job then
                jobName = Player.PlayerData.job.name
            end
        end
    end

    SendWebhook('/duty-webhook', {
        secret = Config.APISecret,
        event = "PLAYER_DROPPED",
        discordId = discordId,
        citizenid = citizenid,
        serverId = tonumber(src),
        jobName = jobName or "unknown",
        timestamp = os.time(),
        reason = reason or "playerDropped"
    }, function(status, body)
        if Config.Debug then
            print(('[Ophelia Bridge] PLAYER_DROPPED webhook sent for discord:%s (Status: %s)'):format(discordId, tostring(status)))
        end
    end)
end)

-- Main Loop: Periodic Player Sync
CreateThread(function()
    while true do
        Wait(Config.SyncInterval * 1000)
        pcall(SyncAllPlayers)
    end
end)

-- Command to manually trigger sync (Admin only)
RegisterCommand('opheliasync', function(source, args)
    if source == 0 or (QBCore and QBCore.Functions.HasPermission(source, 'admin')) then
        print('^3[Ophelia Bridge] Manually triggering player sync...^7')
        SyncAllPlayers()
    else
        TriggerClientEvent('QBCore:Notify', source, 'Kamu tidak memiliki izin.', 'error')
    end
end, false)
