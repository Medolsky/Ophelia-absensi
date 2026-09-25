import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { MemberManagementTable } from "@/components/member-management-table";
import { Users, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const access = await verifyInstitutionAccess(currentUser, slug);
  const institution = await DataService.getInstitutionBySlug(slug);
  if (!institution) return null;

  const isLeader = access.permissionLevel === "LEADER" || access.permissionLevel === "SUPER_ADMIN";
  if (!isLeader) {
    return (
      <div className="rounded-2xl bg-[#111111] border border-red-900/30 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Akses Terbatas: Hanya Petinggi / Leader</h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
          Manajemen data anggota hanya dapat dilakukan oleh Leader atau Petinggi instansi.
        </p>
        <Link
          href={`/institution/${slug}/duty`}
          className="inline-block mt-4 text-xs font-bold text-[#FF1E2D] hover:underline"
        >
          ← Kembali ke Dashboard Dinas
        </Link>
      </div>
    );
  }

  const memberships = await DataService.getMemberships(slug);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202020] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <Users className="h-4 w-4 text-[#FF1E2D]" />
          <span>Direktori Keanggotaan</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          Daftar Anggota — {institution.name}
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Kelola status dinas anggota, penetapan pangkat/jabatan, dan penonaktifan tanpa menghapus riwayat histori.
        </p>
      </div>

      <MemberManagementTable
        initialMemberships={memberships}
        institutionSlug={slug}
      />
    </div>
  );
}
