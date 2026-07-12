import React, { useState } from "react";
import { X, ShieldAlert, AlertTriangle, RefreshCw, UserCheck, CheckCircle2, History } from "lucide-react";
import apiClient from "@/lib/apiClient";

/**
 * StudentManagementModal — View student details & execute administrative actions
 * (Suspend, Unsuspend, Ban, Unban, Refund & Revoke) with reason tracking.
 */
const StudentManagementModal = ({ student, courseId, onClose, onRefresh }) => {
  const [activeAction, setActiveAction] = useState(null); // 'suspend' | 'ban' | 'refund'
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!student) return null;

  const handleAction = async (actionType) => {
    setLoading(true);
    setError("");
    try {
      if (actionType === "ban") {
        await apiClient.patch(`/dashboard/enrollments/${student._id}/ban`, { reason });
      } else if (actionType === "unban") {
        await apiClient.patch(`/dashboard/enrollments/${student._id}/unban`, {});
      } else if (actionType === "suspend") {
        await apiClient.patch(`/dashboard/enrollments/${student._id}/suspend`, { reason, days });
      } else if (actionType === "unsuspend") {
        await apiClient.patch(`/dashboard/enrollments/${student._id}/unsuspend`, {});
      } else if (actionType === "refund") {
        await apiClient.patch(`/dashboard/enrollments/${student._id}/refund`, { reason });
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Student Header */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xl font-black text-indigo-300">
            {student.learnerName?.charAt(0) || "S"}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{student.learnerName}</h3>
            <p className="text-xs text-slate-400">{student.learnerEmail}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  student.banned
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : student.suspended
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {student.banned ? "Banned" : student.suspended ? "Suspended" : "Active Student"}
              </span>
              <span className="text-[10px] text-slate-400">
                Enrolled: {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {/* Dynamic Action Forms */}
        {activeAction ? (
          <div className="space-y-4 bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Confirm {activeAction.toUpperCase()} Action
            </h4>

            {activeAction === "suspend" && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Suspension Duration (Days)</label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  min={1}
                  max={90}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Reason Tracking & Audit Note</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the justification for this action..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveAction(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-bold rounded-xl text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(activeAction)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-xl text-white shadow-lg"
              >
                {loading ? "Processing..." : `Execute ${activeAction}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Administrative Controls</h4>
            <div className="grid grid-cols-2 gap-3">
              {student.banned ? (
                <button
                  onClick={() => handleAction("unban")}
                  className="p-3 bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Unban Student
                </button>
              ) : (
                <button
                  onClick={() => setActiveAction("ban")}
                  className="p-3 bg-red-900/40 hover:bg-red-800/50 border border-red-500/40 rounded-xl text-xs font-bold text-red-300 flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Ban Student
                </button>
              )}

              {student.suspended ? (
                <button
                  onClick={() => handleAction("unsuspend")}
                  className="p-3 bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Unsuspend Access
                </button>
              ) : (
                <button
                  onClick={() => setActiveAction("suspend")}
                  className="p-3 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Suspend Access
                </button>
              )}

              <button
                onClick={() => setActiveAction("refund")}
                className="col-span-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                Refund Access & Revoke Course
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentManagementModal;
