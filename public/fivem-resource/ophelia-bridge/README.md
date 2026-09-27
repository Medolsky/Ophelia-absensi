# Ophelia Bridge — FiveM Resource

Resource untuk menghubungkan FiveM server dengan Ophelia Duty System web dashboard.

## Apa yang dilakukan resource ini?

- Kirim daftar player online ke web dashboard setiap 30 detik
- Sync instant saat player connect / disconnect
- Dashboard bisa melihat: siapa di kota, siapa on duty, siapa belum on duty
- **Tanpa framework dependency** (tidak butuh ESX / QBCore / apapun)
- **Tanpa client script** — 0 impact ke player

---

## Instalasi

### 1. Copy folder ke resources

```
resources/
└── ophelia-bridge/
    ├── fxmanifest.lua
    ├── config.lua      ← EDIT FILE INI
    ├── server.lua
    └── README.md
```

### 2. Edit `config.lua`

Buka `config.lua`, ubah 2 nilai ini:

```lua
-- URL dashboard Ophelia (minta ke admin web)
Config.OpheliaURL = "https://ophelia-absensi.vercel.app"

-- Secret key (sudah terisi otomatis, sinkron dengan .env)
Config.Secret = "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"
```

### 3. Tambah ke `server.cfg`

```cfg
ensure ophelia-bridge
```

### 4. Restart server

```
restart ophelia-bridge
```

---

## Verifikasi

Setelah resource running, cek server console:

```
[Ophelia] ╔════════════════════════════════════════════════════════╗
[Ophelia] ║        OPHELIA BRIDGE v1.0.0 — Starting               ║
[Ophelia] ╚════════════════════════════════════════════════════════╝
[Ophelia]   Dashboard : https://ophelia-absensi.vercel.app
[Ophelia]   Interval  : 30 detik
[Ophelia] [OK] Koneksi ke Ophelia berhasil!
[Ophelia] [INFO] Sync loop started
```

Jika terdapat kendala:

| Pesan | Status | Solusi |
|---|---|---|
| `[OK] Synced X players` | Sukses | Normal operation |
| `[ERROR] AUTH ERROR — Secret key salah!` | Autentikasi Gagal | Pastikan Config.Secret sama dengan FIVEM_API_SECRET di .env |
| `[WARN] Sync gagal — HTTP 0` | Jaringan Error | Cek koneksi internet server FiveM ke domain web |
| `[WARN] SECRET BELUM DI-SET!` | Konfigurasi Belum Diisi | Masukkan API secret key di config.lua |

---

## Server Console Commands

Ketik di **server console** (bukan in-game):

| Command | Fungsi |
|---|---|
| `ophelia_status` | Cek status koneksi, total sync, last sync time |
| `ophelia_sync` | Force sync sekarang (tanpa tunggu interval) |
| `ophelia_health` | Test koneksi ke Ophelia dashboard |
| `ophelia_debug` | Toggle debug mode on/off |

---

## Config Lengkap

| Setting | Default | Keterangan |
|---|---|---|
| `Config.OpheliaURL` | `""` | URL web dashboard (wajib) |
| `Config.Secret` | `""` | API secret key (wajib, minta ke admin web) |
| `Config.SyncInterval` | `30000` | Interval sync dalam ms (min 10000) |
| `Config.Debug` | `true` | Tampilkan log detail (false untuk production) |
| `Config.MaxRetries` | `3` | Jumlah retry jika sync gagal |
| `Config.RetryDelay` | `5000` | Jeda antar retry (ms) |

---

## Syarat

- Player harus **link Discord ke FiveM** (Settings -> Linked Accounts -> Discord)
- Server harus bisa **akses internet** (HTTP outbound ke domain Ophelia)
- **Tidak butuh** ESX, QBCore, atau framework apapun

## Resource Impact

- Network: 1 HTTP request per 30 detik (sangat ringan)
- Client: 0 client scripts (tidak ada download untuk player)
- Security: Server-side only (tidak bisa di-exploit)
- Storage: Stateless (tidak menyimpan database lokal di server)

---

## API Reference

Resource ini mengirim data ke 1 endpoint:

```
POST {OpheliaURL}/api/fivem/players
```

**Request Body:**
```json
{
  "players": [
    {
      "discordId": "123456789012345678",
      "serverId": 1,
      "name": "John_Doe"
    },
    {
      "discordId": "987654321098765432",
      "serverId": 2,
      "name": "Jane_Smith"
    }
  ],
  "secret": "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "synced": 2,
  "wentOffline": 0,
  "timestamp": "2026-09-27T02:00:00.000Z"
}
```

**Error Responses:**

| Status | Body | Artinya |
|---|---|---|
| `401` | `{ "error": "Unauthorized" }` | Secret key salah |
| `400` | `{ "error": "Invalid payload" }` | Format data salah |
| `500` | `{ "error": "Internal server error" }` | Error di server Ophelia |

---

## FAQ

**Q: Player tidak muncul di dashboard?**
A: Pastikan player sudah link Discord ke FiveM (Cfx.re account → Linked Accounts → Discord)

**Q: Bisa dipakai bareng ESX/QBCore?**
A: Ya. Resource ini standalone, tidak bentrok dengan framework apapun.

**Q: Berapa besar bandwidth yang dipakai?**
A: Sekitar 1-2 KB per request. Dengan 50 player dan sync tiap 30 detik, itu sekitar 3 KB/menit.

**Q: Apakah aman?**
A: Ya. Hanya mengirim: Discord ID, Server ID, dan nama in-game. Tidak ada data sensitif.

---

## Kontak

Ada masalah? Hubungi admin web Ophelia.
