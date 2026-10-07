# Ophelia FiveM API Bridge (RDP Server)

API Bridge ringan berbasis Node.js & Express untuk membaca data database MariaDB `opheliav2` (QBCore FiveM) secara **Read-Only** dan menyediakannya untuk sistem web absensi Ophelia.

---

## 🚀 Cara Setup di RDP Server (Windows)

### 1. Prasyarat
- **Node.js** v18+ atau v20+ terinstall di RDP server. (Download dari https://nodejs.org jika belum ada).
- Database MariaDB server berjalan di `127.0.0.1:3306`.

### 2. Copy Folder ke RDP
Copy folder `fivem-bridge` ini ke folder mana saja di RDP server kamu, misalnya:
`C:\ophelia-bridge`

### 3. Konfigurasi `.env`
Salin file `.env.example` menjadi `.env`:
```bash
copy .env.example .env
```
Edit file `.env` dengan Notepad:
```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password_mariadb_kamu_disini
MYSQL_DATABASE=opheliav2

API_SECRET=oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e
PORT=3001
```

> [!IMPORTANT]
> Pastikan nilai `API_SECRET` sama persis dengan `FIVEM_API_SECRET` di `.env` web Next.js kamu.

### 4. Install Dependencies & Jalankan
Buka Command Prompt (cmd) atau PowerShell di folder tersebut:
```bash
cd C:\ophelia-bridge
npm install
node server.js
```

Atau agar otomatis berjalan di background 24/7 menggunakan PM2:
```bash
npm install -g pm2
pm2 start server.js --name ophelia-bridge
pm2 save
pm2 startup
```

### 5. Buka Port Firewall (Port 3001)
Agar aplikasi Next.js (Vercel) bisa memanggil API bridge ini, buka port inbound `3001` di Windows Firewall RDP:
1. Buka **Windows Defender Firewall with Advanced Security**
2. Klik **Inbound Rules** > **New Rule...**
3. Pilih **Port** > Next
4. Pilih **TCP** > Specific local ports: `3001` > Next
5. Pilih **Allow the connection** > Next
6. Centang Domain, Private, Public > Next
7. Beri nama: `Ophelia API Bridge` > Finish

---

## 📡 Daftar Endpoint

Semua endpoint `/api/*` memerlukan header:
`X-API-Secret: <API_SECRET>`

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/health` | Cek status bridge & koneksi MariaDB (Publik) |
| `GET` | `/api/players` | Daftar anggota instansi aktif (support `?job=police&onduty=1`) |
| `GET` | `/api/players/by-job/:jobName` | Filter pemain berdasarkan job (`police`, `ambulance`, `mechanic`, `pedagang`) |
| `GET` | `/api/player/:citizenid` | Detail lengkap profil 1 pemain FiveM |
| `GET` | `/api/bank-accounts/society` | Saldo kas instansi (`society_police`, `society_ambulance`, dll) |
| `GET` | `/api/stats/overview` | Ringkasan cepat jumlah anggota & saldo kas |
| `GET` | `/api/badside/players` | Daftar anggota gang/sindikat (`?gang=hightable`, `whitetiger`, dll) |
| `GET` | `/api/billing` | Rekap invoice tilang/denda polisi & tagihan instansi (`rey_billing`) |
| `GET` | `/api/playtime` | Leaderboard jam terbang keaktifan di kota (`player_playtime`) |
| `GET` | `/api/vehicles` | Data kendaraan dinas & kendaraan pemain (`player_vehicles`) |
