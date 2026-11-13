import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Users,
  BookOpen,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Activity,
  Radio,
  FileCheck,
  Globe,
} from "lucide-react";
import { formatBDT } from "@/lib/money";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import StatCard from "@/components/admin/StatCard";
import { LoadingSpinner, AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";
import logoImg from "@/assets/images/logo.png";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0b101f] border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs font-mono">
        <p className="text-slate-300 font-bold mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApiClient.get("/overview");
      setData(res.data);
    } catch {
      setError("Failed to load dashboard metrics. Verify credentials and network.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <AdminPageLoader
        label="Synchronizing Platform Telemetry..."
        subtext="Aggregating real-time user metrics, course catalog, and financial logs"
      />
    );
  }

  if (error) {
    return (
      <div className="bg-[#160c14] border border-rose-900/50 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={32} />
        <p className="text-rose-300 font-bold text-sm mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Brand Banner / Actions */}
      <div className="bg-gradient-to-r from-[#0b101f] via-[#0e1629] to-[#070b16] border border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Glowing Authentic CSE Logo Container */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-50 blur-xl rounded-2xl animate-pulse" />
              <div className="relative z-10 w-full h-full p-2 bg-slate-900/90 border border-indigo-500/40 group-hover:border-indigo-400 rounded-2xl shadow-xl flex items-center justify-center transition-transform group-hover:rotate-6">
                <img
                  src={logoImg}
                  alt="Collaborative Skill Engine"
                  className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300">
                    Collaborative Skill Engine
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/80 text-[9px] font-mono font-bold text-indigo-300">
                  EXECUTIVE CORE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-[9px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Skill<span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">Engine</span>{" "}
                <span className="text-slate-300 font-semibold text-lg sm:text-2xl font-sans">Mission Control</span>
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Real-time governance, student-instructor telemetry, financial ledger, and system firewall
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-mono text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Sync Metrics
            </button>
            <Link
              to="/admin/courses"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
            >
              Review Courses
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/admin/courses?status=pending"
          className="p-3 bg-[#0b101f]/80 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-bold text-slate-300 transition-all group"
        >
          <span className="flex items-center gap-2">
            <Clock size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
            Pending Review
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px]">
            {data?.totalPendingCourses ?? data?.pendingCourses ?? 0}
          </span>
        </Link>

        <Link
          to="/admin/users"
          className="p-3 bg-[#0b101f]/80 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-bold text-slate-300 transition-all group"
        >
          <span className="flex items-center gap-2">
            <Users size={15} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            User Management
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px]">
            {data?.totalUsers || 0}
          </span>
        </Link>

        <Link
          to="/admin/broadcasts"
          className="p-3 bg-[#0b101f]/80 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-bold text-slate-300 transition-all group"
        >
          <span className="flex items-center gap-2">
            <Radio size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
            Send Broadcast
          </span>
          <ArrowUpRight size={14} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
        </Link>

        <Link
          to="/admin/system-health"
          className="p-3 bg-[#0b101f]/80 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-bold text-slate-300 transition-all group"
        >
          <span className="flex items-center gap-2">
            <Activity size={15} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            System Health
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </Link>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={22} />}
          label="Total Registered Users"
          value={data?.totalUsers?.toLocaleString() || 0}
          color="text-cyan-400"
          bg="bg-cyan-500/10 border-cyan-500/20"
          badge={`${data?.activeUsers || 0} Active`}
        />
        <StatCard
          icon={<BookOpen size={22} />}
          label="Approved Courses"
          value={(data?.totalApprovedCourses ?? data?.approvedCourses ?? 0).toLocaleString()}
          color="text-emerald-400"
          bg="bg-emerald-500/10 border-emerald-500/20"
          badge={`${data?.totalCourses || 0} Total`}
        />
        <StatCard
          icon={<ShoppingCart size={22} />}
          label="Course Enrollments"
          value={data?.totalEnrollments?.toLocaleString() || 0}
          color="text-purple-400"
          bg="bg-purple-500/10 border-purple-500/20"
          badge="Marketplace"
        />
        <StatCard
          icon={<DollarSign size={22} />}
          label="Commission (15%)"
          value={formatBDT(data?.totalRevenue ?? data?.platformCommission ?? 0)}
          color="text-amber-400"
          bg="bg-amber-500/10 border-amber-500/20"
          badge={`Gross: ${formatBDT(data?.totalGrossSales ?? data?.grossRevenue ?? 0)}`}
        />
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations Trend */}
        <div className="bg-[#0b101f]/90 rounded-2xl p-6 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                User Registrations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly trajectory (Last 6 Months)</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
              Accounts
            </span>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.userRegistrationsByMonth || []}>
                <defs>
                  <linearGradient id="userColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#userColor)"
                  name="New Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Submissions Breakdown */}
        <div className="bg-[#0b101f]/90 rounded-2xl p-6 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold">
                Course Submissions Pipeline
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Approved, Pending & Rejected submissions</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
              Curriculum
            </span>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.courseSubmissionsByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value) => <span className="text-slate-300 capitalize">{value}</span>}
                />
                <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Streams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registered Users */}
        <div className="bg-[#0b101f]/90 rounded-2xl p-6 border border-slate-800/80 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                Recent User Registrations
              </h3>
            </div>
            <Link
              to="/admin/users"
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              View All <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {(data?.recentUsers || []).length === 0 ? (
              <p className="text-slate-400 text-xs font-mono text-center py-8">No user records detected</p>
            ) : (
              (data?.recentUsers || []).map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/80 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-300 font-mono text-xs font-bold uppercase shrink-0">
                      {u.fullName ? u.fullName.charAt(0) : u.email.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{u.fullName || "User"}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Recent"}
                    </span>
                    <div className="mt-0.5">
                      {u.isDeactivated ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-400">
                          Deactivated
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Course Activity */}
        <div className="bg-[#0b101f]/90 rounded-2xl p-6 border border-slate-800/80 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-emerald-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                Recent Approved Curriculums
              </h3>
            </div>
            <Link
              to="/admin/courses"
              className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              View All <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {(data?.recentCourses || []).length === 0 ? (
              <p className="text-slate-400 text-xs font-mono text-center py-8">
                No approved course submissions yet
              </p>
            ) : (
              (data?.recentCourses || []).map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/80 transition-all"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-slate-200 truncate">{c.title}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">
                      By: {c.instructorName || c.instructorEmail}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-amber-400 font-mono">{formatBDT(c.price || 0)}</span>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 mt-0.5 justify-end">
                      <CheckCircle2 size={11} />
                      <span>Approved</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live User Login Stream Snippet */}
      {data?.recentLogins && data.recentLogins.length > 0 && (
        <div className="bg-[#0b101f]/90 rounded-2xl p-6 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                Recent User Logins & Client IPs
              </h3>
            </div>
            <Link
              to="/admin/logins"
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              All Login Telemetry <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {data.recentLogins.slice(0, 4).map((item) => (
              <div
                key={item._id}
                className="p-3 bg-[#070b16] border border-slate-800/70 rounded-xl font-mono text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 truncate">{item.fullName || item.email}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                      {item.role || "user"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate font-sans">{item.email}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-cyan-300 font-bold font-mono">{item.ip || "127.0.0.1"}</span>
                  <span className="text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Audit Telemetry Quick Snippet */}
      {(data?.recentAuditLogs || data?.recentLogs)?.length > 0 && (
        <div className="bg-[#0b101f]/90 rounded-2xl p-6 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                Live Admin Security Audit Trail
              </h3>
            </div>
            <Link
              to="/admin/audit-logs"
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              Full Security Stream <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(data.recentAuditLogs || data.recentLogs).slice(0, 3).map((log) => (
              <div
                key={log._id}
                className="p-3 bg-[#070b16] border border-slate-800/70 rounded-xl font-mono text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-[10px] uppercase font-bold">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Recent"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  Admin: <span className="text-slate-400">{log.adminEmail}</span>
                </p>
                {log.details && (
                  <p className="text-[10px] text-slate-400 truncate mt-1">
                    {typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
