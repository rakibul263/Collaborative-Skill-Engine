import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import axios from "axios";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";
import { FullScreenLoader, ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import {
  ArrowLeft,
  BookOpen,
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
  Lock,
  Eye,
  SkipForward,
  Video,
  Play,
  Receipt,
  ArrowRight,
  Download,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import { extractYouTubeId } from "@/lib/youtube";
import { formatBDT, resolveCoursePrice } from "@/lib/money";
import ProtectedVideoPlayer from "@/components/courses/ProtectedVideoPlayer";
import ProtectedPdfModal from "@/components/courses/ProtectedPdfModal";
import InvoiceModal from "@/components/courses/InvoiceModal";
import CourseCertificateModal from "@/components/courses/CourseCertificateModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop";

function getLessonVideos(lesson) {
  if (!lesson) return [];
  if (Array.isArray(lesson.videos) && lesson.videos.length > 0) {
    return lesson.videos.map((v, idx) => ({
      ...v,
      id: v.id || `vid_${idx + 1}`,
      title: v.title || `Video Part ${idx + 1}`,
      embedId: v.embedId || v.videoId || extractYouTubeId(v.url || ""),
    }));
  }
  if (Array.isArray(lesson.videoLinks) && lesson.videoLinks.length > 0) {
    return lesson.videoLinks.filter(Boolean).map((url, idx) => ({
      id: `vid_${idx + 1}`,
      title: `Video Part ${idx + 1}`,
      embedId: extractYouTubeId(url),
      duration: Math.max(
        1,
        Math.round((Number(lesson.videoDuration) || 15) / lesson.videoLinks.length)
      ),
      progressStatus: null,
    }));
  }
  return [];
}

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialCourse = useMemo(() => {
    const direct = getCachedData(`/courses/public/${id}`);
    if (direct) return direct;
    const list = getCachedData("/courses/public");
    return Array.isArray(list) ? list.find((c) => c._id === id) || null : null;
  }, [id]);
  const initialLessonsData = useMemo(() => getCachedData(`/courses/public/${id}/lessons`), [id]);
  const initialEnrollData = useMemo(() => getCachedData(`/courses/${id}/enrollment`), [id]);

  const [course, setCourse] = useState(() => initialCourse);
  const [lessons, setLessons] = useState(() => initialLessonsData?.lessons || []);
  const [canWatchAll, setCanWatchAll] = useState(() => Boolean(initialLessonsData?.canWatchAll));
  const [serverProgress, setServerProgress] = useState(() => initialLessonsData?.courseProgress || null);
  const [localProgress, setLocalProgress] = useState({});

  const [activeLessonId, setActiveLessonId] = useState(() => {
    const list = initialLessonsData?.lessons || [];
    const first = list.find((l) => !l.locked && getLessonVideos(l).some((v) => v.embedId));
    return first?._id || null;
  });
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [expandedLessonIds, setExpandedLessonIds] = useState(() => {
    const list = initialLessonsData?.lessons || [];
    const first = list.find((l) => !l.locked && getLessonVideos(l).some((v) => v.embedId));
    return first?._id ? [first._id] : list[0]?._id ? [list[0]._id] : [];
  });

  const [pdfModalState, setPdfModalState] = useState({ open: false, pdfs: [], index: 0, title: "" });
  const [enrolled, setEnrolled] = useState(() => Boolean(initialEnrollData?.enrolled));
  const [enrollmentMeta, setEnrollmentMeta] = useState(() => initialEnrollData || null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [certificateState, setCertificateState] = useState(() => initialLessonsData?.certificate || null);
  const [certExpanded, setCertExpanded] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [loading, setLoading] = useState(() => !initialCourse);
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  const loadCourseLessons = useCallback(async (forceRefresh = false) => {
    try {
      let lessonsRes;
      try {
        lessonsRes = await apiClient.get(`/courses/public/${id}/lessons`, { forceRefresh });
      } catch {
        lessonsRes = await axios.get(`${API}/courses/public/${id}/lessons`);
      }
      const list = lessonsRes.data?.lessons || [];
      setLessons(list);
      setCanWatchAll(Boolean(lessonsRes.data?.canWatchAll));
      if (lessonsRes.data?.courseProgress) {
        setServerProgress(lessonsRes.data.courseProgress);
      }
      if (lessonsRes.data?.certificate) {
        setCertificateState(lessonsRes.data.certificate);
      }

      const firstPlayable = list.find(
        (l) => !l.locked && getLessonVideos(l).some((v) => v.embedId)
      );
      if (firstPlayable) {
        setActiveLessonId((prev) => prev || firstPlayable._id);
        setExpandedLessonIds((prev) =>
          prev.length > 0 ? prev : [firstPlayable._id]
        );
      } else if (list.length > 0) {
        setExpandedLessonIds((prev) => (prev.length > 0 ? prev : [list[0]._id]));
      }
    } catch {
      /* fallback to static curriculum */
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    const fetchCourse = async () => {
      if (!getCachedData(`/courses/public/${id}`) && !initialCourse) {
        setLoading(true);
      }
      setError("");
      try {
        const coursePromise = apiClient
          .get(`/courses/public/${id}`, {
            onUpdate: (fresh) => active && fresh && setCourse(fresh),
          })
          .catch(() => axios.get(`${API}/courses/public/${id}`));

        const enrollPromise = user
          ? apiClient.get(`/courses/${id}/enrollment`).catch(() => ({ data: { enrolled: false } }))
          : Promise.resolve({ data: { enrolled: false } });

        const [courseRes, , enrollRes] = await Promise.all([
          coursePromise,
          loadCourseLessons(),
          enrollPromise,
        ]);

        if (!active) return;
        setCourse(courseRes.data);
        if (user) {
          setEnrolled(enrollRes.data?.enrolled || false);
          setEnrollmentMeta(enrollRes.data || null);
        }
      } catch {
        if (active && !course) setError("Course not found or no longer available.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCourse();
    return () => {
      active = false;
    };
  }, [id, user, loadCourseLessons]);

  // Handle return from Stripe Checkout (success or cancel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment_status");
    const sessionId = params.get("session_id");

    if (paymentStatus === "success" && sessionId && user) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setEnrolling(true);
      apiClient
        .post("/payments/verify-session", { sessionId })
        .then((res) => {
          setEnrolled(true);
          setEnrollmentMeta({
            enrolled: true,
            enrollmentId: res.data?.enrollmentId,
            invoiceNumber: res.data?.invoiceNumber,
          });
          toast.success("Payment Confirmed! Enrollment Active.", {
            description: `Invoice ${res.data?.invoiceNumber || ""} issued. Lifetime access is now unlocked!`,
          });
        })
        .catch((err) => {
          console.error("Payment verification error:", err);
          toast.error(err?.response?.data?.message || "Could not verify Stripe payment.");
        })
        .finally(() => {
          setEnrolling(false);
        });
    } else if (paymentStatus === "cancelled") {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast.info("Payment was cancelled. You have not been charged.");
    }
  }, [user]);

  const handleEnroll = async () => {
    if (!user) {
      navigate(`/login?returnUrl=/courses/${id}`);
      return;
    }

    const price = resolveCoursePrice(course);

    // 1. Free Course Enrollment
    if (price === 0) {
      const confirm = await showConfirm({
        variant: "confirm",
        badge: "FREE ENROLLMENT",
        title: "Enroll in Free Course?",
        description:
          "Confirm your enrollment to unlock immediate lifetime access to all modules, protected video streams, and PDF worksheets.",
        targetLabel: "Course (Free)",
        targetValue: course?.title,
        confirmText: "Enroll Free Now",
      });
      if (!confirm.isConfirmed) return;

      setEnrolling(true);
      try {
        const enrollPost = await apiClient.post("/payments/create-checkout-session", { courseId: id });
        setEnrolled(true);
        setEnrollmentMeta({
          enrolled: true,
          enrollmentId: enrollPost.data?.enrollmentId || null,
          invoiceNumber: enrollPost.data?.invoiceNumber || null,
        });
        toast.confirmed("Enrollment Confirmed", {
          description: "Redirecting to your dedicated Course Learning Dashboard...",
          target: course?.title,
          badge: "FREE ENROLLED",
        });
        navigate(`/learn/${id}`);
      } catch (err) {
        const msg = err?.response?.data?.message || "Enrollment failed.";
        toast.error(msg);
      } finally {
        setEnrolling(false);
      }
      return;
    }

    // 2. Paid Course Enrollment via Stripe Checkout
    const confirm = await showConfirm({
      variant: "confirm",
      badge: "STRIPE SECURE CHECKOUT",
      title: "Proceed to Stripe Checkout?",
      description:
        "You will be securely redirected to Stripe to complete your card payment (Visa, Mastercard, AMEX). Once complete, you will immediately return here with lifetime access.",
      targetLabel: `Amount (${formatBDT(price)})`,
      targetValue: course?.title,
      confirmText: "Pay with Card (Stripe)",
    });
    if (!confirm.isConfirmed) return;

    setEnrolling(true);
    try {
      const res = await apiClient.post("/payments/create-checkout-session", { courseId: id });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error(res.data?.message || "No checkout URL returned from payment server.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to initialize Stripe checkout.";
      toast.error(msg);
      setEnrolling(false);
    }
  };

  // Flat list of all playable videos across unlocked lessons for Prev/Next/Skip navigation
  const playableQueue = useMemo(() => {
    const queue = [];
    lessons.forEach((lesson) => {
      if (lesson.locked) return;
      const vids = getLessonVideos(lesson);
      vids.forEach((v, vIdx) => {
        if (v.embedId) {
          queue.push({
            lessonId: lesson._id,
            partIndex: vIdx,
            video: v,
          });
        }
      });
    });
    return queue;
  }, [lessons]);

  const getVideoStatus = useCallback(
    (lessonId, video) => {
      if (!video) return null;
      const key = `${lessonId}:${video.id}`;
      if (Object.prototype.hasOwnProperty.call(localProgress, key)) {
        return localProgress[key];
      }
      return video.progressStatus || null;
    },
    [localProgress]
  );

  // Derived progress summary combining server values + optimistic local changes
  const computedProgress = useMemo(() => {
    let totalVideos = 0;
    let watchedCount = 0;
    let skippedCount = 0;

    lessons.forEach((l) => {
      const vids = getLessonVideos(l);
      totalVideos += Math.max(vids.length, l.videoCount || 0);
      vids.forEach((v) => {
        const st = getVideoStatus(l._id, v);
        if (st === "watched") watchedCount += 1;
        else if (st === "skipped") skippedCount += 1;
      });
    });

    const completedVideos = watchedCount + skippedCount;
    const effectiveTotal = serverProgress?.totalVideos ?? totalVideos;
    return {
      totalVideos: effectiveTotal,
      watchedCount,
      skippedCount,
      completedVideos,
      percent:
        effectiveTotal > 0
          ? Math.min(100, Math.round((completedVideos / effectiveTotal) * 100))
          : 0,
    };
  }, [lessons, serverProgress, getVideoStatus]);

  const selectVideoInLesson = (lessonId, partIdx = 0) => {
    setActiveLessonId(lessonId);
    setActivePartIndex(partIdx);
    setExpandedLessonIds((prev) =>
      prev.includes(lessonId) ? prev : [...prev, lessonId]
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleLessonExpand = (lessonId) => {
    setExpandedLessonIds((prev) =>
      prev.includes(lessonId)
        ? prev.filter((item) => item !== lessonId)
        : [...prev, lessonId]
    );
  };

  const updateVideoProgress = async (lessonId, video, status, telemetry = {}) => {
    if (!lessonId || !video?.id) return;
    const mapKey = `${lessonId}:${video.id}`;

    // Optimistic local state update
    setLocalProgress((prev) => ({
      ...prev,
      [mapKey]: status === "unwatched" ? null : status,
    }));

    setLessons((prev) =>
      prev.map((l) => {
        if (l._id !== lessonId) return l;
        const vids = getLessonVideos(l).map((v) =>
          v.id === video.id
            ? { ...v, progressStatus: status === "unwatched" ? null : status }
            : v
        );
        return { ...l, videos: vids };
      })
    );

    if (user) {
      try {
        const res = await apiClient.post(
          `/courses/${id}/lessons/${lessonId}/videos/${encodeURIComponent(video.id)}/progress`,
          {
            status,
            watchedSeconds: telemetry.watchedSeconds || 0,
            durationSeconds: telemetry.durationSeconds || 0,
          }
        );
        if (res.data?.courseProgress) {
          setServerProgress(res.data.courseProgress);
        }
        if (res.data?.certificate) {
          setCertificateState(res.data.certificate);
          if (res.data.certificate.newlyIssued) {
            toast.confirmed("Course Certificate Issued!", {
              description: "80%+ course completed! Download your certificate below the lessons.",
              badge: res.data.certificate.data?.certificateCode || "CERTIFIED",
            });
          }
        }
      } catch {
        // fail gracefully while keeping local UI responsive
      }
    }
  };

  const currentQueueIdx = playableQueue.findIndex(
    (q) => q.lessonId === activeLessonId && q.partIndex === activePartIndex
  );
  const prevTarget = currentQueueIdx > 0 ? playableQueue[currentQueueIdx - 1] : null;
  const nextTarget =
    currentQueueIdx !== -1 && currentQueueIdx < playableQueue.length - 1
      ? playableQueue[currentQueueIdx + 1]
      : null;

  if (loading) {
    return (
      <FullScreenLoader
        message="Loading Course Details..."
        subtext="Fetching syllabus, chapters, and instructor insights"
      />
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

  const fallbackCurriculum = Array.isArray(course.curriculum) ? course.curriculum : [];
  const displayLessons = lessons.length > 0 ? lessons : fallbackCurriculum;
  const activeLesson = lessons.find((l) => l._id === activeLessonId) || null;
  const activeLessonVideos = getLessonVideos(activeLesson);
  const activeVideo =
    activeLesson && !activeLesson.locked
      ? activeLessonVideos[activePartIndex] || activeLessonVideos[0] || null
      : null;
  const activeEmbedId = activeVideo?.embedId || null;
  const activeVideoStatus = activeLesson ? getVideoStatus(activeLesson._id, activeVideo) : null;
  const price = resolveCoursePrice(course);

  const handleMarkWatched = async (telemetry = {}) => {
    if (!activeLesson || !activeVideo) return;
    const nextStatus = activeVideoStatus === "watched" ? "unwatched" : "watched";
    await updateVideoProgress(activeLesson._id, activeVideo, nextStatus, telemetry);
    if (nextStatus === "watched") {
      toast.confirmed("Video Completed", {
        description: `Marked "${activeVideo.title}" as watched.`,
        badge: "WATCHED",
      });
    }
  };

  const handleSkipAndAdvance = async (telemetry = {}) => {
    if (!activeLesson || !activeVideo) return;
    await updateVideoProgress(activeLesson._id, activeVideo, "skipped", telemetry);
    toast.info("Video Skipped", {
      description: nextTarget
        ? "Moving cleanly to the next lesson video."
        : "Video marked as skipped.",
    });
    if (nextTarget) {
      selectVideoInLesson(nextTarget.lessonId, nextTarget.partIndex);
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-transparent text-slate-100 font-sans select-none"
    >
      {/* Ambient Spotlight Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 pt-16 space-y-6">
        {/* Top Action & Progress Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate("/courses")}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Back to Courses</span>
          </button>

          {computedProgress.totalVideos > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Course Progress
                </span>
                <span className="text-xs font-black text-white">
                  {computedProgress.completedVideos}/{computedProgress.totalVideos} Videos ({computedProgress.percent}%)
                </span>
              </div>
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${computedProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── TOP STAGE: CUSTOM PROTECTED WEBSITE PLAYER ── */}
        <div className="rounded-3xl overflow-hidden border border-slate-800/90 bg-slate-950/90 backdrop-blur-2xl shadow-2xl">
          {activeEmbedId ? (
            <>
              <ProtectedVideoPlayer
                videoId={activeEmbedId}
                title={activeVideo?.title || activeLesson?.title}
                lessonTitle={activeLesson?.title}
                viewerEmail={user?.email || "Guest Preview"}
                viewerName={user?.fullName || user?.displayName || ""}
                progressStatus={activeVideoStatus}
                hasPrev={Boolean(prevTarget)}
                hasNext={Boolean(nextTarget)}
                onPrev={() =>
                  prevTarget && selectVideoInLesson(prevTarget.lessonId, prevTarget.partIndex)
                }
                onNext={() =>
                  nextTarget && selectVideoInLesson(nextTarget.lessonId, nextTarget.partIndex)
                }
                onMarkWatched={(telemetry) =>
                  updateVideoProgress(activeLesson._id, activeVideo, "watched", telemetry)
                }
                onSkipVideo={(telemetry) => handleSkipAndAdvance(telemetry)}
                autoplay={true}
              />

              {/* Now Playing & Quick Actions Strip */}
              <div className="px-5 py-3.5 bg-[#070b16] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/35 text-[10px] font-mono font-bold text-indigo-300 shrink-0">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    WEBSITE PLAYER
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {activeLesson.title} — {activeVideo.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMarkWatched()}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeVideoStatus === "watched"
                        ? "bg-emerald-500/20 border-emerald-500/45 text-emerald-300"
                        : "bg-slate-900 hover:bg-emerald-600/20 border-slate-700 text-slate-200 hover:text-emerald-300"
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>
                      {activeVideoStatus === "watched" ? "Watched ✓" : "Mark as Watched"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkipAndAdvance()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <SkipForward size={14} />
                    <span>Skip Video</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="aspect-video max-h-[460px] relative overflow-hidden bg-slate-950">
              <img
                src={course.thumbnailUrl || PLACEHOLDER}
                alt={course.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = PLACEHOLDER;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent flex flex-col justify-end p-6 sm:p-10">
                <div className="max-w-2xl space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/35 text-xs font-bold text-indigo-300">
                    <ShieldCheck size={13} />
                    Protected Course Theater
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-white">
                    {lessons.some((l) => !l.locked && getLessonVideos(l).length > 0)
                      ? "Select any unlocked lesson below to launch the custom video player"
                      : "Enroll in this course to unlock private video lessons & PDFs"}
                  </h2>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── LOWER 2-COLUMN WORKSPACE: LESSONS & STUDY MATERIAL BELOW / SIDE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column (7 spans): Active Lesson Video List, Study Material/PDFs, Course Overview */}
          <div className="lg:col-span-7 space-y-6">
            {/* Videos List Under Currently Active Lesson */}
            {activeLesson && !activeLesson.locked && activeLessonVideos.length > 0 && (
              <div className="bg-slate-900/85 border border-indigo-500/30 rounded-3xl p-6 backdrop-blur-2xl shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                      Active Lesson Playlist
                    </span>
                    <h2 className="text-base font-black text-white">{activeLesson.title}</h2>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
                    {activeLessonVideos.length} Video{activeLessonVideos.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeLessonVideos.map((v, vIdx) => {
                    const isPlaying = vIdx === activePartIndex;
                    const vStatus = getVideoStatus(activeLesson._id, v);
                    return (
                      <div
                        key={v.id || vIdx}
                        onClick={() => selectVideoInLesson(activeLesson._id, vIdx)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isPlaying
                            ? "bg-indigo-600/20 border-indigo-500/50 shadow-md"
                            : "bg-slate-950/75 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                              vStatus === "watched"
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                : isPlaying
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-900 border border-slate-800 text-slate-400"
                            }`}
                          >
                            {vStatus === "watched" ? (
                              <CheckCircle2 size={15} />
                            ) : isPlaying ? (
                              <Play size={14} className="fill-white ml-0.5" />
                            ) : (
                              vIdx + 1
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-white truncate">
                              {v.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {v.duration || 15} mins
                              </span>
                              {vStatus === "watched" && (
                                <span className="text-emerald-400 font-bold">• Watched</span>
                              )}
                              {vStatus === "skipped" && (
                                <span className="text-amber-400 font-bold">• Skipped</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              updateVideoProgress(
                                activeLesson._id,
                                v,
                                vStatus === "watched" ? "unwatched" : "watched"
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              vStatus === "watched"
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                : "bg-slate-900 hover:bg-emerald-600/20 border-slate-700 text-slate-300"
                            }`}
                          >
                            {vStatus === "watched" ? "Watched" : "Mark Done"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateVideoProgress(activeLesson._id, v, "skipped");
                              if (vIdx + 1 < activeLessonVideos.length) {
                                selectVideoInLesson(activeLesson._id, vIdx + 1);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              vStatus === "skipped"
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                : "bg-slate-900 hover:bg-amber-600/20 border-slate-700 text-slate-400"
                            }`}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Lesson Notes & Protected Multi-PDF Viewer Launchers */}
            {activeLesson &&
              !activeLesson.locked &&
              (activeLesson.richTextContent || activeLesson.pdfResources?.length > 0) && (
                <div className="bg-slate-900/80 border border-cyan-500/25 rounded-3xl p-6 backdrop-blur-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={16} className="text-cyan-400" />
                      <span>Lesson Study Notes &amp; PDFs ({activeLesson.pdfResources?.length || 0})</span>
                    </h2>
                  </div>

                  {activeLesson.richTextContent && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                      {activeLesson.richTextContent}
                    </p>
                  )}

                  {activeLesson.pdfResources?.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {activeLesson.pdfResources.map((pdf, pIdx) => (
                        <button
                          key={pdf.id || pIdx}
                          type="button"
                          onClick={() =>
                            setPdfModalState({
                              open: true,
                              pdfs: activeLesson.pdfResources,
                              index: pIdx,
                              title: activeLesson.title,
                            })
                          }
                          className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-xs font-bold transition-colors cursor-pointer text-left"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <FileText size={15} className="text-cyan-400 shrink-0" />
                            <span className="truncate">{pdf.title || `Worksheet #${pIdx + 1}`}</span>
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300 shrink-0">
                            Open Reader
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* Course Header & Overview Info */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-xl space-y-5">
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

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                {course.description || "No detailed description provided for this course."}
              </p>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
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

          {/* Right Sticky Column (5 spans): Curriculum Lesson Explorer + Enrollment */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Enrollment CTA Card */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 backdrop-blur-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Course Tuition Fee
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    {price === 0 ? (
                      <span className="text-3xl font-extrabold text-emerald-400">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-white">
                          {formatBDT(price)}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">BDT</span>
                      </>
                    )}
                  </div>
                </div>

                {(enrolled || canWatchAll) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 size={14} />
                    Enrolled
                  </span>
                )}
              </div>

              {!(enrolled || canWatchAll) ? (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {enrolling ? (
                    <ButtonSpinner />
                  ) : (
                    <>
                      <ShoppingCart size={16} />
                      <span>{user ? "Enroll Now" : "Sign in to Enroll"}</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/learn/${id}`)}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-emerald-600/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Open Learning Dashboard</span>
                    <ArrowRight size={15} />
                  </button>
                  {enrollmentMeta?.enrollmentId && (
                    <button
                      type="button"
                      onClick={() => setInvoiceOpen(true)}
                      className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Receipt size={14} />
                      <span>View Invoice ({enrollmentMeta.invoiceNumber})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Lesson List (Click a lesson -> expands all videos inside it) */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-xl">
              <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Course Lessons</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Click any lesson to inspect &amp; play its videos
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-300 font-mono">
                  {displayLessons.length} Modules
                </span>
              </div>

              <div className="p-3 space-y-2.5 max-h-[620px] overflow-y-auto custom-scrollbar">
                {displayLessons.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 font-medium italic">
                    Curriculum module list will be updated soon.
                  </p>
                ) : (
                  displayLessons.map((item, i) => {
                    const isRealLesson = Boolean(item._id);
                    const isLocked = isRealLesson ? item.locked : !enrolled;
                    const lessonVideos = isRealLesson ? getLessonVideos(item) : [];
                    const isExpanded = isRealLesson && expandedLessonIds.includes(item._id);
                    const isActiveLesson = isRealLesson && activeLessonId === item._id;

                    const finishedCount = lessonVideos.filter((v) => {
                      const st = getVideoStatus(item._id, v);
                      return st === "watched" || st === "skipped";
                    }).length;
                    const lessonDone =
                      lessonVideos.length > 0 && finishedCount >= lessonVideos.length;

                    return (
                      <div
                        key={item._id || i}
                        className={`rounded-2xl border overflow-hidden transition-colors ${
                          isActiveLesson
                            ? "border-indigo-500/45 bg-indigo-950/20"
                            : "border-slate-800/80 bg-slate-950/60"
                        }`}
                      >
                        {/* Lesson Header Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!isRealLesson) return;
                            toggleLessonExpand(item._id);
                            if (isLocked) {
                              toast.warning("Lesson Locked", {
                                description:
                                  "Enroll in this course to unlock private protected videos and PDFs.",
                              });
                              return;
                            }
                            if (!isActiveLesson) {
                              setActiveLessonId(item._id);
                              setActivePartIndex(0);
                            }
                          }}
                          className="w-full text-left flex items-center justify-between gap-3 p-3.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-xl border text-xs font-extrabold flex items-center justify-center shrink-0 ${
                                lessonDone
                                  ? "bg-emerald-500/20 border-emerald-500/45 text-emerald-300"
                                  : isActiveLesson
                                  ? "bg-indigo-600 border-indigo-400 text-white"
                                  : "bg-slate-950 border-slate-800 text-indigo-400"
                              }`}
                            >
                              {lessonDone ? <CheckCircle2 size={15} /> : i + 1}
                            </span>

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-white block truncate">
                                {item.title}
                              </span>
                              {isRealLesson && (
                                <span className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Video size={10} className="text-rose-400" />
                                    {item.videoCount || lessonVideos.length} Video
                                    {(item.videoCount || lessonVideos.length) !== 1 ? "s" : ""}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} /> {item.videoDuration || 15}m
                                  </span>
                                  {item.pdfResources?.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-cyan-300 flex items-center gap-1">
                                        <FileText size={10} /> {item.pdfResources.length} PDF
                                      </span>
                                    </>
                                  )}
                                  {item.isFreePreview && (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <Eye size={10} /> Preview
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isLocked ? (
                              <Lock size={14} className="text-slate-500" />
                            ) : lessonVideos.length > 0 ? (
                              <span className="text-[10px] font-mono text-slate-400">
                                {finishedCount}/{lessonVideos.length}
                              </span>
                            ) : null}
                            {isRealLesson &&
                              (isExpanded ? (
                                <ChevronUp size={16} className="text-slate-400" />
                              ) : (
                                <ChevronDown size={16} className="text-slate-400" />
                              ))}
                          </div>
                        </button>

                        {/* Expanded Videos List Under This Lesson */}
                        {isExpanded && (
                          <div className="border-t border-slate-800/70 bg-slate-950/80 px-3 py-2 space-y-1.5">
                            {lessonVideos.length === 0 ? (
                              <p className="text-[11px] text-slate-500 py-2 px-2">
                                {isLocked
                                  ? "Enroll to unlock this lesson's video playlist."
                                  : "Instructor hasn't uploaded videos in this lesson yet."}
                              </p>
                            ) : (
                              lessonVideos.map((vid, vIdx) => {
                                const vidStatus = getVideoStatus(item._id, vid);
                                const isCurrent =
                                  isActiveLesson && activePartIndex === vIdx;
                                return (
                                  <button
                                    key={vid.id || vIdx}
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => {
                                      if (isLocked) return;
                                      selectVideoInLesson(item._id, vIdx);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs transition-all ${
                                      isLocked
                                        ? "opacity-55 cursor-not-allowed text-slate-400"
                                        : isCurrent
                                        ? "bg-indigo-600/25 border border-indigo-500/45 text-white cursor-pointer"
                                        : "hover:bg-slate-900 text-slate-300 cursor-pointer"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {vidStatus === "watched" ? (
                                        <CheckCircle2
                                          size={14}
                                          className="text-emerald-400 shrink-0"
                                        />
                                      ) : vidStatus === "skipped" ? (
                                        <SkipForward
                                          size={14}
                                          className="text-amber-400 shrink-0"
                                        />
                                      ) : isLocked ? (
                                        <Lock size={13} className="text-slate-500 shrink-0" />
                                      ) : (
                                        <PlayCircle
                                          size={14}
                                          className={
                                            isCurrent
                                              ? "text-indigo-300 shrink-0"
                                              : "text-slate-400 shrink-0"
                                          }
                                        />
                                      )}
                                      <span className="truncate font-semibold">
                                        {vIdx + 1}. {vid.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] font-mono text-slate-500">
                                        {vid.duration || 15}m
                                      </span>
                                      {vidStatus === "watched" && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                          Done
                                        </span>
                                      )}
                                      {vidStatus === "skipped" && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                          Skipped
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* ── PERMANENT FINAL LESSON ITEM: COURSE CERTIFICATE (LOCKED UNTIL 80%) ── */}
                {(() => {
                  const certUnlocked = Boolean(
                    certificateState?.unlocked && certificateState?.data
                  );
                  const currentPct =
                    computedProgress?.percent ?? certificateState?.currentPercent ?? 0;

                  return (
                    <div
                      className={`rounded-2xl border overflow-hidden transition-all ${
                        certUnlocked
                          ? "border-amber-500/45 bg-gradient-to-r from-emerald-950/35 via-slate-900 to-amber-950/30"
                          : "border-slate-800/90 bg-slate-950/80"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (certUnlocked) {
                            setCertModalOpen(true);
                          } else {
                            setCertExpanded((prev) => !prev);
                          }
                        }}
                        className="w-full text-left flex items-center justify-between gap-3 p-3.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-xl border text-xs font-extrabold flex items-center justify-center shrink-0 ${
                              certUnlocked
                                ? "bg-amber-500/20 border-amber-400/55 text-amber-300"
                                : "bg-slate-900 border-slate-700 text-slate-400"
                            }`}
                          >
                            {certUnlocked ? <Award size={16} /> : <Lock size={14} />}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-white truncate">
                                Certificate of Completion
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                                  certUnlocked
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35"
                                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {certUnlocked ? "Unlocked" : "Locked"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {certUnlocked
                                ? `Issued to ${certificateState.data.recipientName} • Ready to download`
                                : canWatchAll
                                ? `Complete 80% of this course to unlock (${currentPct}% done)`
                                : "Requires enrollment & 80% course completion"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {certUnlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black">
                              <Download size={12} />
                              Download
                            </span>
                          ) : certExpanded ? (
                            <ChevronUp size={16} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={16} className="text-slate-400" />
                          )}
                        </div>
                      </button>

                      {certExpanded && !certUnlocked && (
                        <div className="border-t border-slate-800/80 bg-slate-950/90 px-4 py-3 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-300 font-semibold">
                              80% Completion Requirement
                            </span>
                            <span className="font-mono font-bold text-amber-300">
                              {canWatchAll ? `${currentPct}% / 80%` : "0% / 80%"}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-amber-400"
                              style={{ width: `${Math.min(100, canWatchAll ? currentPct : 0)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Finish at least 80% of all video lessons to receive a signed{" "}
                            <strong className="text-slate-200">Collaborative Skill Engine</strong>{" "}
                            certificate in your name.
                          </p>
                          {enrolled || canWatchAll ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/learn/${id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer"
                            >
                              <span>Continue in Classroom</span>
                              <ArrowRight size={12} />
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Protected PDF Modal */}
      {pdfModalState.open && (
        <ProtectedPdfModal
          pdfs={pdfModalState.pdfs}
          initialIndex={pdfModalState.index}
          lessonTitle={pdfModalState.title}
          onClose={() => setPdfModalState({ open: false, pdfs: [], index: 0, title: "" })}
        />
      )}

      {/* Official Purchase Invoice Modal */}
      {invoiceOpen && enrollmentMeta?.enrollmentId && (
        <InvoiceModal
          enrollmentId={enrollmentMeta.enrollmentId}
          onClose={() => setInvoiceOpen(false)}
        />
      )}

      {/* Official Course Completion Certificate Modal */}
      {certModalOpen && (
        <CourseCertificateModal
          courseId={id}
          courseTitle={course.title}
          initialCertificateState={certificateState}
          onClose={() => setCertModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CourseDetail;
