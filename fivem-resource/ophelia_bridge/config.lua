Config = {}

-- URL ke endpoint Next.js (bisa Vercel production atau domain publik kamu)
Config.WebhookURL = "https://ophelia-absensi.vercel.app/api/fivem"

-- Secret key yang sama dengan FIVEM_API_SECRET di .env Next.js
Config.APISecret = "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"

-- Interval pengiriman data pemain online ke Next.js (dalam detik)
Config.SyncInterval = 30

-- Debug log di console server
Config.Debug = false

-- Job instansi yang dilacak (disesuaikan dengan kesepakatan: pedagang = resto, skip realestate & badside)
Config.TrackedJobs = {
    ['police'] = 'police',
    ['ambulance'] = 'medical',
    ['mechanic'] = 'mechanic',
    ['pedagang'] = 'restaurant',
    ['resto'] = 'restaurant'
}
