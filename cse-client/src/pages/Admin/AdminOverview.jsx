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
  Shield,
  Activity,
  Globe,
  Check,
  ChevronRight,
  Sparkles,
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
import { AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";

// Refined, clean dark tooltip
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs font-mono">
        <p className="text-slate-300 font-bold mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <p key={`tooltip-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-400 capitalize">{entry.name}:</span>
            <span className="font-bold text-white">{entry.value}</span>
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
        label="Loading Platform Metrics..."
        subtext="Synchronizing real-time telemetry, user directories, and financial ledgers"
      />
    );
  }

  if (error) {
    return (
      <div className="bg-[#120E15] border border-rose-900/40 rounded-2xl p-8 text-center max-w-md mx-auto my-12">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={28} />
        <p className="text-rose-300 font-semibold text-sm mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium text-xs transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const pendingCount = data?.totalPendingCourses ?? data?.pendingCourses ?? 0;
  const approvedCount = data?.totalApprovedCourses ?? data?.approvedCourses ?? 0;
  const totalCourses = data?.totalCourses || approvedCount + pendingCount;
  const grossSales = data?.totalGrossSales ?? data?.grossRevenue ?? 0;
  const netCommission = data?.totalRevenue ?? data?.platformCommission ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Page Header & Quick Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Executive Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time platform activity, curriculum review queue, and financial performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-cyan-400" : "text-slate-400"} />
            Sync
          </button>

          {pendingCount > 0 ? (
            <Link
              to="/admin/courses?status=pending"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              <Clock size={13} className="text-amber-400" />
              <span>{pendingCount} Pending Review</span>
              <ArrowUpRight size={13} />
            </Link>
          ) : (
            <Link
              to="/admin/courses"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              <span>Manage Courses</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Registered Users"
          value={data?.totalUsers?.toLocaleString() || "0"}
          subtext={`${data?.activeUsers || 0} active accounts`}
          badge="Platform"
          badgeColor="neutral"
        />

        <StatCard
          icon={BookOpen}
          label="Course Curriculum"
          value={approvedCount.toLocaleString()}
          subtext={`${totalCourses} total submitted`}
          badge={pendingCount > 0 ? `${pendingCount} Pending` : "All Clear"}
          badgeColor={pendingCount > 0 ? "amber" : "emerald"}
        />

        <StatCard
          icon={DollarSign}
          label="Gross Platform Volume"
          value={formatBDT(grossSales)}
          subtext={`Commission: ${formatBDT(netCommission)} (15%)`}
          badge="Ledger"
          badgeColor="cyan"
        />

        <StatCard
          icon={Activity}
          label="System Health"
          value="99.98%"
          subtext={`${data?.totalEnrollments || 0} active enrollments`}
          badge="Live Pulse"
          badgeColor="emerald"
        />
      </div>

      {/* ── Visual Analytics (Growth Trajectory & Pipeline) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Acquisition Growth */}
        <div className="bg-[#0E1322] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                User Registrations Trend
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly trajectory over the last 6 months</p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded-md">
              Accounts
            </span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.userRegistrationsByMonth || []}>
                <defs>
                  <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#userGrowthGradient)"
                  name="New Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Pipeline Distribution */}
        <div className="bg-[#0E1322] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Course Submissions Pipeline
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Approved vs pending vs rejected submissions</p>
            </div>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-md">
              Curriculum
            </span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.courseSubmissionsByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  formatter={(val) => <span className="text-slate-300 capitalize">{val}</span>}
                />
                <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[3, 3, 0, 0]} />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Operational Focus Hub (Actionable & Non-Redundant) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Priority Action Queue */}
        <div className="bg-[#0E1322] border border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Priority Review Queue
                </h3>
              </div>
              <Link
                to="/admin/courses?status=pending"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Review All <ArrowUpRight size={13} />
              </Link>
            </div>

            {pendingCount === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  All Submissions Reviewed
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  There are currently zero courses waiting in the review pipeline.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(data?.recentCourses || [])
                  .filter((c) => c.status === "pending" || c.status === "pending_review")
                  .slice(0, 3)
                  .map((course) => (
                    <div
                      key={course._id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {course.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Instructor: {course.instructorName || course.instructorEmail}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-amber-300 font-mono">
                          {formatBDT(course.price || 0)}
                        </span>
                        <Link
                          to="/admin/courses?status=pending"
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}

                <p className="text-[11px] text-slate-400 text-center pt-2">
                  {pendingCount} course{pendingCount !== 1 ? "s" : ""} pending instructor verification.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Course Quality Assurance Protocol</span>
            <Link to="/admin/courses" className="text-slate-300 hover:text-white font-medium flex items-center gap-1">
              Full Catalog <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* Right Column: Live Login & Security Stream */}
        <div className="bg-[#0E1322] border border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Recent Access Telemetry
                </h3>
              </div>
              <Link
                to="/admin/logins"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Full Telemetry <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="space-y-2">
              {(data?.recentLogins || []).slice(0, 4).map((login) => (
                <div
                  key={login._id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-semibold text-slate-200 truncate">
                      {login.fullName || login.email}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">
                      {login.email}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[11px] font-semibold text-cyan-300">
                      {login.ip || "127.0.0.1"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {login.timestamp ? new Date(login.timestamp).toLocaleTimeString() : "Recent"}
                    </p>
                  </div>
                </div>
              ))}

              {(!data?.recentLogins || data.recentLogins.length === 0) && (
                <p className="text-slate-400 text-xs font-mono text-center py-8">
                  No recent access sessions recorded.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>IP Geolocation & Threat Monitoring</span>
            <Link to="/admin/audit-logs" className="text-slate-300 hover:text-white font-medium flex items-center gap-1">
              Audit Trail <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
