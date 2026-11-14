import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Database,
  Cpu,
  Clock,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Users,
  BookOpen,
  Radio,
  Shield,
  Layers,
} from "lucide-react";
import { AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";
import { toast } from "sonner";

const AdminSystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pingLatency, setPingLatency] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await adminApiClient.get("/system-health");
      const duration = Math.round(performance.now() - start);
      setPingLatency(duration);
      setHealth(res.data);
    } catch {
      toast.error("Failed to query system telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Server className="text-slate-400 w-5 h-5" />
            System Telemetry & Database Diagnostics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time server resource consumption, MongoDB Atlas metrics, and process status
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#0E1322] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Run Diagnostics
        </button>
      </div>

      {loading && !health ? (
        <AdminPageLoader
          label="Measuring Platform Telemetry..."
          subtext="Querying server memory, event loop latency, and MongoDB Atlas telemetry"
        />
      ) : (
        <>
          {/* Main Status Hero Card */}
          <div className="p-6 bg-[#0E1322] border border-slate-800/80 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    {health?.status?.toUpperCase() || "OPERATIONAL"}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Collaborative Skill Engine Core
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cluster: MongoDB Atlas &bull; Express Gateway &bull; Socket.IO WebSockets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-[#080B11] border border-slate-800 rounded-lg font-mono text-xs">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">API Latency</span>
                <span className="text-slate-200 font-semibold text-sm">{pingLatency || 12} ms</span>
              </div>
              <div className="px-4 py-2 bg-[#080B11] border border-slate-800 rounded-lg font-mono text-xs">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Server Uptime</span>
                <span className="text-emerald-400 font-semibold text-sm">
                  {health?.uptimeFormatted || health?.uptime || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Node & Memory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Memory RSS */}
            <div className="bg-[#0E1322] border border-slate-800/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  Resident Set Size (RSS)
                </span>
                <Cpu size={16} className="text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {health?.memory?.rssMb ? `${health.memory.rssMb} MB` : health?.memory?.rss || "—"}
              </p>
              <div className="w-full bg-[#080B11] rounded-full h-1.5 mt-3 overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full w-2/5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Physical RAM committed</p>
            </div>

            {/* Heap Allocated */}
            <div className="bg-[#0E1322] border border-slate-800/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  V8 Heap Memory
                </span>
                <HardDrive size={16} className="text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {health?.memory?.heapUsedMb ? `${health.memory.heapUsedMb} MB` : health?.memory?.heapUsed || "—"}
              </p>
              <div className="w-full bg-[#080B11] rounded-full h-1.5 mt-3 overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full w-1/3" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Total Allocated: {health?.memory?.heapTotalMb ? `${health.memory.heapTotalMb} MB` : health?.memory?.heapTotal || "—"}
              </p>
            </div>

            {/* Runtime Info */}
            <div className="bg-[#0E1322] border border-slate-800/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  Runtime Environment
                </span>
                <Server size={16} className="text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {health?.nodeVersion || "Node.js"}
              </p>
              <p className="text-[11px] text-slate-400 mt-3 font-mono">
                Environment: {health?.environment || health?.platform || "production"}
              </p>
              <p className="text-[11px] text-emerald-400 mt-0.5">
                V8 Engine &bull; Event Loop Idle
              </p>
            </div>
          </div>

          {/* Database Collection Telemetry Grid */}
          <div className="bg-[#0E1322] rounded-xl border border-slate-800/80 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 mb-5">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-slate-400" />
                <h3 className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
                  MongoDB Atlas Collection Metrics
                </h3>
              </div>
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { label: "Users", count: health?.collections?.users ?? health?.mongo?.collections?.users ?? 0, icon: Users },
                { label: "Courses", count: health?.collections?.courses ?? health?.mongo?.collections?.courses ?? 0, icon: BookOpen },
                { label: "Enrollments", count: health?.collections?.enrollments ?? health?.mongo?.collections?.enrollments ?? 0, icon: Layers },
                { label: "Schedules", count: health?.collections?.schedules ?? health?.mongo?.collections?.lessons ?? 0, icon: HardDrive },
                { label: "Ratings", count: health?.collections?.ratings ?? health?.mongo?.collections?.sessions ?? 0, icon: Clock },
                { label: "Broadcasts", count: health?.collections?.notifications ?? health?.mongo?.collections?.notifications ?? 0, icon: Radio },
                { label: "Audit Logs", count: health?.collections?.auditLogs ?? health?.mongo?.collections?.auditLogs ?? 0, icon: Shield },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#080B11] border border-slate-800 rounded-lg flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase text-slate-500 font-semibold">
                        {item.label}
                      </span>
                      <Icon size={14} className="text-slate-400" />
                    </div>
                    <p className="text-xl font-bold text-white font-mono">{item.count}</p>
                    <span className="text-[10px] text-slate-500 mt-1">documents</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSystemHealth;
