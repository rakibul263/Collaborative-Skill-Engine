import { useForm, useFieldArray } from "react-hook-form";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import apiClient from "@/lib/apiClient";

const CourseCreationForm = ({ eligibleTopics, onSuccess, onCancel }) => {
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { curriculum: [{ title: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "curriculum" });

  const onSubmit = async (data) => {
    setServerError("");
    setSubmitting(true);
    try {
      const res = await apiClient.post("/courses", {
        title: data.title,
        topic: data.topic,
        description: data.description,
        price: parseFloat(data.price),
        thumbnailUrl: data.thumbnailUrl,
        curriculum: data.curriculum.map((c) => ({ title: c.title })),
      });
      onSuccess(res.data);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create course.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5";
  const errorClass = "text-red-500 text-xs font-bold mt-1";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-black text-[#1B1B4B]">Create New Course</h3>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
          <X size={16} />
        </button>
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl mb-4">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div>
          <label className={labelClass}>Course Title</label>
          <input
            {...register("title", { required: "Title is required", minLength: { value: 1, message: "Min 1 character" }, maxLength: { value: 120, message: "Max 120 characters" } })}
            placeholder="e.g. React Fundamentals for Beginners"
            className={inputClass}
          />
          {errors.title && <p className={errorClass}>{errors.title.message}</p>}
        </div>

        {/* Topic */}
        <div>
          <label className={labelClass}>Topic</label>
          <select
            {...register("topic", { required: "Please select a topic" })}
            className={inputClass}
          >
            <option value="">— Select a topic —</option>
            {eligibleTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.topic && <p className={errorClass}>{errors.topic.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            {...register("description", { required: "Description is required", minLength: { value: 10, message: "Min 10 characters" }, maxLength: { value: 2000, message: "Max 2000 characters" } })}
            rows={4}
            placeholder="Describe what learners will gain from this course..."
            className={`${inputClass} resize-none`}
          />
          {errors.description && <p className={errorClass}>{errors.description.message}</p>}
        </div>

        {/* Price + Thumbnail row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Price (BDT)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              max="9999.99"
              {...register("price", {
                required: "Price is required",
                min: { value: 1, message: "Min ৳1" },
                max: { value: 999999, message: "Max ৳9,99,999" },
              })}
              placeholder="৳500"
              className={inputClass}
            />
            {errors.price && <p className={errorClass}>{errors.price.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Thumbnail URL</label>
            <input
              {...register("thumbnailUrl", { required: "Thumbnail URL is required", maxLength: { value: 500, message: "Max 500 characters" } })}
              placeholder="https://..."
              className={inputClass}
            />
            {errors.thumbnailUrl && <p className={errorClass}>{errors.thumbnailUrl.message}</p>}
          </div>
        </div>

        {/* Curriculum */}
        <div>
          <label className={labelClass}>Curriculum ({fields.length}/50 items)</label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                  {index + 1}
                </span>
                <input
                  {...register(`curriculum.${index}.title`, {
                    required: "Item title required",
                    maxLength: { value: 100, message: "Max 100 chars" },
                  })}
                  placeholder={`Lesson ${index + 1} title...`}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {fields.length < 50 && (
            <button
              type="button"
              onClick={() => append({ title: "" })}
              className="mt-2 flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Plus size={13} />
              Add curriculum item
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1B1B4B] hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all disabled:opacity-50"
          >
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Create Course
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-black text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseCreationForm;
