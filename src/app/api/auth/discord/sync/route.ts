import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
import { DataService } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.discordId || user.discordId.startsWith("demo-")) {
      return NextResponse.json(
        { success: false, message: "User tidak sedang login dengan akun Discord." },
        { status: 401 }
      );
    }

    const freshUser = await DataService.syncDiscordUser(user.discordId, true);
    if (!freshUser) {
      return NextResponse.json(
        { success: false, message: "Gagal mengambil data member dari server Discord." },
        { status: 502 }
      );
    }

    // Update session cookie with the latest live Discord roles and info
    await setCurrentUser(freshUser);

    return NextResponse.json({
      success: true,
      user: freshUser,
      roles: freshUser.discordRoles,
      isSuperAdmin: freshUser.isSuperAdmin,
      displayName: freshUser.displayName,
    });
  } catch (error: any) {
    console.error("API /api/auth/discord/sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
