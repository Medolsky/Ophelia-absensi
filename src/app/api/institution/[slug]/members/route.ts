import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { MembershipData } from "@/types";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";
import { getDiscordCredentials } from "@/lib/discord-credentials";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const members = await DataService.getMemberships(slug);
    return NextResponse.json({ success: true, members });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal memuat data anggota." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
        { success: false, error: "Akses ditolak: Hanya Petinggi yang dapat menambah anggota." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { discordId, positionName, status } = body;

    if (!discordId || !positionName) {
      return NextResponse.json(
        { success: false, error: "Discord User ID dan Jabatan wajib diisi." },
        { status: 400 }
      );
    }

    const institution = await DataService.getInstitutionBySlug(slug);
    if (!institution) {
      return NextResponse.json(
        { success: false, error: "Instansi tidak ditemukan." },
        { status: 404 }
      );
    }

    const isChief = /chief|director|petinggi|pimpinan|manager|head/i.test(positionName);

    let displayName = `Anggota (${discordId.slice(-4)})`;
    let discordUsername = `user_${discordId.slice(-4)}`;
    let discordAvatar = getDiscordAvatarUrl(discordId, null);

    const { botToken, guildId } = getDiscordCredentials();
    if (botToken) {
      try {
        if (guildId) {
          const gmRes = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
          );
          if (gmRes.ok) {
            const gm = await gmRes.json();
            displayName =
              gm.nick ||
              gm.user?.global_name ||
              gm.user?.username ||
              displayName;
            discordUsername = gm.user?.username || discordUsername;
            if (gm.avatar) {
              discordAvatar = `https://cdn.discordapp.com/guilds/${guildId}/users/${discordId}/avatars/${gm.avatar}.png`;
            } else if (gm.user?.avatar) {
              discordAvatar = `https://cdn.discordapp.com/avatars/${discordId}/${gm.user.avatar}.png`;
            }
          }
        }

        if (!discordAvatar || discordAvatar.includes("/embed/avatars/")) {
          const uRes = await fetch(
            `https://discord.com/api/v10/users/${discordId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
          );
          if (uRes.ok) {
            const u = await uRes.json();
            discordUsername = u.username || discordUsername;
            displayName = u.global_name || u.username || displayName;
            if (u.avatar) {
              discordAvatar = `https://cdn.discordapp.com/avatars/${discordId}/${u.avatar}.png`;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch Discord user info:", err);
      }
    }

    const newMember: MembershipData = {
      id: `mem-${slug}-${discordId}`,
      userId: `discord-${discordId}`,
      institutionId: institution.id,
      positionName,
      permissionLevel: isChief ? "LEADER" : "MEMBER",
      status: status || "ACTIVE",
      joinedAt: new Date().toISOString(),
      user: {
        id: `discord-${discordId}`,
        discordId,
        discordUsername,
        displayName,
        discordAvatar,
      },
    };

    const saved = await DataService.addMembership(newMember);

    return NextResponse.json({ success: true, member: saved });
  } catch (error) {
    console.error("Add member API error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan anggota baru." },
      { status: 500 }
    );
  }
}
