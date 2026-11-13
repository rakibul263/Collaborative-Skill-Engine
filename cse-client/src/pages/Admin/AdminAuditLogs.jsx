import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { LoadingSpinner, AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";
import { toast } from "sonner";

const actionColors = {
  LOGIN_SUCCESS: "bg-emerald-950/80 border-emerald-800 text-emerald-300",
  LOGIN_FAILED: "bg-rose-950/80 border-rose-800 text-rose-300",
  LOGOUT: "bg-slate-800 border-slate-700 text-slate-300",
  COURSE_APPROVED: "bg-cyan-950/80 border-cyan-800 text-cyan-300",
  COURSE_REJECTED: "bg-amber-950/80 border-amber-800 text-amber-300",
  COURSE_DELETED: "bg-rose-950/80 border-rose-800 text-rose-300",
  USER_ROLE_CHANGED: "bg-purple-950/80 border-purple-800 text-purple-300",
  USER_DEACTIVATED: "bg-amber-950/80 border-amber-800 text-amber-300",
  USER_REACTIVATED: "bg-emerald-950/80 border-emerald-800 text-emerald-300",
  USER_DELETED: "bg-rose-950/80 border-rose-800 text-rose-300",
  BROADCAST_SENT: "bg-indigo-950/80 border-indigo-800 text-indigo-300",
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const debounceRef = useRef(null);

  const fetchLogs = useCallback(
    async (pg = page, act = actionFilter, q = search) => {
      setLoading(true);
      try {
        const res = await adminApiClient.get("/audit-logs", {
          params: {
            page: pg,
            limit: 20,
            action: act || undefined,
            search: q || undefined,
          },
        });
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } catch {
        toast.error("Failed to query security audit trail.");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [page, actionFilter, search]
  );

  useEffect(() => {
    fetchLogs(page, actionFilter, search);
  }, [page, actionFilter, fetchLogs]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLogs(1, actionFilter, val);
    }, 350);
  };

  if (initialLoading) {
    return (
      <AdminPageLoader
        label="Streaming Security Audit Trail..."
        subtext="Tracking administrative actions, permissions, and security events"
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Security & Operational Audit Logs
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Immutable administrative event trail tracking privilege elevations, approvals, and mutations
          </p>
        </div>

        <button
          onClick={() => fetchLogs(page, actionFilter, search)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-mono text-xs font-bold transition-all self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Sync Stream
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by admin email, IP address, or event details..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#0b101f] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2.5 bg-[#0b101f] border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Security Events</option>
            <option value="LOGIN_SUCCESS">Admin Logins</option>
            <option value="COURSE_APPROVED">Course Approvals</option>
            <option value="COURSE_REJECTED">Course Rejections</option>
            <option value="COURSE_DELETED">Course Deletions</option>
            <option value="USER_ROLE_CHANGED">Role Updates</option>
            <option value="USER_DEACTIVATED">User Suspensions</option>
            <option value="USER_DELETED">User Purges</option>
            <option value="BROADCAST_SENT">System Broadcasts</option>
          </select>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#070b16]/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-cyan-400" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
              Event Telemetry Stream
            </h3>
          </div>
          <span className="text-xs font-mono text-cyan-400">{total} Logged Events</span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="md" label="Streaming audit records..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-mono text-xs">
            No audit records found matching current query
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#070b16]/50">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Action Event
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Admin Actor
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Source IP
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Event Telemetry Payload
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {logs.map((log) => {
                  const badgeClass =
                    actionColors[log.action] || "bg-slate-800 border-slate-700 text-slate-300";
                  return (
                    <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recent"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeClass}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-200 font-bold whitespace-nowrap">
                        {log.adminEmail || "SuperAdmin"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {log.ip || "127.0.0.1"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-sans text-xs">
                        {typeof log.details === "object" ? (
                          <pre className="text-[11px] font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 max-w-xl overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          <span>{log.details || "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800/80 bg-[#070b16]/40 flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400">
              Page <span className="text-cyan-400 font-bold">{page}</span> of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;

