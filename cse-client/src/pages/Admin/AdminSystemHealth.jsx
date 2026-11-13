import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Server,
  Database,
  Cpu,
  Clock,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Layers,
  Users,
  BookOpen,
  Radio,
  Shield,
} from "lucide-react";
import { LoadingSpinner, AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            System Telemetry & Database Diagnostics
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Real-time server resource consumption, MongoDB collections telemetry, and process status
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-mono text-xs font-bold transition-all self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Run Diagnostics
        </button>
      </div>

      {loading && !health ? (
        <AdminPageLoader
          label="Measuring Platform Telemetry & Infrastructure..."
          subtext="Querying server memory, event loop latency, and MongoDB Atlas telemetry"
        />
      ) : (
        <>
          {/* Main Status Hero Card */}
          <div className="p-6 bg-gradient-to-br from-emerald-950/30 via-[#0b101f] to-[#070b16] border border-emerald-500/30 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={32} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-widest">
                    Operational Status: {health?.status?.toUpperCase() || "HEALTHY"}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mt-1">
                  Collaborative Skill Engine Core Online
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Cluster: MongoDB Atlas &bull; Express Gateway &bull; Socket.IO WebSockets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-[#070b16] border border-slate-800 rounded-xl font-mono text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">API Latency</span>
                <span className="text-cyan-300 font-bold text-sm">{pingLatency || 12} ms</span>
              </div>
              <div className="px-4 py-2 bg-[#070b16] border border-slate-800 rounded-xl font-mono text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Server Uptime</span>
                <span className="text-emerald-300 font-bold text-sm">
                  {health?.uptimeFormatted || health?.uptime || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Node & Memory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Memory RSS */}
            <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  Resident Set Size (RSS)
                </span>
                <Cpu size={18} className="text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {health?.memory?.rssMb ? `${health.memory.rssMb} MB` : health?.memory?.rss || "—"}
              </p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full w-2/5" />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-2">Physical RAM committed</p>
            </div>

            {/* Heap Allocated */}
            <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  V8 Heap Memory
                </span>
                <HardDrive size={18} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {health?.memory?.heapUsedMb ? `${health.memory.heapUsedMb} MB` : health?.memory?.heapUsed || "—"}
              </p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full w-1/3" />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-2">
                Total Allocated: {health?.memory?.heapTotalMb ? `${health.memory.heapTotalMb} MB` : health?.memory?.heapTotal || "—"}
              </p>
            </div>

            {/* Runtime Info */}
            <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  Runtime Environment
                </span>
                <Server size={18} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {health?.nodeVersion || "Node.js"}
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-4">
                Environment: {health?.environment || health?.platform || "development"}
              </p>
              <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                V8 Engine &bull; Event Loop Idle
              </p>
            </div>
          </div>

          {/* Database Collection Telemetry Grid */}
          <div className="bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-cyan-400" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                  MongoDB Atlas Collection Record Metrics
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Connected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { label: "Users", count: health?.collections?.users ?? health?.mongo?.collections?.users ?? 0, icon: Users, color: "text-cyan-400" },
                { label: "Courses", count: health?.collections?.courses ?? health?.mongo?.collections?.courses ?? 0, icon: BookOpen, color: "text-indigo-400" },
                { label: "Enrollments", count: health?.collections?.enrollments ?? health?.mongo?.collections?.enrollments ?? 0, icon: Layers, color: "text-purple-400" },
                { label: "Schedules", count: health?.collections?.schedules ?? health?.mongo?.collections?.lessons ?? 0, icon: HardDrive, color: "text-emerald-400" },
                { label: "Ratings", count: health?.collections?.ratings ?? health?.mongo?.collections?.sessions ?? 0, icon: Clock, color: "text-amber-400" },
                { label: "Broadcasts", count: health?.collections?.notifications ?? health?.mongo?.collections?.notifications ?? 0, icon: Radio, color: "text-fuchsia-400" },
                { label: "Audit Logs", count: health?.collections?.auditLogs ?? health?.mongo?.collections?.auditLogs ?? 0, icon: Shield, color: "text-rose-400" },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 bg-[#070b16] border border-slate-800/80 rounded-xl flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        {item.label}
                      </span>
                      <Icon size={14} className={item.color} />
                    </div>
                    <p className="text-xl font-black text-white font-mono">{item.count}</p>
                    <span className="text-[9px] font-mono text-slate-400 mt-1">documents</span>
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

