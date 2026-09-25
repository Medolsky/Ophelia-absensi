import { DataService } from "@/lib/data-service";
import { ShieldAlert, History, User, Clock, FileText } from "lucide-react";

export default async function AdminAuditLogPage() {
  const auditLogs = await DataService.getAuditLogs();

  // Seed sample audit log entries if empty for immediate rich demonstration
  const displayLogs =
    auditLogs.length > 0
      ? auditLogs
      : [
          {
            id: "audit-001",
            actorId: "user-gordon",
            actorName: "Chief James Gordon",
            action: "CORRECT_ATTENDANCE",
            targetType: "DUTY_SESSION",
            targetId: "ds-100",
            oldData: JSON.stringify({ oldStart: "09:00", oldEnd: "18:00" }),
            newData: JSON.stringify({
              newStart: "09:00",
              newEnd: "16:00",
              reason: "Petugas lupa clock out saat server restart.",
            }),
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: "audit-002",
            actorId: "user-gordon",
            actorName: "Chief James Gordon",
            action: "UPDATE_MEMBER",
            targetType: "MEMBER",
            targetId: "mem-mike-pd",
            oldData: JSON.stringify({ position: "Officer" }),
            newData: JSON.stringify({ position: "Sergeant", reason: "Promosi kenaikan pangkat reguler" }),
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "audit-003",
            actorId: "user-john",
            actorName: "Officer John Doe",
            action: "START_DUTY",
            targetType: "DUTY_SESSION",
            targetId: "ds-102",
            oldData: null,
            newData: JSON.stringify({ institution: "Police Department", startedAt: "14:00" }),
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
        ];

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
          Pencatatan menyeluruh terhadap setiap aksi sensitif (koreksi absensi, perubahan data anggota, role mapping) untuk mencegah manipulasi data.
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
              {displayLogs.map((log) => (
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
                    <User className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{log.actorName}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        log.action.includes("CORRECT")
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
                    {log.targetType} <span className="text-neutral-500">({log.targetId})</span>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-400 max-w-md font-mono text-[11px]">
                    <div className="bg-[#090909] p-2 rounded-lg border border-[#1f1f1f] text-neutral-300">
                      {log.newData}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
