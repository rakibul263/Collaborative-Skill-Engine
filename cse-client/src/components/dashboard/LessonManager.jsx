import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { ArrowLeft, Plus, Pencil, Video, Trash2, X } from "lucide-react";
import apiClient from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Lesson add/edit form (rendered inline when showAddForm or editingLesson)
// ---------------------------------------------------------------------------
function LessonForm({ initialData, onSave, onCancel }) {
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: initialData?.title ?? "",
      videoLinks: initialData?.videoLinks?.map((url) => ({ url })) ?? [{ url: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "videoLinks" });

  // Re-populate when switching from add→edit
  useEffect(() => {
    reset({
      title: initialData?.title ?? "",
      videoLinks: initialData?.videoLinks?.map((url) => ({ url })) ?? [{ url: "" }],
    });
  }, [initialData, reset]);

  const youtubePattern =
    /^(https:\/\/www\.youtube\.com\/watch\?v=|https:\/\/youtu\.be\/)/;

  const onSubmit = async (data) => {
    setSubmitError("");
    setSubmitting(true);
    try {
      await onSave({
        title: data.title,
        videoLinks: data.videoLinks.map((v) => v.url),
      });
    } catch (err) {
      setSubmitError(err?.message ?? "Failed to save lesson. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass =
    "block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5";
  const errorClass = "text-red-500 text-xs font-bold mt-1";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black text-[#1B1B4B]">
          {initialData ? "Edit Lesson" : "Add Lesson"}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-2.5 rounded-xl mb-4">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <div>
          <label className={labelClass}>Lesson Title</label>
          <input
            {...register("title", {
              required: "Title is required",
              minLength: { value: 1, message: "Min 1 character" },
              maxLength: { value: 150, message: "Max 150 characters" },
            })}
            placeholder="e.g. Introduction to React Hooks"
            className={inputClass}
          />
          {errors.title && <p className={errorClass}>{errors.title.message}</p>}
        </div>

        {/* Video Links */}
        <div>
          <label className={labelClass}>
            YouTube Video Links ({fields.length}/10)
          </label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <input
                    {...register(`videoLinks.${index}.url`, {
                      required: "Video URL is required",
                      validate: (v) =>
                        youtubePattern.test(v) ||
                        "Please enter a valid YouTube video URL",
                    })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={inputClass}
                  />
                  {errors.videoLinks?.[index]?.url && (
                    <p className={errorClass}>
                      {errors.videoLinks[index].url.message}
                    </p>
                  )}
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 mt-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {fields.length < 10 && (
            <button
              type="button"
              onClick={() => append({ url: "" })}
              className="mt-2 flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Plus size={12} />
              Add video link
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-[#1B1B4B] hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {initialData ? "Save Changes" : "Add Lesson"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 font-black text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main LessonManager component
// ---------------------------------------------------------------------------
export default function LessonManager({ courseId, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/courses/${courseId}/lessons`);
      setLessons(res.data);
    } catch {
      setError("Failed to load lessons. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-slate-600 text-sm">{error}</p>
        <button
          onClick={fetchLessons}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Called by LessonForm on submit for ADD
  const handleAddSave = async ({ title, videoLinks }) => {
    const res = await apiClient.post(`/courses/${courseId}/lessons`, {
      title,
      videoLinks,
    });
    setLessons((prev) => [...prev, res.data]);
    setShowAddForm(false);
    showSuccess("Lesson added successfully!");
  };

  // Called by LessonForm on submit for EDIT
  const handleEditSave = async ({ title, videoLinks }) => {
    const res = await apiClient.patch(`/lessons/${editingLesson._id}`, {
      title,
      videoLinks,
    });
    setLessons((prev) =>
      prev.map((l) => (l._id === editingLesson._id ? res.data : l))
    );
    setEditingLesson(null);
    showSuccess("Lesson updated successfully!");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <button
          onClick={() => { setShowAddForm(true); setEditingLesson(null); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all"
        >
          <Plus size={13} />
          Add Lesson
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-4 py-3 rounded-xl">
          {successMsg}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <LessonForm
          initialData={null}
          onSave={handleAddSave}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit form */}
      {editingLesson && (
        <LessonForm
          initialData={editingLesson}
          onSave={handleEditSave}
          onCancel={() => setEditingLesson(null)}
        />
      )}

      {/* Lesson list */}
      {lessons.length === 0 && !showAddForm ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-slate-500 text-sm">No lessons added yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black flex-shrink-0">
                  #{lesson.order}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {lesson.title}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-bold mt-0.5">
                    <Video size={11} />
                    {lesson.videoLinks?.length ?? 0} video
                    {(lesson.videoLinks?.length ?? 0) !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setEditingLesson(lesson); setShowAddForm(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex-shrink-0"
              >
                <Pencil size={12} />
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
