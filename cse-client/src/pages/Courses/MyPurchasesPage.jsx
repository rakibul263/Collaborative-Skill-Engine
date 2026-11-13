import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Receipt,
  BookOpen,
  Play,
  Search,
  Wallet,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  Award,
  ShieldAlert,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { formatBDT } from "@/lib/money";
import { FullScreenLoader } from "@/components/shared/loading/LoadingSpinner";
import InvoiceModal from "@/components/courses/InvoiceModal";
import CourseCertificateModal from "@/components/courses/CourseCertificateModal";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop";

/**
 * MyPurchasesPage (/my-purchases) — Accessible via Avatar Dropdown Menu.
 * Displays complete course purchase history, BDT amounts paid, classroom launch,
 * and printable official invoices.
 */
const MyPurchasesPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);
  const [activeCertCourse, setActiveCertCourse] = useState(null);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/courses/my-purchases");
      setSummary(res.data);
    } catch {
      setSummary({
        totalPurchases: 0,
        activeCourses: 0,
        totalSpent: 0,
        purchases: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (!active) return;
      await loadPurchases();
    };
    run();
    return () => {
      active = false;
    };
  }, [loadPurchases]);

  const filteredPurchases = useMemo(() => {
    const list = summary?.purchases || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.courseTitle?.toLowerCase().includes(q) ||
        p.instructorName?.toLowerCase().includes(q) ||
        p.invoiceNumber?.toLowerCase().includes(q) ||
        p.topic?.toLowerCase().includes(q)
    );
  }, [summary, search]);

  if (loading) {
    return (
      <FullScreenLoader
        message="Loading Your Purchase History & Invoices..."
        subtext="Retrieving verified BDT transactions and course enrollments"
      />
    );
  }

  return (
    <div className="min-h-screen py-14 px-4 sm:px-6 lg:px-8 bg-transparent text-slate-100 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[780px] h-[420px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-emerald-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 pt-14 space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5" />
              Purchase History &amp; Receipts
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Purchased Courses &amp; Invoices
            </h1>
            <p className="text-xs text-slate-400">
              Access your dedicated Course Classrooms, track completion, and inspect official BDT payment invoices anytime.
            </p>
          </div>

          <button
            onClick={() => navigate("/courses")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explore More Courses</span>
          </button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Purchased Courses
              </span>
              <p className="text-2xl font-black text-white mt-1">
                {summary?.totalPurchases || 0}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Active Enrollments
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {summary?.activeCourses || 0}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Total BDT Paid
              </span>
              <p className="text-2xl font-black text-white mt-1">
                {formatBDT(summary?.totalSpent || 0)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by course title, instructor, topic, or invoice number (INV-...)..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Purchase Records */}
        {filteredPurchases.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl py-16 px-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Course Purchases Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Once you enroll in a course, it will appear here with instant classroom access and a verified BDT invoice.
              </p>
            </div>
            <button
              onClick={() => navigate("/courses")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
            >
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map((p) => (
              <div
                key={p.enrollmentId}
                className="bg-slate-900/85 border border-slate-800 hover:border-indigo-500/35 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all shadow-lg"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 flex-1">
                  <img
                    src={p.thumbnailUrl || PLACEHOLDER}
                    alt={p.courseTitle}
                    onError={(e) => {
                      e.target.src = PLACEHOLDER;
                    }}
                    className="w-full sm:w-36 aspect-video rounded-xl object-cover border border-slate-800 shrink-0"
                  />

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 font-mono text-[10px] font-bold text-cyan-300">
                        {p.invoiceNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          p.status === "active"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {p.status}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-300">
                        {p.topic}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {p.courseTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>Instructor: <strong className="text-slate-200">{p.instructorName}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {p.purchasedAt
                          ? new Date(p.purchasedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                      {p.totalVideos > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">
                            {p.completedVideos}/{p.totalVideos} Videos ({p.progressPercent}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price + Actions */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800 shrink-0">
                  <div className="lg:text-right mr-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Amount Paid
                    </span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {formatBDT(p.price)} BDT
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveInvoiceId(p.enrollmentId)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Invoice</span>
                  </button>

                  {p.certificateUnlocked && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCertCourse({
                          courseId: p.courseId,
                          courseTitle: p.courseTitle,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Certificate</span>
                    </button>
                  )}

                  {p.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/learn/${p.courseId}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Open Classroom</span>
                    </button>
                  ) : p.status === "banned" || p.status === "suspended" ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/learn/${p.courseId}`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-xs font-bold text-rose-300 transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>View Restriction &amp; Appeal</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/courses/${p.courseId}`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Course Page</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeInvoiceId && (
        <InvoiceModal
          enrollmentId={activeInvoiceId}
          onClose={() => setActiveInvoiceId(null)}
        />
      )}

      {activeCertCourse && (
        <CourseCertificateModal
          courseId={activeCertCourse.courseId}
          courseTitle={activeCertCourse.courseTitle}
          onClose={() => setActiveCertCourse(null)}
        />
      )}
    </div>
  );
};

export default MyPurchasesPage;

