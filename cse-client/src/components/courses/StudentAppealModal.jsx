import React, { useState, useRef } from "react";
import { X, Send, MessageSquare, ShieldAlert, AlertCircle, Phone, Info } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "@/components/ui/toast-system";
import { getSocket } from "@/lib/socket";
import { playNotificationSound } from "@/lib/notificationSound";

/**
 * StudentAppealModal — Allows a banned or suspended learner to send an appeal/explanation
 * directly to the course instructor detailing what problem occurred.
 */
const StudentAppealModal = ({
  courseId,
  courseTitle,
  instructorName,
  instructorEmail,
  restrictionType = "ban",
  restrictionReason = "",
  onClose,
  onAppealSubmitted,
}) => {
  const [message, setMessage] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [requestedAction, setRequestedAction] = useState("lift_restriction");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const typingTimerRef = useRef(null);

  const handleMessageChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    if (!instructorEmail) return;
    const socket = getSocket();
    if (!socket?.connected) return;

    socket.emit("appeal:typing", {
      appealId: courseId,
      recipientEmail: instructorEmail,
      isTyping: true,
      role: "student",
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("appeal:typing", {
        appealId: courseId,
        recipientEmail: instructorEmail,
        isTyping: false,
        role: "student",
      });
    }, 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please write an appeal message for the instructor.");
      return;
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    const socket = getSocket();
    socket?.emit("appeal:typing", {
      appealId: courseId,
      recipientEmail: instructorEmail,
      isTyping: false,
      role: "student",
    });

    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post(`/courses/${courseId}/appeal-instructor`, {
        message: message.trim(),
        issueDetails: issueDetails.trim(),
        requestedAction,
        contactPhone: contactPhone.trim(),
      });

      playNotificationSound("sent");
      toast.success(res.data?.message || "Appeal submitted to instructor successfully!");
      if (onAppealSubmitted) onAppealSubmitted(res.data?.appeal);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit appeal. Please try again.");
    } finally {
      setLoading(false);
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

        {/* Header */}
        <div className="flex items-start gap-3.5 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-indigo-400">
              Direct Instructor Appeal
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Message Instructor Regarding Restriction
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Course: <strong className="text-slate-200">{courseTitle || "Course"}</strong> • Instructor: <strong className="text-slate-200">{instructorName || instructorEmail}</strong>
            </p>
          </div>
        </div>

        {/* Existing Restriction Banner */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-slate-300">
            <span className="font-bold text-amber-300 capitalize">
              Current Restriction ({restrictionType}):
            </span>
            <p className="text-slate-400 text-[11px] italic">
              "{restrictionReason || "Access restricted by instructor"}"
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Message / Summary */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-1.5">
              Appeal Message / Summary <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={message}
              onChange={handleMessageChange}
              placeholder="e.g. Request to lift suspension - clarification regarding account activity"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          {/* Detailed Problem Explanation */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center justify-between">
              <span>Explain What Happened (কি সমস্যা হয়েছে বিস্তারিত বলুন)</span>
              <span className="text-[10px] text-slate-400 font-normal">Provide full details</span>
            </label>
            <textarea
              rows={4}
              value={issueDetails}
              onChange={(e) => setIssueDetails(e.target.value)}
              placeholder="Explain the situation in detail: what occurred, any misunderstandings, why the restriction should be lifted, or any steps you have taken..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed resize-none"
            />
          </div>

          {/* Requested Action & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5">
                Requested Action
              </label>
              <select
                value={requestedAction}
                onChange={(e) => setRequestedAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="lift_restriction">Lift Restriction &amp; Restore Access</option>
                <option value="review_activity">Review Activity / Reconsideration</option>
                <option value="discuss_issue">Discuss Issue via Messages</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>Contact Phone / WhatsApp (Optional)</span>
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+8801..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-indigo-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Your message will be sent instantly to the instructor. The instructor can reply directly, and when they lift your restriction, classroom access will unlock immediately.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Submitting Appeal...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Appeal to Instructor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentAppealModal;
