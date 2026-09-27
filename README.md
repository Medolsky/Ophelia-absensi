# OPHELIA ROLEPLAY — INSTITUTION ATTENDANCE SYSTEM (OPHELIA Duty System)

Aplikasi Web modern pencatatan absensi, jam dinas (*duty tracking*), dan pengawasan keaktifan anggota instansi (Police / LSPD, EMS / Medical, Mechanic / LSC, Restaurant, dll.) terintegrasi dengan verifikasi role Discord server whitelist.

---

## Fitur Utama

### 1. Dual-Mode Authentication & Discord Verification
- **Discord OAuth2 Asli**: Login langsung menggunakan akun Discord pemain dan membaca roles guild Discord server secara otomatis.
- **Server-Side Role Authority**: Frontend tidak dapat memanipulasi akses. Setiap perpindahan instansi divalidasi ulang di backend (`/institution/[slug]` memblokir akses 403 jika user tidak memiliki role Discord instansi tersebut).
- **Built-in Role Switcher (Dev Mode)**: Pengujian instan tanpa bot Discord. Dapat berpindah persona antara:
  - **Officer John Doe** (Member Police)
  - **Chief James Gordon** (Leader Police & Member Mechanic)
  - **Dr. Sarah Connor** (Leader Medical / EMS)
  - **Alex Rivera** (Member Mechanic)
  - **Marcus Vance** (Super Admin / Server Owner)

### 2. Duty System & Realtime Stopwatch
- **Server-Side Timestamp**: Durasi dihitung berdasarkan jam server/database saat `START DUTY` dan `END DUTY`, bukan jam browser lokal (mencegah manipulasi waktu).
- **Anti-Abuse Protection**:
  - Maksimal 1 sesi duty simultan per akun (tidak bisa duty ganda lintas instansi).
  - Proteksi double-click request.
  - Sesi tetap aman dan berjalan di server jika internet terputus, browser ditutup, atau logout.
- **Multiple Sessions Per Day**: Mendukung ON/OFF dinas berulang kali dalam satu hari dengan pencatatan terpisah (Sesi #1, #2, #3, dst.).

### 3. Rekapitulasi & Statistik Presensi
- **Absensi Harian**: Tabel histori kehadiran per sesi dengan filter tanggal dan status.
- **Statistik Mingguan**: Grafik visual distribusi jam dinas dari Senin hingga Minggu.
- **Statistik Bulanan**: Total jam kerja, hari aktif, rata-rata jam per hari, dan sesi dinas terpanjang.
- **Monthly Duty Calendar**: Kalender bulanan interaktif dengan badge indikator jam dinas per tanggal.
- **Histori Arsip**: Arsip data bulan-bulan sebelumnya tetap tersimpan permanen.

### 4. Portal Petinggi / Leader (Chief, Director, Manager)
- **Live Radar On Duty**: Monitoring realtime anggota yang sedang aktif dinas di lapangan lengkap dengan counter durasi dinas realtime.
- **Koreksi Absensi**: Fasilitas edit jam mulai dan selesai bagi anggota yang lupa clock-out, dengan **kewajiban mencantumkan alasan** yang tercatat otomatis ke Audit Log.
- **Manajemen Anggota**: Pengaturan status keanggotaan (`ACTIVE`, `INACTIVE`, `SUSPENDED`) dengan prinsip *soft status* (tanpa *hard delete*).
- **Laporan & Ekspor**: Pembuatan rekapitulasi presensi berdasarkan rentang tanggal kustom dan ekspor ke **CSV / Excel**.

### 5. Super Admin Console
- **Discord Role Mapping**: Pengaturan mapping role Discord ke instansi dan level hak akses (`MEMBER`, `LEADER`, `SUPER_ADMIN`) tanpa mengubah source code.
- **Manajemen Instansi**: Pembuatan dan konfigurasi instansi baru (Nama, Slug, Warna Aksen, Logo).
- **Audit Log Terpusat**: Log transparansi terhadap setiap perubahan data sensitif (*Who, Did What, To Whom, When, Old Value, New Value*).

---

## Tech Stack

- **Framework**: Next.js 16 (App Router & Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Luxury Black `#080808` & Red `#E50914` Gaming Theme)
- **Icons**: Lucide React
- **Database & ORM**: PostgreSQL via Prisma ORM 6
- **Architecture**: Hybrid Data Provider (PostgreSQL Cloud/Local + Safe Resilient Dev Seed Store)

---

## Panduan Menjalankan

### 1. Persiapan Kredensial Database
Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Masukkan PostgreSQL Connection String Anda (Supabase / Neon / Local PostgreSQL):
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require"
```

### 2. Push Schema Database (Prisma)
Ketika connection string telah siap, jalankan:
```bash
npx prisma db push
```

### 3. Konfigurasi Discord OAuth2 (Opsional jika ingin Bot Asli)
Daftarkan aplikasi di [Discord Developer Portal](https://discord.com/developers/applications):
- Redirect URI: `http://localhost:3000/api/auth/discord/callback`
- Masukkan `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, dan `DISCORD_GUILD_ID` ke `.env`.

### 4. Jalankan Development Server
```bash
npm run dev
```
Buka browser di: [http://localhost:3000](http://localhost:3000)
# Ophelia-absensi
