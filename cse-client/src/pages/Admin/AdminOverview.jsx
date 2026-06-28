import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Users, BookOpen, ShoppingCart, DollarSign, RefreshCw, AlertCircle } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/admin-api/overview`, { withCredentials: true });
      setData(res.data);
    } catch {
      setError("Failed to load overview data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
      <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
      <p className="text-red-600 font-bold">{error}</p>
      <button onClick={fetchData} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm">Retry</button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#1B1B4B]">Overview</h2>
          <p className="text-sm text-slate-400 font-bold mt-1">Platform performance at a glance</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-sm transition-all"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={22} />} label="Total Users" value={data?.totalUsers?.toLocaleString()} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={<BookOpen size={22} />} label="Approved Courses" value={data?.totalApprovedCourses?.toLocaleString()} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={<ShoppingCart size={22} />} label="Total Enrollments" value={data?.totalEnrollments?.toLocaleString()} color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={<DollarSign size={22} />} label="Platform Revenue" value={`৳${(data?.totalRevenue || 0).toFixed(2)}`} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest mb-6">User Registrations (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.userRegistrationsByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fontWeight: 700 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Course Submissions */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest mb-6">Course Submissions (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.courseSubmissionsByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fontWeight: 700 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4,4,0,0]} />
              <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[4,4,0,0]} />
              <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest mb-4">Recent Users</h3>
          <div className="space-y-3">
            {(data?.recentUsers || []).length === 0 ? (
              <p className="text-slate-400 text-sm font-bold text-center py-4">No users yet</p>
            ) : (
              (data?.recentUsers || []).map((u) => (
                <div key={u._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-black text-slate-800">{u.fullName || "Unknown"}</p>
                    <p className="text-xs text-slate-400 font-bold">{u.email}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-bold">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest mb-4">Recently Approved Courses</h3>
          <div className="space-y-3">
            {(data?.recentCourses || []).length === 0 ? (
              <p className="text-slate-400 text-sm font-bold text-center py-4">No approved courses yet</p>
            ) : (
              (data?.recentCourses || []).map((c) => (
                <div key={c._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-black text-slate-800">{c.title}</p>
                    <p className="text-xs text-slate-400 font-bold">{c.instructorEmail}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-bold">{c.approvedAt ? new Date(c.approvedAt).toLocaleDateString() : "—"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
