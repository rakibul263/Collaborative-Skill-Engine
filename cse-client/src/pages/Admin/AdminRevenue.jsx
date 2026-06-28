import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, AlertCircle, Filter } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AdminRevenue = () => {
  const [revenueData, setRevenueData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRevenue = useCallback(async (start, end) => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const [revRes, chartRes] = await Promise.all([
        axios.get(`${API}/admin-api/revenue`, { params, withCredentials: true }),
        axios.get(`${API}/admin-api/revenue/chart`, { withCredentials: true }),
      ]);
      setRevenueData(revRes.data);
      setChartData(chartRes.data || []);
    } catch {
      setError("Failed to load revenue data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRevenue("", ""); }, [fetchRevenue]);

  const handleApplyFilter = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setDateError("Start date must be before end date.");
      return;
    }
    setDateError("");
    fetchRevenue(startDate, endDate);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setDateError("");
    fetchRevenue("", "");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[#1B1B4B]">Revenue</h2>
        <p className="text-sm text-slate-400 font-bold mt-1">Platform commission earnings from course sales</p>
      </div>

      {/* Total Revenue Card */}
      {!loading && !error && revenueData && (
        <div className="bg-gradient-to-br from-[#1B1B4B] to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={20} className="text-indigo-300" />
            <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Total Platform Revenue</p>
          </div>
          <p className="text-4xl font-black">৳{(revenueData.totalRevenue || 0).toFixed(2)}</p>
          <p className="text-indigo-300 text-sm font-bold mt-1">15% commission on all course sales</p>
        </div>
      )}

      {/* Date Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest mb-4">Filter by Date Range</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDateError(""); }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDateError(""); }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleApplyFilter}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all"
          >
            <Filter size={14} />
            Apply Filter
          </button>
          {(startDate || endDate) && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-black transition-all"
            >
              Clear
            </button>
          )}
        </div>
        {dateError && <p className="text-red-500 text-xs font-bold mt-2">{dateError}</p>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
          <p className="text-red-600 font-bold">{error}</p>
        </div>
      ) : (
        <>
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest mb-6">Monthly Revenue (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `৳${v}`} />
                <Tooltip formatter={(v) => [`৳${v.toFixed(2)}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} name="Commission" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-Course Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest">Course Breakdown</h3>
            </div>
            {(revenueData?.courses || []).length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-sm">No sales data yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {["Course", "Instructor", "Enrollments", "Gross Sales", "Commission"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.courses.map((c) => (
                      <tr key={c.courseId} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm font-black text-slate-800">{c.courseTitle}</td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-500">{c.instructorName}</td>
                        <td className="px-4 py-3 text-sm font-black text-slate-700">{c.enrollments}</td>
                        <td className="px-4 py-3 text-sm font-black text-slate-700">৳{c.grossSales.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-black text-indigo-600">৳{c.commission.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRevenue;
