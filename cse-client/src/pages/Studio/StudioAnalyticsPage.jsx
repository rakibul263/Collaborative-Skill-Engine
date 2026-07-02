import React, { useState, useEffect } from "react";
import { DollarSign, Users, BookOpen, Star, TrendingUp, PieChart as PieIcon, BarChart3, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import apiClient from "@/lib/apiClient";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

const StudioAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/studio/analytics");
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
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
        <div className="h-24 bg-slate-900 rounded-3xl border border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900 rounded-3xl border border-slate-800" />
          <div className="h-80 bg-slate-900 rounded-3xl border border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Revenue & Analytics Intelligence</h1>
          <p className="text-xs text-slate-400">Deep performance metrics, student retention, and category revenue distribution.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Data
        </button>
      </div>

      {/* Analytics Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-xs font-bold text-slate-400">Lifetime Revenue</span>
          <div className="text-2xl font-black text-white">${analytics?.totalRevenue || 0}</div>
          <div className="text-[10px] text-emerald-400 font-semibold">85% Creator Net Payout</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-xs font-bold text-slate-400">Monthly Revenue</span>
          <div className="text-2xl font-black text-white">${analytics?.monthlyRevenue || 0}</div>
          <div className="text-[10px] text-indigo-400 font-semibold">Current Billing Cycle</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-xs font-bold text-slate-400">Active Enrollments</span>
          <div className="text-2xl font-black text-white">{analytics?.totalEnrollments || 0}</div>
          <div className="text-[10px] text-amber-400 font-semibold">Across Published Courses</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-xs font-bold text-slate-400">Average Student Rating</span>
          <div className="text-2xl font-black text-white">{analytics?.averageRating || 5.0} ★</div>
          <div className="text-[10px] text-purple-400 font-semibold">{analytics?.totalReviews || 0} Total Reviews</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Revenue & Sales Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">Monthly Earnings & Sales</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} name="Revenue ($)" />
                <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} name="Sales Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">Course Topic Breakdown</h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.categoryDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(analytics?.categoryDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Performing Courses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">Top Performing Courses</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Course Title</th>
                <th className="p-3">Topic</th>
                <th className="p-3">Price</th>
                <th className="p-3">Total Sales</th>
                <th className="p-3">Total Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(analytics?.topCourses || []).map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-bold text-white">{c.title}</td>
                  <td className="p-3 text-slate-400">{c.topic}</td>
                  <td className="p-3 text-indigo-400 font-bold">${c.price}</td>
                  <td className="p-3">{c.sales} sales</td>
                  <td className="p-3 text-emerald-400 font-bold">${c.revenue}</td>
                </tr>
              ))}

              {(!analytics?.topCourses || analytics.topCourses.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    No course analytics recorded yet.
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
