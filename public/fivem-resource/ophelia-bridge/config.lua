--[[
  ╔════════════════════════════════════════════╗
  ║   OPHELIA BRIDGE — KONFIGURASI             ║
  ║   Edit nilai di bawah sesuai setup kamu    ║
  ╚════════════════════════════════════════════╝
]]

Config = {}

-- ============================================================
-- 1. URL Dashboard Ophelia
-- ============================================================
-- URL web dashboard Ophelia (tanpa trailing slash)
-- Contoh production: "https://ophelia-absensi.vercel.app"
-- Contoh lokal:      "http://localhost:3000"
Config.OpheliaURL = "https://ophelia-absensi.vercel.app"

-- ============================================================
-- 2. API Secret Key
-- ============================================================
-- Harus SAMA PERSIS dengan nilai FIVEM_API_SECRET di file .env
-- pada web server Ophelia. Sudah otomatis diset siap pakai.
Config.Secret = "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"

-- ============================================================
-- 3. Interval Sync (milidetik)
-- ============================================================
-- Seberapa sering mengirim data player ke Ophelia.
-- Default: 30000 (30 detik). Jangan terlalu kecil (<10000)
-- agar tidak membebani server.
Config.SyncInterval = 30000

-- ============================================================
-- 4. Debug Mode
-- ============================================================
-- true  = Tampilkan log detail di console (untuk testing)
-- false = Hanya tampilkan error (untuk production)
Config.Debug = true

-- ============================================================
-- 5. Retry Settings
-- ============================================================
-- Jika sync gagal, coba ulang berapa kali sebelum skip
Config.MaxRetries = 3
-- Jeda antar retry (milidetik)
Config.RetryDelay = 5000
