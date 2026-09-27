import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Sesi autentikasi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    const access = await verifyInstitutionAccess(currentUser, slug);
    const isLeader =
      access.permissionLevel === "LEADER" || access.permissionLevel === "SUPER_ADMIN";

    if (!isLeader) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Hanya Petinggi atau Admin yang dapat menyinkronkan data anggota." },
        { status: 403 }
      );
    }

    const result = await DataService.syncDiscordMembers(slug);

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan data anggota dari server Discord.`,
      count: result.count,
      members: result.members,
    });
  } catch (error) {
    console.error("API sync-discord error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal saat menyinkronkan data Discord." },
      { status: 500 }
    );
  }
}
