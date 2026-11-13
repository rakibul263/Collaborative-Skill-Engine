import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  Filter,
  RefreshCw,
  Award,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner, AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";
import { toast } from "sonner";
import { toWholeTaka, formatBDT } from "@/lib/money";

const formatMoney = (val) => {
  return toWholeTaka(val).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0b101f] border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs font-mono">
        <p className="text-slate-300 font-bold mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-bold">৳{formatMoney(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminRevenue = () => {
  const [revenueData, setRevenueData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [rangePreset, setRangePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRevenue = useCallback(async (range, start, end) => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (range) params.range = range;
      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const [revRes, chartRes] = await Promise.all([
        adminApiClient.get("/revenue", { params }),
        adminApiClient.get("/revenue/chart"),
      ]);

      setRevenueData(revRes.data);
      setChartData(chartRes.data || []);
    } catch {
      setError("Failed to load revenue and ledger data.");
      toast.error("Failed to load revenue data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue(rangePreset, startDate, endDate);
  }, [rangePreset, startDate, endDate, fetchRevenue]);

  const handleApplyCustomDates = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must precede end date.");
      return;
    }
    setRangePreset("");
    fetchRevenue("", startDate, endDate);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setRangePreset("all");
    fetchRevenue("all", "", "");
  };

  if (loading && !revenueData) {
    return (
      <AdminPageLoader
        label="Auditing Financial Ledger & Revenue Streams..."
        subtext="Computing gross marketplace sales, platform commissions, and instructor payouts"
      />
    );
  }

  if (error && !revenueData) {
    return (
      <div className="bg-[#160c14] border border-rose-900/50 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={32} />
        <p className="text-rose-300 font-bold text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchRevenue(rangePreset, startDate, endDate)}
          className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Revenue Ledger & Commission Analytics
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Track gross marketplace transactions, 15% platform split, and 85% instructor earnings
          </p>
        </div>

        <button
          onClick={() => fetchRevenue(rangePreset, startDate, endDate)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-mono text-xs font-bold transition-all self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Sync Financials
        </button>
      </div>

      {/* Top Financial Stat Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gross Sales */}
        <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Gross Marketplace Volume
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            ৳{formatMoney(revenueData?.totalGross ?? revenueData?.grossSales)}
          </p>
          <p className="text-xs font-mono text-indigo-400 mt-1">
            Total learner transactions processed
          </p>
        </div>

        {/* Platform Commission (15%) */}
        <div className="bg-[#0b101f]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group bg-gradient-to-br from-cyan-950/20 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Platform Commission (15%)
            </span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-300 font-mono">
            ৳{formatMoney(revenueData?.totalCommission ?? revenueData?.totalRevenue)}
          </p>
          <p className="text-xs font-mono text-cyan-400/80 mt-1">
            Net platform maintenance & hosting margin
          </p>
        </div>

        {/* Instructor Payouts (85%) */}
        <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Instructor Disbursals (85%)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 font-mono">
            ৳{formatMoney(revenueData?.totalInstructorEarnings ?? revenueData?.instructorPayouts)}
          </p>
          <p className="text-xs font-mono text-emerald-400/80 mt-1">
            Total instructor earnings distributed
          </p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quick presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
            { id: "6m", label: "6 Months" },
            { id: "all", label: "All Time" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setRangePreset(preset.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                rangePreset === preset.id
                  ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-[#070b16] border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-[#070b16] border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleApplyCustomDates}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all"
          >
            Filter
          </button>
          {(startDate || endDate) && (
            <button
              onClick={handleClearFilter}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[#0b101f]/90 rounded-2xl p-6 border border-slate-800/80 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Monthly Revenue Performance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison of Gross Marketplace Sales vs Platform 15% Margin
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis
                stroke="#64748b"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v) => formatBDT(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => <span className="text-slate-300 capitalize">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="gross"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#grossGrad)"
                name="Gross Volume"
              />
              <Area
                type="monotone"
                dataKey="commission"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#commGrad)"
                name="Platform Commission"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per Course Breakdown Table */}
      <div className="bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#070b16]/70 flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
            Curriculum Sales Breakdown
          </h3>
          <span className="text-xs font-mono text-cyan-400">
            {(revenueData?.courses || []).length} Curriculums with Sales
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" label="Auditing ledger transactions..." />
          </div>
        ) : (revenueData?.courses || []).length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-mono text-xs">
            No sales transactions recorded in this timeframe
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#070b16]/50">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Course Title
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Instructor
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Enrollments
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Gross Sales
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Instructor (85%)
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    Platform (15%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {revenueData.courses.map((c, idx) => (
                  <tr key={c.courseId || idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-200">{c.courseTitle || "Untitled Course"}</td>
                    <td className="px-4 py-3.5 text-slate-400">{c.instructorName || c.instructorEmail || "Unknown"}</td>
                    <td className="px-4 py-3.5 text-slate-300 font-bold">{c.enrollments || 0}</td>
                    <td className="px-4 py-3.5 text-slate-200 font-bold">
                      ৳{formatMoney(c.grossSales)}
                    </td>
                    <td className="px-4 py-3.5 text-emerald-400 font-bold">
                      ৳{formatMoney(c.instructorPayout ?? c.instructorEarnings)}
                    </td>
                    <td className="px-4 py-3.5 text-cyan-300 font-bold">
                      ৳{formatMoney(c.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRevenue;
