import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, User, Tag, DollarSign, Trash2 } from "lucide-react";

const CourseApprovalCard = ({ course, onApprove, onReject, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const submittedDate = course.submittedAt
    ? new Date(course.submittedAt).toLocaleDateString()
    : "—";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Main Info */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-[#1B1B4B] leading-tight mb-2">{course.title}</h3>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <User size={12} className="text-indigo-400" />
                {course.instructorName || course.instructorEmail}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag size={12} className="text-emerald-400" />
                {course.topic}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-amber-400 font-black text-sm">৳</span>
                {course.price}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-2">
              Submitted: {submittedDate} · {course.instructorEmail}
            </p>
            <p className="text-sm text-slate-600 font-medium mt-3 line-clamp-2">
              {(course.description || "").slice(0, 200)}
              {(course.description || "").length > 200 ? "…" : ""}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onApprove(course._id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <Check size={13} />
              Approve
            </button>
            <button
              onClick={() => onReject(course._id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <X size={13} />
              Reject
            </button>
            <button
              onClick={() => onDelete(course._id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Hide details" : "View full details"}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
          <p className="text-sm font-bold text-slate-600 mb-4 leading-relaxed">{course.description}</p>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Curriculum</h4>
          <div className="space-y-2">
            {(course.curriculum || []).map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                  {i + 1}
                </span>
                <span className="font-bold">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseApprovalCard;
