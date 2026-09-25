import { getCurrentUser, verifyInstitutionAccess } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { DEFAULT_INSTITUTIONS } from "@/lib/constants";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default async function InstitutionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  // PRD Section 6 & 29: Server-side validation of Discord Role
  const access = await verifyInstitutionAccess(currentUser, slug);
  const currentInstitution = await DataService.getInstitutionBySlug(slug);

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

          <div className="mt-6 pt-4 border-t border-[#222]">
            <Link
              href="/select-institution"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E50914] hover:bg-[#FF1E2D] transition shadow-md glow-red-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Pilihan Instansi</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active duty session across all institutions
  const activeSession = await DataService.getActiveDutySession(currentUser.id);

  // List of allowed institutions for navbar switcher
  const allowedInstitutions = (
    await Promise.all(
      DEFAULT_INSTITUTIONS.map(async (inst) => {
        const canAccess = await verifyInstitutionAccess(currentUser, inst.slug);
        return canAccess.allowed ? inst : null;
      })
    )
  ).filter(Boolean) as typeof DEFAULT_INSTITUTIONS;

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col selection:bg-[#E50914] selection:text-white">
      <Navbar
        currentUser={currentUser}
        currentInstitution={currentInstitution}
        activeSession={activeSession}
        allowedInstitutions={allowedInstitutions}
      />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        <Sidebar
          institutionSlug={slug}
          permissionLevel={access.permissionLevel}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
