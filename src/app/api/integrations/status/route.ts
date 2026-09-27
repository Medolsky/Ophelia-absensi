import { NextRequest } from "next/server";
import { DataService } from "@/lib/data-service";
import { FiveMBridge } from "@/lib/fivem-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/integrations/status
 *
 * Combined status API — returns members, on-duty, in-city, off-duty data.
 * Query params:
 *   - institution: slug filter (optional, defaults to "all")
 *   - view: "members" | "onduty" | "incity" | "offduty" | "overview" (defaults to "overview")
 */
export async function GET(request: NextRequest) {
  try {
    const institution = request.nextUrl.searchParams.get("institution") || "all";
    const view = request.nextUrl.searchParams.get("view") || "overview";

    // Auto-inject active duty from user's request cookie if present
    const dutyCookie =
      request.cookies.get(`ophelia_active_duty_${institution}`) ||
      request.cookies.get("ophelia_active_duty");
    if (dutyCookie?.value) {
      try {
        const parsed = JSON.parse(dutyCookie.value);
        if (parsed && !parsed.endedAt && parsed.status === "ON_DUTY") {
          DataService.injectActiveDutySession(parsed);
        }
      } catch {}
    }

    switch (view) {
      case "members": {
        if (institution === "all") {
          const slugs = ["police", "medical", "mechanic", "restaurant"];
          const allMembers = await Promise.all(
            slugs.map(async (s) => ({
              institution: s,
              members: await DataService.getMemberships(s),
            }))
          );
          return Response.json({ view, data: allMembers }, { headers: NO_CACHE_HEADERS });
        }
        const members = await DataService.getMemberships(institution);
        return Response.json({ view, institution, data: members }, { headers: NO_CACHE_HEADERS });
      }

      case "onduty": {
        const sessions = await DataService.getLiveOnDuty(
          institution === "all" ? undefined : institution
        );
        return Response.json({ view, institution, data: sessions }, { headers: NO_CACHE_HEADERS });
      }

      case "incity": {
        const cityStatus = await FiveMBridge.getCityStatus(
          institution === "all" ? undefined : institution
        );
        return Response.json({ view, institution, data: cityStatus }, { headers: NO_CACHE_HEADERS });
      }

      case "offduty": {
        const cityStatus = await FiveMBridge.getCityStatus(
          institution === "all" ? undefined : institution
        );
        const offDuty = cityStatus.filter(
          (e) => !e.isOnDuty && e.memberInstitutions.length > 0
        );
        return Response.json({ view, institution, data: offDuty }, { headers: NO_CACHE_HEADERS });
      }

      case "overview":
      default: {
        const slugs = ["police", "medical", "mechanic", "restaurant"];
        const overview = await Promise.all(
          slugs.map(async (slug) => {
            const inst = await DataService.getInstitutionBySlug(slug);
            const members = await DataService.getMemberships(slug);
            const onDuty = await DataService.getLiveOnDuty(slug);
            const cityStatus = await FiveMBridge.getCityStatus(slug);
            const inCity = cityStatus.filter((e) => e.isOnline);
            const offDuty = cityStatus.filter(
              (e) => !e.isOnDuty && e.memberInstitutions.includes(slug)
            );

            return {
              institution: slug,
              name: inst?.name || slug,
              icon: { police: "shield", medical: "cross", mechanic: "wrench", restaurant: "utensils" }[slug] || "building",
              stats: {
                totalMembers: members.length,
                onDuty: onDuty.length,
                inCity: inCity.length,
                offDuty: offDuty.length,
              },
            };
          })
        );

        const allCityStatus = await FiveMBridge.getCityStatus();
        return Response.json(
          {
            view: "overview",
            totalOnlinePlayers: allCityStatus.length,
            institutions: overview,
          },
          { headers: NO_CACHE_HEADERS }
        );
      }
    }
  } catch (err) {
    console.error("Integration status error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
