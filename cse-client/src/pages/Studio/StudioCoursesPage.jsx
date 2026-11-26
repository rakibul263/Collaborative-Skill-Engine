import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Edit3,
  Copy,
  Send,
  ExternalLink,
  Video,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import CourseEditorModal from "@/components/studio/CourseEditorModal";
import { toast } from "@/components/ui/toast-system";
import { formatBDT } from "@/lib/money";

const StudioCoursesPage = () => {
  const { eligibleTopics = [], refreshStudioData } = useOutletContext() || {};
  const navigate = useNavigate();

  const [courses, setCourses] = useState(() => getCachedData("/courses/mine") || []);
  const [loading, setLoading] = useState(() => !getCachedData("/courses/mine"));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const fetchCourses = useCallback(async (forceRefresh = false) => {
    if (!getCachedData("/courses/mine") && !forceRefresh) setLoading(true);
    try {
      const res = await apiClient.get("/courses/mine", { forceRefresh });
      setCourses(res.data || []);
    } catch (err) {
      console.error("Fetch courses error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDuplicate = async (course) => {
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
      fetchCourses();
      if (refreshStudioData) refreshStudioData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Duplication failed. Check topic eligibility.");
    }
  };

  const handleSubmitForReview = async (courseId) => {
    try {
      await apiClient.patch(`/courses/${courseId}/submit`, {});
      toast.success("Course published to marketplace!");
      fetchCourses();
      if (refreshStudioData) refreshStudioData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed.");
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.topic?.toLowerCase().includes(search.toLowerCase());
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* ─── HEADER TOOLBAR ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Course Catalog Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Courses Studio
          </h1>
          <p className="text-xs text-slate-400">
            Publish, edit curriculum, upload video lessons, and manage course pricing.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCourse(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Course</span>
        </button>
      </div>

      {/* ─── FILTER & SEARCH BAR ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, topic, or keyword..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "approved", label: "Published" },
            { id: "pending_review", label: "In Review" },
            { id: "draft", label: "Drafts" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── COURSES GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const isPublished = course.status === "approved";
          const isPending = course.status === "pending_review";
          const isDraft = course.status === "draft";

          return (
            <div
              key={course._id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group backdrop-blur-xl"
            >
              <div>
                {/* Course Thumbnail */}
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img
                    src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80"}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                    {course.topic}
                  </div>
                  <div
                    className={`absolute top-3 right-3 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isPublished
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : isPending
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-900/80 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {isPublished ? "Live on Marketplace" : isPending ? "Pending Review" : "Draft Mode"}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl text-sm font-black text-white border border-slate-800">
                    {formatBDT(course.price)}
                  </div>
                </div>

                {/* Course Content Info */}
                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-white text-base leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      {course.curriculum?.length || 1} Modules
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      {course.estimatedDuration || "5 Hours"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Bottom Action Bar */}
              <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      setShowModal(true);
                    }}
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Edit Course Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(course)}
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Duplicate Course"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigate(`/studio/lessons?courseId=${course._id}`)}
                    className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center gap-1 font-bold text-xs transition-colors cursor-pointer"
                    title="Manage Lessons & Upload YouTube Unlisted Videos"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Lessons</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {(isDraft || course.status === "rejected") && (
                    <button
                      onClick={() => handleSubmitForReview(course._id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </button>
                  )}

                  {isPublished && (
                    <button
                      onClick={() => navigate(`/courses/${course._id}`)}
                      className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-indigo-400 transition-colors cursor-pointer"
                      title="View on Public Marketplace"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredCourses.length === 0 && !loading && (
          <div className="col-span-full py-16 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-4 p-8 backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No courses found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {search
                  ? "No courses match your search criteria. Try a different query or clear filters."
                  : "You haven't created any courses in this category yet. Click below to launch your curriculum."}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCourse(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Course</span>
            </button>
          </div>
        )}
      </div>

      {/* Course Editor Dialog */}
      {showModal && (
        <CourseEditorModal
          course={selectedCourse}
          eligibleTopics={eligibleTopics}
          onSuccess={(savedCourse) => {
            fetchCourses();
            if (refreshStudioData) refreshStudioData();
            if (!selectedCourse && savedCourse?._id) {
              toast.confirmed("Course & Lesson Modules Created", {
                description: "Click 'Lessons' on the course card to upload YouTube Unlisted videos.",
                target: savedCourse.title,
                badge: "COURSE READY",
              });
            }
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default StudioCoursesPage;
