import React, { useState, useEffect } from "react";
import {
  X,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  MessageSquare,
  Send,
  Phone,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";
import { toast } from "@/components/ui/toast-system";

/**
 * StudentManagementModal — View student details, review submitted appeals,
 * send direct SMS/notification replies to the student, and manage enrollment access
 * (Suspend, Unsuspend, Ban, Unban, Refund & Revoke) with reason tracking.
 */
const StudentManagementModal = ({ student, courseId, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState(
    student?.hasAppeal || student?.appeals?.length > 0 ? "appeals" : "actions"
  ); // 'appeals' | 'actions'
  const [activeAction, setActiveAction] = useState(null); // 'suspend' | 'ban' | 'refund'
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reply form states
  const [replyText, setReplyText] = useState("");
  const [liftAccessOnReply, setLiftAccessOnReply] = useState(
    Boolean(student?.banned || student?.suspended)
  );
  const [replyLoading, setReplyLoading] = useState(false);
  const [studentAppeals, setStudentAppeals] = useState(student?.appeals || []);

  if (!student) return null;

  const enrollmentId = student.enrollmentId || student._id || student.id;

  useEffect(() => {
    const socket = getSocket();
    const handleAppeal = (newOrUpdated) => {
      const eId = newOrUpdated.enrollmentId ? newOrUpdated.enrollmentId.toString() : null;
      if (eId === enrollmentId) {
        setStudentAppeals((prev) => {
          const id = newOrUpdated._id || newOrUpdated.id;
          const exists = prev.some((a) => (a._id || a.id) === id);
          if (exists) {
            return prev.map((a) => ((a._id || a.id) === id ? { ...a, ...newOrUpdated } : a));
          }
          return [newOrUpdated, ...prev];
        });
      }
    };

    socket.on("appeal:new", handleAppeal);
    socket.on("appeal:updated", handleAppeal);

    return () => {
      socket.off("appeal:new", handleAppeal);
      socket.off("appeal:updated", handleAppeal);
    };
  }, [enrollmentId]);

  const handleAction = async (actionType) => {
    setLoading(true);
    setError("");
    try {
      // Use the unified studio status endpoint with reason tracking
      await apiClient.patch(`/studio/students/${enrollmentId}/status`, {
        action: actionType,
        reason: reason.trim(),
        days: actionType === "suspend" ? days : undefined,
      });

      toast.success(`Action "${actionType}" applied to student successfully.`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      setError("Please enter a reply message for the student.");
      return;
    }

    setReplyLoading(true);
    setError("");

    try {
      const activeAppealId = student.activeAppeal?._id || student.appeals?.[0]?._id;
      const res = await apiClient.post(`/studio/students/${enrollmentId}/reply-appeal`, {
        message: replyText.trim(),
        appealId: activeAppealId,
        restoreAccess: liftAccessOnReply,
      });

      toast.success(res.data?.message || "Reply sent to student successfully!");
      setReplyText("");
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send reply to student.");
    } finally {
      setReplyLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative text-slate-100 my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Student Header */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xl font-black text-indigo-300 shrink-0">
            {student.learnerName?.charAt(0) || "S"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-white truncate">{student.learnerName}</h3>
            <p className="text-xs text-slate-400 truncate">{student.learnerEmail}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  student.banned
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : student.suspended
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : student.refunded
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {student.banned ? "Banned" : student.suspended ? "Suspended" : student.refunded ? "Refunded" : "Active Student"}
              </span>

              {student.hasAppeal && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Appeal Received
                </span>
              )}

              <span className="text-[10px] text-slate-400">
                Course: <strong className="text-slate-200">{student.courseTitle || "Course"}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("appeals")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "appeals"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Appeals &amp; Messages ({studentAppeals.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("actions")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "actions"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Restriction Controls</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {/* TAB 1: APPEALS & MESSAGES */}
        {activeTab === "appeals" && (
          <div className="space-y-4">
            {studentAppeals.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {studentAppeals.map((appeal) => (
                  <div
                    key={appeal._id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <span className="font-bold text-white capitalize">
                        Status: <strong className="text-cyan-300">{appeal.status}</strong>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(appeal.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {appeal.contactPhone && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Phone / WhatsApp: <strong className="text-slate-200">{appeal.contactPhone}</strong></span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {(appeal.messages || []).map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className={`p-3 rounded-xl ${
                            m.sender === "instructor"
                              ? "bg-indigo-950/40 border border-indigo-500/30 ml-4"
                              : "bg-slate-900 border border-slate-800 mr-4"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                            <span className={m.sender === "instructor" ? "text-indigo-300" : "text-amber-300"}>
                              {m.sender === "instructor" ? "You (Instructor)" : student.learnerName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <p className="text-slate-200 text-xs leading-relaxed">{m.message}</p>
                          {m.issueDetails && (
                            <div className="mt-2 p-2 bg-slate-950/70 rounded border border-slate-800 text-[11px] text-slate-300">
                              <span className="font-bold text-slate-400 block text-[10px]">Problem details:</span>
                              <p className="whitespace-pre-wrap">{m.issueDetails}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                No appeals submitted by this student yet. You can still message them below.
              </div>
            )}

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/80">
              <label className="text-xs font-bold text-slate-200 block">
                Reply to Student (শিক্ষার্থীকে বার্তা পাঠান)
              </label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your explanation or resolution message to the student..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                required
              />

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={liftAccessOnReply}
                  onChange={(e) => setLiftAccessOnReply(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-bold text-emerald-300">
                  Also lift restriction and restore active course access immediately
                </span>
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={replyLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {replyLoading ? (
                    <span>Sending Reply...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Reply &amp; Update Access</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: ADMINISTRATIVE CONTROLS */}
        {activeTab === "actions" && (
          <div>
            {/* Dynamic Action Forms */}
            {activeAction ? (
              <div className="space-y-4 bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Confirm {activeAction.toUpperCase()} Action
                </h4>

                {activeAction === "suspend" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Suspension Duration (Days)
                    </label>
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
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Reason Tracking &amp; Student Notice
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="State the justification for this action (the student will see this reason)..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveAction(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-bold rounded-xl text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(activeAction)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-xl text-white shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Processing..." : `Execute ${activeAction}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Administrative Controls
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {student.banned ? (
                    <button
                      type="button"
                      onClick={() => handleAction("unban")}
                      className="p-3 bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      Unban Student
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveAction("ban")}
                      className="p-3 bg-red-900/40 hover:bg-red-800/50 border border-red-500/40 rounded-xl text-xs font-bold text-red-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Ban Student
                    </button>
                  )}

                  {student.suspended ? (
                    <button
                      type="button"
                      onClick={() => handleAction("restore")}
                      className="p-3 bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Unsuspend Access
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveAction("suspend")}
                      className="p-3 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Suspend Access
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveAction("refund")}
                    className="col-span-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-indigo-400" />
                    Refund Access &amp; Revoke Course
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentManagementModal;
