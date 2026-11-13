import React, { useState, useEffect } from "react";
import { X, BookOpen, Image, Lock, ShieldCheck, Sparkles, Plus, Trash2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toWholeTaka } from "@/lib/money";

/**
 * CourseEditorModal — Create or edit course details.
 * STRICT TOPIC RESTRICTION: Instructors can ONLY select topics officially completed in mentoring sessions!
 */
const CourseEditorModal = ({ course, eligibleTopics = [], onSuccess, onClose }) => {
  const isEditing = !!course?._id;

  const [title, setTitle] = useState(course?.title || "");
  const [topic, setTopic] = useState(course?.topic || (eligibleTopics[0] || ""));
  const [description, setDescription] = useState(course?.description || "");
  const [price, setPrice] = useState(
    course?.price !== undefined && course?.price !== null
      ? Math.round(Number(course.price))
      : 500
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnailUrl || "");
  const [difficulty, setDifficulty] = useState(course?.difficulty || "Intermediate");
  const [language, setLanguage] = useState(course?.language || "English");
  const [estimatedDuration, setEstimatedDuration] = useState(course?.estimatedDuration || "5 Hours");
  const [curriculumItems, setCurriculumItems] = useState(
    Array.isArray(course?.curriculum) && course.curriculum.length > 0
      ? course.curriculum.map((c) => c.title)
      : ["Introduction to Course", "Core Concepts & Fundamentals", "Hands-on Project & Wrap-up"]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!topic && eligibleTopics.length > 0) {
      setTopic(eligibleTopics[0]);
    }
  }, [eligibleTopics, topic]);

  const handleAddCurriculum = () => {
    setCurriculumItems([...curriculumItems, "New Module Title"]);
  };

  const handleRemoveCurriculum = (index) => {
    setCurriculumItems(curriculumItems.filter((_, i) => i !== index));
  };

  const handleCurriculumChange = (index, val) => {
    const next = [...curriculumItems];
    next[index] = val;
    setCurriculumItems(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Course title is required.");
    if (!description.trim() || description.length < 10) return setError("Description must be at least 10 characters.");
    if (!thumbnailUrl.trim()) return setError("Thumbnail URL is required.");
    if (!topic) return setError("Please select an eligible course topic.");

    // Strict topic restriction check
    if (!isEditing && !eligibleTopics.includes(topic)) {
      return setError(`Topic Restriction Error: You are only permitted to teach in topics you completed mentoring sessions for!`);
    }

    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice < 1 || numPrice > 999999) {
      return setError("Price must be between ৳1 and ৳999,999 BDT.");
    }
    if (!Number.isInteger(numPrice)) {
      return setError("Price must be a whole Taka amount without floating-point decimals.");
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        topic,
        description: description.trim(),
        price: toWholeTaka(numPrice),
        thumbnailUrl: thumbnailUrl.trim(),
        difficulty,
        language,
        estimatedDuration,
        curriculum: curriculumItems.map((itemTitle) => ({ title: itemTitle.trim() })),
      };

      let res;
      if (isEditing) {
        res = await apiClient.patch(`/courses/${course._id}`, payload);
      } else {
        res = await apiClient.post("/courses", payload);
      }

      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save course. Please verify input fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isEditing ? "Edit Course Settings" : "Create New Course"}
            </h3>
            <p className="text-xs text-slate-400">
              Set course metadata, pricing, and curriculum outline.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Course Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master React 19 & Next.js Architecture"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Topic Restriction Notice & Select */}
          <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verified Teaching Topic (Restricted)
              </label>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {eligibleTopics.length} Eligible Topics
              </span>
            </div>

            {eligibleTopics.length === 0 ? (
              <p className="text-xs text-amber-400">
                No verified topics available yet. You must complete at least 1 mentoring session in a topic to unlock teaching rights for it.
              </p>
            ) : (
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isEditing}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {eligibleTopics.map((t) => (
                  <option key={t} value={t}>
                    {t} (Verified Completed Topic)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Course Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive summary of what students will master in this course..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Price & Thumbnail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Price (BDT ৳)</label>
              <div className="relative">
                <span className="text-sm font-black text-emerald-400 absolute left-3 top-2 select-none">৳</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="1"
                  min="1"
                  max="999999"
                  placeholder="500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-12 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] font-bold text-slate-400 absolute right-3 top-3 select-none">BDT</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Course Thumbnail URL</label>
              <div className="relative">
                <Image className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Curriculum Outline Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Curriculum Module Structure</label>
              <button
                type="button"
                onClick={handleAddCurriculum}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Section
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {curriculumItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleCurriculumChange(idx, e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  {curriculumItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCurriculum(idx)}
                      className="p-2 text-red-400 hover:text-red-300 bg-slate-800 rounded-xl border border-slate-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (isEditing ? false : eligibleTopics.length === 0)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseEditorModal;
