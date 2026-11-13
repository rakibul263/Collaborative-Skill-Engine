import React, { useState } from "react";
import {
  X,
  Video,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  FolderOpen,
  UploadCloud,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "@/components/ui/toast-system";
import { extractYouTubeId, fetchYouTubeMeta, getYouTubeThumbnailUrl } from "@/lib/youtube";

const createVideoItem = (idx = 0) => ({
  id: `vid_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
  title: "",
  url: "",
  duration: 15,
  visibility: "unlisted",
  videoId: "",
  thumbnailUrl: "",
  authorName: "",
  durationFormatted: "",
});

/**
 * LessonEditorModal — Clean, modern modal for creating & editing lesson modules.
 * Supports multiple YouTube Unlisted videos with auto-detection of title & duration,
 * optional PDF worksheets, markdown notes, and free preview toggle.
 */
const LessonEditorModal = ({ courses = [], courseId, lesson, onSuccess, onClose }) => {
  const isEditing = !!lesson?._id;

  const [selectedCourseId, setSelectedCourseId] = useState(
    lesson?.courseId || courseId || (courses.length > 0 ? courses[0]._id : "")
  );

  const [title, setTitle] = useState(lesson?.title || "");
  const [description] = useState(lesson?.description || "");
  const [richTextContent, setRichTextContent] = useState(lesson?.richTextContent || "");
  const [isFreePreview, setIsFreePreview] = useState(!!lesson?.isFreePreview);

  // Multi-video state
  const [videos, setVideos] = useState(() => {
    if (Array.isArray(lesson?.videos) && lesson.videos.length > 0) {
      return lesson.videos.map((v, idx) => {
        const vidId = v.videoId || v.embedId || extractYouTubeId(v.url || "");
        return {
          id: v.id || `vid_${idx + 1}`,
          title: v.title || "",
          url: v.url || (vidId ? `https://www.youtube.com/watch?v=${vidId}` : ""),
          duration: Number(v.duration) || 15,
          visibility: v.visibility || lesson?.videoVisibility || "unlisted",
          videoId: vidId || "",
          thumbnailUrl:
            v.thumbnailUrl || (vidId ? getYouTubeThumbnailUrl(v.url || `https://youtu.be/${vidId}`, "hqdefault") : ""),
          authorName: v.authorName || "",
          durationFormatted: "",
        };
      });
    }
    if (Array.isArray(lesson?.videoLinks) && lesson.videoLinks.length > 0) {
      return lesson.videoLinks.filter(Boolean).map((url, idx) => {
        const vidId = extractYouTubeId(url);
        return {
          id: `vid_${idx + 1}`,
          title: idx === 0 && lesson?.videoMeta?.title ? lesson.videoMeta.title : `Video Part ${idx + 1}`,
          url,
          duration: Math.max(1, Math.round((Number(lesson?.videoDuration) || 15) / lesson.videoLinks.length)),
          visibility: lesson?.videoVisibility || "unlisted",
          videoId: vidId || "",
          thumbnailUrl: vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : "",
          authorName: idx === 0 && lesson?.videoMeta?.authorName ? lesson.videoMeta.authorName : "",
          durationFormatted: "",
        };
      });
    }
    if (lesson?.videoUrl) {
      const vidId = extractYouTubeId(lesson.videoUrl);
      return [
        {
          id: "vid_1",
          title: lesson?.videoMeta?.title || lesson?.title || "",
          url: lesson.videoUrl,
          duration: Number(lesson?.videoDuration) || 15,
          visibility: lesson?.videoVisibility || "unlisted",
          videoId: vidId || "",
          thumbnailUrl: vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : "",
          authorName: "",
          durationFormatted: "",
        },
      ];
    }
    return [createVideoItem(0)];
  });

  const [detectingMap, setDetectingMap] = useState({});

  // PDF resources state
  const [pdfResources, setPdfResources] = useState(
    Array.isArray(lesson?.pdfResources) ? lesson.pdfResources : []
  );
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-detect single video details from YouTube
  const autoDetectVideo = async (index, customUrl = null) => {
    const target = customUrl !== null ? customUrl : videos[index]?.url;
    const raw = String(target || "").trim();
    const vidId = extractYouTubeId(raw);
    if (!vidId) return;

    setDetectingMap((prev) => ({ ...prev, [index]: true }));
    setError("");
    try {
      const meta = await fetchYouTubeMeta(raw);
      if (meta && (meta.title || meta.durationMinutes)) {
        setVideos((prev) => {
          const next = [...prev];
          const current = next[index] || {};
          const isTitleGeneric =
            !current.title?.trim() ||
            /^(\d+[.\-\s]*)?(Lesson|Video\s*Part|Part)\s*(\d+)?/i.test(current.title.trim());

          const finalTitle = isTitleGeneric && meta.title ? meta.title : current.title || meta.title;
          const finalDuration = meta.durationMinutes || current.duration || 15;

          next[index] = {
            ...current,
            url: raw,
            videoId: vidId,
            title: finalTitle,
            duration: finalDuration,
            thumbnailUrl:
              meta.thumbnailUrl || (vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : ""),
            authorName: meta.authorName || current.authorName || "",
            durationFormatted: meta.durationFormatted || `${finalDuration}m`,
          };
          return next;
        });

        // Auto-fill main lesson title from first video if empty
        if (
          index === 0 &&
          (!title.trim() || /^(\d+[.\-\s]*)?(Lesson|Module)\s*(\d+)?/i.test(title.trim()))
        ) {
          if (meta.title) setTitle(meta.title);
        }

        toast.confirmed("Video Details Detected", {
          description: `${meta.title.slice(0, 45)}... (${meta.durationMinutes}m)`,
          badge: meta.durationFormatted || `${meta.durationMinutes}m`,
        });
      }
    } catch {
      /* ignore */
    } finally {
      setDetectingMap((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleVideoUrlChange = (index, val) => {
    setVideos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], url: val };
      return next;
    });
    const vidId = extractYouTubeId(val);
    if (vidId) {
      autoDetectVideo(index, val);
    }
  };

  const handleUpdateVideoField = (index, field, value) => {
    setVideos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddVideo = () => {
    setVideos((prev) => [...prev, createVideoItem(prev.length)]);
  };

  const handleRemoveVideo = (index) => {
    setVideos((prev) => {
      if (prev.length <= 1) {
        return [createVideoItem(0)];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Direct PDF file upload
  const handlePdfFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const badFile = files.find(
      (f) => f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")
    );
    if (badFile) {
      toast.error(`"${badFile.name}" is not a valid PDF file.`);
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("pdfs", f));
      const res = await apiClient.post("/lessons/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newFiles = res.data?.files || [];
      setPdfResources((prev) => [...prev, ...newFiles]);
      toast.confirmed("PDF Attached", {
        description: `${newFiles.length} PDF file(s) attached.`,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "PDF upload failed.");
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  };

  const handleAddPdfUrl = () => {
    if (!pdfUrl.trim()) return;
    setPdfResources((prev) => [
      ...prev,
      {
        id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        title: pdfName.trim() || `Resource #${prev.length + 1}`,
        fileUrl: pdfUrl.trim(),
      },
    ]);
    setPdfUrl("");
    setPdfName("");
  };

  const handleRemovePdf = (index) => {
    setPdfResources(pdfResources.filter((_, i) => i !== index));
  };

  const totalVideosDuration = videos.reduce(
    (sum, v) => sum + (Number(v.duration) || 0),
    0
  );
  const filledVideosCount = videos.filter((v) => v.url && v.url.trim().length > 0).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      return setError("Lesson title is required.");
    }

    const targetCourseId = selectedCourseId || courseId;
    if (!targetCourseId) {
      return setError("Please select a course for this lesson.");
    }

    // Filter valid video entries
    const validVideos = videos.filter((v) => v.url && v.url.trim().length > 0);

    const formattedVideos = validVideos.map((v, idx) => {
      const vidId = extractYouTubeId(v.url);
      const normalizedUrl = vidId ? `https://www.youtube.com/watch?v=${vidId}` : v.url.trim();
      return {
        id: v.id || `vid_${idx + 1}_${vidId || "item"}`,
        title: v.title?.trim() || `Video Part ${idx + 1}`,
        url: normalizedUrl,
        videoId: vidId || "",
        duration: Math.max(1, Number(v.duration) || 15),
        visibility: v.visibility || "unlisted",
        thumbnailUrl:
          v.thumbnailUrl || (vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : ""),
        authorName: v.authorName || "",
      };
    });

    const primaryVideo = formattedVideos[0];
    const totalDuration =
      formattedVideos.length > 0
        ? formattedVideos.reduce((sum, v) => sum + (Number(v.duration) || 0), 0)
        : 15;

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description ? description.trim() : "",
        richTextContent: richTextContent ? richTextContent.trim() : "",
        videos: formattedVideos,
        videoLinks: formattedVideos.map((v) => v.url),
        videoUrl: primaryVideo ? primaryVideo.url : "",
        videoVisibility: primaryVideo ? primaryVideo.visibility : "unlisted",
        videoDuration: totalDuration,
        videoMeta: primaryVideo
          ? {
              videoId: primaryVideo.videoId,
              title: primaryVideo.title,
              authorName: primaryVideo.authorName || "",
              thumbnailUrl: primaryVideo.thumbnailUrl,
              provider: "youtube",
            }
          : null,
        isFreePreview,
        pdfResources,
        notifyStudents: formattedVideos.length > 0,
      };

      let res;
      if (isEditing) {
        res = await apiClient.patch(`/lessons/${lesson._id}`, payload);
      } else {
        res = await apiClient.post(`/courses/${targetCourseId}/lessons`, payload);
      }

      onSuccess(res.data, targetCourseId);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save lesson.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative text-slate-100 my-8 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Clean Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isEditing ? "Edit Lesson" : "Create Lesson"}
            </h3>
            <p className="text-xs text-slate-400">
              Set title, video parts, resources, and notes.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Selector (when applicable) */}
          {courses.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={isEditing}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} ({c.topic})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lesson Title */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Lesson Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 01. Building State Management"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* ── VIDEOS SECTION ── */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  Videos
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({filledVideosCount} Part{filledVideosCount !== 1 ? "s" : ""})
                </span>
              </div>

              {filledVideosCount > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {totalVideosDuration} mins total
                </span>
              )}
            </div>

            {/* List of Video Parts */}
            <div className="space-y-3">
              {videos.map((vid, idx) => {
                const vidId = extractYouTubeId(vid.url);
                const isDetecting = !!detectingMap[idx];

                return (
                  <div
                    key={vid.id || idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5"
                  >
                    {/* Header of Video Part */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        Part {idx + 1}
                      </span>

                      <div className="flex items-center gap-2">
                        <select
                          value={vid.visibility || "unlisted"}
                          onChange={(e) =>
                            handleUpdateVideoField(idx, "visibility", e.target.value)
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-slate-300 focus:outline-none"
                        >
                          <option value="unlisted">Unlisted</option>
                          <option value="public">Public</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove part"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* URL Input with Auto-Detect */}
                    <div className="relative">
                      <input
                        type="text"
                        value={vid.url}
                        onChange={(e) => handleVideoUrlChange(idx, e.target.value)}
                        placeholder="Paste YouTube link (watch / youtu.be)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-24 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {isDetecting ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-mono">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Detecting
                          </span>
                        ) : vidId ? (
                          <button
                            type="button"
                            onClick={() => autoDetectVideo(idx, vid.url)}
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold hover:text-emerald-300 cursor-pointer"
                            title="Re-detect info"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Detected
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Compact Preview Strip when detected */}
                    {vidId && (
                      <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                        {vid.thumbnailUrl && (
                          <img
                            src={vid.thumbnailUrl}
                            alt=""
                            className="w-12 h-7 object-cover rounded border border-slate-800 shrink-0"
                          />
                        )}
                        <p className="text-[11px] font-medium text-slate-300 truncate flex-1">
                          {vid.title || "YouTube Video"}
                        </p>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                          {vid.durationFormatted || `${vid.duration}m`}
                        </span>
                      </div>
                    )}

                    {/* Title & Duration */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={vid.title}
                          onChange={(e) =>
                            handleUpdateVideoField(idx, "title", e.target.value)
                          }
                          placeholder={`Part ${idx + 1} Title`}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          value={vid.duration}
                          onChange={(e) =>
                            handleUpdateVideoField(idx, "duration", e.target.value)
                          }
                          min="1"
                          placeholder="Mins"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono pr-7"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                          m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* + Add Video Button */}
            <button
              type="button"
              onClick={handleAddVideo}
              className="w-full py-2 rounded-xl border border-dashed border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Video Part</span>
            </button>
          </div>

          {/* Lesson Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Lesson Notes (Markdown)
            </label>
            <textarea
              value={richTextContent}
              onChange={(e) => setRichTextContent(e.target.value)}
              placeholder="Summary notes, code snippets, or links..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* PDF Worksheets */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                PDF Worksheets ({pdfResources.length})
              </label>

              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors">
                {uploadingPdf ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UploadCloud className="w-3 h-3" />
                )}
                <span>{uploadingPdf ? "Uploading..." : "Upload PDF"}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handlePdfFileUpload}
                  disabled={uploadingPdf}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick URL Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="Or paste PDF link..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddPdfUrl}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl cursor-pointer"
              >
                Add Link
              </button>
            </div>

            {/* Attached PDFs List */}
            {pdfResources.map((res, idx) => (
              <div
                key={res.id || idx}
                className="flex items-center justify-between p-2 bg-slate-900 rounded-xl border border-slate-800/80 text-xs text-slate-300"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-medium text-white truncate max-w-[240px]">
                    {res.title || `Resource #${idx + 1}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePdf(idx)}
                  className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Free Preview Toggle */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={isFreePreview}
                onChange={(e) => setIsFreePreview(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              Allow free preview for non-enrolled visitors
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Lesson"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonEditorModal;
