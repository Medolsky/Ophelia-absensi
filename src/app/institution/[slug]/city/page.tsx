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
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#E50914]" />
            <span>Status Kota</span>
          </h1>
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
        </div>
      </div>

      {/* City Status Panel */}
      <CityStatusPanel institutionSlug={slug} />
    </div>
  );
}
