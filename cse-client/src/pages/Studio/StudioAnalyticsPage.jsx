import React, { useState, useEffect } from "react";
import { Coins, Users, BookOpen, Star, TrendingUp, PieChart as PieIcon, BarChart3, RefreshCw, Wallet, Award } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import { formatBDT } from "@/lib/money";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

const StudioAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(() => getCachedData("/studio/analytics"));
  const [loading, setLoading] = useState(() => !getCachedData("/studio/analytics"));

  const fetchAnalytics = async (forceRefresh = false) => {
    if (!getCachedData("/studio/analytics") && !forceRefresh) setLoading(true);
    try {
      const res = await apiClient.get("/studio/analytics", { forceRefresh });
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      if (!getCachedData("/studio/analytics")) toast.error("Could not fetch analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-900 rounded-3xl border border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900 rounded-3xl border border-slate-800" />
          <div className="h-80 bg-slate-900 rounded-3xl border border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">Revenue & Performance Intelligence</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time telemetry on course earnings, monthly sales trends, learner enrollments, and category distribution.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Metrics
        </button>
      </div>

      {/* ── HIGHLIGHT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Earnings</span>
            <div className="text-3xl font-black text-white mt-1">
              {formatBDT(analytics?.totalRevenue || 0)}
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            85% Creator Net Share
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</span>
            <div className="text-3xl font-black text-white mt-1">
              {formatBDT(analytics?.monthlyRevenue || 0)}
            </div>
          </div>
          <div className="text-[11px] text-indigo-400 font-semibold">
            Current Billing Cycle
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Enrollments</span>
            <div className="text-3xl font-black text-white mt-1">
              {(analytics?.totalEnrollments || 0).toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-purple-400 font-semibold">
            Enrolled Students
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Rating</span>
            <div className="text-3xl font-black text-white mt-1">
              {analytics?.averageRating || 5.0} ★
            </div>
          </div>
          <div className="text-[11px] text-amber-400 font-semibold">
            Across {analytics?.totalReviews || 0} Reviews
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Trend Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Monthly Earnings & Sales Count
            </h3>
            <span className="text-xs text-slate-400 font-mono">Last 6 Months</span>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${Math.round(v)}`} />
                <Tooltip
                  formatter={(value, name) =>
                    typeof name === "string" && name.includes("Revenue")
                      ? [formatBDT(value), name]
                      : [value, name]
                  }
                  contentStyle={{
                    backgroundColor: "#030712",
                    borderColor: "#334155",
                    borderRadius: "14px",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} name="Revenue (৳ BDT)" />
                <Bar dataKey="sales" fill="#10b981" radius={[8, 8, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              Course Discipline Breakdown
            </h3>
            <span className="text-xs text-slate-400 font-mono">By Topic</span>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            {Array.isArray(analytics?.categoryDistribution) && analytics.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {analytics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#030712",
                      borderColor: "#334155",
                      borderRadius: "14px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 text-xs">
                No course category distribution data available yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── TOP COURSES TABLE ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Top Performing Courses
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Course Title</th>
                <th className="p-3.5">Discipline / Topic</th>
                <th className="p-3.5">Catalog Price</th>
                <th className="p-3.5">Total Sales</th>
                <th className="p-3.5 text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(analytics?.topCourses || []).map((c) => (
                <tr key={c.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="p-3.5 font-bold text-white">{c.title}</td>
                  <td className="p-3.5 text-slate-400">{c.topic}</td>
                  <td className="p-3.5 text-indigo-400 font-bold">{formatBDT(c.price)}</td>
                  <td className="p-3.5">{c.sales} sales</td>
                  <td className="p-3.5 text-right text-emerald-400 font-black">
                    {formatBDT(c.revenue)}
                  </td>
                </tr>
              ))}

              {(!analytics?.topCourses || analytics.topCourses.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                    No course analytics recorded yet. Publish your courses to start tracking performance!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default StudioAnalyticsPage;