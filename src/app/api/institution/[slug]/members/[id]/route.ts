import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    const access = await verifyInstitutionAccess(currentUser, slug);
    const isLeader =
      access.permissionLevel === "LEADER" || access.permissionLevel === "SUPER_ADMIN";

    if (!isLeader) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Hanya Petinggi yang dapat mengubah data anggota." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { positionName, status } = body;

    const updates: any = {};
    if (positionName !== undefined) {
      updates.positionName = positionName;
      const isChief = /chief|director|petinggi|pimpinan|manager|head/i.test(positionName);
      updates.permissionLevel = isChief ? "LEADER" : "MEMBER";
    }
    if (status !== undefined) {
      updates.status = status;
    }

    const updated = await DataService.updateMembership(id, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Anggota tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("Update member API error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui data anggota." },
      { status: 500 }
    );
  }
}
