import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import axios from "axios";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShoppingCart,
  Clock,
  Award,
  FileText,
  ShieldCheck,
  PlayCircle,
  Sparkles,
  Lock,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PLACEHOLDER = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API}/courses/public/${id}`);
        setCourse(res.data);

        // Check enrollment status if logged in
        if (user) {
          try {
            const enrollRes = await apiClient.get(`/courses/${id}/enrollment`);
            setEnrolled(enrollRes.data?.enrolled || false);
          } catch {
            /* not enrolled */
          }
        }
      } catch {
        setError("Course not found or no longer available.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) {
      navigate(`/login?returnUrl=/courses/${id}`);
      return;
    }

    const price = Number(course?.price || 0);

    const confirm = await Swal.fire({
      title: "Enroll in Course?",
      html: `
        <div style="text-align:left;font-size:13px;color:#94a3b8">
          <p style="margin-bottom:8px;color:#fff;font-weight:bold">${course?.title}</p>
          <p>Investment: <strong style="color:#818cf8">${price === 0 ? "Free" : `৳${price.toFixed(0)}`}</strong></p>
        </div>
      `,
      icon: "question",
      background: "#090d16",
      color: "#fff",
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
      confirmButtonText: "Confirm & Enroll",
    });
    if (!confirm.isConfirmed) return;

    setEnrolling(true);
    try {
      await apiClient.post(`/courses/${id}/enroll`, {});
      setEnrolled(true);
      Swal.fire({
        icon: "success",
        title: "Enrolled Successfully!",
        text: "You now have lifetime access to this course.",
        timer: 2200,
        showConfirmButton: false,
        background: "#090d16",
        color: "#fff",
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Enrollment failed.";
      Swal.fire({
        icon: "error",
        title: msg,
        timer: 2200,
        showConfirmButton: false,
        background: "#090d16",
        color: "#fff",
      });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-24 px-4 flex flex-col items-center justify-center bg-[#030712] text-slate-100">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Loading course details...
        </p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen py-24 px-4 flex flex-col items-center justify-center bg-[#030712] text-center text-slate-100">
        <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <BookOpen size={36} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{error || "Course Not Found"}</h2>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">
          The requested course may have been removed or is no longer available.
        </p>
        <button
          onClick={() => navigate("/courses")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
        >
          Back to Courses Marketplace
        </button>
      </div>
    );
  }

  const curriculumList = Array.isArray(course.curriculum) ? course.curriculum : [];
  const price = Number(course.price || 0);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Ambient Spotlight Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 pt-16">
        {/* Back Navigation Button */}
        <button
          onClick={() => navigate("/courses")}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all mb-8 shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to Courses</span>
        </button>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (Left Col - 2 spans) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-800/90 bg-slate-900/80 backdrop-blur-2xl shadow-2xl">
              <div className="aspect-video relative overflow-hidden bg-slate-950">
                <img
                  src={course.thumbnailUrl || PLACEHOLDER}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = PLACEHOLDER;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                {/* Topic & Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold px-3 py-1 rounded-full">
                    <Tag size={12} />
                    {course.topic || "General Topic"}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-extrabold px-3 py-1 rounded-full">
                    <Award size={12} />
                    Verified Certificate
                  </span>
                </div>

                {/* Course Title */}
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {course.title}
                </h1>

                {/* Instructor Info Bar */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shadow-md">
                    <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-white font-extrabold text-sm">
                      {(course.instructorName || course.instructorEmail || "I")[0]}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block">Created by</span>
                    <span className="text-xs font-bold text-white">
                      {course.instructorName || course.instructorEmail || "Platform Instructor"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Overview Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-xl">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <span>Course Overview & Description</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                {course.description || "No detailed description provided for this course."}
              </p>
            </div>

            {/* Curriculum Accordion */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-xl">
              <button
                onClick={() => setCurriculumOpen((o) => !o)}
                className="w-full flex items-center justify-between p-6 sm:p-8 text-left bg-slate-900/90 hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Course Curriculum</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {curriculumList.length} structured lessons
                    </p>
                  </div>
                </div>
                {curriculumOpen ? (
                  <ChevronUp size={20} className="text-slate-400" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400" />
                )}
              </button>

              {curriculumOpen && (
                <div className="border-t border-slate-800/80 divide-y divide-slate-800/60 p-2 sm:p-4">
                  {curriculumList.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 font-medium italic">
                      Curriculum module list will be updated soon.
                    </p>
                  ) : (
                    curriculumList.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 hover:bg-slate-950/60 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 text-xs font-extrabold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-200">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {enrolled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              <PlayCircle size={12} /> Play Lesson
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 text-[10px] font-bold">
                              <Lock size={12} /> Locked
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Sidebar (Right Col - 1 span) */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 backdrop-blur-2xl shadow-xl sticky top-24 space-y-6">
              {/* Price Row */}
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Course Tuition Fee
                </span>
                <div className="flex items-baseline gap-1.5">
                  {price === 0 ? (
                    <span className="text-3xl font-extrabold text-emerald-400">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-white">৳{price.toFixed(0)}</span>
                      <span className="text-xs text-slate-400 font-semibold">BDT</span>
                    </>
                  )}
                </div>
              </div>

              {/* Enrollment CTA Button */}
              {enrolled ? (
                <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold block">Enrolled & Active</span>
                    <span className="text-[11px] text-emerald-400/80">
                      You have full access to this course.
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {enrolling ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart size={16} />
                      <span>{user ? "Enroll Now" : "Sign in to Enroll"}</span>
                    </>
                  )}
                </button>
              )}

              {/* Feature Highlights */}
              <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-indigo-400 shrink-0" />
                  <span>Full Lifetime Access</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Award size={16} className="text-purple-400 shrink-0" />
                  <span>Verified Platform Certificate</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <BookOpen size={16} className="text-emerald-400 shrink-0" />
                  <span>{curriculumList.length} Practical Lessons</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
