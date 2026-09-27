import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Key,
  Check,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { FiveMHandoffCard } from "@/components/fivem-download-card";

export const metadata: Metadata = {
  title: "Ophelia FiveM API Documentation",
  description: "API documentation and developer kit for FiveM integration with Ophelia Duty System",
};

export default function FiveMDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ophelia-absensi.vercel.app";
  const apiSecret = process.env.FIVEM_API_SECRET || "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e";

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#E50914] selection:text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Navigation & Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition bg-[#141414] hover:bg-[#202020] border border-[#222] px-3.5 py-2 rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Dashboard</span>
            </Link>
            <span className="text-[11px] font-mono text-neutral-500 bg-[#111] border border-[#222] px-3 py-1.5 rounded-lg">
              v1.0.0 • Ophelia Bridge
            </span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-[#E50914] flex items-center justify-center text-lg font-black text-white shadow-lg shadow-[#E50914]/20">
              O
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Ophelia × FiveM Integration Kit & API
              </h1>
              <p className="text-xs text-neutral-400">
                Resource FiveM, panduan setup untuk developer, dan dokumentasi API lengkap
              </p>
            </div>
          </div>

          {/* Developer Handoff Card */}
          <FiveMHandoffCard baseUrl={baseUrl} apiSecret={apiSecret} />
        </div>

        {/* Auth */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">
              <Key className="h-3.5 w-3.5" />
            </span>
            Authentication
          </h2>
          <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
            <p className="text-sm text-neutral-300 mb-3">
              Semua request POST harus menyertakan field{" "}
              <code className="text-[#E50914] bg-[#1a0a0a] px-1.5 py-0.5 rounded text-xs">
                secret
              </code>{" "}
              di body JSON. Nilainya harus sama persis dengan{" "}
              <code className="text-[#E50914] bg-[#1a0a0a] px-1.5 py-0.5 rounded text-xs">
                FIVEM_API_SECRET
              </code>{" "}
              yang di-set di server Ophelia.
            </p>
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 mt-3">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
                Contoh
              </div>
              <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
{`{
  "secret": "${apiSecret}",
  "players": [...]
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Endpoint 1: POST /api/fivem/players */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold border border-emerald-500/30">
              POST
            </span>
            <code className="text-sm text-white font-mono">
              /api/fivem/players
            </code>
          </div>

          <div className="rounded-2xl bg-[#111] border border-[#222] p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Deskripsi
              </h3>
              <p className="text-sm text-neutral-300">
                Kirim daftar player yang sedang online di FiveM server. Endpoint
                ini dipanggil otomatis oleh resource{" "}
                <code className="text-[#E50914] bg-[#1a0a0a] px-1 py-0.5 rounded text-xs">
                  ophelia-bridge
                </code>{" "}
                setiap 30 detik. Player yang tidak ada di list akan ditandai offline.
              </p>
            </div>

            {/* Request Body */}
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Request Body
              </h3>
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
{`{
  "secret": "string (wajib)",
  "players": [
    {
      "discordId": "string — Discord ID player (wajib)",
      "serverId": "number — Server ID player di FiveM (wajib)",
      "name": "string — Nama in-game player (wajib)"
    }
  ]
}`}
                </pre>
              </div>
            </div>

            {/* Field Table */}
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Fields
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#222]">
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Field
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Type
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Wajib
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-300">
                    <tr className="border-b border-[#1a1a1a]">
                      <td className="py-2 px-3 font-mono text-[#E50914]">
                        secret
                      </td>
                      <td className="py-2 px-3">string</td>
                      <td className="py-2 px-3">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </td>
                      <td className="py-2 px-3">API secret key</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]">
                      <td className="py-2 px-3 font-mono text-[#E50914]">
                        players
                      </td>
                      <td className="py-2 px-3">array</td>
                      <td className="py-2 px-3">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </td>
                      <td className="py-2 px-3">
                        Array player online (bisa kosong [])
                      </td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]">
                      <td className="py-2 px-3 font-mono text-blue-400 pl-6">
                        ↳ discordId
                      </td>
                      <td className="py-2 px-3">string</td>
                      <td className="py-2 px-3">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </td>
                      <td className="py-2 px-3">
                        Discord user ID (dari identifier &quot;discord:xxx&quot;)
                      </td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]">
                      <td className="py-2 px-3 font-mono text-blue-400 pl-6">
                        ↳ serverId
                      </td>
                      <td className="py-2 px-3">number</td>
                      <td className="py-2 px-3">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </td>
                      <td className="py-2 px-3">FiveM server-side player ID</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]">
                      <td className="py-2 px-3 font-mono text-blue-400 pl-6">
                        ↳ name
                      </td>
                      <td className="py-2 px-3">string</td>
                      <td className="py-2 px-3">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </td>
                      <td className="py-2 px-3">
                        Nama in-game (GetPlayerName)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Responses */}
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Responses
              </h3>
              <div className="space-y-3">
                <div className="bg-[#0a0a0a] border border-emerald-900/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                      200
                    </span>
                    <span className="text-xs text-neutral-400">OK</span>
                  </div>
                  <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
{`{
  "ok": true,
  "synced": 5,
  "wentOffline": 1,
  "timestamp": "2026-09-27T02:00:00.000Z"
}`}
                  </pre>
                </div>

                <div className="bg-[#0a0a0a] border border-red-900/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-mono font-bold">
                      401
                    </span>
                    <span className="text-xs text-neutral-400">
                      Unauthorized — Secret salah
                    </span>
                  </div>
                  <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
{`{ "ok": false, "error": "Unauthorized: invalid FIVEM_API_SECRET" }`}
                  </pre>
                </div>

                <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                      400
                    </span>
                    <span className="text-xs text-neutral-400">
                      Bad Request — Format salah
                    </span>
                  </div>
                  <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
{`{ "ok": false, "error": "Invalid payload: 'players' must be an array" }`}
                  </pre>
                </div>
              </div>
            </div>

            {/* cURL Example */}
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Contoh cURL
              </h3>
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap break-all">
{`curl -X POST ${baseUrl}/api/fivem/players \\
  -H "Content-Type: application/json" \\
  -d '{
    "secret": "${apiSecret}",
    "players": [
      {
        "discordId": "123456789012345678",
        "serverId": 1,
        "name": "John_Doe"
      }
    ]
  }'`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Endpoint 2: GET /api/fivem/players */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[11px] font-mono font-bold border border-blue-500/30">
              GET
            </span>
            <code className="text-sm text-white font-mono">
              /api/fivem/players
            </code>
          </div>

          <div className="rounded-2xl bg-[#111] border border-[#222] p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Deskripsi
              </h3>
              <p className="text-sm text-neutral-300">
                Ambil daftar player yang sedang online. Bisa dipakai sebagai
                health check dari FiveM resource.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Response (200)
              </h3>
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
{`{
  "ok": true,
  "players": [
    {
      "discordId": "123456789012345678",
      "serverId": 1,
      "playerName": "John_Doe",
      "isOnline": true,
      "joinedAt": "2026-09-27T01:00:00.000Z",
      "lastSeenAt": "2026-09-27T02:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2026-09-27T02:00:00.000Z"
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Endpoint 3: GET /api/fivem/health */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[11px] font-mono font-bold border border-blue-500/30">
              GET
            </span>
            <code className="text-sm text-white font-mono">
              /api/fivem/health
            </code>
          </div>

          <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Deskripsi
            </h3>
            <p className="text-sm text-neutral-300 mb-4">
              Simple ping / health check. Selalu return 200 jika server Ophelia
              berjalan.
            </p>
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
              <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
{`{
  "ok": true,
  "service": "ophelia-fivem-bridge",
  "version": "1.0.0",
  "timestamp": "2026-09-27T02:00:00.000Z"
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Endpoint 4: GET /api/integrations/status */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[11px] font-mono font-bold border border-blue-500/30">
              GET
            </span>
            <code className="text-sm text-white font-mono">
              /api/integrations/status
            </code>
          </div>

          <div className="rounded-2xl bg-[#111] border border-[#222] p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Deskripsi
              </h3>
              <p className="text-sm text-neutral-300">
                Combined status API — gabungan data anggota, on duty, di kota,
                dan off duty.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Query Parameters
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#222]">
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Param
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Values
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Default
                      </th>
                      <th className="text-left py-2 px-3 text-neutral-400 font-medium">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-300">
                    <tr className="border-b border-[#1a1a1a]">
                      <td className="py-2 px-3 font-mono text-[#E50914]">
                        view
                      </td>
                      <td className="py-2 px-3 font-mono">
                        overview, members, onduty, incity, offduty
                      </td>
                      <td className="py-2 px-3">overview</td>
                      <td className="py-2 px-3">Jenis data yang mau diambil</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]">
                      <td className="py-2 px-3 font-mono text-[#E50914]">
                        institution
                      </td>
                      <td className="py-2 px-3 font-mono">
                        all, police, medical, mechanic, restaurant
                      </td>
                      <td className="py-2 px-3">all</td>
                      <td className="py-2 px-3">Filter berdasarkan instansi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Contoh Request
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-neutral-300">
                  GET /api/integrations/status?view=overview
                </div>
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-neutral-300">
                  GET /api/integrations/status?view=incity&institution=police
                </div>
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-neutral-300">
                  GET /api/integrations/status?view=offduty
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-neutral-400" />
            <span>Catatan Penting</span>
          </h2>
          <div className="rounded-2xl bg-[#111] border border-[#222] p-6 space-y-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300">
                Player yang <strong>tidak mengirim Discord ID</strong> (belum
                link Discord ke FiveM) akan di-skip dan tidak muncul di
                dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300">
                Jika FiveM server mengirim array kosong{" "}
                <code className="text-[#E50914] bg-[#1a0a0a] px-1 py-0.5 rounded text-xs">
                  {`{"players": []}`}
                </code>
                , semua player yang sebelumnya online akan ditandai offline.
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300">
                Data yang dikirim hanya: Discord ID, Server ID, dan nama
                in-game. <strong>Tidak ada data sensitif</strong> yang
                ditransmisikan.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#222] pt-6 text-center">
          <p className="text-xs text-neutral-500">
            Ophelia Duty System × FiveM Integration • v1.0.0
          </p>
        </footer>
      </div>
    </div>
  );
}
