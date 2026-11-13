import React, { useState } from "react";
import { X, ShieldAlert, Send, AlertCircle, HelpCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "@/components/ui/toast-system";

/**
 * AdminDisputeModal — Allows learners to escalate an unjustified course ban or unresponsive
 * instructor directly to Platform Administration.
 */
const AdminDisputeModal = ({
  courseId,
  courseTitle,
  instructorEmail,
  onClose,
}) => {
  const [category, setCategory] = useState("unfair_ban");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!details.trim()) {
      setError("Please describe the dispute details for our Platform Administration.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post(`/courses/${courseId}/report-admin`, {
        category,
        reason: reason.trim() || category,
        details: details.trim(),
      });

      toast.success(res.data?.message || "Dispute report submitted to Platform Administration.");
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit report. Please try again.");
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
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-rose-400">
              Platform Escalation &amp; Safety
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Report Dispute to Platform Administration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Escalate unfair treatment, unresponsive instructors, or policy violations to the support team.
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
          {/* Dispute Category */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-1.5">
              Dispute Category <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
            >
              <option value="unfair_ban">Unjustified / False Course Ban</option>
              <option value="no_instructor_response">Instructor Unresponsive to Appeals</option>
              <option value="harassment">Harassment, Abuse or Discrimination</option>
              <option value="payment_dispute">Paid Course Access Revoked Without Refund</option>
              <option value="other">Other Platform Policy Violation</option>
            </select>
          </div>

          {/* Short Reason */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-1.5">
              Brief Summary of Dispute
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Banned without violating any stated course rules"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {/* Full Dispute Description */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-1.5">
              Detailed Statement for Platform Administrators <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide complete evidence, sequence of events, and why the restriction should be overturned by Admin review..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors leading-relaxed resize-none"
              required
            />
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-400">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Course: <strong className="text-slate-300">{courseTitle || "Course"}</strong> • Instructor: <strong className="text-slate-300">{instructorEmail}</strong>. Platform Admins will review both the instructor's ban reason and your statement.
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Submitting Report...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Dispute to Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDisputeModal;

