import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Wallet,
  Users,
  BookOpen,
  Star,
  Plus,
  TrendingUp,
  Award,
  Video,
  Youtube,
  Settings,
  Bell,
  RefreshCw,
  Search,
  Eye,
  Edit3,
  Trash2,
  Lock,
  MessageSquare,
  ShieldCheck,
  Tag,
  BarChart3,
  Layers,
  UserCheck,
  CheckCircle2,
  Copy,
  Sparkles,
} from "lucide-react";
import { formatBDT } from "@/lib/money";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import apiClient from "@/lib/apiClient";
import CourseEditorModal from "./CourseEditorModal";
import LessonEditorModal from "./LessonEditorModal";
import YouTubeVideoUploadModal from "./YouTubeVideoUploadModal";
import StudentManagementModal from "./StudentManagementModal";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

const StudioDashboardView = ({ eligibleTopics = [] }) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Analytics & Stats Data
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [videoUploadLesson, setVideoUploadLesson] = useState(null);
  const [selectedCourseIdForLesson, setSelectedCourseIdForLesson] = useState(null);
  const [selectedLessonForEdit, setSelectedLessonForEdit] = useState(null);
  const [selectedStudentForMgmt, setSelectedStudentForMgmt] = useState(null);
  const [courseLessonsMap, setCourseLessonsMap] = useState({});

  // Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilterStatus, setStudentFilterStatus] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, coursesRes, studentsRes, reviewsRes] = await Promise.all([
        apiClient.get("/studio/analytics").catch(() => ({ data: null })),
        apiClient.get("/courses/mine").catch(() => ({ data: [] })),
        apiClient.get("/dashboard/enrolled-students").catch(() => ({ data: { courses: [] } })),
        apiClient.get("/studio/reviews").catch(() => ({ data: [] })),
      ]);

      setAnalytics(analyticsRes.data);
      setCourses(coursesRes.data || []);
      setReviews(reviewsRes.data || []);

      // Extract enrolled students list
      const rawCourseGroups = studentsRes.data?.courses || [];
      const flatStudents = [];
      rawCourseGroups.forEach((group) => {
        if (Array.isArray(group.enrollments)) {
          group.enrollments.forEach((e) => {
            flatStudents.push({
              ...e,
              courseId: group.courseId,
              courseTitle: group.courseTitle,
            });
          });
        }
      });
      setStudents(flatStudents);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load lessons for selected course in Lesson Builder
  const fetchLessonsForCourse = async (courseId) => {
    try {
      const res = await apiClient.get(`/courses/${courseId}/lessons`);
      setCourseLessonsMap((prev) => ({ ...prev, [courseId]: res.data || [] }));
    } catch (err) {
      console.error("Fetch lessons error:", err);
    }
  };

  const handleCreateCourseClick = () => {
    setSelectedCourseForEdit(null);
    setShowCourseModal(true);
  };

  const handleEditCourseClick = (course) => {
    setSelectedCourseForEdit(course);
    setShowCourseModal(true);
  };

  const handleDuplicateCourse = async (course) => {
    try {
      const payload = {
        title: `${course.title} (Copy)`,
        topic: course.topic,
        description: course.description,
        price: course.price,
        thumbnailUrl: course.thumbnailUrl,
        curriculum: course.curriculum || [{ title: "Module 1" }],
      };
      await apiClient.post("/courses", payload);
      toast.success("Course duplicated successfully!");
      fetchData();
    } catch (err) {
      toast.error("Duplication failed.");
    }
  };

  const handleSubmitCourseForReview = async (courseId) => {
    try {
      await apiClient.patch(`/courses/${courseId}/submit`, {});
      toast.success("Course submitted for review!");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed.");
    }
  };

  // Filtered Students List
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.learnerName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.learnerEmail?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.courseTitle?.toLowerCase().includes(studentSearch.toLowerCase());

    if (studentFilterStatus === "banned") return matchesSearch && s.banned;
    if (studentFilterStatus === "suspended") return matchesSearch && s.suspended;
    if (studentFilterStatus === "refunded") return matchesSearch && s.refunded;
    if (studentFilterStatus === "active") return matchesSearch && !s.banned && !s.suspended && !s.refunded;

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      
      {/* Studio Header Toolbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">Creator Studio</h1>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified Access
                </span>
              </div>
              <p className="text-xs text-slate-400">Thinkific & Udemy Instructor Workspace</p>
            </div>
          </div>

          {/* Quick Action Floating Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateCourseClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-3">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
            { id: "courses", label: "Courses", icon: BookOpen },
            { id: "lessons", label: "Lesson Builder", icon: Video },
            { id: "students", label: "Students", icon: Users },
            { id: "reviews", label: "Reviews", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Lifetime Revenue</span>
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {formatBDT(analytics?.totalRevenue || 0)}
                </div>
                <p className="text-[11px] text-slate-400">85% instructor earnings payout share</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">Monthly Revenue</span>
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {formatBDT(analytics?.monthlyRevenue || 0)}
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold">+18.4% growth this month</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Enrollments</span>
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {analytics?.totalEnrollments || 0}
                </div>
                <p className="text-[11px] text-slate-400">{analytics?.activeStudents || 0} active learners</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Rating & Reviews</span>
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white flex items-center gap-2">
                  {analytics?.averageRating || 5.0}
                  <span className="text-sm font-normal text-slate-400">/ 5.0</span>
                </div>
                <p className="text-[11px] text-slate-400">{analytics?.totalReviews || 0} verified reviews</p>
              </div>
            </div>

            {/* Revenue Trend Chart & Quick Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Revenue & Sales Performance</h3>
                  <span className="text-xs text-slate-400">Last 6 Months</span>
                </div>
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.monthlyTrend || []}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" allowDecimals={false} fontSize={12} tickFormatter={(v) => `৳${Math.round(v)}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                        formatter={(val) => [formatBDT(val), "Revenue (BDT)"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pending Payout Card */}
              <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Pending Payout Balance</h3>
                  <p className="text-xs text-slate-300">
                    Automated payouts processed directly to your linked account.
                  </p>
                  <div className="text-4xl font-black text-emerald-400">
                    {formatBDT(analytics?.pendingPayouts || 0)}
                  </div>
                </div>

                <button
                  onClick={() => toast.success("Payout request sent for processing.")}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
                >
                  Request Express Payout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Student Enrollment Growth</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Bar dataKey="students" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Course Topic Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.categoryDistribution || [{ name: "General", value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(analytics?.categoryDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COURSE MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">My Instructor Courses</h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  An instructor can ONLY create courses in topics officially completed through mentoring sessions.
                </p>
              </div>
              <button
                onClick={handleCreateCourseClick}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Course
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No courses created yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click "Create New Course" to choose from your verified topics and design your curriculum.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div
                    key={course._id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4 p-5">
                      <div className="relative h-40 rounded-2xl overflow-hidden bg-slate-800">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <BookOpen className="w-10 h-10" />
                          </div>
                        )}
                        <span
                          className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            course.status === "approved"
                              ? "bg-emerald-500 text-white"
                              : course.status === "pending_review"
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-700 text-slate-200"
                          }`}
                        >
                          {course.status}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                          {course.topic}
                        </span>
                        <h3 className="text-base font-bold text-white line-clamp-2">{course.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-white pt-2 border-t border-slate-800">
                        <span>Price: {formatBDT(course.price)}</span>
                        <span className="text-slate-400 font-normal">
                          {course.curriculum?.length || 0} Modules
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-4 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleEditCourseClick(course)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      {course.status === "draft" && (
                        <button
                          onClick={() => handleSubmitCourseForReview(course._id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                        >
                          Submit
                        </button>
                      )}

                      <button
                        onClick={() => handleDuplicateCourse(course)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Duplicate Course"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LESSON BUILDER */}
        {/* ========================================================================= */}
        {activeTab === "lessons" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Lesson Builder & Video Manager</h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Manage video parts and lesson materials for your courses.
                </p>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                Create a course first before building lesson modules.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <label className="text-xs font-bold text-slate-300 block mb-2">Select Course to Build Lessons:</label>
                  <select
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCourseIdForLesson(id);
                      if (id) fetchLessonsForCourse(id);
                    }}
                    value={selectedCourseIdForLesson || ""}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title} ({c.topic})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCourseIdForLesson && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Course Modules & Lessons</h3>
                      <button
                        onClick={() => {
                          setSelectedLessonForEdit(null);
                          setShowLessonModal(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Lesson Module
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(courseLessonsMap[selectedCourseIdForLesson] || []).map((l, idx) => (
                        <div
                          key={l._id || idx}
                          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{l.title}</h4>
                              <p className="text-xs text-slate-400">
                                {l.videoDuration || 15} mins • {l.videoLinks?.length || 0} Video Streams
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setVideoUploadLesson(l)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                l.videoLinks?.length > 0
                                  ? "bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700"
                                  : "bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white"
                              }`}
                            >
                              <Youtube className="w-3.5 h-3.5" />
                              <span>{l.videoLinks?.length > 0 ? "Manage Video" : "Upload Unlisted Video"}</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLessonForEdit(l);
                                setShowLessonModal(true);
                              }}
                              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                              title="Edit Lesson"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: STUDENTS & MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Enrolled Students & Moderation</h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Manage student course access, suspend/ban users, and track audit history.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student or course..."
                    className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>

                <select
                  value={studentFilterStatus}
                  onChange={(e) => setStudentFilterStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Student Name</th>
                      <th className="p-4">Course Enrolled</th>
                      <th className="p-4">Enroll Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No enrolled students found.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => (
                        <tr key={s._id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-bold text-white">
                            {s.learnerName}
                            <div className="text-[10px] font-normal text-slate-400">{s.learnerEmail}</div>
                          </td>
                          <td className="p-4 text-slate-300">{s.courseTitle}</td>
                          <td className="p-4 text-slate-400">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                                s.banned
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : s.suspended
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {s.banned ? "Banned" : s.suspended ? "Suspended" : "Active"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedStudentForMgmt(s)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-400 rounded-lg"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showCourseModal && (
          <CourseEditorModal
            course={selectedCourseForEdit}
            eligibleTopics={eligibleTopics}
            onSuccess={() => fetchData()}
            onClose={() => setShowCourseModal(false)}
          />
        )}

        {showLessonModal && (
          <LessonEditorModal
            courses={courses}
            courseId={selectedCourseIdForLesson}
            lesson={selectedLessonForEdit}
            onSuccess={() => {
              if (selectedCourseIdForLesson) fetchLessonsForCourse(selectedCourseIdForLesson);
            }}
            onClose={() => setShowLessonModal(false)}
          />
        )}

        {videoUploadLesson && (
          <YouTubeVideoUploadModal
            lesson={videoUploadLesson}
            onSuccess={() => {
              if (selectedCourseIdForLesson) fetchLessonsForCourse(selectedCourseIdForLesson);
            }}
            onClose={() => setVideoUploadLesson(null)}
          />
        )}

        {selectedStudentForMgmt && (
          <StudentManagementModal
            student={selectedStudentForMgmt}
            onRefresh={() => fetchData()}
            onClose={() => setSelectedStudentForMgmt(null)}
          />
        )}
      </main>
    </div>
  );
};

export default StudioDashboardView;
