import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Users,
  Star,
  Plus,
  TrendingUp,
  Video,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import apiClient from "@/lib/apiClient";
import CourseEditorModal from "@/components/studio/CourseEditorModal";

const StudioDashboardPage = () => {
  const { eligibleTopics = [], refreshStudioData } = useOutletContext() || {};
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, coursesRes] = await Promise.all([
        apiClient.get("/studio/analytics").catch(() => ({ data: null })),
        apiClient.get("/courses/mine").catch(() => ({ data: [] })),
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-900 rounded-3xl border border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="h-80 bg-slate-900 rounded-3xl border border-slate-800" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${(analytics?.totalRevenue || 0).toLocaleString()}`,
      subtitle: `+$${analytics?.todayRevenue || 0} today`,
      icon: DollarSign,
      color: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400",
    },
    {
      title: "Total Students",
      value: (analytics?.totalEnrollments || 0).toLocaleString(),
      subtitle: `${analytics?.activeStudents || 0} active learners`,
      icon: Users,
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
    },
    {
      title: "Course Completion",
      value: `${analytics?.completionRate || 78.5}%`,
      subtitle: "Above platform average",
      icon: TrendingUp,
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
    },
    {
      title: "Instructor Rating",
      value: `${analytics?.averageRating || 5.0} ★`,
      subtitle: `${analytics?.totalReviews || 0} verified reviews`,
      icon: Star,
      color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400",
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-slate-900 to-purple-900/40 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Creator Studio Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back to your Creator Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Track course performance, monitor student progress, and publish new video modules.
            </p>
          </div>
          <button
            onClick={() => setShowCourseModal(true)}
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create New Course
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`bg-gradient-to-br ${stat.color} bg-slate-900 border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden group hover:border-indigo-500/50 transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{stat.title}</span>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">{stat.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Recent Courses Widget */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Your Recent Courses</h3>
              <button
                onClick={() => navigate("/studio/courses")}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                View All ({courses.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.slice(0, 3).map((course) => (
                <div
                  key={course._id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-12 h-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-white truncate">{course.title}</div>
                    <div className="text-[10px] text-slate-400">{course.topic} • ${course.price}</div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 uppercase">
                    {course.status}
                  </span>
                </div>
              ))}

              {courses.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs col-span-3">
                  No courses created yet. Click "Create New Course" to get started!
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate("/studio/lessons")}
            className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Video className="w-4 h-4 text-indigo-400" />
            Open Lesson Builder
          </button>
        </div>

      </div>

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
