import Link from "next/link";
import { CityStatusPanel } from "@/components/city-status-panel";
import { MapPin, Gamepad2, Wifi, Download, FileCode2 } from "lucide-react";

export default async function CityStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 uppercase tracking-wider mb-1">
            <Gamepad2 className="h-3.5 w-3.5" />
            <span>FiveM Integration</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#E50914]" />
            Status Kota
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Pantau siapa yang sedang online di kota — dan siapa yang sudah on duty.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/api-docs/fivem"
            className="flex items-center gap-1.5 text-xs text-neutral-200 hover:text-white bg-[#161616] hover:bg-[#222] border border-[#2b2b2b] rounded-xl px-3.5 py-2 transition shadow-sm"
          >
            <FileCode2 className="h-3.5 w-3.5 text-[#FF5A5F]" />
            <span>Handoff ke Developer FiveM</span>
          </Link>
          <a
            href="/fivem-resource/ophelia-bridge.zip"
            download="ophelia-bridge.zip"
            className="flex items-center gap-1.5 text-xs text-white bg-[#E50914] hover:bg-[#ff1e2d] rounded-xl px-3.5 py-2 transition font-medium shadow-md shadow-[#E50914]/20"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Resource</span>
          </a>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-neutral-400 bg-[#111] border border-[#222] rounded-xl px-3 py-2">
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            <span>FiveM Connected</span>
          </div>
        </div>
      </div>

      {/* City Status Panel */}
      <CityStatusPanel institutionSlug={slug} />
    </div>
  );
}
