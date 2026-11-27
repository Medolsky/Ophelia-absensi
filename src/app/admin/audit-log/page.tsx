import { DataService } from "@/lib/data-service";
import { ShieldAlert, User } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAuditLogPage() {
  const auditLogs = await DataService.getAuditLogs();

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202020] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Pengawasan & Akuntabilitas Petinggi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          Audit Log Sistem
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Pencatatan menyeluruh terhadap setiap aktivitas absensi (start, end, auto-stop FiveM, koreksi absensi, perubahan anggota) untuk transparansi penuh.
        </p>
      </div>

      <div className="rounded-2xl bg-[#111111] border border-[#222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#252525] text-neutral-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Waktu (Timestamp)</th>
                <th className="py-3.5 px-4">Pelaku (Who)</th>
                <th className="py-3.5 px-4">Aktivitas (Action)</th>
                <th className="py-3.5 px-4">Target Entitas</th>
                <th className="py-3.5 px-4">Detail Perubahan & Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    Belum ada aktivitas audit log yang tercatat.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161616] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      <span>{log.actorName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          log.action.includes("AUTO_END")
                            ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
                            : log.action.includes("CORRECT")
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : log.action.includes("START")
                            ? "bg-[#E50914]/20 text-[#FF1E2D] border-[#E50914]/40"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      {log.targetType} <span className="text-neutral-500">({log.targetId || "-"})</span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 max-w-md font-mono text-[11px]">
                      <div className="bg-[#090909] p-2 rounded-lg border border-[#1f1f1f] text-neutral-300 break-all">
                        {log.newData || "-"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
