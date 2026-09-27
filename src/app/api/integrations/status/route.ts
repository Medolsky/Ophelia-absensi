import { NextRequest } from "next/server";
import { DataService } from "@/lib/data-service";
import { FiveMBridge } from "@/lib/fivem-bridge";

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
          return Response.json({ view, data: allMembers });
        }
        const members = await DataService.getMemberships(institution);
        return Response.json({ view, institution, data: members });
      }

      case "onduty": {
        const sessions = await DataService.getLiveOnDuty(
          institution === "all" ? undefined : institution
        );
        return Response.json({ view, institution, data: sessions });
      }

      case "incity": {
        const cityStatus = await FiveMBridge.getCityStatus(
          institution === "all" ? undefined : institution
        );
        return Response.json({ view, institution, data: cityStatus });
      }

      case "offduty": {
        const cityStatus = await FiveMBridge.getCityStatus(
          institution === "all" ? undefined : institution
        );
        const offDuty = cityStatus.filter(
          (e) => !e.isOnDuty && e.memberInstitutions.length > 0
        );
        return Response.json({ view, institution, data: offDuty });
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
        return Response.json({
          view: "overview",
          totalOnlinePlayers: allCityStatus.length,
          institutions: overview,
        });
      }
    }
  } catch (err) {
    console.error("Integration status error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
