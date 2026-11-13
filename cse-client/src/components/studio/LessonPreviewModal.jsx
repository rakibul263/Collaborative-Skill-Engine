import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Play,
  Video,
  FileText,
  Clock,
  Eye,
  EyeOff,
  Youtube,
  BookOpen,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import ProtectedVideoPlayer from "@/components/courses/ProtectedVideoPlayer";
import { extractYouTubeId } from "@/lib/youtube";
import apiClient from "@/lib/apiClient";

/**
 * LessonPreviewModal — Studio modal that renders a complete student-style preview
 * of a lesson (custom website player, multi-video playlist, study notes, and inline PDF preview).
 */
const LessonPreviewModal = ({ lesson, courseTitle = "", onClose }) => {
  const videos =
    Array.isArray(lesson?.videos) && lesson.videos.length > 0
      ? lesson.videos
      : (lesson?.videoLinks || [])
          .filter(Boolean)
          .map((url, idx) => ({
            id: `vid_${idx + 1}`,
            title: `Video Part ${idx + 1}`,
            url,
            videoId: extractYouTubeId(url),
            duration: Math.round((Number(lesson?.videoDuration) || 15) / Math.max(1, lesson?.videoLinks?.length || 1)),
            visibility: lesson?.videoVisibility || "unlisted",
          }));

  const pdfs = Array.isArray(lesson?.pdfResources) ? lesson.pdfResources : [];

  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [activePdfIdx, setActivePdfIdx] = useState(pdfs.length > 0 ? 0 : null);
  const [pdfBlobState, setPdfBlobState] = useState({ forUrl: "", blobUrl: "", loading: false, error: "" });

  const activeVideo = videos[activeVideoIdx] || null;
  const activeVideoId = activeVideo?.videoId || extractYouTubeId(activeVideo?.url || "");
  const activePdf = activePdfIdx !== null ? pdfs[activePdfIdx] || null : null;
  const targetPdfUrl = activePdf?.fileUrl || "";

  useEffect(() => {
    if (!targetPdfUrl) return undefined;
    let revoked = "";
    let cancelled = false;

    const loadPdf = async () => {
      if (!targetPdfUrl.includes("/courses/pdfs/")) {
        setPdfBlobState({ forUrl: targetPdfUrl, blobUrl: targetPdfUrl, loading: false, error: "" });
        return;
      }
      setPdfBlobState({ forUrl: targetPdfUrl, blobUrl: "", loading: true, error: "" });
      try {
        const res = await apiClient.get(targetPdfUrl, { responseType: "blob" });
        if (cancelled) return;
        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        revoked = url;
        setPdfBlobState({ forUrl: targetPdfUrl, blobUrl: url, loading: false, error: "" });
      } catch (err) {
        if (!cancelled) {
          setPdfBlobState({
            forUrl: targetPdfUrl,
            blobUrl: "",
            loading: false,
            error: err?.response?.data?.message || "Failed to load PDF preview.",
          });
        }
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [targetPdfUrl]);

  const pdfLoading = Boolean(targetPdfUrl && pdfBlobState.forUrl === targetPdfUrl && pdfBlobState.loading);
  const pdfError = targetPdfUrl && pdfBlobState.forUrl === targetPdfUrl ? pdfBlobState.error : "";
  const pdfBlobUrl = targetPdfUrl && pdfBlobState.forUrl === targetPdfUrl ? pdfBlobState.blobUrl : "";

  if (!lesson || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9992] bg-[#02050e]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="w-full max-w-6xl rounded-[28px] border border-indigo-500/30 bg-[#0b101f] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.95)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 shrink-0" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#070b16] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/35 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 shrink-0">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              STUDIO LESSON PREVIEW
            </span>
            <div className="min-w-0">
              {courseTitle && (
                <span className="text-[10px] font-bold text-slate-400 block truncate">
                  Course: {courseTitle}
                </span>
              )}
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {lesson.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Preview Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* Top Custom Player */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl">
            {activeVideoId ? (
              <ProtectedVideoPlayer
                videoId={activeVideoId}
                title={activeVideo?.title || lesson.title}
                lessonTitle={lesson.title}
                previewMode={true}
                autoplay={false}
                hasPrev={activeVideoIdx > 0}
                hasNext={activeVideoIdx < videos.length - 1}
                onPrev={() => setActiveVideoIdx((i) => Math.max(0, i - 1))}
                onNext={() => setActiveVideoIdx((i) => Math.min(videos.length - 1, i + 1))}
              />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center text-slate-400 space-y-2 p-6 text-center">
                <Youtube className="w-10 h-10 text-rose-400/70" />
                <p className="text-sm font-bold text-white">No Videos Attached Yet</p>
                <p className="text-xs text-slate-400">
                  Attach YouTube Unlisted video links to preview the custom player.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Split: Video List + Study Material & Multi-PDF Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Videos Under Lesson */}
            <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-400" />
                  Lesson Videos ({videos.length})
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Custom Player
                </span>
              </div>

              {videos.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No video parts uploaded in this lesson.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {videos.map((v, idx) => {
                    const active = idx === activeVideoIdx;
                    return (
                      <button
                        key={v.id || idx}
                        type="button"
                        onClick={() => setActiveVideoIdx(idx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                          active
                            ? "bg-indigo-600/20 border-indigo-500/45 text-white"
                            : "bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                              active
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-950 text-slate-400 border border-slate-800"
                            }`}
                          >
                            {active ? <Play className="w-3.5 h-3.5 fill-white" /> : idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{v.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {v.duration || 15}m
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-rose-300">
                                <EyeOff className="w-2.5 h-2.5" />
                                {(v.visibility || "unlisted").toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {lesson.richTextContent && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Lesson Study Notes
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/70 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                    {lesson.richTextContent}
                  </p>
                </div>
              )}
            </div>

            {/* PDFs Inline Modal Preview */}
            <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Attached PDF Worksheets ({pdfs.length})
                </h4>
              </div>

              {pdfs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500 text-xs">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  No PDF worksheets attached to this lesson.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {pdfs.map((pdf, idx) => (
                      <button
                        key={pdf.id || idx}
                        type="button"
                        onClick={() => setActivePdfIdx(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          activePdfIdx === idx
                            ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[180px]">{pdf.title || `PDF #${idx + 1}`}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 min-h-[260px] rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                    {pdfLoading ? (
                      <div className="h-64 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                        Loading PDF preview...
                      </div>
                    ) : pdfError ? (
                      <div className="h-64 flex flex-col items-center justify-center gap-2 text-xs text-rose-300 p-4 text-center">
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                        <span>{pdfError}</span>
                      </div>
                    ) : pdfBlobUrl ? (
                      <iframe
                        src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                        title={activePdf?.title || "PDF Preview"}
                        className="w-full h-72 sm:h-80 border-0 bg-white"
                      />
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LessonPreviewModal;
