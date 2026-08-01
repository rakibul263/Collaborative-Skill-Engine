import React, { useState, useEffect } from "react";
import { History, ShieldCheck, UserCheck, RefreshCw, Clock } from "lucide-react";
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Creator Activity & Security Audit Logs</h1>
          <p className="text-xs text-slate-400">Timestamped record of instructor governance, student actions, and studio access events.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Logs
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log._id} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <History className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wider text-indigo-300">
                    {log.action?.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{log.details || log.action}</p>
                {log.targetStudent && (
                  <span className="text-[10px] text-slate-400 block mt-1">Target Student: {log.targetStudent}</span>
                )}
              </div>
            </div>
          ))}

          {logs.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-500 text-xs">
              No activity logs recorded yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default StudioAuditLogsPage;
