"use client";

import { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Server,
  Key,
  MessageSquare,
  FileArchive,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Wrench,
} from "lucide-react";

interface FiveMHandoffCardProps {
  baseUrl: string;
  apiSecret?: string;
}

export function FiveMHandoffCard({
  baseUrl,
  apiSecret = "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e",
}: FiveMHandoffCardProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const secret = apiSecret;

  const messageTemplate = `Halo dev, ini resource FiveM untuk integrasi absensi & tracking player online ke Web Ophelia:

[DOWNLOAD RESOURCE ZIP]
${baseUrl}/fivem-resource/ophelia-bridge.zip

[STATUS KONFIGURASI]
Kredensial sudah dimasukkan langsung ke config.lua di dalam ZIP:
- Config.OpheliaURL = "${baseUrl}"
- Config.Secret = "${secret}"

Langkah instalasi:
1. Extract folder 'ophelia-bridge' ke folder 'resources/' FiveM
2. Tambahkan 'ensure ophelia-bridge' di server.cfg
3. Jalankan 'restart ophelia-bridge' di server console

Dokumentasi & API Reference: ${baseUrl}/api-docs/fivem
Terima kasih!`;

  const copyToClipboard = async (text: string, type: "key" | "url" | "template") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "key") {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else if (type === "url") {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else if (type === "template") {
        setCopiedTemplate(true);
        setTimeout(() => setCopiedTemplate(false), 2000);
      }
    } catch {
      // Fallback
      console.warn("Clipboard write failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Action Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#180a0a] via-[#121212] to-[#0c0c0c] border border-[#E50914]/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E50914]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E50914]/20 border border-[#E50914]/30 text-[#FF5A5F] text-xs font-semibold uppercase tracking-wider mb-2">
                <FileArchive className="h-3.5 w-3.5" />
                Handoff Kit Developer
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white">
                Kirim Paket Resource ke Developer FiveM
              </h2>
              <p className="text-xs md:text-sm text-neutral-400 mt-1 max-w-2xl">
                Kamu tidak perlu pegang server FiveM langsung. Cukup kirim file ZIP dan konfigurasi di bawah ini ke developer server kamu.
              </p>
            </div>

            <a
              href="/fivem-resource/ophelia-bridge.zip"
              download="ophelia-bridge.zip"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E50914] hover:bg-[#ff1e2d] text-white font-bold text-sm shadow-lg shadow-[#E50914]/25 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              <span>Download ophelia-bridge.zip</span>
              <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-mono font-normal">
                ~6 KB
              </span>
            </a>
          </div>

          {/* Quick info badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2.5 text-xs text-neutral-300 bg-white/5 rounded-xl p-3 border border-white/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>0 Client Scripts (No FPS drop)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-neutral-300 bg-white/5 rounded-xl p-3 border border-white/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Standalone (Tanpa ESX/QBCore)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-neutral-300 bg-white/5 rounded-xl p-3 border border-white/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Auto-sync Discord ID & Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column: Quick Credentials & Copyable Message Template */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Credentials to provide */}
        <div className="rounded-2xl bg-[#111] border border-[#222] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">2 Data yang Wajib Diberikan</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Developer FiveM membutuhkan dua informasi ini untuk dimasukkan ke file <code className="text-[#FF5A5F] bg-[#1a0a0a] px-1 py-0.5 rounded font-mono">config.lua</code>:
          </p>

          {/* Ophelia Base URL */}
          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Server className="h-3.5 w-3.5 text-blue-400" />
                1. URL Web Dashboard Ophelia
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(baseUrl, "url")}
                className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs text-white bg-black/50 p-2.5 rounded-lg border border-neutral-800 break-all select-all">
              {baseUrl}
            </div>
            <p className="text-[10px] text-neutral-500">
              Gunakan domain hosting kamu saat online, atau localhost saat tahap testing.
            </p>
          </div>

          {/* FIVEM_API_SECRET */}
          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Key className="h-3.5 w-3.5 text-amber-400" />
                2. API Secret Key (FIVEM_API_SECRET)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(secret, "key")}
                className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition"
              >
                {copiedKey ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs text-white bg-black/50 p-2.5 rounded-lg border border-neutral-800 break-all select-all">
              {secret}
            </div>
            <p className="text-[10px] text-neutral-500">
              Nilai ini harus sama dengan yang ada di file <code className="text-neutral-400">.env</code> web server kamu.
            </p>
          </div>
        </div>

        {/* Right: Ready-to-Send Chat Template */}
        <div className="rounded-2xl bg-[#111] border border-[#222] p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Template Chat ke Developer</h3>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(messageTemplate, "template")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2c2c2c] text-white text-xs font-semibold border border-[#333] transition"
              >
                {copiedTemplate ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Pesan Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-neutral-300" />
                    <span>Salin Seluruh Chat</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              Tinggal klik &quot;Salin Seluruh Chat&quot; di atas, lalu paste langsung ke Discord DM atau WhatsApp developer kamu.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 overflow-y-auto max-h-60 font-mono text-[11px] text-neutral-300 leading-relaxed whitespace-pre-wrap select-all">
            {messageTemplate}
          </div>

          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3 text-[#E50914]" />
            <span>Developer juga bisa membuka halaman ini langsung via browser mereka.</span>
          </div>
        </div>
      </div>

      {/* Step by step accordion/guide */}
      <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-[#FF5A5F]" />
          <span>Langkah Teknis Yang Dilakukan Developer di FiveM Server</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#E50914]/20 text-[#FF5A5F] flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div className="text-xs font-bold text-white">Extract Folder</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Extract file ZIP ke direktori <code className="text-neutral-300 font-mono text-[10px]">resources/ophelia-bridge/</code> di root FiveM server.
            </p>
          </div>

          <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#E50914]/20 text-[#FF5A5F] flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div className="text-xs font-bold text-white">Edit config.lua</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Buka <code className="text-neutral-300 font-mono text-[10px]">config.lua</code>, isi <code className="text-neutral-300 font-mono text-[10px]">Config.OpheliaURL</code> dan <code className="text-neutral-300 font-mono text-[10px]">Config.Secret</code> sesuai data di atas.
            </p>
          </div>

          <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#E50914]/20 text-[#FF5A5F] flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div className="text-xs font-bold text-white">Tambah ke server.cfg</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Tambahkan baris <code className="text-emerald-400 font-mono text-[10px]">ensure ophelia-bridge</code> ke dalam file <code className="text-neutral-300 font-mono text-[10px]">server.cfg</code>.
            </p>
          </div>

          <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#E50914]/20 text-[#FF5A5F] flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div className="text-xs font-bold text-white">Restart & Test</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Jalankan <code className="text-amber-400 font-mono text-[10px]">restart ophelia-bridge</code> di console. Cek status dengan command <code className="text-neutral-300 font-mono text-[10px]">ophelia_status</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
