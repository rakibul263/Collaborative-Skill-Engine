/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Youtube,
  Lock,
  Globe,
  Play,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  Bell,
  Plus,
  Trash2,
  EyeOff,
  Loader2,
  ShieldCheck,
  FileText,
  UploadCloud,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "@/components/ui/toast-system";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import ProtectedVideoPlayer from "@/components/courses/ProtectedVideoPlayer";
import {
  extractYouTubeId,
  isValidYouTubeUrl,
  normalizeYouTubeWatchUrl,
  getYouTubeThumbnailUrl,
  fetchYouTubeMeta,
} from "@/lib/youtube";

const createVideoPart = (idx = 0) => ({
  id: `vid_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
  title: "",
  url: "",
  duration: 15,
  visibility: "unlisted",
});

/**
 * YouTubeVideoUploadModal — Multi-video & multi-PDF upload studio modal for any lesson module.
 */
const YouTubeVideoUploadModal = ({ lesson, courseTitle = "", onSuccess, onClose }) => {
  const [videoItems, setVideoItems] = useState(() => {
    if (Array.isArray(lesson?.videos) && lesson.videos.length > 0) {
      return lesson.videos.map((v, idx) => ({
        id: v.id || `vid_${idx + 1}`,
        title: v.title || "",
        url: v.url || "",
        duration: Number(v.duration) || 15,
        visibility: v.visibility || lesson?.videoVisibility || "unlisted",
      }));
    }
    if (Array.isArray(lesson?.videoLinks) && lesson.videoLinks.length > 0) {
      return lesson.videoLinks.filter(Boolean).map((url, idx) => ({
        id: `vid_${idx + 1}`,
        title: idx === 0 && lesson?.videoMeta?.title ? lesson.videoMeta.title : `Video Part ${idx + 1}`,
        url,
        duration: Math.max(1, Math.round((Number(lesson?.videoDuration) || 15) / lesson.videoLinks.length)),
        visibility: lesson?.videoVisibility || "unlisted",
      }));
    }
    return [createVideoPart(0)];
  });

  const [pdfResources, setPdfResources] = useState(
    Array.isArray(lesson?.pdfResources) ? lesson.pdfResources : []
  );
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [notifyStudents, setNotifyStudents] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showLivePlayer, setShowLivePlayer] = useState(false);

  const [metaMap, setMetaMap] = useState({});
  const [detectingMap, setDetectingMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const autoDetectPart = async (idx, overrideUrl = null) => {
    const targetUrl =
      overrideUrl !== null ? overrideUrl : (videoItems[idx]?.url || "");
    const vidId = extractYouTubeId(targetUrl);
    if (!vidId) return;

    setDetectingMap((prev) => ({ ...prev, [idx]: true }));
    try {
      const meta = await fetchYouTubeMeta(targetUrl);
      if (meta) {
        setMetaMap((prev) => ({ ...prev, [vidId]: meta }));
        setVideoItems((prev) => {
          const next = [...prev];
          const current = next[idx];
          if (!current) return prev;
          const isTitleGeneric =
            !current.title.trim() ||
            /^Video Part\s*\d+/i.test(current.title.trim()) ||
            (metaMap[vidId] && current.title === metaMap[vidId].title);

          const detectedTitle = isTitleGeneric && meta.title ? meta.title : current.title;
          const detectedDuration =
            Number(meta.durationMinutes) || Number(meta.duration) || current.duration || 15;

          next[idx] = {
            ...current,
            title: detectedTitle,
            duration: detectedDuration,
            videoId: vidId,
            thumbnailUrl: meta.thumbnailUrl || current.thumbnailUrl,
            authorName: meta.authorName || current.authorName,
          };
          return next;
        });

        toast.confirmed("Video Details Auto-Detected", {
          description: `Auto-filled title & ${meta.durationMinutes || 15}m duration from YouTube.`,
          badge: meta.durationFormatted || "AUTO-DETECT",
        });
      }
    } catch {
      /* ignore */
    } finally {
      setDetectingMap((prev) => ({ ...prev, [idx]: false }));
    }
  };

  useEffect(() => {
    let active = true;
    videoItems.forEach((item, idx) => {
      const id = extractYouTubeId(item.url);
      if (id && !metaMap[id]) {
        fetchYouTubeMeta(item.url).then((meta) => {
          if (!active || !meta) return;
          setMetaMap((prev) => ({ ...prev, [id]: meta }));
          // If title is generic or duration is default, auto-populate
          setVideoItems((prev) => {
            const next = [...prev];
            const current = next[idx];
            if (!current) return prev;
            const isTitleGeneric =
              !current.title.trim() || /^Video Part\s*\d+/i.test(current.title.trim());
            const needsDuration = !current.duration || current.duration === 15;
            if (isTitleGeneric || needsDuration) {
              next[idx] = {
                ...current,
                title: isTitleGeneric && meta.title ? meta.title : current.title,
                duration: needsDuration && meta.durationMinutes ? meta.durationMinutes : current.duration,
                videoId: id,
                thumbnailUrl: meta.thumbnailUrl || current.thumbnailUrl,
                authorName: meta.authorName || current.authorName,
              };
              return next;
            }
            return prev;
          });
        });
      }
    });
    return () => {
      active = false;
    };
  }, [videoItems, metaMap]);

  const handleFieldChange = (idx, field, val) => {
    setError("");
    setVideoItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });

    if (field === "url") {
      const vidId = extractYouTubeId(val);
      if (vidId) {
        autoDetectPart(idx, val);
      }
    }
  };

  const handleAddPart = () => {
    if (videoItems.length >= 15) return;
    setVideoItems((prev) => [...prev, createVideoPart(prev.length)]);
  };

  const handleRemovePart = (idx) => {
    setVideoItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [createVideoPart(0)];
    });
    if (previewIndex >= videoItems.length - 1) {
      setPreviewIndex(Math.max(0, videoItems.length - 2));
    }
  };

  const handleMultiPdfUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const badFile = files.find(
      (f) => f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")
    );
    if (badFile) {
      return setError(`"${badFile.name}" is not a valid PDF file.`);
    }

    setUploadingPdf(true);
    setError("");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("pdfs", f));
      const res = await apiClient.post("/lessons/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPdfResources((prev) => [...prev, ...(res.data?.files || [])]);
    } catch (err) {
      setError(err?.response?.data?.message || "PDF upload failed.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    const filled = videoItems.filter((item) => item.url.trim().length > 0);
    if (filled.length === 0) {
      return setError("Please paste at least one YouTube Unlisted video link.");
    }

    const invalidLink = filled.find((item) => !isValidYouTubeUrl(item.url));
    if (invalidLink) {
      return setError(
        "Invalid YouTube link detected. Use a valid youtube.com/watch?v=..., youtu.be/..., or studio.youtube.com/video/... URL."
      );
    }

    const formattedVideos = filled.map((item, idx) => {
      const normalizedUrl = normalizeYouTubeWatchUrl(item.url);
      const vidId = extractYouTubeId(normalizedUrl);
      const meta = vidId ? metaMap[vidId] : null;
      return {
        id: item.id || `vid_${idx + 1}_${vidId}`,
        title: item.title.trim() || meta?.title || `Video Part ${idx + 1}`,
        url: normalizedUrl,
        videoId: vidId,
        duration: Math.max(1, Number(item.duration) || 15),
        visibility: item.visibility === "public" ? "public" : "unlisted",
        thumbnailUrl: meta?.thumbnailUrl || getYouTubeThumbnailUrl(normalizedUrl, "hqdefault"),
        authorName: meta?.authorName || "",
      };
    });

    const primary = formattedVideos[0];
    const totalDuration = formattedVideos.reduce((sum, v) => sum + v.duration, 0);

    setSaving(true);
    try {
      const res = await apiClient.patch(`/lessons/${lesson._id}`, {
        videos: formattedVideos,
        videoLinks: formattedVideos.map((v) => v.url),
        videoUrl: primary.url,
        videoVisibility: primary.visibility,
        videoMeta: {
          videoId: primary.videoId,
          title: primary.title,
          authorName: primary.authorName,
          thumbnailUrl: primary.thumbnailUrl,
          provider: "youtube",
        },
        videoDuration: totalDuration,
        pdfResources,
        notifyStudents,
      });

      toast.confirmed("Lesson Videos & Resources Saved", {
        description: `${formattedVideos.length} video${formattedVideos.length > 1 ? "s" : ""} attached to "${lesson.title}"${notifyStudents ? " and learners notified" : ""}.`,
        target: primary.title,
        badge: `${formattedVideos.length} VIDEO${formattedVideos.length > 1 ? "S" : ""}`,
      });
      onSuccess?.(res.data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save video to lesson.");
    } finally {
      setSaving(false);
    }
  };

  const activeItem = videoItems[previewIndex] || videoItems[0];
  const activeVideoId = activeItem ? extractYouTubeId(activeItem.url) : null;
  const activeMeta = activeVideoId ? metaMap[activeVideoId] : null;
  const activeThumb = activeVideoId
    ? getYouTubeThumbnailUrl(activeItem.url, "hqdefault")
    : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 font-sans overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#02050e]/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative z-10 w-full max-w-3xl rounded-[26px] border border-rose-500/25 bg-[#0b101f]/95 backdrop-blur-2xl shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)] overflow-hidden my-6"
        >
          <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500 via-rose-500 to-purple-500" />

          {/* Header */}
          <div className="px-6 py-3.5 bg-[#070b16]/90 border-b border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300 shrink-0">
                <Youtube className="w-3.5 h-3.5 text-rose-400" />
                MULTI-VIDEO &amp; PDF STUDIO
              </span>
              <div className="min-w-0">
                {courseTitle && (
                  <span className="text-[10px] text-slate-400 block truncate">
                    Course: {courseTitle}
                  </span>
                )}
                <span className="text-xs font-bold text-white truncate block">
                  {lesson?.title}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto custom-scrollbar">
            {/* Guide Banner */}
            <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/50 via-[#0d1428] to-rose-950/30 p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Add multiple YouTube Unlisted videos + multiple PDF worksheets in this lesson</span>
              </div>
              <a
                href="https://studio.youtube.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold"
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>Open YouTube Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs font-semibold text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Video Parts List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Lesson Videos ({videoItems.length}/15)
                </label>
                {videoItems.length < 15 && (
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-xs font-bold text-indigo-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Video Part
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {videoItems.map((item, idx) => {
                  const vid = extractYouTubeId(item.url);
                  const meta = vid ? metaMap[vid] : null;
                  const isChecking = Boolean(vid && !meta);
                  return (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleFieldChange(idx, "title", e.target.value)}
                          placeholder={meta?.title || `Video Part ${idx + 1} Title`}
                          className="sm:col-span-4 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />

                        <div className="sm:col-span-5 relative">
                          <Youtube
                            className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                              vid ? "text-rose-400" : "text-slate-500"
                            }`}
                          />
                          <input
                            type="text"
                            value={item.url}
                            onChange={(e) => {
                              handleFieldChange(idx, "url", e.target.value);
                              setPreviewIndex(idx);
                            }}
                            onFocus={() => setPreviewIndex(idx)}
                            placeholder="https://youtu.be/... or youtube.com/watch?v=..."
                            className={`w-full bg-slate-900 border rounded-xl pl-8 pr-24 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${
                              item.url.trim() && !vid
                                ? "border-rose-500/60"
                                : vid
                                ? "border-emerald-500/40"
                                : "border-slate-800 focus:border-indigo-500"
                            }`}
                          />
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {detectingMap[idx] ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-[9px] font-mono text-indigo-300">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                Auto...
                              </span>
                            ) : vid ? (
                              <button
                                type="button"
                                onClick={() => autoDetectPart(idx)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-[9px] font-mono font-bold text-emerald-300 cursor-pointer transition-all"
                                title="Auto-detect title & duration from YouTube"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                <span>Auto-Detect</span>
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="sm:col-span-3 flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Clock className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="number"
                              min="1"
                              max="600"
                              value={item.duration}
                              onChange={(e) => handleFieldChange(idx, "duration", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-6 pr-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              title="Duration (mins)"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleFieldChange(
                                idx,
                                "visibility",
                                item.visibility === "unlisted" ? "public" : "unlisted"
                              )
                            }
                            className={`p-2 rounded-xl border text-xs ${
                              item.visibility === "unlisted"
                                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                : "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                            }`}
                            title={item.visibility === "unlisted" ? "Unlisted" : "Public"}
                          >
                            {item.visibility === "unlisted" ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Globe className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {videoItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePart(idx)}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-slate-800 text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {meta && (meta.durationFormatted || meta.title) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-emerald-400 font-bold shrink-0">Auto-Detected:</span>
                            <span className="truncate text-slate-200">"{meta.title}"</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
                            <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                              {meta.durationFormatted ? `${meta.durationFormatted} (${meta.durationMinutes}m)` : `${item.duration || 15} mins`}
                            </span>
                            {meta.authorName && <span>• {meta.authorName}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Player Preview */}
            {activeVideoId && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-inner">
                <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[11px] font-bold text-white truncate">
                      {activeItem?.title || activeMeta?.title || `Verified Stream (${activeVideoId})`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLivePlayer((p) => !p)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/35 text-indigo-300 text-[10px] font-bold shrink-0 transition-all"
                  >
                    <Play className="w-3 h-3" />
                    <span>{showLivePlayer ? "Hide Custom Player" : "Test Custom Player"}</span>
                  </button>
                </div>

                {showLivePlayer ? (
                  <ProtectedVideoPlayer
                    videoId={activeVideoId}
                    title={activeItem?.title || activeMeta?.title || lesson?.title}
                    lessonTitle={lesson?.title}
                    previewMode={true}
                    autoplay={true}
                  />
                ) : (
                  <div
                    onClick={() => setShowLivePlayer(true)}
                    className="relative aspect-video max-h-44 w-full overflow-hidden bg-slate-900 cursor-pointer group"
                  >
                    <img
                      src={activeThumb}
                      alt="YouTube video thumbnail"
                      className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col items-center justify-center gap-2">
                      <div className="w-11 h-11 rounded-2xl bg-rose-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
                        <Play className="w-5 h-5 ml-0.5 fill-white" />
                      </div>
                      <span className="text-[11px] font-bold text-white/95 px-3 py-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-md">
                        Click to Test Protected Website Player
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Multi-PDF Attachments */}
            <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/75 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  PDF Resources ({pdfResources.length})
                </span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-bold cursor-pointer">
                  {uploadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingPdf ? "Uploading..." : "Upload PDFs"}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    disabled={uploadingPdf}
                    onChange={handleMultiPdfUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {pdfResources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pdfResources.map((pdf, pIdx) => (
                    <span
                      key={pdf.id || pIdx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                    >
                      <FileText className="w-3 h-3 text-cyan-400" />
                      <span className="truncate max-w-[160px]">{pdf.title}</span>
                      <button
                        type="button"
                        onClick={() => setPdfResources((prev) => prev.filter((_, i) => i !== pIdx))}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>



            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingPdf}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-indigo-600 to-purple-600 hover:from-rose-500 hover:via-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <ButtonSpinner size="xs" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Save Videos &amp; PDFs</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default YouTubeVideoUploadModal;
