import { NextRequest } from "next/server";
import { FiveMDataService } from "@/lib/fivem-data-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "society-accounts";

    if (type === "society-accounts") {
      const slug = searchParams.get("slug");
      if (slug) {
        const account = await FiveMDataService.getInstitutionSocietyBalance(slug);
        return Response.json({ ok: true, account });
      }
      const accounts = await FiveMDataService.getSocietyBankAccounts();
      return Response.json({ ok: true, accounts });
    }

    if (type === "players") {
      const job = searchParams.get("job") || "police";
      const players = await FiveMDataService.getPlayersByJob(job);
      return Response.json({ ok: true, job, count: players.length, players });
    }

    if (type === "player") {
      const citizenid = searchParams.get("citizenid");
      if (!citizenid) {
        return Response.json(
          { ok: false, error: "Query parameter 'citizenid' is required" },
          { status: 400 }
        );
      }
      const player = await FiveMDataService.getPlayerDetail(citizenid);
      if (!player) {
        return Response.json({ ok: false, error: "Player not found" }, { status: 404 });
      }
      return Response.json({ ok: true, player });
    }

    if (type === "health") {
      const health = await FiveMDataService.checkBridgeHealth();
      return Response.json({ ok: true, health });
    }

    return Response.json(
      { ok: false, error: `Invalid type parameter: '${type}'` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[FiveM Game Data API Error]:", err);
    return Response.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
