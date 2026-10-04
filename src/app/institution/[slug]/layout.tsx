import { getCurrentUser, verifyInstitutionAccess, getAllowedInstitutions } from "@/lib/auth";
import { DataService, normalizeInstSlug } from "@/lib/data-service";
import { DEFAULT_INSTITUTIONS } from "@/lib/constants";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { SyncDiscordRolesButton } from "@/components/sync-discord-roles-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InstitutionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeInstSlug(rawSlug);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  // Parallelize all checks concurrently with zero sequential blocking
  const [access, currentInstitution, activeSession, allowedInstitutions] = await Promise.all([
    verifyInstitutionAccess(currentUser, slug),
    DataService.getInstitutionBySlug(slug),
    DataService.getActiveDutySession(currentUser.id),
    getAllowedInstitutions(currentUser),
  ]);

  if (!access.allowed || !currentInstitution) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-[#111111] border border-red-900/40 p-8 text-center shadow-2xl">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-[#FF1E2D] mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">403: Akses Instansi Ditolak</h2>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            {access.reason || "Akun Discord Anda tidak memiliki role yang diizinkan untuk mengakses instansi ini."}
          </p>

          <div className="mt-6 pt-4 border-t border-[#222] flex flex-col sm:flex-row items-center justify-center gap-3">
            <SyncDiscordRolesButton discordId={currentUser.discordId} variant="full" />
            <Link
              href="/select-institution"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] transition shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col selection:bg-[#E50914] selection:text-white">
      <Navbar
        currentUser={currentUser}
        currentInstitution={currentInstitution}
        activeSession={activeSession}
        allowedInstitutions={allowedInstitutions}
      />

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto min-w-0">
        <Sidebar
          institutionSlug={slug}
          permissionLevel={access.permissionLevel}
        />
        <main className="flex-1 min-w-0 w-full p-3.5 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
