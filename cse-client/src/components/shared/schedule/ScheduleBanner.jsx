import React, { useEffect, useRef, useState } from "react";
import { Video, Clock, Sparkles } from "lucide-react";

/**
 * ScheduleBanner
 *
 * Displays a status strip above the chat input for an accepted schedule.
 * Ticks every second to compute the current display state.
 *
 * Props:
 *   schedule       – accepted schedule object or null
 *   serverOffset   – ms offset between server clock and local clock (default 0)
 *   onJoin         – called when the user clicks "Join Video Call"
 *   onScheduleExpired – called exactly once when the schedule expires
 */
const ScheduleBanner = ({ schedule, serverOffset = 0, onJoin, onScheduleExpired }) => {
  const [tick, setTick] = useState(0);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    hasExpiredRef.current = false;
    if (!schedule) return;

    const intervalId = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [schedule, serverOffset]);

  if (!schedule) return null;

  const now = Date.now() + serverOffset;
  const startTime = new Date(schedule.startTime).getTime();
  const expiryTime = startTime + schedule.durationMinutes * 60_000;
  const activationTime = startTime - 10 * 60_000;

  // Helper: format seconds as MM:SS
  const formatCountdown = (totalSeconds) => {
    const secs = Math.max(0, totalSeconds);
    return (
      String(Math.floor(secs / 60)).padStart(2, "0") +
      ":" +
      String(secs % 60).padStart(2, "0")
    );
  };

  // Expired state
  if (now > expiryTime) {
    if (!hasExpiredRef.current) {
      hasExpiredRef.current = true;
      setTimeout(() => {
        onScheduleExpired?.();
      }, 0);
    }
    return null;
  }

  // Upcoming state: before activation window
  if (now < activationTime) {
    const formattedDate = new Date(schedule.startTime).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="py-2.5 px-4 flex items-center justify-between bg-slate-900/90 border-t border-slate-800 text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <Clock size={13} className="text-indigo-400" />
          <span>Meeting scheduled for {formattedDate}</span>
        </span>
      </div>
    );
  }

  // Activating state: within 10-min window before start
  if (now < startTime) {
    const secsUntilStart = Math.floor((startTime - now) / 1000);
    return (
      <div className="py-2.5 px-4 flex items-center justify-between bg-amber-500/10 border-t border-amber-500/20 text-xs font-bold text-amber-300">
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          <span>Starts in {formatCountdown(secsUntilStart)}</span>
        </span>
        <button
          onClick={onJoin}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all shadow-md"
        >
          <Video size={13} />
          <span>Join Video Call</span>
        </button>
      </div>
    );
  }

  // In Progress state: between start and expiry
  const secsUntilExpiry = Math.floor((expiryTime - now) / 1000);
  return (
    <div className="py-2.5 px-4 flex items-center justify-between bg-emerald-500/10 border-t border-emerald-500/20 text-xs font-bold text-emerald-300">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Call in progress — ends in {formatCountdown(secsUntilExpiry)}</span>
      </span>
      <button
        onClick={onJoin}
        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
      >
        <Video size={13} />
        <span>Join Video Call</span>
      </button>
    </div>
  );
};

export default ScheduleBanner;
