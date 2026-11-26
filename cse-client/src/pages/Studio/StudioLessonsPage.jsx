import React, { useState, useEffect, useCallback } from "react";
import {
  Video,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Clock,
  Layers,
  Eye,
  BookOpen,
  Youtube,
  UploadCloud,
  Play,
  EyeOff,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { useOutletContext, Link, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import LessonEditorModal from "@/components/studio/LessonEditorModal";
import YouTubeVideoUploadModal from "@/components/studio/YouTubeVideoUploadModal";
import LessonPreviewModal from "@/components/studio/LessonPreviewModal";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";
import { extractYouTubeId, getYouTubeThumbnailUrl } from "@/lib/youtube";

const StudioLessonsPage = () => {
  const { courses = [] } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCourseId = searchParams.get("courseId");

  const [manualCourseId, setManualCourseId] = useState(queryCourseId || "");
  const selectedCourseId =
    queryCourseId && courses.some((c) => c._id === queryCourseId)
      ? queryCourseId
      : manualCourseId && courses.some((c) => c._id === manualCourseId)
      ? manualCourseId
      : courses[0]?._id || "";

  const [lessons, setLessons] = useState(
    () => (selectedCourseId ? getCachedData(`/courses/${selectedCourseId}/lessons`) : null) || []
  );
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const [videoUploadLesson, setVideoUploadLesson] = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);

  const handleSelectCourse = (courseId) => {
    setManualCourseId(courseId);
    setPreviewLesson(null);
    const cached = getCachedData(`/courses/${courseId}/lessons`);
    if (Array.isArray(cached)) setLessons(cached);
    setSearchParams({ courseId }, { replace: true });
  };

  const fetchLessons = useCallback(
    async (targetId, forceRefresh = false) => {
      const idToLoad = targetId || selectedCourseId;
      if (!idToLoad) return;
      const url = `/courses/${idToLoad}/lessons`;
      const cached = getCachedData(url);
      if (!cached && !forceRefresh) setLoading(true);
      try {
        const res = await apiClient.get(url, { forceRefresh });
        setLessons(res.data || []);
      } catch (err) {
        console.error("Fetch lessons error:", err);
        if (!cached) toast.error("Could not load lessons for selected course.");
      } finally {
        setLoading(false);
      }
    },
    [selectedCourseId]
  );

  useEffect(() => {
    if (!selectedCourseId) return undefined;
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (!active) return;
      await fetchLessons(selectedCourseId);
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedCourseId, fetchLessons]);

  const handleDeleteLesson = async (lessonId, lessonTitle) => {
    const { isConfirmed } = await showConfirm({
      variant: "delete",
      badge: "MODULE REMOVAL",
      title: "Delete Lesson Module?",
      description:
        "This lesson module, all linked videos, and PDF worksheets will be permanently removed.",
      targetLabel: "Lesson Title",
      targetValue: lessonTitle || "Selected Lesson Module",
      confirmText: "Delete Lesson",
    });
    if (!isConfirmed) return;

    try {
      await apiClient.delete(`/lessons/${lessonId}`);
      toast.deleted("Lesson Module Removed", {
        description: "Module deleted permanently from course curriculum.",
        target: lessonTitle,
      });
      fetchLessons();
    } catch {
      toast.error("Failed to delete lesson module.");
    }
  };

  const selectedCourseDoc = courses.find((c) => c._id === selectedCourseId);
  const totalDuration = lessons.reduce(
    (acc, curr) => acc + (Number(curr.videoDuration) || 15),
    0
  );
  const totalVideosCount = lessons.reduce((acc, l) => {
    if (Array.isArray(l.videos) && l.videos.length > 0) return acc + l.videos.length;
    if (Array.isArray(l.videoLinks)) return acc + l.videoLinks.filter(Boolean).length;
    return acc;
  }, 0);
  const totalPdfsCount = lessons.reduce(
    (acc, l) => acc + (Array.isArray(l.pdfResources) ? l.pdfResources.length : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Lesson Curriculum &amp; Multi-Video Studio
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Select a course below, create structured lessons with multiple YouTube Unlisted videos &amp; PDFs, and test in modal preview.
          </p>
        </div>

        {courses.length > 0 && (
          <button
            onClick={() => {
              setSelectedLesson(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create New Lesson
          </button>
        )}
      </div>

      {/* ── COURSE SELECTOR & TELEMETRY ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1.5 flex-1 max-w-xl">
            <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              Select Course Under Which Lesson Is Created:
            </label>
            {courses.length > 0 ? (
              <select
                value={selectedCourseId}
                onChange={(e) => handleSelectCourse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 hover:border-indigo-500/60 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
              >
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} — {c.topic} ({c.status})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400">No courses created yet.</p>
            )}
          </div>

          {selectedCourseDoc && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {lessons.length} Lessons
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5" />
                {totalVideosCount} Videos
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {totalPdfsCount} PDFs
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {totalDuration} mins
              </span>
            </div>
          )}
        </div>

        {/* Quick Course Pills */}
        {courses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <button
                key={c._id}
                onClick={() => handleSelectCourse(c._id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  selectedCourseId === c._id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                    : "bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800"
                }`}
              >
                <Video className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[200px]">{c.title}</span>
              </button>
            ))}
          </div>
        )}

        {courses.length === 0 && (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl w-full text-center space-y-2">
            <p className="text-xs text-slate-400">
              No courses created yet. Create a course first in the Courses tab.
            </p>
            <Link
              to="/studio/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Course
            </Link>
          </div>
        )}
      </div>

      {/* ── LESSONS OUTLINE LIST ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              {selectedCourseDoc
                ? `Lessons under "${selectedCourseDoc.title}"`
                : "Curriculum Sequence & Multi-Video Manager"}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload multiple Unlisted videos and multiple PDF worksheets per lesson, then preview the custom player inside a Studio modal.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {lessons.length} Modules Total
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingSpinner size="lg" label="Loading curriculum modules..." />
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson, idx) => {
              const lessonVideos =
                Array.isArray(lesson.videos) && lesson.videos.length > 0
                  ? lesson.videos
                  : (lesson.videoLinks || []).filter(Boolean).map((url, vIdx) => ({
                      id: `vid_${vIdx + 1}`,
                      title: `Video Part ${vIdx + 1}`,
                      url,
                      videoId: extractYouTubeId(url),
                    }));
              const primaryVideo = lessonVideos[0];
              const ytId =
                primaryVideo?.videoId || extractYouTubeId(primaryVideo?.url || "");
              const thumbUrl = ytId
                ? primaryVideo?.thumbnailUrl ||
                  lesson.videoMeta?.thumbnailUrl ||
                  getYouTubeThumbnailUrl(primaryVideo?.url || `https://youtu.be/${ytId}`, "hqdefault")
                : null;
              const pdfCount = Array.isArray(lesson.pdfResources)
                ? lesson.pdfResources.length
                : 0;

              return (
                <div
                  key={lesson._id}
                  className="rounded-2xl bg-slate-950/85 border border-slate-800 hover:border-indigo-500/35 overflow-hidden transition-all group p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Left: Thumbnail Preview + Module Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 flex-1">
                      {thumbUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewLesson(lesson)}
                          className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 group/thumb cursor-pointer"
                          title="Open Studio Modal Preview"
                        >
                          <img
                            src={thumbUrl}
                            alt={lesson.title}
                            className="w-full h-full object-cover opacity-85 group-hover/thumb:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/25 flex items-center justify-center transition-colors">
                            <span className="w-9 h-9 rounded-xl bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                              <Play className="w-4 h-4 ml-0.5 fill-white" />
                            </span>
                          </div>
                          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 border border-rose-500/35 text-[9px] font-mono font-bold text-rose-300">
                            <EyeOff className="w-2.5 h-2.5" />
                            {(lesson.videoVisibility || "unlisted").toUpperCase()}
                          </span>
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/85 border border-slate-700 text-[9px] font-mono font-bold text-white">
                            {lessonVideos.length} Video{lessonVideos.length > 1 ? "s" : ""}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVideoUploadLesson(lesson)}
                          className="w-full sm:w-44 aspect-video rounded-xl border border-dashed border-rose-500/35 bg-gradient-to-br from-slate-900 to-rose-950/20 hover:border-rose-400/70 hover:bg-rose-950/30 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-rose-200 transition-all shrink-0 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                            <UploadCloud className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold">
                            Upload Videos &amp; PDFs
                          </span>
                        </button>
                      )}

                      {/* Details */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-mono font-black text-[11px]">
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                          <h4 className="font-bold text-white text-sm group-hover:text-indigo-200 transition-colors truncate">
                            {lesson.title}
                          </h4>

                          {lesson.isFreePreview && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Free Preview
                            </span>
                          )}

                          {lessonVideos.length > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {lessonVideos.length} Video{lessonVideos.length > 1 ? "s" : ""} Ready
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Video Pending
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">
                          {lesson.description ||
                            (primaryVideo?.title
                              ? `Includes: ${lessonVideos.map((v) => v.title).join(", ")}`
                              : "Ready for multi-video & multi-PDF upload.")}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {lesson.videoDuration || 15} mins total
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-cyan-300">
                            <FileText className="w-3 h-3 text-cyan-400" />
                            {pdfCount} PDF{pdfCount !== 1 ? "s" : ""} Attached
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setVideoUploadLesson(lesson)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          lessonVideos.length > 0
                            ? "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300"
                            : "bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-md shadow-rose-600/20"
                        }`}
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        <span>
                          {lessonVideos.length > 0 ? "Manage Videos / PDFs" : "Upload Videos & PDFs"}
                        </span>
                      </button>

                      {(lessonVideos.length > 0 || pdfCount > 0) && (
                        <button
                          type="button"
                          onClick={() => setPreviewLesson(lesson)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-indigo-600/20 hover:bg-indigo-600/35 border-indigo-500/40 text-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Modal Preview</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setShowModal(true);
                        }}
                        className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-colors"
                        title="Edit Lesson Details, Videos & PDFs"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLesson(lesson._id, lesson.title)}
                        className="p-2.5 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700/80 hover:border-rose-500/30 transition-colors"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Summary Pills for Video Parts inside Lesson */}
                  {(lessonVideos.length > 0 || pdfCount > 0) && (
                    <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                      {lessonVideos.map((v, vIdx) => (
                        <button
                          key={v.id || vIdx}
                          type="button"
                          onClick={() => setPreviewLesson(lesson)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/35 text-[10px] font-semibold text-slate-300 cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 text-rose-400" />
                          <span className="truncate max-w-[160px]">
                            {vIdx + 1}. {v.title}
                          </span>
                          <span className="text-slate-500">({v.duration || 15}m)</span>
                        </button>
                      ))}
                      {(lesson.pdfResources || []).map((pdf, pIdx) => (
                        <button
                          key={pdf.id || pIdx}
                          type="button"
                          onClick={() => setPreviewLesson(lesson)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/25 text-[10px] font-semibold text-cyan-300 cursor-pointer"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[150px]">{pdf.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {lessons.length === 0 && selectedCourseId && (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-xs">No lessons added to this course yet.</p>
                <button
                  onClick={() => {
                    setSelectedLesson(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Lesson Module
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Lesson Modal with Course Selector, Multi-Video & Multi-PDF */}
      {showModal && (
        <LessonEditorModal
          courses={courses}
          courseId={selectedCourseId}
          lesson={selectedLesson}
          onSuccess={(_saved, targetCourseId) => {
            if (targetCourseId && targetCourseId !== selectedCourseId) {
              setManualCourseId(targetCourseId);
              setSearchParams({ courseId: targetCourseId }, { replace: true });
              fetchLessons(targetCourseId);
            } else {
              fetchLessons();
            }
            toast.confirmed(
              selectedLesson ? "Lesson Module Updated" : "New Lesson Module Created",
              {
                description: selectedLesson
                  ? "Lesson videos, PDFs, and notes saved."
                  : "Lesson created under selected course!",
                badge: selectedLesson ? "SAVED" : "LESSON CREATED",
              }
            );
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Multi-Video & PDF Upload Studio Modal */}
      {videoUploadLesson && (
        <YouTubeVideoUploadModal
          lesson={videoUploadLesson}
          courseTitle={selectedCourseDoc?.title || ""}
          onSuccess={() => fetchLessons()}
          onClose={() => setVideoUploadLesson(null)}
        />
      )}

      {/* Full Studio Lesson Preview Modal */}
      {previewLesson && (
        <LessonPreviewModal
          lesson={previewLesson}
          courseTitle={selectedCourseDoc?.title || ""}
          onClose={() => setPreviewLesson(null)}
        />
      )}
    </div>
  );
};

export default StudioLessonsPage;
