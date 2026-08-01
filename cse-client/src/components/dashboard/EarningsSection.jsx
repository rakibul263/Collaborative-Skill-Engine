import { useState, useEffect, useCallback } from "react";
import { DollarSign, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import apiClient from "@/lib/apiClient";

const EarningsSection = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/dashboard/earnings");
      setData(res.data);
    } catch {
      setError("Failed to load earnings data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state — spinner in place of charts
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state — message + retry button
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-slate-600 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  // Zero earnings state
  if (data && data.totalEarnings === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500 text-sm">
          No earnings yet. Share your courses to start earning!
        </p>
      </div>
    );
  }

  const { totalEarnings, perCourse, monthly } = data;

  return (
    <div className="space-y-6">
      {/* Task 11.2 — Total earnings card (white card, green accent, matching Studio.jsx style) */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
          <DollarSign size={22} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">
            Total Earnings
          </p>
          <p className="text-2xl font-black text-[#1B1B4B]">
            ৳{totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 font-bold">
            85% of each course sale
          </p>
        </div>
      </div>

      {/* Task 11.3 — Per-course bar chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-700 mb-4">
          Earnings by Course
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={perCourse}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="courseTitle" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="earnings" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Task 11.4 — Monthly line chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-700 mb-4">
          Monthly Earnings (Last 6 Months)
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="earnings"
              stroke="#4f46e5"
              dot
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Task 11.5 — Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default EarningsSection;
