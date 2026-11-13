import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 240];
const MIN_ADVANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Formats a Date to a datetime-local input value (YYYY-MM-DDTHH:MM)
 * Uses local time so the user sees what they expect in their timezone.
 */
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

/**
 * ScheduleModal
 *
 * Props:
 *  - isOpen {boolean}
 *  - onClose {function}
 *  - onSubmit {function(payload)} — payload: { title, startTime (ISO string), durationMinutes (integer) }
 *  - serverOffset {number} — ms difference between server clock and client clock (default 0)
 *  - initialTitle {string} — optional prefilled topic/title
 */
const ScheduleModal = ({ isOpen, onClose, onSubmit, serverOffset = 0, initialTitle = "" }) => {
  const [title, setTitle] = useState(initialTitle || "");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(""); // root-level submission error
  const [loading, setLoading] = useState(false);

  // Recalculate the min datetime-local value whenever the modal opens
  const getMinStartTime = useCallback(() => {
    const minMs = Date.now() + serverOffset + MIN_ADVANCE_MS;
    return toDatetimeLocalValue(new Date(minMs));
  }, [serverOffset]);

  useEffect(() => {
    if (isOpen) {
      // Reset all state on open
      setTitle(initialTitle || "");
      setStartTime("");
      setDurationMinutes(30);
      setErrors({});
      setSubmitError("");
      setLoading(false);
    }
  }, [isOpen, initialTitle]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  const validate = () => {
    const newErrors = {};

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 1) {
      newErrors.title = "Please enter a meeting title.";
    } else if (trimmedTitle.length > 100) {
      newErrors.title = "Title must be 100 characters or fewer.";
    }

    if (!startTime) {
      newErrors.startTime = "Please select a start time.";
    } else {
      const selectedMs = new Date(startTime).getTime();
      if (isNaN(selectedMs)) {
        newErrors.startTime = "Invalid start time.";
      } else {
        const minAllowedMs = Date.now() + serverOffset + MIN_ADVANCE_MS;
        if (selectedMs < minAllowedMs) {
          newErrors.startTime = "Start time must be at least 5 minutes from now.";
        }
      }
    }

    const parsedDuration = parseInt(durationMinutes, 10);
    if (isNaN(parsedDuration) || ![15, 30, 45, 60, 90, 120, 240].includes(parsedDuration)) {
      newErrors.duration = "Please select a valid duration.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double-submission

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitError("");
    setLoading(true);

    try {
      await onSubmit({
        title: title.trim(),
        // Convert local datetime string to UTC ISO string for the server
        startTime: new Date(startTime).toISOString(),
        durationMinutes: parseInt(durationMinutes, 10),
      });
      // onSubmit succeeded — close modal
      onClose();
    } catch (err) {
      // Surface the error from the parent's handler (handleCreateSchedule)
      setSubmitError(err?.message || "Failed to schedule meeting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center"
      onClick={() => { if (!loading) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="schedule-modal-title"
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            id="schedule-modal-title"
            className="text-base font-bold text-white"
          >
            Schedule a Meeting
          </h2>
          <button
            onClick={() => { if (!loading) onClose(); }}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
            aria-label="Close modal"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Root-level submission error */}
          {submitError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
              {submitError}
            </div>
          )}

          {/* Title field */}
          <div className="mb-4">
            <label
              htmlFor="schedule-title"
              className="block text-xs font-bold text-slate-300 mb-1.5"
            >
              Meeting Title
            </label>
            <input
              id="schedule-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                if (submitError) setSubmitError("");
              }}
              maxLength={100}
              placeholder="e.g. JavaScript deep dive session"
              disabled={loading}
              className="bg-slate-950/80 border border-slate-700 text-white rounded-xl px-4 py-2.5 w-full text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all disabled:opacity-50"
            />
            {errors.title && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium">{errors.title}</p>
            )}
          </div>

          {/* Start Time field */}
          <div className="mb-4">
            <label
              htmlFor="schedule-start-time"
              className="block text-xs font-bold text-slate-300 mb-1.5"
            >
              Start Time <span className="text-slate-500 font-normal">(your local time)</span>
            </label>
            <input
              id="schedule-start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: undefined }));
                if (submitError) setSubmitError("");
              }}
              min={getMinStartTime()}
              disabled={loading}
              className="bg-slate-950/80 border border-slate-700 text-white rounded-xl px-4 py-2.5 w-full text-xs font-medium focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all disabled:opacity-50 [color-scheme:dark]"
            />
            {errors.startTime && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium">{errors.startTime}</p>
            )}
          </div>

          {/* Duration field */}
          <div className="mb-6">
            <label
              htmlFor="schedule-duration"
              className="block text-xs font-bold text-slate-300 mb-1.5"
            >
              Duration
            </label>
            <select
              id="schedule-duration"
              value={durationMinutes}
              onChange={(e) => {
                setDurationMinutes(parseInt(e.target.value, 10));
                if (errors.duration) setErrors((prev) => ({ ...prev, duration: undefined }));
              }}
              disabled={loading}
              className="bg-slate-950/80 border border-slate-700 text-white rounded-xl px-4 py-2.5 w-full text-xs font-medium focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all disabled:opacity-50 [color-scheme:dark]"
            >
              {DURATION_OPTIONS.map((mins) => (
                <option key={mins} value={mins}>
                  {mins < 60
                    ? `${mins} minutes`
                    : `${mins / 60} hour${mins / 60 > 1 ? "s" : ""}`}
                </option>
              ))}
            </select>
            {errors.duration && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium">{errors.duration}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { if (!loading) onClose(); }}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-50 transition shadow-md shadow-indigo-600/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <ButtonSpinner size="xs" />
                  Scheduling…
                </span>
              ) : (
                "Schedule Meeting"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;
