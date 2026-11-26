import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Users,
  Star,
  Plus,
  TrendingUp,
  Video,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Edit3,
  Award,
  Layers,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import CourseEditorModal from "@/components/studio/CourseEditorModal";
import useAuth from "@/hooks/useAuth";
import { formatBDT } from "@/lib/money";

const StudioDashboardPage = () => {
  const { eligibleTopics = [], refreshStudioData } = useOutletContext() || {};
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(() => getCachedData("/studio/analytics"));
  const [courses, setCourses] = useState(() => getCachedData("/courses/mine") || []);
  const [loading, setLoading] = useState(
    () => !(getCachedData("/studio/analytics") && getCachedData("/courses/mine"))
  );
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [activeCourseFilter, setActiveCourseFilter] = useState("all");

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    const hasWarm = Boolean(getCachedData("/studio/analytics") && getCachedData("/courses/mine"));
    if (!hasWarm && !forceRefresh) setLoading(true);
    try {
      const [analyticsRes, coursesRes] = await Promise.all([
        apiClient.get("/studio/analytics", { forceRefresh }).catch(() => ({ data: null })),
        apiClient.get("/courses/mine", { forceRefresh }).catch(() => ({ data: [] })),
      ]);
      setAnalytics(analyticsRes.data);
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error("Fetch dashboard data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const displayName = user?.fullName || user?.displayName || "Instructor";

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-900/90 rounded-3xl border border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900/90 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="h-96 bg-slate-900/90 rounded-3xl border border-slate-800" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: formatBDT(analytics?.totalRevenue || 0),
      subtitle: `+${formatBDT(analytics?.todayRevenue || 0)} earned today`,
      icon: Wallet,
      color: "from-indigo-600/20 via-purple-600/10 to-transparent border-indigo-500/30 text-indigo-400",
      pill: "85% Creator Share",
    },
    {
      title: "Enrolled Students",
      value: (analytics?.totalEnrollments || 0).toLocaleString(),
      subtitle: `${analytics?.activeStudents || 0} active learners`,
      icon: Users,
      color: "from-emerald-600/20 via-teal-600/10 to-transparent border-emerald-500/30 text-emerald-400",
      pill: "Active",
    },
    {
      title: "Course Completion",
      value: `${analytics?.completionRate || 82.5}%`,
      subtitle: "Avg student progress rate",
      icon: TrendingUp,
      color: "from-amber-600/20 via-orange-600/10 to-transparent border-amber-500/30 text-amber-400",
      pill: "Top 10%",
    },
    {
      title: "Instructor Reputation",
      value: `${analytics?.averageRating || 5.0} ★`,
      subtitle: `${analytics?.totalReviews || 0} verified reviews`,
      icon: Star,
      color: "from-pink-600/20 via-rose-600/10 to-transparent border-pink-500/30 text-pink-400",
      pill: "Verified",
    },
  ];

  const filteredCourses = courses.filter((c) => {
    if (activeCourseFilter === "approved") return c.status === "approved";
    if (activeCourseFilter === "draft") return c.status === "draft";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* ─── 1. WELCOME HERO BANNER ─── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/70 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Creator Workspace
              </span>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                {courses.length} Course{courses.length !== 1 ? "s" : ""} Published
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Welcome back, <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{displayName}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Create and publish high-impact courses, record video curriculum lessons, monitor student enrollment metrics, and track your instructor revenue in real-time.
            </p>
          </div>

          {/* Action Button Cluster */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowCourseModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Course</span>
            </button>

            <button
              onClick={() => navigate("/studio/lessons")}
              className="inline-flex items-center gap-2 px-4 py-3 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Lesson Builder</span>
            </button>

            <button
              onClick={() => navigate("/courses")}
              className="inline-flex items-center gap-1.5 p-3 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 rounded-2xl transition-all cursor-pointer"
              title="View Public Marketplace"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. KPI METRICS CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`bg-slate-900/90 bg-gradient-to-br ${stat.color} border rounded-3xl p-5 shadow-xl space-y-3 relative overflow-hidden group hover:scale-[1.02] transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{stat.title}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                  {stat.pill}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">{stat.subtitle}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 3. TOPIC ELIGIBILITY HUB (CLEAR & INFORMATIVE) ─── */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Authorized Teaching Disciplines
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                  {eligibleTopics.length} Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                You are officially authorized to publish and monetize courses under these verified topics.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/network")}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Unlock More Topics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {eligibleTopics.map((topic) => (
            <div
              key={topic}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-slate-200 text-xs font-semibold hover:border-indigo-500/50 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{topic}</span>
            </div>
          ))}

          {eligibleTopics.length === 0 && (
            <p className="text-xs text-slate-500">
              Complete peer mentoring sessions or update your teach skills profile to unlock eligible topics.
            </p>
          )}
        </div>
      </div>

      {/* ─── 4. RECENT COURSES MANAGER ─── */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Course Catalog Management
            </h3>
            <p className="text-xs text-slate-400">
              Review published curriculums, draft new modules, and view performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {["all", "approved", "draft"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveCourseFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeCourseFilter === tab
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                {tab === "all" ? `All (${courses.length})` : tab}
              </button>
            ))}

            <button
              onClick={() => navigate("/studio/courses")}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 ml-2 cursor-pointer"
            >
              View Full List →
            </button>
          </div>
        </div>

        {/* Courses Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.slice(0, 6).map((course) => (
            <div
              key={course._id}
              className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl hover:border-slate-700 transition-all flex flex-col justify-between group space-y-3"
            >
              <div className="flex items-start gap-3">
                <img
                  src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80"}
                  alt={course.title}
                  className="w-16 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      {course.topic}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        course.status === "approved"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {course.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                    {course.title}
                  </h4>
                  <p className="text-[11px] text-indigo-400 font-extrabold mt-0.5">
                    {formatBDT(course.price)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  {course.curriculum?.length || 1} Module{course.curriculum?.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => navigate("/studio/lessons")}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Edit Lessons"
                  >
                    <Video className="w-3 h-3 text-indigo-400" />
                    <span>Lessons</span>
                  </button>
                  <button
                    onClick={() => navigate(`/courses/${course._id}`)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                    title="View in Marketplace"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredCourses.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 p-6 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No courses created in this tab</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ready to share your knowledge? Click below to launch your first course in 3 simple steps.
              </p>
              <button
                onClick={() => setShowCourseModal(true)}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Course</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. CREATOR ACADEMY TIPS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
            01
          </div>
          <h4 className="text-xs font-bold text-white">Focused Video Modules</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Keep lessons between 5 to 12 minutes. Short, single-topic videos produce up to 4x higher completion rates.
          </p>
        </div>

        <div className="p-5 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
            02
          </div>
          <h4 className="text-xs font-bold text-white">Hands-on Practice Projects</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Include a real-world repository or code sandbox in your curriculum to give learners immediate portfolio items.
          </p>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            03
          </div>
          <h4 className="text-xs font-bold text-white">Launch Promo Discounts</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Create early-bird coupon codes in the Coupons tab to drive initial enrollments and gather verified student reviews.
          </p>
        </div>
      </div>

      {/* Course Creation Modal */}
      {showCourseModal && (
        <CourseEditorModal
          eligibleTopics={eligibleTopics}
          onSuccess={() => {
            fetchDashboardData();
            if (refreshStudioData) refreshStudioData();
          }}
          onClose={() => setShowCourseModal(false)}
        />
      )}
    </div>
  );
};

export default StudioDashboardPage;
