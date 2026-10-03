import { CityStatusPanel } from "@/components/city-status-panel";
import { MapPin } from "lucide-react";

export default async function CityStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#202020] pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#E50914] shrink-0" />
          <span>Status Kota</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Pantau status kehadiran dan petugas yang sedang aktif di dalam kota secara realtime.
        </p>
      </div>

      {/* City Status Panel */}
      <CityStatusPanel institutionSlug={slug} />
    </div>
  );
}
