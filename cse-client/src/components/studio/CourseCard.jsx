import { Clock, Send, Tag, XCircle, CheckCircle, AlertCircle, FileText } from "lucide-react";

const statusConfig = {
  draft:          { label: "Draft",          color: "bg-slate-100 text-slate-600"   },
  pending_review: { label: "Pending Review",  color: "bg-amber-100 text-amber-700"   },
  approved:       { label: "Approved",        color: "bg-green-100 text-green-700"   },
  rejected:       { label: "Rejected",        color: "bg-red-100 text-red-700"       },
};

const StatusIcon = ({ status }) => {
  if (status === "approved") return <CheckCircle size={12} />;
  if (status === "rejected") return <XCircle size={12} />;
  if (status === "pending_review") return <Clock size={12} />;
  return <FileText size={12} />;
};

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString() : "—";

const CourseCard = ({ course, onSubmit }) => {
  const cfg = statusConfig[course.status] || statusConfig.draft;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title + Status */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-sm font-black text-[#1B1B4B]">{course.title}</h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${cfg.color}`}>
              <StatusIcon status={course.status} />
              {cfg.label}
            </span>
          </div>

          {/* Topic */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-3">
            <Tag size={11} className="text-indigo-400" />
            {course.topic}
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-bold">
            <span>Created: {fmt(course.createdAt)}</span>
            <span>Submitted: {fmt(course.submittedAt)}</span>
            {course.status === "approved" && <span className="text-green-600">Approved: {fmt(course.approvedAt)}</span>}
            {course.status === "rejected" && <span className="text-red-600">Rejected: {fmt(course.rejectedAt)}</span>}
          </div>

          {/* Rejection reason */}
          {course.status === "rejected" && course.rejectionReason && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 font-bold leading-relaxed">{course.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0">
          {course.status === "draft" && (
            <button
              onClick={() => onSubmit(course._id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <Send size={12} />
              Submit for Review
            </button>
          )}
          {course.status === "pending_review" && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
              Awaiting review…
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
