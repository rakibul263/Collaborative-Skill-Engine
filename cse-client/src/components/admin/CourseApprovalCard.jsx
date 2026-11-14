import { useState } from "react";
import {
  Check,
  X,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { formatBDT } from "@/lib/money";

const CourseApprovalCard = ({
  course,
  onApprove,
  onReject,
  onDelete,
  onInspect,
}) => {
  const [expanded, setExpanded] = useState(false);

  const submittedDate = course.submittedAt
    ? new Date(course.submittedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : course.createdAt
    ? new Date(course.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0E1322] rounded-xl border border-slate-800/80 hover:border-slate-750 transition-all overflow-hidden shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          {/* Main Course Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              {getStatusBadge(course.status)}
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Calendar size={12} className="text-slate-500" />
                {submittedDate}
              </span>
              {course.topic && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                  {course.topic}
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold text-slate-100 leading-snug mb-2">
              {course.title}
            </h3>

            {/* Instructor & Metadata row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <User size={13} className="text-cyan-400" />
                {course.instructorName || course.instructorEmail}
              </span>

              <span className="font-semibold text-slate-100 font-mono">
                {formatBDT(course.price || 0)}
              </span>

              {course.curriculum && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Layers size={13} className="text-indigo-400" />
                  {course.curriculum.length} Lessons
                </span>
              )}
            </div>

            {/* Description Preview */}
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
              {course.description || "No overview provided."}
            </p>

            {/* Rejection reason banner */}
            {course.status === "rejected" && course.rejectionReason && (
              <div className="mt-3.5 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle size={15} className="shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-semibold uppercase text-[10px] tracking-wider block text-rose-400">
                    Rejection Feedback to Instructor:
                  </span>
                  <span className="text-slate-300 mt-0.5 block">{course.rejectionReason}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button Suite */}
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            {/* Inspect Modal Trigger */}
            <button
              onClick={() => onInspect(course)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-800"
            >
              <Eye size={13} className="text-slate-400" />
              Inspect
            </button>

            {/* Approve Button */}
            {course.status !== "approved" && (
              <button
                onClick={() => onApprove(course._id)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <Check size={13} />
                Approve
              </button>
            )}

            {/* Reject Button */}
            {course.status !== "rejected" && (
              <button
                onClick={() => onReject(course._id)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <X size={13} />
                Reject
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={() => onDelete(course._id, course.title)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium transition-colors border border-slate-800/80 hover:border-rose-900/40"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Accordion Quick Preview */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 pt-3 border-t border-slate-800/70 w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>{expanded ? "Hide Curriculum Lessons" : `View Curriculum (${(course.curriculum || []).length} Lessons)`}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded Quick Curriculum */}
      {expanded && (
        <div className="bg-[#090D18] border-t border-slate-800/80 px-6 py-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Curriculum Lessons ({(course.curriculum || []).length})
          </p>
          {(course.curriculum || []).length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No lesson details registered in submission</p>
          ) : (
            (course.curriculum || []).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 bg-[#0E1322] border border-slate-800/60 rounded-lg text-xs text-slate-300"
              >
                <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-mono font-semibold">
                  {idx + 1}
                </span>
                <span className="truncate">{item.title || `Lesson ${idx + 1}`}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CourseApprovalCard;
