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
  RefreshCw,
  Award,
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
      <div className="bg-[#0E1322] border border-slate-800 rounded-xl p-3 shadow-xl text-xs">
        <p className="text-slate-300 font-semibold mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize text-slate-400">{entry.name}:</span>
            <span className="font-mono font-semibold">৳{formatMoney(entry.value)}</span>
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
      <div className="bg-[#0E1322] border border-rose-900/40 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={32} />
        <p className="text-rose-300 font-semibold text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchRevenue(rangePreset, startDate, endDate)}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium text-xs transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <DollarSign className="text-slate-400 w-5 h-5" />
            Revenue Ledger & Commission Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track gross marketplace volume, 15% platform split, and 85% instructor earnings
          </p>
        </div>

        <button
          onClick={() => fetchRevenue(rangePreset, startDate, endDate)}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#0E1322] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Sync Financials
        </button>
      </div>

      {/* Top Financial Stat Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gross Sales */}
        <div className="bg-[#0E1322] border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Gross Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            ৳{formatMoney(revenueData?.totalGross ?? revenueData?.grossSales)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total learner transactions processed
          </p>
        </div>

        {/* Platform Commission (15%) */}
        <div className="bg-[#0E1322] border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Platform Commission (15%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            ৳{formatMoney(revenueData?.totalCommission ?? revenueData?.totalRevenue)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Net platform maintenance & hosting margin
          </p>
        </div>

        {/* Instructor Payouts (85%) */}
        <div className="bg-[#0E1322] border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Instructor Disbursals (85%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Award size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 font-mono">
            ৳{formatMoney(revenueData?.totalInstructorEarnings ?? revenueData?.instructorPayouts)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total instructor earnings distributed
          </p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-3.5 bg-[#0E1322] border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rangePreset === preset.id
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-[#080B11] border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-slate-600 font-mono transition-colors"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-[#080B11] border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-slate-600 font-mono transition-colors"
          />
          <button
            onClick={handleApplyCustomDates}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-white text-slate-900 rounded-lg font-semibold transition-colors shadow-sm"
          >
            Apply
          </button>
          {(startDate || endDate) && (
            <button
              onClick={handleClearFilter}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[#0E1322] rounded-xl p-5 border border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Monthly Revenue Performance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gross Marketplace Volume vs Platform 15% Margin
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis
                stroke="#475569"
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
                stroke="#10b981"
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
      <div className="bg-[#0E1322] rounded-xl border border-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-800/80 bg-[#0A0E1A] flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
            Curriculum Sales Breakdown
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {(revenueData?.courses || []).length} Curriculums
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" label="Auditing ledger transactions..." />
          </div>
        ) : (revenueData?.courses || []).length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No sales transactions recorded in this timeframe
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#080B11]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Course Title
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Enrollments
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Gross Sales
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Instructor (85%)
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Platform (15%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {revenueData.courses.map((c, idx) => (
                  <tr key={c.courseId || idx} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">{c.courseTitle || "Untitled Course"}</td>
                    <td className="px-4 py-3 text-slate-400">{c.instructorName || c.instructorEmail || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono font-medium">{c.enrollments || 0}</td>
                    <td className="px-4 py-3 text-slate-200 font-mono font-semibold">
                      ৳{formatMoney(c.grossSales)}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono">
                      ৳{formatMoney(c.instructorPayout ?? c.instructorEarnings)}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-mono font-semibold">
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
