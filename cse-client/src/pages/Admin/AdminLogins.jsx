import { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe,
  Search,
  RefreshCw,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Laptop,
  Smartphone,
  Tablet,
  Clock,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Sparkles,
  Activity,
  Layers,
  Ban,
  Eye,
  X,
  Plus,
  Terminal,
  ExternalLink,
  Navigation,
  Plane,
  Star,
  Zap,
} from "lucide-react";
import { LoadingSpinner, AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";

const AdminLogins = () => {
  // View mode: "grouped" (default: 1 row per IP), "stream" (raw logins), or "blocked" (quarantined IPs)
  const [viewMode, setViewMode] = useState("grouped");

  // Grouped by IP State
  const [ipGroups, setIpGroups] = useState([]);
  const [groupedTotal, setGroupedTotal] = useState(0);
  const [groupedPage, setGroupedPage] = useState(1);
  const [groupedTotalPages, setGroupedTotalPages] = useState(1);
  const [groupedStats, setGroupedStats] = useState({
    totalUniqueIps: 0,
    blockedIpsCount: 0,
    totalLoginsSum: 0,
  });

  // Raw Stream State
  const [streamLogins, setStreamLogins] = useState([]);
  const [streamTotal, setStreamTotal] = useState(0);
  const [streamPage, setStreamPage] = useState(1);
  const [streamTotalPages, setStreamTotalPages] = useState(1);
  const [streamStats, setStreamStats] = useState({
    todayCount: 0,
    uniqueIpsCount: 0,
    adminLoginsCount: 0,
  });

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "blocked" | "allowed"
  const [roleFilter, setRoleFilter] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedIp, setCopiedIp] = useState(null);

  // Deep Inspection Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedIpData, setSelectedIpData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Manual Block IP Modal State
  const [manualBlockOpen, setManualBlockOpen] = useState(false);
  const [manualIp, setManualIp] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [submittingBlock, setSubmittingBlock] = useState(false);

  // Security Intelligence & Fraud Detection State
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState("ALL");
  const [anomalyStats, setAnomalyStats] = useState({
    total: 0,
    impossibleTravel: 0,
    reviewFraud: 0,
    unresolved: 0,
  });
  const [simulatingTravel, setSimulatingTravel] = useState(false);
  const [simulatingReview, setSimulatingReview] = useState(false);

  const debounceRef = useRef(null);

  // ── Fetch Grouped By IP Telemetry ──
  const fetchGroupedLogins = useCallback(
    async (pg = groupedPage, q = search, st = statusFilter) => {
      setLoading(true);
      try {
        const res = await adminApiClient.get("/logins/grouped", {
          params: {
            page: pg,
            limit: 20,
            search: q || undefined,
            status: st || undefined,
          },
        });

        setIpGroups(res.data.ipGroups || []);
        setGroupedTotal(res.data.total || 0);
        setGroupedTotalPages(res.data.totalPages || 1);
        if (res.data.stats) {
          setGroupedStats(res.data.stats);
        }
      } catch {
        toast.error("Failed to query grouped IP telemetry directory.");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [groupedPage, search, statusFilter]
  );

  // ── Fetch Linear Raw Telemetry ──
  const fetchStreamLogins = useCallback(
    async (pg = streamPage, q = search, role = roleFilter, gw = gatewayFilter, st = statusFilter) => {
      setLoading(true);
      try {
        const res = await adminApiClient.get("/logins", {
          params: {
            page: pg,
            limit: 20,
            search: q || undefined,
            role: role || undefined,
            gateway: gw || undefined,
            status: st || undefined,
          },
        });

        setStreamLogins(res.data.logins || []);
        setStreamTotal(res.data.total || 0);
        setStreamTotalPages(res.data.totalPages || 1);
        if (res.data.stats) {
          setStreamStats(res.data.stats);
        }
      } catch {
        toast.error("Failed to query login telemetry stream.");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [streamPage, search, roleFilter, gatewayFilter, statusFilter]
  );

  // ── Fetch Anomaly & Fraud Intelligence Alerts ──
  const fetchAnomalies = useCallback(async () => {
    setAnomalyLoading(true);
    try {
      const res = await adminApiClient.get("/security/anomalies", {
        params: {
          type: anomalyTypeFilter !== "ALL" ? anomalyTypeFilter : undefined,
          limit: 50,
        },
      });
      setAnomalies(res.data.alerts || []);
      if (res.data.stats) {
        setAnomalyStats(res.data.stats);
      }
    } catch {
      toast.error("Failed to load security anomaly telemetry.");
    } finally {
      setAnomalyLoading(false);
    }
  }, [anomalyTypeFilter]);

  // Execute Anomaly Action (Dismiss, Resolve, Block IP, Release Review, Quarantine User)
  const handleAnomalyAction = async (alertId, action, targetIp = null) => {
    try {
      await adminApiClient.post(`/security/anomalies/${alertId}/action`, { action, targetIp });
      toast.success(`Security mitigation action '${action}' applied.`);
      fetchAnomalies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply security action.");
    }
  };

  // Simulate Impossible Travel Event for Verification
  const handleSimulateTravel = async () => {
    setSimulatingTravel(true);
    try {
      const res = await adminApiClient.post("/security/simulate-impossible-travel", {
        fromCity: "Dhaka",
        fromCountry: "BD",
        toCity: "London",
        toCountry: "GB",
        intervalMinutes: 5,
      });
      toast.success(res.data.message || "Simulated impossible travel event generated!");
      fetchAnomalies();
    } catch {
      toast.error("Failed to generate simulated travel alert.");
    } finally {
      setSimulatingTravel(false);
    }
  };

  // Simulate Sybil Review Ring Event for Verification
  const handleSimulateReviewFraud = async () => {
    setSimulatingReview(true);
    try {
      const res = await adminApiClient.post("/security/simulate-review-fraud", {
        targetName: "Advanced Full-Stack Engineering 2026",
      });
      toast.success(res.data.message || "Simulated review fraud ring detected and auto-quarantined!");
      fetchAnomalies();
    } catch {
      toast.error("Failed to generate simulated review fraud alert.");
    } finally {
      setSimulatingReview(false);
    }
  };

  // Refresh current view
  const refreshCurrentView = useCallback(() => {
    if (viewMode === "grouped") {
      fetchGroupedLogins(groupedPage, search, statusFilter);
    } else if (viewMode === "stream") {
      fetchStreamLogins(streamPage, search, roleFilter, gatewayFilter, statusFilter);
    } else if (viewMode === "anomalies") {
      fetchAnomalies();
    }
  }, [
    viewMode,
    groupedPage,
    streamPage,
    search,
    statusFilter,
    roleFilter,
    gatewayFilter,
    fetchGroupedLogins,
    fetchStreamLogins,
    fetchAnomalies,
  ]);

  useEffect(() => {
    if (viewMode === "grouped") {
      fetchGroupedLogins(groupedPage, search, statusFilter);
    } else if (viewMode === "stream") {
      fetchStreamLogins(streamPage, search, roleFilter, gatewayFilter, statusFilter);
    } else if (viewMode === "anomalies") {
      fetchAnomalies();
    }
  }, [
    viewMode,
    groupedPage,
    streamPage,
    statusFilter,
    roleFilter,
    gatewayFilter,
    fetchGroupedLogins,
    fetchStreamLogins,
    fetchAnomalies,
  ]);

  // Load anomaly stats on initial mount for notification badge
  useEffect(() => {
    adminApiClient
      .get("/security/anomalies", { params: { limit: 1 } })
      .then((res) => {
        if (res.data.stats) setAnomalyStats(res.data.stats);
      })
      .catch(() => {});
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (viewMode === "grouped") {
        setGroupedPage(1);
        fetchGroupedLogins(1, val, statusFilter);
      } else {
        setStreamPage(1);
        fetchStreamLogins(1, val, roleFilter, gatewayFilter, statusFilter);
      }
    }, 350);
  };

  const handleCopyIp = (ip, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    toast.success(`IP ${ip} copied to clipboard`);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // ── Open Session Inspection Modal ──
  const handleInspectIp = async (ip) => {
    setInspectModalOpen(true);
    setInspectLoading(true);
    try {
      const res = await adminApiClient.get(`/logins/ip/${encodeURIComponent(ip)}`);
      setSelectedIpData(res.data);
    } catch {
      toast.error(`Failed to load sessions for IP ${ip}`);
    } finally {
      setInspectLoading(false);
    }
  };

  // ── Block IP Action ──
  const handleBlockIp = async (ip) => {
    const { value: reason, isConfirmed } = await showConfirm({
      variant: "danger",
      badge: "FIREWALL RESTRICTION",
      title: "Restrict Client IP Address",
      description:
        "All incoming requests and authentication attempts from this IP address will be rejected immediately with HTTP 403 Forbidden.",
      targetLabel: "Target IP Address",
      targetValue: ip,
      input: {
        type: "text",
        label: "Restriction Reason / Audit Note",
        defaultValue: "Administrative security restriction: suspicious activity detected",
        placeholder: "Enter reason for restriction...",
      },
      confirmText: "Apply IP Restriction",
    });

    if (!isConfirmed) return;

    try {
      const res = await adminApiClient.post("/blocked-ips", {
        ip,
        reason: reason || "Administrative security restriction",
      });
      toast.confirmed(res.data.message || "Client IP Restricted", {
        description: "All requests from this IP are now quarantined.",
        target: ip,
        badge: "IP BLOCKED",
      });
      refreshCurrentView();

      // If inspect modal is open for this IP, update it
      if (selectedIpData && selectedIpData.ip === ip) {
        setSelectedIpData((prev) => ({
          ...prev,
          isBlocked: true,
          blockDetails: {
            reason: reason || "Administrative security restriction",
            blockedBy: "Admin",
            blockedAt: new Date().toISOString(),
          },
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to restrict IP ${ip}`);
    }
  };

  // ── Unblock IP Action ──
  const handleUnblockIp = async (ip) => {
    const result = await showConfirm({
      variant: "approve",
      badge: "ACCESS RESTORE",
      title: "Lift IP Restriction?",
      description:
        "The client will be permitted to authenticate and access platform services immediately.",
      targetLabel: "Target IP Address",
      targetValue: ip,
      confirmText: "Restore Access",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await adminApiClient.delete(`/blocked-ips/${encodeURIComponent(ip)}`);
      toast.confirmed(res.data.message || "IP Restriction Lifted", {
        description: "Platform access has been restored for this client IP.",
        target: ip,
        badge: "RESTORED",
      });
      refreshCurrentView();

      // If inspect modal is open for this IP, update it
      if (selectedIpData && selectedIpData.ip === ip) {
        setSelectedIpData((prev) => ({
          ...prev,
          isBlocked: false,
          blockDetails: null,
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to unblock IP ${ip}`);
    }
  };

  // ── Manual Block Submit ──
  const handleManualBlockSubmit = async (e) => {
    e.preventDefault();
    if (!manualIp.trim()) {
      toast.error("Please enter a valid IP address.");
      return;
    }
    setSubmittingBlock(true);
    try {
      const res = await adminApiClient.post("/blocked-ips", {
        ip: manualIp.trim(),
        reason: manualReason.trim() || "Manual administrative restriction",
      });
      toast.success(res.data.message || `IP ${manualIp} restricted.`);
      setManualIp("");
      setManualReason("");
      setManualBlockOpen(false);
      refreshCurrentView();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to block IP.");
    } finally {
      setSubmittingBlock(false);
    }
  };

  // ── Purge Single Raw Record ──
  const handleDeleteRawRecord = async (id) => {
    const { isConfirmed } = await showConfirm({
      variant: "delete",
      badge: "LOG PURGE",
      title: "Delete Login Telemetry Record?",
      description: "This login event entry will be permanently removed from the telemetry stream.",
      confirmText: "Purge Record",
    });
    if (!isConfirmed) return;

    try {
      await adminApiClient.delete(`/logins/${id}`);
      setStreamLogins((prev) => prev.filter((l) => l._id !== id));
      setStreamTotal((prev) => Math.max(0, prev - 1));
      toast.deleted("Login Record Purged", {
        description: "Telemetry record permanently removed.",
        badge: "LOG DELETED",
      });
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone size={13} className="text-cyan-400 shrink-0" />;
      case "tablet":
        return <Tablet size={13} className="text-indigo-400 shrink-0" />;
      default:
        return <Laptop size={13} className="text-slate-400 shrink-0" />;
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  if (initialLoading) {
    return (
      <AdminPageLoader
        label="Aggregating IP Clusters & Firewall Telemetry..."
        subtext="Tracking geographic nodes, active sessions, and multi-account IP bindings"
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Globe className="text-cyan-400 w-7 h-7" />
            Login & IP Access Control
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Real-time IP telemetry tracking, unique network origins, session audits, and instant platform restriction firewall
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setManualBlockOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl font-mono text-xs font-bold transition-all shadow-sm"
          >
            <Ban size={14} />
            Restrict IP Manually
          </button>

          <button
            onClick={refreshCurrentView}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-mono text-xs font-bold transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sync Telemetry
          </button>
        </div>
      </div>

      {/* ── Top 4 Metric Highlights ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Unique IPs */}
        <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold block">
              Unique Client IPs
            </span>
            <p className="text-xl font-black text-white font-mono mt-1">
              {viewMode === "grouped" ? groupedStats.totalUniqueIps : streamStats.uniqueIpsCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Shield size={20} />
          </div>
        </div>

        {/* Total Logins Recorded */}
        <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
              Total Logins Tracked
            </span>
            <p className="text-xl font-black text-cyan-300 font-mono mt-1">
              {viewMode === "grouped" ? groupedStats.totalLoginsSum : streamTotal}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Activity size={20} />
          </div>
        </div>

        {/* Restricted / Blocked IPs */}
        <div className="bg-[#0b101f]/90 border border-rose-900/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold block">
              Restricted / Blocked
            </span>
            <p className="text-xl font-black text-rose-400 font-mono mt-1">
              {groupedStats.blockedIpsCount} <span className="text-xs text-rose-400/70 font-normal">IPs</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* Active 24h / Admin Logins */}
        <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
              Past 24 Hours
            </span>
            <p className="text-xl font-black text-emerald-300 font-mono mt-1">
              {streamStats.todayCount || groupedStats.totalUniqueIps}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* ── View Switcher & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0b101f]/80 p-3 rounded-2xl border border-slate-800/80">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[#070b16] rounded-xl border border-slate-800/90 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("grouped")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "grouped"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers size={13} />
            Grouped by IP Directory
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-slate-900 border border-slate-700 text-slate-300">
              1 Row / IP
            </span>
          </button>

          <button
            onClick={() => setViewMode("stream")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "stream"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity size={13} />
            Raw Event Stream
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-slate-900 border border-slate-700 text-slate-300">
              {streamTotal}
            </span>
          </button>

          <button
            onClick={() => setViewMode("anomalies")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "anomalies"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert size={13} className="text-rose-400" />
            Security &amp; Fraud Intelligence
            {anomalyStats.unresolved > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-rose-600 text-white font-bold animate-pulse">
                {anomalyStats.unresolved} ALERTS
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-slate-800 text-slate-400 font-bold">
                {anomalyStats.total}
              </span>
            )}
          </button>
        </div>

        {/* Status / Restriction Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                if (viewMode === "grouped") setGroupedPage(1);
                else setStreamPage(1);
              }}
              className="px-3 py-2 bg-[#070b16] border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Access Statuses</option>
              <option value="allowed">Allowed / Permitted Only</option>
              <option value="blocked">Restricted / Blocked Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder={
            viewMode === "grouped"
              ? "Search by Client IP address, User Email, or Full Name..."
              : "Search linear logins by IP, User Name, Email..."
          }
          className="w-full pl-9 pr-4 py-2.5 bg-[#0b101f] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
        />
      </div>

      {/* ── VIEW 1: GROUPED BY IP DIRECTORY (DEFAULT) ── */}
      {viewMode === "grouped" && (
        <div className="bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-[#070b16]/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                Unique IP Addresses & Session Clusters
              </h3>
            </div>
            <span className="text-xs font-mono text-cyan-400">{groupedTotal} Unique IP(s) Monitored</span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="md" label="Aggregating IP clusters and firewall status..." />
            </div>
          ) : ipGroups.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-mono text-xs">
              No unique IP records found matching current query or filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-[#070b16]/50">
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      Client IP Address & Status
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Total Sessions
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Associated Accounts Logged In
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Devices & Gateways
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Security Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {ipGroups.map((group) => {
                    const isRestricted = group.isBlocked;

                    return (
                      <tr
                        key={group.ip}
                        className={`transition-colors ${
                          isRestricted ? "bg-rose-950/20 hover:bg-rose-950/30" : "hover:bg-slate-800/30"
                        }`}
                      >
                        {/* IP Address & Status Badge */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${
                                  isRestricted
                                    ? "bg-rose-950/80 border-rose-800 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                                    : "bg-cyan-950/70 border-cyan-800/70 text-cyan-300"
                                }`}
                              >
                                {group.ip}
                              </span>
                              <button
                                onClick={(e) => handleCopyIp(group.ip, e)}
                                className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                                title="Copy IP"
                              >
                                {copiedIp === group.ip ? (
                                  <Check size={13} className="text-emerald-400" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>

                            {/* Status indicator */}
                            {isRestricted ? (
                              <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold">
                                <ShieldAlert size={12} className="shrink-0 animate-pulse text-rose-400" />
                                <span>Restricted by Admin</span>
                                {group.blockDetails?.reason && (
                                  <span
                                    className="text-slate-400 font-normal truncate max-w-[150px]"
                                    title={group.blockDetails.reason}
                                  >
                                    ({group.blockDetails.reason})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                                <ShieldCheck size={12} className="shrink-0 text-emerald-400" />
                                <span>Permitted &bull; Active</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Total Sessions Count */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-black text-white font-mono">
                              {group.totalLogins}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase">logins</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                            <span className="text-emerald-400 font-bold">{group.successCount || 0} ok</span>
                            {group.failedCount > 0 && (
                              <span className="text-rose-400 font-bold">{group.failedCount} failed</span>
                            )}
                          </div>
                        </td>

                        {/* Associated Accounts */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 max-w-[280px]">
                            {group.accounts && group.accounts.length > 0 ? (
                              group.accounts.slice(0, 2).map((acc, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px] text-indigo-300 uppercase shrink-0">
                                    {acc.fullName ? acc.fullName.charAt(0) : acc.email?.charAt(0) || "U"}
                                  </div>
                                  <span className="text-xs text-slate-200 truncate font-semibold">
                                    {acc.email}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-400 shrink-0">
                                    {acc.role || "user"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unauthenticated</span>
                            )}

                            {group.accounts && group.accounts.length > 2 && (
                              <button
                                onClick={() => handleInspectIp(group.ip)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 text-left font-bold"
                              >
                                +{group.accounts.length - 2} more account(s) used
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Devices & Gateways */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 max-w-[220px]">
                            {group.devices && group.devices.length > 0 ? (
                              group.devices.slice(0, 2).map((dev, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                                  {getDeviceIcon(dev.deviceType)}
                                  <span className="truncate">
                                    {dev.browser || "Browser"} on {dev.os || "OS"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[11px]">—</span>
                            )}

                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {(group.gateways || []).map((gw, idx) => (
                                <span
                                  key={idx}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                    gw?.includes("Admin")
                                      ? "bg-amber-950/70 border-amber-800/80 text-amber-300"
                                      : "bg-indigo-950/70 border-indigo-800/80 text-indigo-300"
                                  }`}
                                >
                                  {gw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Last Active Timestamp */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-slate-300 block font-bold text-xs">
                            {formatRelativeTime(group.lastLogin)}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {group.lastLogin ? new Date(group.lastLogin).toLocaleString() : "—"}
                          </span>
                        </td>

                        {/* Security Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Inspect sessions modal */}
                            <button
                              onClick={() => handleInspectIp(group.ip)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold transition-all shadow-sm"
                              title="Inspect all sessions from this IP"
                            >
                              <Eye size={13} />
                              Inspect
                            </button>

                            {/* Block / Unblock Toggle Button */}
                            {isRestricted ? (
                              <button
                                onClick={() => handleUnblockIp(group.ip)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                                title="Lift IP restriction"
                              >
                                <Check size={13} />
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockIp(group.ip)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
                                title="Restrict this IP immediately"
                              >
                                <Ban size={13} />
                                Block IP
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Grouped Pagination Bar */}
          {groupedTotalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800/80 bg-[#070b16]/40 flex items-center justify-between">
              <p className="text-xs font-mono text-slate-400">
                Page <span className="text-cyan-400 font-bold">{groupedPage}</span> of {groupedTotalPages} &bull;{" "}
                {groupedTotal} unique client IPs
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGroupedPage((p) => Math.max(1, p - 1))}
                  disabled={groupedPage === 1}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setGroupedPage((p) => Math.min(groupedTotalPages, p + 1))}
                  disabled={groupedPage === groupedTotalPages}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: RAW LINEAR EVENT STREAM ── */}
      {viewMode === "stream" && (
        <div className="bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-[#070b16]/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                Sequential Login Telemetry Stream
              </h3>
            </div>
            <span className="text-xs font-mono text-cyan-400">{streamTotal} Events Recorded</span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="md" label="Streaming sequential authentication logs..." />
            </div>
          ) : streamLogins.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-mono text-xs">
              No login records found matching current query or filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-[#070b16]/50">
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      User Identity
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      Client IP
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Device & OS
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Gateway
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {streamLogins.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-cyan-300 uppercase shrink-0">
                            {item.fullName ? item.fullName.charAt(0) : item.email?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{item.fullName || "User"}</p>
                            <p className="text-[11px] text-slate-400 truncate">{item.email}</p>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                              {item.role || "user"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-slate-300 block font-bold text-[11px]">
                          {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "—"}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "—"}
                        </span>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-cyan-950/70 border border-cyan-800/70 text-cyan-300 rounded-lg font-mono font-bold text-xs">
                            {item.ip || "127.0.0.1"}
                          </span>
                          <button
                            onClick={() => handleCopyIp(item.ip || "127.0.0.1")}
                            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                          >
                            {copiedIp === item.ip ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(item.deviceType)}
                          <span className="text-slate-300 text-xs">
                            {item.browser || "Browser"} &bull; {item.os || "Desktop"}
                          </span>
                        </div>
                      </td>

                      {/* Gateway */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.gateway?.includes("Admin")
                              ? "bg-amber-950/70 border-amber-800/80 text-amber-300"
                              : "bg-indigo-950/70 border-indigo-800/80 text-indigo-300"
                          }`}
                        >
                          {item.gateway || "Web Portal"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-300 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            {item.status || "Failed"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspectIp(item.ip)}
                            className="p-1.5 text-cyan-400 hover:bg-cyan-950/40 rounded-lg transition-all"
                            title="Inspect IP"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRawRecord(item._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all"
                            title="Delete log record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stream Pagination */}
          {streamTotalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800/80 bg-[#070b16]/40 flex items-center justify-between">
              <p className="text-xs font-mono text-slate-400">
                Page <span className="text-cyan-400 font-bold">{streamPage}</span> of {streamTotalPages} &bull;{" "}
                {streamTotal} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStreamPage((p) => Math.max(1, p - 1))}
                  disabled={streamPage === 1}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setStreamPage((p) => Math.min(streamTotalPages, p + 1))}
                  disabled={streamPage === streamTotalPages}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 3: ANOMALY & FRAUD INTELLIGENCE (IMPOSSIBLE TRAVEL & REVIEW FRAUD RINGS) ── */}
      {viewMode === "anomalies" && (
        <div className="space-y-6">
          {/* Top Intelligence Banner with Simulation Triggers */}
          <div className="bg-[#0E1322] rounded-xl border border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  <ShieldAlert size={13} className="text-rose-400" />
                  <span>Automated Anomaly &amp; Sybil Ring Detection</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Security Intelligence &amp; Fraud Telemetry
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Detects physically impossible geographic velocity jumps (e.g. Dhaka to London in minutes)
                  and multi-account Sybil review rings from identical IP addresses attempting to inflate course ratings.
                </p>
              </div>

              {/* Simulation Demo Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateTravel}
                  disabled={simulatingTravel}
                  className="px-3.5 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
                  title="Simulate Dhaka -> London login jump"
                >
                  <Zap size={13} className={simulatingTravel ? "animate-spin" : "text-rose-200"} />
                  <span>{simulatingTravel ? "Simulating..." : "Simulate Impossible Travel"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateReviewFraud}
                  disabled={simulatingReview}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
                  title="Simulate multi-account 5-star review burst from same IP"
                >
                  <Star size={13} className={simulatingReview ? "animate-spin" : "fill-amber-400 text-amber-400"} />
                  <span>{simulatingReview ? "Simulating..." : "Simulate Review Fraud"}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchAnomalies}
                  disabled={anomalyLoading}
                  className="p-2 rounded-lg bg-[#080B11] border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title="Refresh security alerts"
                >
                  <RefreshCw size={16} className={anomalyLoading ? "animate-spin text-cyan-400" : ""} />
                </button>
              </div>
            </div>

            {/* Sub-Filter Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setAnomalyTypeFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  anomalyTypeFilter === "ALL"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Alerts ({anomalyStats.total})
              </button>
              <button
                type="button"
                onClick={() => setAnomalyTypeFilter("IMPOSSIBLE_TRAVEL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  anomalyTypeFilter === "IMPOSSIBLE_TRAVEL"
                    ? "bg-rose-950/80 text-rose-300 border border-rose-700/60"
                    : "text-slate-400 hover:text-rose-300"
                }`}
              >
                Impossible Travel ({anomalyStats.impossibleTravel})
              </button>
              <button
                type="button"
                onClick={() => setAnomalyTypeFilter("REVIEW_FRAUD_RING")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  anomalyTypeFilter === "REVIEW_FRAUD_RING"
                    ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                    : "text-slate-400 hover:text-amber-300"
                }`}
              >
                Review Fraud Rings ({anomalyStats.reviewFraud})
              </button>
            </div>
          </div>

          {/* Alerts Feed */}
          {anomalyLoading ? (
            <div className="bg-[#0b101f]/90 rounded-3xl border border-slate-800/80 p-16 text-center space-y-3 shadow-xl">
              <LoadingSpinner size="lg" label="Analyzing real-time velocity & review audit logs..." />
            </div>
          ) : anomalies.length === 0 ? (
            <div className="bg-[#0b101f]/90 rounded-3xl border border-slate-800/80 p-16 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white font-mono">
                  All Systems Clear • Zero Security Anomalies
                </h4>
                <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                  No impossible travel velocity violations or multi-account review rings currently flagged.
                  Use the simulation buttons above to test detection flows in real time.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((alert) => {
                const isTravel = alert.type === "IMPOSSIBLE_TRAVEL";
                const isReview = alert.type === "REVIEW_FRAUD_RING";
                const isUnresolved = alert.status === "UNRESOLVED" || alert.status === "AUTO_QUARANTINED";

                return (
                  <div
                    key={alert._id}
                    className={`rounded-xl p-5 sm:p-6 border transition-all shadow-sm ${
                      isTravel
                        ? "bg-[#0E1322] border-rose-500/30"
                        : "bg-[#0E1322] border-amber-500/30"
                    }`}
                  >
                    {/* Alert Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isTravel
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          }`}
                        >
                          {isTravel ? <Plane size={20} /> : <Star size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-black tracking-wider uppercase ${
                                isTravel ? "text-rose-400" : "text-amber-400"
                              }`}
                            >
                              {isTravel ? "Impossible Travel Alert" : "Review Fraud Detection"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                isUnresolved
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {alert.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                            Detected {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Recently"}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isTravel && alert.currentLocation?.ip && (
                          <button
                            type="button"
                            onClick={() => handleAnomalyAction(alert._id, "block_ip", alert.currentLocation.ip)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Ban size={13} />
                            <span>Block Current IP ({alert.currentLocation.ip})</span>
                          </button>
                        )}

                        {isReview && alert.reviewerIp && (
                          <button
                            type="button"
                            onClick={() => handleAnomalyAction(alert._id, "block_ip", alert.reviewerIp)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Ban size={13} />
                            <span>Block Quarantined IP ({alert.reviewerIp})</span>
                          </button>
                        )}

                        {isReview && alert.status === "AUTO_QUARANTINED" && (
                          <button
                            type="button"
                            onClick={() => handleAnomalyAction(alert._id, "release_review")}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check size={13} />
                            <span>Release Review</span>
                          </button>
                        )}

                        {isUnresolved && (
                          <button
                            type="button"
                            onClick={() => handleAnomalyAction(alert._id, "dismiss")}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Alert Card Body */}
                    <div className="pt-4 space-y-4">
                      {/* IMPOSSIBLE TRAVEL BODY */}
                      {isTravel && (
                        <div className="space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                            {/* Previous Origin */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 uppercase font-bold">Origin Location</span>
                              <p className="text-sm font-bold text-white">
                                {alert.previousLocation?.city || "City"}, {alert.previousLocation?.country || "BD"}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                IP: {alert.previousLocation?.ip} &bull;{" "}
                                {alert.previousLocation?.timestamp
                                  ? new Date(alert.previousLocation.timestamp).toLocaleTimeString()
                                  : "Past"}
                              </p>
                            </div>

                            {/* Distance & Velocity Pill */}
                            <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center shrink-0">
                              <span className="text-[10px] text-rose-400 uppercase font-extrabold flex items-center gap-1">
                                <Plane size={12} />
                                {alert.metrics?.speedKmh?.toLocaleString() || "95,000"} km/h
                              </span>
                              <span className="text-[11px] text-slate-300 font-bold">
                                {alert.metrics?.distanceKm?.toLocaleString() || "7,940"} km in{" "}
                                {alert.metrics?.timeDiffMinutes || "5"}m
                              </span>
                              <span className="text-[9px] text-rose-400/80 font-sans">
                                (Max Flight Speed: 800 km/h)
                              </span>
                            </div>

                            {/* Current Destination */}
                            <div className="space-y-1 text-right">
                              <span className="text-[10px] text-slate-500 uppercase font-bold">Current Login</span>
                              <p className="text-sm font-bold text-rose-300">
                                {alert.currentLocation?.city || "London"},{" "}
                                {alert.currentLocation?.country || "GB"}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                IP: {alert.currentLocation?.ip} &bull;{" "}
                                {alert.currentLocation?.timestamp
                                  ? new Date(alert.currentLocation.timestamp).toLocaleTimeString()
                                  : "Now"}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-slate-300 font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                            <b>Anomaly Intelligence Summary:</b> {alert.details}
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
                            <span>
                              Target Account: <b className="text-white">{alert.email}</b> ({alert.fullName || "User"})
                            </span>
                            <span>Severity: <b className="text-rose-400">{alert.severity || "CRITICAL"}</b></span>
                          </div>
                        </div>
                      )}

                      {/* REVIEW FRAUD RING BODY */}
                      {isReview && (
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Target Course / Mentor</span>
                                <p className="text-base font-bold text-amber-300">
                                  {alert.targetName || alert.targetId}
                                </p>
                              </div>
                              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                                <Star size={13} className="fill-amber-400 text-amber-400" />
                                <span>5.0 Star Auto-Quarantined</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                              <span className="text-[10px] text-slate-500 uppercase font-bold">
                                Detected Sybil Ring Accounts (Same IP: {alert.reviewerIp})
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {(alert.ringAccounts || [alert.reviewerEmail]).map((acc, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                                  >
                                    {acc}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {alert.reviewText && (
                              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-sans italic">
                                &ldquo;{alert.reviewText}&rdquo;
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-slate-300 font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                            <b>Anti-Fraud Action Taken:</b> Review has been quarantined and omitted from public
                            aggregate rating calculations to protect leaderboard and marketplace credibility.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: DEEP SESSION INSPECTION MODAL ── */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
          <div className="bg-[#0b101f] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#070b16]/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Terminal size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">IP Session Audit:</h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 text-sm font-bold">
                      {selectedIpData?.ip || "Client IP"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                    Detailed telemetry history of every account and session originating from this IP address
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedIpData && (
                  selectedIpData.isBlocked ? (
                    <button
                      onClick={() => handleUnblockIp(selectedIpData.ip)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      Lift Restriction
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBlockIp(selectedIpData.ip)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Ban size={14} />
                      Restrict IP
                    </button>
                  )
                )}

                <button
                  onClick={() => setInspectModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Block Warning Banner (if blocked) */}
            {selectedIpData?.isBlocked && (
              <div className="px-6 py-3 bg-rose-950/60 border-b border-rose-800/80 flex items-center justify-between text-xs text-rose-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-rose-400 shrink-0" />
                  <span>
                    <b>RESTRICTED IP:</b> All platform traffic from this address is currently rejected (HTTP 403).
                  </span>
                </div>
                {selectedIpData.blockDetails?.reason && (
                  <span className="text-slate-300 text-[11px]">
                    Reason: <i>{selectedIpData.blockDetails.reason}</i>
                  </span>
                )}
              </div>
            )}

            {/* Modal Body / Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {inspectLoading ? (
                <div className="py-20 flex justify-center">
                  <LoadingSpinner size="md" label="Loading deep session telemetry..." />
                </div>
              ) : !selectedIpData || selectedIpData.records?.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-sans">
                  No historical sessions recorded for IP {selectedIpData?.ip}.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span>
                      Total Recorded Sessions: <b className="text-white">{selectedIpData.totalSessions}</b>
                    </span>
                    <span className="text-slate-400 text-[11px]">Showing up to 300 most recent events</span>
                  </div>

                  <div className="divide-y divide-slate-800/70 border border-slate-800 rounded-2xl overflow-hidden bg-[#070b16]/70">
                    {selectedIpData.records.map((rec, idx) => (
                      <div
                        key={rec._id || idx}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Account details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-cyan-300 uppercase shrink-0">
                            {rec.fullName ? rec.fullName.charAt(0) : rec.email?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white truncate">{rec.email || "Unknown"}</p>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                                {rec.role || "user"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {rec.fullName || "User"} &bull; Gateway:{" "}
                              <span className="text-cyan-300">{rec.gateway || "Web Portal"}</span>
                            </p>
                          </div>
                        </div>

                        {/* Device & Status & Timestamp */}
                        <div className="flex items-center gap-4 text-right self-end sm:self-auto shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300 justify-end">
                              {getDeviceIcon(rec.deviceType)}
                              <span>
                                {rec.browser || "Browser"} / {rec.os || "OS"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {rec.timestamp ? new Date(rec.timestamp).toLocaleString() : "—"}
                            </span>
                          </div>

                          {/* Status Pill */}
                          <div className="min-w-[90px] text-right">
                            {rec.status === "SUCCESS" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-800/80 text-emerald-300 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Authenticated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-800/80 text-rose-300 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                {rec.status || "Failed"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-[#070b16] flex justify-end">
              <button
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold font-mono transition-colors"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MANUAL IP RESTRICTION DIALOG ── */}
      {manualBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
          <div className="bg-[#0b101f] border border-rose-500/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-rose-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Ban size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Manual IP Restriction</h3>
                  <p className="text-[11px] text-slate-400 font-sans">Blacklist any client IP from accessing the platform</p>
                </div>
              </div>
              <button
                onClick={() => setManualBlockOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleManualBlockSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target IP Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.100 or 103.145.72.10"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason / Policy Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excessive suspicious logins, DDoS attempt"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-[11px] text-rose-300 font-sans leading-relaxed">
                <AlertTriangle size={14} className="inline mr-1 text-rose-400" />
                Once restricted, requests from this IP will receive <b>HTTP 403 Forbidden</b> immediately with an in-memory cache lookup.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setManualBlockOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBlock}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingBlock && <LoadingSpinner size="sm" />}
                  Confirm Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogins;
