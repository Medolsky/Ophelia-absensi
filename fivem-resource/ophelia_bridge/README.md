# Ophelia FiveM Bridge Resource (`ophelia_bridge`)

Resource Lua FiveM untuk menghubungkan server FiveM QBCore langsung dengan sistem web absensi Ophelia secara real-time.

---

## 🛠️ Cara Pasang di Server FiveM

1. **Copy Folder**:
   Copy folder `ophelia_bridge` ini ke folder resource server FiveM kamu, misalnya:
   `[resources]/[custom]/ophelia_bridge` atau `resources/ophelia_bridge`

2. **Edit `config.lua`**:
   Buka `config.lua` dan sesuaikan:
   - `Config.WebhookURL`: Pastikan mengarah ke domain web absensi (misal: `https://absensi-instansi.vercel.app/api/fivem`).
   - `Config.APISecret`: Pastikan sama persis dengan `FIVEM_API_SECRET` di web.

3. **Aktifkan di `server.cfg`**:
   Tambahkan baris berikut di file `server.cfg` kamu:
   ```cfg
   ensure ophelia_bridge
   ```

4. **Restart Resource / Server**:
   Jalankan perintah di server console FiveM:
   ```cfg
   refresh
   ensure ophelia_bridge
   ```
   Atau restart server FiveM.

---

## ⚡ Fitur Resource Ini
- **Auto Duty Sync**: Saat player On Duty / Off Duty di in-game (`QBCore:Server:OnJobUpdate`), webhook otomatis dikirim ke web untuk start/stop absensi.
- **Player Sync**: Setiap 30 detik mengirim daftar pemain online + Discord ID + job ke sistem status kota (`City Status`).
- **Disconnect Handling**: Bila anggota on-duty disconnect dari server FiveM, sistem otomatis mendeteksi status logout.
- **Admin Command**: `/opheliasync` di console atau in-game (admin) untuk sync paksa.
