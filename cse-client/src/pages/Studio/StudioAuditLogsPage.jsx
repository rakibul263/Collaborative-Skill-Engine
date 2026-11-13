import React, { useState, useEffect } from "react";
import { History, ShieldCheck, UserCheck, RefreshCw, Clock, Activity, AlertTriangle, Key } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

const StudioAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/studio/audit-logs");
      setLogs(res.data || []);
    } catch (err) {
      console.error("Fetch audit logs error:", err);
      toast.error("Could not fetch audit log history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeColor = (action = "") => {
    const act = action.toLowerCase();
    if (act.includes("ban") || act.includes("delete")) return "bg-red-500/20 text-red-300 border-red-500/30";
    if (act.includes("suspend")) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (act.includes("create") || act.includes("claim")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">Security & Activity Audit Trail</h1>
          </div>
          <p className="text-xs text-slate-400">
            Immutable system audit logs detailing instructor actions, learner access governance, and course modifications.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Logs
        </button>
      </div>

      {/* ── LOGS LIST ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Recorded Events ({logs.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">Real-time DB Events</span>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log._id}
              className="p-4 sm:p-5 bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getActionBadgeColor(log.action)}`}>
                      {log.action?.replace("_", " ")}
                    </span>
                    <span className="text-xs font-bold text-white">{log.details || log.action}</span>
                  </div>

                  {log.targetStudent && (
                    <p className="text-[11px] text-slate-400">
                      Target User / Student: <span className="text-slate-300 font-mono">{log.targetStudent}</span>
                    </p>
                  )}
                </div>
              </div>

              <span className="text-[11px] text-slate-500 font-mono shrink-0 self-end sm:self-auto">
                {new Date(log.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {logs.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-500 text-xs space-y-2">
              <History className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No activity audit logs recorded yet.</p>
              <p className="text-[11px] text-slate-600">Events will appear here automatically when actions occur.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default StudioAuditLogsPage;