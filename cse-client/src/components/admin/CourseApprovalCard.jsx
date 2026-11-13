import { useState } from "react";
import {
  Check,
  X,
  Trash2,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  Eye,
  BookOpen,
  Calendar,
  Layers,
  AlertTriangle,
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
    ? new Date(course.submittedAt).toLocaleDateString()
    : course.createdAt
    ? new Date(course.createdAt).toLocaleDateString()
    : "—";

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-300 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 shadow-lg hover:border-slate-700/80 transition-all overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          {/* Main Course Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {getStatusBadge(course.status)}
              <span className="text-[10px] font-mono text-slate-400">
                Submitted: {submittedDate}
              </span>
              {course.topic && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {course.topic}
                </span>
              )}
            </div>

            <h3 className="text-base font-black text-white leading-snug mb-2 group-hover:text-cyan-300 transition-colors">
              {course.title}
            </h3>

            {/* Instructor & Metadata pill row */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mb-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <User size={13} className="text-cyan-400" />
                {course.instructorName || course.instructorEmail}
              </span>

              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                {formatBDT(course.price || 0)}
              </span>

              {course.curriculum && (
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Layers size={13} />
                  {course.curriculum.length} Lessons
                </span>
              )}
            </div>

            {/* Description Preview */}
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
              {course.description || "No overview provided."}
            </p>

            {/* Rejection reason banner if rejected */}
            {course.status === "rejected" && course.rejectionReason && (
              <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs font-mono flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-bold uppercase text-[10px] tracking-wider block text-rose-400">
                    Rejection Feedback to Instructor:
                  </span>
                  <span>{course.rejectionReason}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button Suite */}
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
            {/* Inspect Modal Trigger */}
            <button
              onClick={() => onInspect(course)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all border border-slate-700"
            >
              <Eye size={13} className="text-cyan-400" />
              Inspect
            </button>

            {/* Approve Button */}
            {course.status !== "approved" && (
              <button
                onClick={() => onApprove(course._id)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md shadow-emerald-950/50"
              >
                <Check size={13} />
                Approve
              </button>
            )}

            {/* Reject Button */}
            {course.status !== "rejected" && (
              <button
                onClick={() => onReject(course._id)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md"
              >
                <X size={13} />
                Reject
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={() => onDelete(course._id, course.title)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-mono font-bold transition-all border border-rose-900/50"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Accordion Quick Preview */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 pt-3 border-t border-slate-800/60 w-full flex items-center justify-between text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>{expanded ? "Collapse Syllabus" : "Quick View Curriculum"}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded Quick Curriculum */}
      {expanded && (
        <div className="bg-[#070b16]/70 border-t border-slate-800/80 px-6 py-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-2">
            Curriculum Lessons ({(course.curriculum || []).length})
          </p>
          {(course.curriculum || []).length === 0 ? (
            <p className="text-xs text-slate-400 font-mono">No lesson details registered</p>
          ) : (
            (course.curriculum || []).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 bg-slate-900/60 rounded-lg text-xs font-mono text-slate-300"
              >
                <span className="w-5 h-5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
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
