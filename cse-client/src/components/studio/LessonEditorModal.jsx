import React, { useState } from "react";
import { X, Video, FileText, Plus, Trash2, Bell, Sparkles, Check } from "lucide-react";
import apiClient from "@/lib/apiClient";

/**
 * LessonEditorModal — Create or edit a lesson.
 * Supports Cloudinary video upload links, markdown text content, PDF resources,
 * free preview toggle, and automatically notifies enrolled students when video is uploaded.
 */
const LessonEditorModal = ({ courseId, lesson, onSuccess, onClose }) => {
  const isEditing = !!lesson?._id;

  const [title, setTitle] = useState(lesson?.title || "");
  const [description, setDescription] = useState(lesson?.description || "");
  const [richTextContent, setRichTextContent] = useState(lesson?.richTextContent || "");
  const [videoUrl, setVideoUrl] = useState(
    Array.isArray(lesson?.videoLinks) && lesson.videoLinks.length > 0
      ? lesson.videoLinks[0]
      : ""
  );
  const [videoDuration, setVideoDuration] = useState(lesson?.videoDuration || 15);
  const [isFreePreview, setIsFreePreview] = useState(!!lesson?.isFreePreview);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfResources, setPdfResources] = useState(lesson?.pdfResources || []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddPdf = () => {
    if (!pdfUrl.trim()) return;
    setPdfResources([...pdfResources, { title: `Resource #${pdfResources.length + 1}`, fileUrl: pdfUrl.trim() }]);
    setPdfUrl("");
  };

  const handleRemovePdf = (index) => {
    setPdfResources(pdfResources.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Lesson title is required.");

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        richTextContent: richTextContent.trim(),
        videoUrl: videoUrl.trim(),
        videoLinks: videoUrl.trim() ? [videoUrl.trim()] : [],
        videoDuration: Number(videoDuration),
        isFreePreview,
        pdfResources,
      };

      let res;
      if (isEditing) {
        res = await apiClient.patch(`/lessons/${lesson._id}`, payload);
      } else {
        res = await apiClient.post(`/courses/${courseId}/lessons`, payload);
      }

      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save lesson.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isEditing ? "Edit Lesson Module" : "Add New Lesson Module"}
            </h3>
            <p className="text-xs text-slate-400">
              Configure video links, markdown material, and resources.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Lesson Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 01. Building Full-Stack State Management"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">YouTube Video URL (Listed/Unlisted)</label>
            <div className="relative">
              <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Paste a YouTube link (listed or unlisted). The video will be embedded for enrolled students.
            </p>
          </div>

          {videoUrl.trim().length > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-indigo-300">
              <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong className="text-white">Automated Notifications:</strong> Saving this lesson with a video will automatically send real-time notifications to all enrolled students!
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Duration (Minutes)</label>
              <input
                type="number"
                value={videoDuration}
                onChange={(e) => setVideoDuration(e.target.value)}
                min="1"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Allow Free Preview
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Markdown / Lesson Notes</label>
            <textarea
              value={richTextContent}
              onChange={(e) => setRichTextContent(e.target.value)}
              placeholder="Add lesson summary notes, code snippets, or markdown guide..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* PDF Attachments */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">PDF Worksheets & Downloadable Attachments</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://... worksheet.pdf"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddPdf}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white rounded-xl"
              >
                Add PDF
              </button>
            </div>

            {pdfResources.map((res, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg text-xs text-slate-300">
                <span className="truncate max-w-[280px]">{res.title} ({res.fileUrl})</span>
                <button type="button" onClick={() => handleRemovePdf(idx)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {loading ? "Saving..." : isEditing ? "Save Lesson" : "Publish Lesson"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonEditorModal;
