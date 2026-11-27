--[[
  ============================================================
    OPHELIA BRIDGE v2.0.0 — SIAP PAKAI (PLUG & PLAY)
    URL Web & API Secret sudah terisi otomatis — tinggal
    upload ke folder resources/ server FiveM lalu ensure!
  ============================================================
]]

Config = {}

-- 1. URL Web Absensi Ophelia (SUDAH TERISI OTOMATIS)
Config.OpheliaURL = "https://ophelia-absensi.vercel.app"

-- 2. API Secret Key (SUDAH SINKRON DENGAN SERVER WEB)
Config.Secret = "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"

-- 3. Framework Mode
-- "auto" = Deteksi otomatis (QBox / QBCore / ESX / Standalone)
Config.Framework = "auto"

-- 4. Pengaturan Auto-Stop Absensi
-- Otomatis STOP absensi saat player disconnect / keluar server FiveM
Config.AutoStopOnDisconnect = true

-- Otomatis STOP absensi saat player keluar kota / kembali ke menu karakter
Config.AutoStopOnCharUnload = true

-- Di QBCore/QBox/ESX: anggap player "di kota" hanya jika karakter sudah spawn/loaded
Config.RequireLoadedCharacter = true

-- Otomatis STOP absensi jika player Off-Duty atau ganti ke job non-instansi di game
Config.AutoStopOnOffDuty = true

-- Default: false — saat keluar kota lalu masuk lagi, absensi TETAP STOP dan harus dimulai ulang!
Config.AutoStartOnInGameDuty = false

-- Otomatis STOP semua sesi aktif saat server FiveM restart / shutdown (via txAdmin)
Config.AutoStopAllOnShutdown = true

-- Aktifkan command in-game: /absensi start | /absensi stop
Config.EnableInGameCommands = true

-- 5. Interval Heartbeat Sync & Retry
-- Default: 15000 ms (15 detik) — ringan dan akurat
Config.SyncInterval = 15000
Config.MaxRetries = 3
Config.RetryDelay = 3000

-- Set false untuk console bersih di production (bisa toggle lewat command: ophelia_debug)
Config.Debug = false

-- 6. Mapping Job In-Game -> Slug Instansi Web
Config.TrackedJobs = {
    ['police']     = 'police',
    ['ambulance']  = 'medical',
    ['ems']        = 'medical',
    ['mechanic']   = 'mechanic',
    ['pedagang']   = 'restaurant',
    ['resto']      = 'restaurant',
    ['pemerintah'] = 'pemerintah',
}
