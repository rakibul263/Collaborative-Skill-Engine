import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { toast } from "@/components/ui/toast-system";
import { FullScreenLoader } from "@/components/shared/loading/LoadingSpinner";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  PlayCircle,
  Lock,
  SkipForward,
  Video,
  Play,
  Receipt,
  Search,
  Award,
  Layers,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import { extractYouTubeId } from "@/lib/youtube";
import ProtectedVideoPlayer from "@/components/courses/ProtectedVideoPlayer";
import ProtectedPdfModal from "@/components/courses/ProtectedPdfModal";
import InvoiceModal from "@/components/courses/InvoiceModal";
import CertificateLessonPanel from "@/components/courses/CertificateLessonPanel";
import CourseCertificateModal from "@/components/courses/CourseCertificateModal";
import CourseRestrictionScreen from "@/components/courses/CourseRestrictionScreen";
import BottomNotificationPopup from "@/components/shared/notifications/BottomNotificationPopup";

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

/**
 * CourseLearningDashboard — Standalone Classroom Workspace (/learn/:id)
 * Dedicated interface launched after purchasing or opening an enrolled course.
 */
const CourseLearningDashboard = () => {
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
  const [canWatchAll, setCanWatchAll] = useState(() =>
    Boolean(initialLessonsData?.canWatchAll || initialEnrollData?.enrolled)
  );
  const [enrollmentMeta, setEnrollmentMeta] = useState(() => initialEnrollData || null);
  const [serverProgress, setServerProgress] = useState(() => initialLessonsData?.courseProgress || null);
  const [localProgress, setLocalProgress] = useState({});
  const [certificateState, setCertificateState] = useState(() => initialLessonsData?.certificate || null);

  const [activeLessonId, setActiveLessonId] = useState(() => {
    const list = initialLessonsData?.lessons || [];
    const firstWithVideo = list.find((l) => !l.locked && getLessonVideos(l).some((v) => v.embedId));
    return (firstWithVideo || list.find((l) => !l.locked) || list[0] || null)?._id || null;
  });
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [expandedLessonIds, setExpandedLessonIds] = useState(() => {
    const list = initialLessonsData?.lessons || [];
    const first = list.find((l) => !l.locked) || list[0];
    return first?._id ? [first._id] : [];
  });
  const [activeTab, setActiveTab] = useState("playlist"); // playlist | resources | overview
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lessonSearch, setLessonSearch] = useState("");

  const [pdfModalState, setPdfModalState] = useState({
    open: false,
    pdfs: [],
    index: 0,
    title: "",
  });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [loading, setLoading] = useState(() => !(initialCourse && initialLessonsData));
  const [accessDenied, setAccessDenied] = useState(false);

  const loadClassroomData = useCallback(async (forceRefresh = false) => {
    try {
      const [courseRes, lessonsRes, enrollRes] = await Promise.all([
        apiClient.get(`/courses/public/${id}`, { forceRefresh }),
        apiClient.get(`/courses/public/${id}/lessons`, { forceRefresh }),
        apiClient
          .get(`/courses/${id}/enrollment`, { forceRefresh })
          .catch(() => ({ data: { enrolled: false } })),
      ]);

      setCourse(courseRes.data);
      setEnrollmentMeta(enrollRes.data || null);

      const allowed = Boolean(lessonsRes.data?.canWatchAll || enrollRes.data?.enrolled);
      setCanWatchAll(allowed);

      const list = lessonsRes.data?.lessons || [];
      setLessons(list);
      if (lessonsRes.data?.courseProgress) {
        setServerProgress(lessonsRes.data.courseProgress);
      }
      if (lessonsRes.data?.certificate) {
        setCertificateState(lessonsRes.data.certificate);
      }

      if (!allowed) {
        setAccessDenied(true);
        return;
      }

      const firstWithVideo = list.find(
        (l) => !l.locked && getLessonVideos(l).some((v) => v.embedId)
      );
      const initialLesson = firstWithVideo || list.find((l) => !l.locked) || list[0] || null;
      if (initialLesson) {
        setActiveLessonId((prev) => prev || initialLesson._id);
        setExpandedLessonIds((prev) => (prev.length > 0 ? prev : [initialLesson._id]));
      }
    } catch {
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (!active) return;
      await loadClassroomData();
    };
    run();
    return () => {
      active = false;
    };
  }, [loadClassroomData]);

  const playableQueue = useMemo(() => {
    const queue = [];
    lessons.forEach((lesson) => {
      if (lesson.locked) return;
      const vids = getLessonVideos(lesson);
      vids.forEach((v, vIdx) => {
        if (v.embedId) {
          queue.push({ lessonId: lesson._id, partIndex: vIdx, video: v });
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

  const selectVideo = (lessonId, partIdx = 0) => {
    setActiveLessonId(lessonId);
    setActivePartIndex(partIdx);
    setExpandedLessonIds((prev) =>
      prev.includes(lessonId) ? prev : [...prev, lessonId]
    );
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
            description:
              "You completed 80%+ of this course! Open the Certificate lesson to download your official diploma.",
            badge: res.data.certificate.data?.certificateCode || "CERTIFIED",
          });
        }
      }
    } catch {
      // keep optimistic UI responsive
    }
  };

  const filteredLessons = useMemo(() => {
    const q = lessonSearch.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((l) => {
      if (l.title?.toLowerCase().includes(q)) return true;
      return getLessonVideos(l).some((v) => v.title?.toLowerCase().includes(q));
    });
  }, [lessons, lessonSearch]);

  if (loading) {
    return (
      <FullScreenLoader
        message="Launching Course Learning Dashboard..."
        subtext="Preparing protected theater, multi-video modules & PDF study notes"
      />
    );
  }

  if (accessDenied || !course || !canWatchAll) {
    if (
      enrollmentMeta?.status === "banned" ||
      enrollmentMeta?.status === "suspended" ||
      enrollmentMeta?.banned ||
      enrollmentMeta?.suspended
    ) {
      return (
        <CourseRestrictionScreen
          course={course}
          enrollmentMeta={enrollmentMeta}
          onRefresh={loadClassroomData}
        />
      );
    }

    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white">Enrollment Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              This dedicated Classroom Dashboard unlocks automatically as soon as you enroll in the course.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => navigate(`/courses/${id}`)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg cursor-pointer"
            >
              Go to Course Enrollment
            </button>
            <button
              onClick={() => navigate("/courses")}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCertificateSelected = activeLessonId === "__certificate__";
  const certificateUnlocked = Boolean(
    certificateState?.unlocked && certificateState?.data
  );

  const activeLesson = isCertificateSelected
    ? null
    : lessons.find((l) => l._id === activeLessonId) || lessons[0] || null;
  const activeLessonVideos = getLessonVideos(activeLesson);
  const activeVideo = activeLessonVideos[activePartIndex] || activeLessonVideos[0] || null;
  const activeEmbedId = activeVideo?.embedId || null;
  const activeVideoStatus = activeLesson ? getVideoStatus(activeLesson._id, activeVideo) : null;

  const currentQueueIdx = playableQueue.findIndex(
    (q) => q.lessonId === activeLesson?._id && q.partIndex === activePartIndex
  );
  const prevTarget = currentQueueIdx > 0 ? playableQueue[currentQueueIdx - 1] : null;
  const nextTarget =
    currentQueueIdx !== -1 && currentQueueIdx < playableQueue.length - 1
      ? playableQueue[currentQueueIdx + 1]
      : null;

  const handleMarkWatched = async (telemetry = {}) => {
    if (!activeLesson || !activeVideo) return;
    const nextStatus = activeVideoStatus === "watched" ? "unwatched" : "watched";
    await updateVideoProgress(activeLesson._id, activeVideo, nextStatus, telemetry);
    if (nextStatus === "watched") {
      toast.confirmed("Video Watched", {
        description: `Completed "${activeVideo.title}".`,
        badge: "DONE",
      });
    }
  };

  const handleSkipVideo = async (telemetry = {}) => {
    if (!activeLesson || !activeVideo) return;
    await updateVideoProgress(activeLesson._id, activeVideo, "skipped", telemetry);
    toast.info("Video Skipped", {
      description: nextTarget ? "Loading next video in curriculum..." : "Marked as skipped.",
    });
    if (nextTarget) {
      selectVideo(nextTarget.lessonId, nextTarget.partIndex);
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none"
    >
      {/* ── DEDICATED CLASSROOM HEADER BAR ── */}
      <header className="h-16 bg-[#070b16]/95 border-b border-slate-800/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/my-purchases")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Courses</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono font-bold text-indigo-300 shrink-0">
                CLASSROOM
              </span>
              <span className="text-[11px] text-slate-400 truncate hidden md:inline">
                {course.topic} • {course.instructorName || "Instructor"}
              </span>
            </div>
            <h1 className="text-xs sm:text-sm font-black text-white truncate">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Right Header Telemetry & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {computedProgress.totalVideos > 0 && (
            <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block leading-none">
                  PROGRESS
                </span>
                <span className="text-xs font-black text-emerald-400">
                  {computedProgress.completedVideos}/{computedProgress.totalVideos} ({computedProgress.percent}%)
                </span>
              </div>
              <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${computedProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveLessonId("__certificate__")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
              certificateUnlocked
                ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/45 text-amber-300 shadow shadow-amber-500/10"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
            }`}
            title={
              certificateUnlocked
                ? "Certificate Unlocked — View & Download"
                : `Certificate locked until 80% (${computedProgress.percent}% done)`
            }
          >
            {certificateUnlocked ? (
              <Award className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">
              {certificateUnlocked ? "Certificate" : `Cert (${computedProgress.percent}%/80%)`}
            </span>
          </button>

          {enrollmentMeta?.enrollmentId && (
            <button
              type="button"
              onClick={() => setInvoiceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invoice</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
            title={sidebarOpen ? "Hide Lessons Sidebar" : "Show Lessons Sidebar"}
          >
            {sidebarOpen ? (
              <PanelRightClose className="w-4 h-4 text-indigo-400" />
            ) : (
              <PanelRightOpen className="w-4 h-4 text-indigo-400" />
            )}
            <span className="hidden sm:inline">
              {sidebarOpen ? "Hide Lessons" : "Lessons"}
            </span>
          </button>
        </div>
      </header>

      {/* ── MAIN CLASSROOM SPLIT WORKSPACE ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* LEFT STAGE: Certificate Stage OR Custom Player + Active Video Controls + Notes/PDFs */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isCertificateSelected ? (
            <CertificateLessonPanel
              course={course}
              certificateState={certificateState}
              computedProgress={computedProgress}
              recipientFallbackName={
                user?.fullName || user?.displayName || user?.email?.split("@")[0]
              }
              onResumeLessons={() => {
                const firstTarget = playableQueue[0] || lessons[0];
                if (firstTarget?.lessonId) {
                  selectVideo(firstTarget.lessonId, firstTarget.partIndex || 0);
                } else if (firstTarget?._id) {
                  setActiveLessonId(firstTarget._id);
                  setActivePartIndex(0);
                }
              }}
              onOpenFullscreenModal={() => setCertificateModalOpen(true)}
            />
          ) : (
            <>
          {/* Custom Video Theater */}
          <div className="rounded-3xl overflow-hidden border border-slate-800 bg-black shadow-2xl">
            {activeEmbedId ? (
              <ProtectedVideoPlayer
                videoId={activeEmbedId}
                title={activeVideo?.title || activeLesson?.title}
                lessonTitle={activeLesson?.title}
                viewerEmail={user?.email || "Student"}
                viewerName={user?.fullName || user?.displayName || ""}
                progressStatus={activeVideoStatus}
                hasPrev={Boolean(prevTarget)}
                hasNext={Boolean(nextTarget)}
                onPrev={() =>
                  prevTarget && selectVideo(prevTarget.lessonId, prevTarget.partIndex)
                }
                onNext={() =>
                  nextTarget && selectVideo(nextTarget.lessonId, nextTarget.partIndex)
                }
                onMarkWatched={(telemetry) =>
                  updateVideoProgress(activeLesson._id, activeVideo, "watched", telemetry)
                }
                onSkipVideo={(telemetry) => handleSkipVideo(telemetry)}
                autoplay={true}
              />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center p-8 text-center space-y-2 bg-slate-950">
                <Video className="w-10 h-10 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {activeLesson?.title || "Select a Lesson"}
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  This lesson module contains reading notes or PDF worksheets. Choose a video lesson from the curriculum panel to begin playback.
                </p>
              </div>
            )}

            {/* Video Action Strip Directly Under Player */}
            {activeLesson && activeVideo && (
              <div className="px-5 py-3.5 bg-[#070b16] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block">
                    {activeLesson.title} • Part {activePartIndex + 1} of {activeLessonVideos.length}
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-white truncate">
                    {activeVideo.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMarkWatched()}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeVideoStatus === "watched"
                        ? "bg-emerald-500/20 border-emerald-500/45 text-emerald-300"
                        : "bg-slate-900 hover:bg-emerald-600/20 border-slate-700 text-slate-200 hover:text-emerald-300"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {activeVideoStatus === "watched" ? "Watched ✓" : "Mark as Watched"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkipVideo()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip Video</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lower Workspace Navigation Tabs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-4 sm:px-6 py-3 bg-[#070b16]/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[
                  {
                    id: "playlist",
                    label: `Videos in This Lesson (${activeLessonVideos.length})`,
                    icon: Video,
                  },
                  {
                    id: "resources",
                    label: `Notes & PDFs (${activeLesson?.pdfResources?.length || 0})`,
                    icon: FileText,
                  },
                  {
                    id: "overview",
                    label: "Course Info",
                    icon: BookOpen,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <Link
                to={`/courses/${id}`}
                className="text-[11px] font-bold text-slate-400 hover:text-indigo-300"
              >
                Course Overview Page →
              </Link>
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === "playlist" && (
                <div className="space-y-2.5">
                  {activeLessonVideos.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No videos uploaded for this lesson yet.
                    </p>
                  ) : (
                    activeLessonVideos.map((v, vIdx) => {
                      const isPlaying = vIdx === activePartIndex;
                      const vStatus = getVideoStatus(activeLesson._id, v);
                      return (
                        <div
                          key={v.id || vIdx}
                          onClick={() => selectVideo(activeLesson._id, vIdx)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isPlaying
                              ? "bg-indigo-600/20 border-indigo-500/45"
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
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isPlaying ? (
                                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
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
                                  <Clock className="w-3 h-3" /> {v.duration || 15} mins
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
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
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
                                  selectVideo(activeLesson._id, vIdx + 1);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
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
                    })
                  )}
                </div>
              )}

              {activeTab === "resources" && (
                <div className="space-y-4">
                  {activeLesson?.richTextContent && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                        Instructor Study Notes
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/75 p-4 rounded-2xl border border-slate-800">
                        {activeLesson.richTextContent}
                      </p>
                    </div>
                  )}

                  {activeLesson?.pdfResources?.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                        PDF Worksheets ({activeLesson.pdfResources.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                            className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-xs font-bold cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span className="truncate">{pdf.title || `Worksheet #${pIdx + 1}`}</span>
                            </span>
                            <span className="text-[10px] font-mono text-cyan-300 shrink-0">
                              Open Reader
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    !activeLesson?.richTextContent && (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        No notes or PDF worksheets attached to this lesson.
                      </p>
                    )
                  )}
                </div>
              )}

              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Award className="w-4 h-4" />
                    <span>{course.topic} • Lifetime Classroom Access Active</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </main>

        {/* RIGHT CLASSROOM CURRICULUM SIDEBAR */}
        {sidebarOpen && (
          <aside className="w-full lg:w-[400px] xl:w-[430px] bg-[#070b16] border-t lg:border-t-0 lg:border-l border-slate-800/90 flex flex-col shrink-0 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16">
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-black text-white">Course Curriculum</h2>
                </div>
                <span className="text-[11px] font-mono text-indigo-300">
                  {lessons.length} Lessons • {computedProgress.totalVideos} Videos
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  placeholder="Search lessons or video topics..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {filteredLessons.map((item, idx) => {
                const lessonVideos = getLessonVideos(item);
                const isExpanded = expandedLessonIds.includes(item._id);
                const isCurrentLesson = activeLesson?._id === item._id;
                const finishedCount = lessonVideos.filter((v) => {
                  const st = getVideoStatus(item._id, v);
                  return st === "watched" || st === "skipped";
                }).length;
                const done = lessonVideos.length > 0 && finishedCount >= lessonVideos.length;

                return (
                  <div
                    key={item._id}
                    className={`rounded-2xl border overflow-hidden transition-colors ${
                      isCurrentLesson
                        ? "border-indigo-500/45 bg-indigo-950/20"
                        : "border-slate-800/80 bg-slate-900/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        toggleLessonExpand(item._id);
                        if (!isCurrentLesson) {
                          setActiveLessonId(item._id);
                          setActivePartIndex(0);
                        }
                      }}
                      className="w-full text-left flex items-center justify-between gap-2.5 p-3.5 hover:bg-slate-800/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg border text-[11px] font-black flex items-center justify-center shrink-0 ${
                            done
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : isCurrentLesson
                              ? "bg-indigo-600 border-indigo-400 text-white"
                              : "bg-slate-950 border-slate-800 text-indigo-300"
                          }`}
                        >
                          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>
                              {finishedCount}/{lessonVideos.length} videos
                            </span>
                            {item.pdfResources?.length > 0 && (
                              <span className="text-cyan-400">
                                • {item.pdfResources.length} PDF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-800/70 bg-slate-950/75 px-2.5 py-2 space-y-1">
                        {lessonVideos.length === 0 ? (
                          <p className="text-[11px] text-slate-500 px-2 py-1.5">
                            No video streams in this lesson yet.
                          </p>
                        ) : (
                          lessonVideos.map((v, vIdx) => {
                            const st = getVideoStatus(item._id, v);
                            const isPlaying = isCurrentLesson && activePartIndex === vIdx;
                            return (
                              <button
                                key={v.id || vIdx}
                                type="button"
                                onClick={() => selectVideo(item._id, vIdx)}
                                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                                  isPlaying
                                    ? "bg-indigo-600/25 border border-indigo-500/45 text-white"
                                    : "hover:bg-slate-900 text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {st === "watched" ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : st === "skipped" ? (
                                    <SkipForward className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  ) : (
                                    <PlayCircle
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isPlaying ? "text-indigo-300" : "text-slate-500"
                                      }`}
                                    />
                                  )}
                                  <span className="truncate font-semibold">
                                    {vIdx + 1}. {v.title}
                                  </span>
                                </div>

                                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                  {v.duration || 15}m
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── PERMANENT FINAL MILESTONE LESSON: COURSE CERTIFICATE (LOCKED UNTIL 80%) ── */}
              <div
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isCertificateSelected
                    ? certificateUnlocked
                      ? "border-amber-400/70 bg-amber-950/25 shadow-lg shadow-amber-500/10"
                      : "border-indigo-500/50 bg-indigo-950/25"
                    : certificateUnlocked
                    ? "border-amber-500/40 bg-gradient-to-r from-emerald-950/35 via-slate-900/80 to-amber-950/30"
                    : "border-slate-800 bg-slate-900/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveLessonId("__certificate__")}
                  className="w-full text-left flex items-center justify-between gap-2.5 p-3.5 hover:bg-slate-800/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg border text-[11px] font-black flex items-center justify-center shrink-0 ${
                        certificateUnlocked
                          ? "bg-amber-500/20 border-amber-400/55 text-amber-300"
                          : isCertificateSelected
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-slate-950 border-slate-700 text-slate-400"
                      }`}
                    >
                      {certificateUnlocked ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-white truncate">
                          Certificate
                        </p>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                            certificateUnlocked
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {certificateUnlocked ? "Unlocked" : "Locked"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {certificateUnlocked
                          ? "Ready to view & download official diploma"
                          : `Complete 80% to unlock (${computedProgress.percent}% done)`}
                      </p>
                    </div>
                  </div>

                  {certificateUnlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                      {computedProgress.percent}/80%
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Anti-Share Classroom Mode
              </span>
              <span>Watched: {computedProgress.watchedCount}</span>
            </div>
          </aside>
        )}
      </div>

      {/* Inline PDF Viewer */}
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
      {certificateModalOpen && (
        <CourseCertificateModal
          courseId={id}
          courseTitle={course.title}
          initialCertificateState={certificateState}
          onClose={() => setCertificateModalOpen(false)}
        />
      )}

      {/* Global Realtime Bottom SMS / Appeal Popup */}
      <BottomNotificationPopup />
    </div>
  );
};

export default CourseLearningDashboard;

