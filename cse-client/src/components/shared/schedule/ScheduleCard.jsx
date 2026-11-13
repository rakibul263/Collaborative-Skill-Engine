import React, { useState } from "react";
import { Calendar, Clock, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

/**
 * Formats a schedule's startTime and durationMinutes into a human-readable string.
 * e.g. "Sat 21 Jun · 3:00 PM · 45 min"
 */
function formatScheduleTime(startTime, durationMinutes) {
  const date = new Date(startTime);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dayName} ${dayNum} ${month} · ${time} · ${durationMinutes} min`;
}

const STATUS_CONFIG = {
  pending: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    label: "Pending Response",
    icon: <Clock size={12} className="text-amber-400" />,
  },
  accepted: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    label: "Scheduled & Accepted",
    icon: <CheckCircle2 size={12} className="text-emerald-400" />,
  },
  rejected: {
    badge: "bg-slate-800 text-slate-400 border-slate-700",
    label: "Meeting Declined",
    icon: <XCircle size={12} className="text-slate-400" />,
  },
  expired: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    label: "Session Completed",
    icon: <Sparkles size={12} className="text-rose-400" />,
  },
};

const ScheduleCard = ({ schedule, currentUserEmail, onAccept, onReject }) => {
  const [loadingAccept, setLoadingAccept] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);

  const isPending = schedule.status === "pending";
  const isInvitee = currentUserEmail === schedule.inviteeEmail;
  const showButtons = isPending && isInvitee;

  const handleAccept = async () => {
    if (loadingAccept || loadingReject) return;
    setLoadingAccept(true);
    try {
      await onAccept(schedule._id);
    } finally {
      setLoadingAccept(false);
    }
  };

  const handleReject = async () => {
    if (loadingAccept || loadingReject) return;
    setLoadingReject(true);
    try {
      await onReject(schedule._id);
    } finally {
      setLoadingReject(false);
    }
  };

  const statusInfo = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.pending;

  return (
    <div className="mx-auto max-w-sm w-full bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl transition-all my-2 group">
      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wider uppercase">
          <Calendar size={12} />
          <span>1-on-1 Meeting</span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusInfo.badge}`}
        >
          {statusInfo.icon}
          <span>{statusInfo.label}</span>
        </div>
      </div>

      {/* Meeting Title */}
      <h4 className="text-sm font-bold text-white leading-snug mb-1.5 group-hover:text-indigo-400 transition-colors">
        {schedule.title}
      </h4>

      {/* Time & Duration */}
      {schedule.startTime && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-4">
          <Clock size={13} className="text-slate-500 shrink-0" />
          <span>{formatScheduleTime(schedule.startTime, schedule.durationMinutes)}</span>
        </div>
      )}

      {/* Action Buttons for Invitee */}
      {showButtons && (
        <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <button
            onClick={handleAccept}
            disabled={loadingAccept || loadingReject}
            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {loadingAccept ? (
              <ButtonSpinner size="xs" />
            ) : (
              <>
                <CheckCircle2 size={13} /> Accept
              </>
            )}
          </button>
          <button
            onClick={handleReject}
            disabled={loadingAccept || loadingReject}
            className="py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all disabled:opacity-50"
          >
            {loadingReject ? (
              <ButtonSpinner size="xs" />
            ) : (
              "Decline"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ScheduleCard;
