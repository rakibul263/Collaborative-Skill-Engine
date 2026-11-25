import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Send,
  BellRing,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { getSocket } from "@/lib/socket";
import { playNotificationSound } from "@/lib/notificationSound";

/**
 * BottomNotificationPopup — Floating, high-contrast, audible bottom notification
 * popup for SMS messages, appeals, and real-time updates.
 */
const BottomNotificationPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activePopup, setActivePopup] = useState(null);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const lastPopupIdRef = useRef("");

  const dismissPopup = useCallback(() => {
    setActivePopup(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  }, []);

  const triggerPopup = useCallback(
    (data) => {
      if (!data) return;

      // Avoid immediate duplicate popups within 1.5s
      const popupKey = `${data.type || "msg"}-${data.senderEmail || ""}-${data.createdAt || Date.now()}`;
      if (lastPopupIdRef.current === popupKey) return;
      lastPopupIdRef.current = popupKey;

      // Don't show SMS popup if user is actively in that exact chat conversation
      if (
        data.type === "chat_message" &&
        location.pathname.startsWith("/message") &&
        data.senderEmail &&
        location.search.includes(encodeURIComponent(data.senderEmail))
      ) {
        return;
      }

      // Don't show appeal popup if instructor is actively in the Appeals Mailbox
      if (
        data.type === "course_appeal" &&
        location.pathname.startsWith("/studio/appeals")
      ) {
        return;
      }

      // Don't show meeting join popup if user is already inside the video call overlay
      if (
        data.type === "meeting_joined" &&
        typeof document !== "undefined" &&
        document.body.classList.contains("video-call-active")
      ) {
        return;
      }

      // Play sound
      playNotificationSound("chime");

      // Set popup data
      setActivePopup({
        id: popupKey,
        type: data.type || "chat_message",
        title: data.title || (data.senderName ? `SMS from ${data.senderName}` : "New Message"),
        message: data.message || "You have a new message.",
        senderName: data.senderName || data.learnerName || "User",
        senderEmail: data.senderEmail || data.learnerEmail || "",
        senderImage: data.senderImage || data.senderPhoto || "",
        courseTitle: data.courseTitle || "",
        actionUrl: data.actionUrl || data.link || (data.senderEmail ? `/message?peer=${encodeURIComponent(data.senderEmail)}` : "/message"),
        createdAt: data.createdAt || new Date().toISOString(),
      });

      setProgress(100);
    },
    [location.pathname, location.search]
  );

  // Auto-dismiss timer & progress bar
  useEffect(() => {
    if (!activePopup) return;

    const DURATION = 8000;
    const INTERVAL = 80;
    const step = (INTERVAL / DURATION) * 100;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    progressIntervalRef.current = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(progressIntervalRef.current);
            dismissPopup();
            return 0;
          }
          return prev - step;
        });
      }
    }, INTERVAL);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activePopup, isPaused, dismissPopup]);

  // Socket listeners for real-time messages and notifications
  useEffect(() => {
    if (!user?.email) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const cleanEmail = user.email.trim();
    socket.emit("presence:join", { email: cleanEmail });
    socket.emit("presence:join", { email: cleanEmail.toLowerCase() });

    // 1. Direct real-time SMS / chat popup event
    const handleMessagePopup = (payload) => {
      if (!payload) return;
      if (payload.senderEmail && payload.senderEmail.toLowerCase() === cleanEmail.toLowerCase()) {
        return; // Don't popup own sent messages
      }
      triggerPopup(payload);
    };

    // 2. Persistent user notification event (course updates, appeals, replies, meeting joins)
    const handleUserNotification = (notif) => {
      if (!notif) return;
      if (
        notif.type === "chat_message" ||
        notif.type === "course_appeal" ||
        notif.type === "appeal_reply" ||
        notif.type === "restriction_lifted" ||
        notif.type === "meeting_joined"
      ) {
        triggerPopup(notif);
      }
    };

    // 3. Direct student appeal event
    const handleAppealNew = (appeal) => {
      if (!appeal) return;
      if (appeal.learnerEmail && appeal.learnerEmail.toLowerCase() === cleanEmail.toLowerCase()) {
        return;
      }
      triggerPopup({
        type: "course_appeal",
        title: `Student Appeal: ${appeal.learnerName || appeal.learnerEmail}`,
        message: appeal.message || "A student sent an appeal regarding access restriction.",
        senderName: appeal.learnerName || "Student",
        senderEmail: appeal.learnerEmail,
        courseTitle: appeal.courseTitle,
        actionUrl: "/studio/appeals",
        createdAt: appeal.createdAt,
      });
    };

    socket.on("message:popup", handleMessagePopup);
    socket.on("user-notification:new", handleUserNotification);
    socket.on("appeal:new", handleAppealNew);

    return () => {
      socket.off("message:popup", handleMessagePopup);
      socket.off("user-notification:new", handleUserNotification);
      socket.off("appeal:new", handleAppealNew);
    };
  }, [user?.email, triggerPopup]);

  const handleOpenAction = () => {
    if (activePopup?.actionUrl) {
      navigate(activePopup.actionUrl);
    }
    dismissPopup();
  };

  return (
    <AnimatePresence>
      {activePopup && (
        <motion.div
          key={activePopup.id}
          initial={{ opacity: 0, y: 50, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[99999] w-[360px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-[#0b0f19] border-2 border-indigo-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(99,102,241,0.35)] overflow-hidden font-sans select-none"
        >
          {/* Top glowing ambient neon line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500" />

          {/* Left vertical neon bar */}
          <div className="absolute left-0 top-3 bottom-3 w-[4px] bg-gradient-to-b from-indigo-400 via-cyan-400 to-purple-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />

          <div className="p-4 pl-5">
            {/* Header: Tag + Time + Close */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                  {activePopup.type === "course_appeal"
                    ? "STUDENT APPEAL"
                    : activePopup.type === "appeal_reply"
                    ? "INSTRUCTOR REPLY"
                    : activePopup.type === "meeting_joined"
                    ? "MEETING JOINED"
                    : "NEW SMS / MESSAGE"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Just now</span>
                <button
                  type="button"
                  onClick={dismissPopup}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body: Sender Avatar + Details */}
            <div className="flex items-start gap-3">
              <div className="relative shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-indigo-500/40 flex items-center justify-center text-white font-black text-sm shadow-inner">
                  {activePopup.senderImage ? (
                    <img
                      src={activePopup.senderImage}
                      alt={activePopup.senderName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="bg-gradient-to-tr from-indigo-600 to-purple-600 w-full h-full flex items-center justify-center">
                      {(activePopup.senderName || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b0f19] animate-pulse" />
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-white truncate leading-tight">
                  {activePopup.senderName}
                </h4>
                {activePopup.senderEmail && (
                  <p className="text-[11px] text-indigo-300/80 font-mono truncate">
                    {activePopup.senderEmail}
                  </p>
                )}

                <p className="text-xs text-slate-200 mt-1 line-clamp-2 leading-snug font-medium">
                  {activePopup.message}
                </p>

                {activePopup.courseTitle && (
                  <div className="mt-1">
                    <span className="inline-block max-w-full truncate text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                      Course: {activePopup.courseTitle}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 italic">Click to view &amp; reply</span>
              <button
                type="button"
                onClick={handleOpenAction}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
              >
                <span>
                  {activePopup.type === "course_appeal"
                    ? "Open Appeals"
                    : activePopup.type === "meeting_joined"
                    ? "Join Meeting"
                    : "Open Chat"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Countdown Progress Bar */}
          <div className="h-1 w-full bg-slate-900 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500"
              style={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BottomNotificationPopup;

