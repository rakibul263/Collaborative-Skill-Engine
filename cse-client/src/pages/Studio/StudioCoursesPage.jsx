import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, BookOpen, Edit3, Eye, Copy, RefreshCw, Send, Lock, Sparkles, Video } from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import apiClient from "@/lib/apiClient";
import CourseEditorModal from "@/components/studio/CourseEditorModal";

const StudioCoursesPage = () => {
  const { eligibleTopics = [], refreshStudioData } = useOutletContext() || {};
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/courses/mine");
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
      fetchCourses();
      if (refreshStudioData) refreshStudioData();
    } catch (err) {
      alert("Duplication failed. Check topic eligibility.");
    }
  };

  const handleSubmitForReview = async (courseId) => {
    try {
      await apiClient.patch(`/courses/${courseId}/submit`, {});
      fetchCourses();
      if (refreshStudioData) refreshStudioData();
    } catch (err) {
      alert(err?.response?.data?.message || "Submission failed.");
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
      
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Course Management Studio</h1>
          <p className="text-xs text-slate-400">Create, edit, duplicate, and publish courses in eligible topics.</p>
        </div>
        <button
          onClick={() => {
            setSelectedCourse(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Create New Course
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course title or topic..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["all", "draft", "pending_review", "approved", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <div
            key={course._id}
            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="relative h-44 overflow-hidden bg-slate-950">
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                  {course.topic}
                </div>
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-slate-700">
                  {course.status}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="font-bold text-white text-base leading-snug line-clamp-2">{course.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>
                <div className="text-lg font-black text-indigo-400">${course.price}</div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setSelectedCourse(course);
                    setShowModal(true);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white"
                  title="Edit Course Details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(course)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white"
                  title="Duplicate Course"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/studio/lessons")}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold text-[11px]"
                  title="Manage Lessons"
                >
                  <Video className="w-4 h-4" />
                  Lessons
                </button>
              </div>

              {(course.status === "draft" || course.status === "rejected") && (
                <button
                  onClick={() => handleSubmitForReview(course._id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && !loading && (
          <div className="col-span-full py-16 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-slate-300 font-bold text-sm">No courses matching current query</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first course module in your verified teaching topics.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <CourseEditorModal
          course={selectedCourse}
          eligibleTopics={eligibleTopics}
          onSuccess={() => {
            fetchCourses();
            if (refreshStudioData) refreshStudioData();
          }}
          onClose={() => setShowModal(false)}
        />
      )}

    </div>
  );
};

export default StudioCoursesPage;
