# Ophelia Bridge v2.0.0 — Resource Server FiveM (Siap Pakai)

Resource ini **sudah dikonfigurasi otomatis** ke web `https://ophelia-absensi.vercel.app` beserta API Secret-nya. **Tidak perlu edit file apapun lagi** — tinggal upload ke server FiveM dan jalankan!

## Fitur Otomatis
- **Auto-Stop saat Keluar Server (`playerDropped`)**: Jika anggota disconnect/crash/keluar server, absensi langsung berhenti (`AUTO_CLOSED`) dan harus dimulai lagi (`START DUTY`) saat masuk kembali.
- **Auto-Stop saat Keluar Kota (Multicharacter Logout)**: Logout ke menu karakter (QBCore / QBox / ESX) langsung menghentikan absensi.
- **Pengaman Ganda Heartbeat (15 detik)**: Mengirim daftar player online setiap 15 detik (termasuk saat 0 player online) untuk memastikan tidak ada sesi gantung.
- **Auto-Stop Massal saat Server Restart**: Terhubung dengan `txAdmin:events:serverShuttingDown`.
- **Auto-Detect Framework**: Otomatis mendukung **QBox**, **QBCore**, **ESX**, maupun **Standalone**.
- **0 Client Script**: Tidak membebani FPS player.

---

## Cara Pasang (3 Langkah — Tanpa Edit)

1. **Upload folder `ophelia-bridge`** ini ke dalam folder `resources/` server FiveM kamu:
   ```
   resources/
   └── ophelia-bridge/
       ├── fxmanifest.lua
       ├── config.lua
       ├── server.lua
       └── README.md
   ```
2. **Tambahkan 1 baris di `server.cfg`** (letakkan di bawah framework jika memakai QBCore/QBox/ESX):
   ```cfg
   ensure ophelia-bridge
   ```
3. **Jalankan di console server FiveM**:
   ```cfg
   refresh
   ensure ophelia-bridge
   ophelia_status
   ```

---

## Command Console Server (Admin)
- `ophelia_status` — Cek status koneksi, framework terdeteksi, jumlah sync & sesi auto-stop
- `ophelia_sync` — Paksa sync player sekarang
- `ophelia_health` — Cek koneksi ke `https://ophelia-absensi.vercel.app/api/fivem/health`
- `ophelia_debug` — Nyalakan/matikan log debug detail
- `ophelia_testdrop <serverId>` — Simulasi auto-stop untuk player Server ID tertentu

## Command In-Game (Player)
- `/absensi start` — Mulai absensi dari dalam game
- `/absensi stop` — Akhiri absensi manual dari dalam game
