import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import { getSocket } from "@/lib/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

/* ─── Notification type config ─── */
const notifConfig = {
  info: {
    icon: <Info size={14} />,
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    border: "border-blue-200 dark:border-blue-800/40",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-200 dark:border-amber-800/40",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  success: {
    icon: <CheckCircle size={14} />,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-200 dark:border-emerald-800/40",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  update: {
    icon: <RefreshCw size={14} />,
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    border: "border-indigo-200 dark:border-indigo-800/40",
    text: "text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
};

const userNotifConfig = {
  schedule_invite: {
    icon: <Bell size={14} />,
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    border: "border-indigo-200 dark:border-indigo-800/40",
    text: "text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  schedule_accepted: {
    icon: <CheckCircle size={14} />,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-200 dark:border-emerald-800/40",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  schedule_rejected: {
    icon: <AlertTriangle size={14} />,
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-rose-200 dark:border-rose-800/40",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "unread"
  const [notifications, setNotifications] = useState([]); // admin broadcast notifications
  const [userNotifs, setUserNotifs] = useState([]); // persistent user-specific notifications
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("cse_read_notifs") || "[]"));
    } catch {
      return new Set();
    }
  });
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/notifications`);
      setNotifications(res.data || []);
    } catch {
      /* silent catch */
    }
  }, []);

  const fetchUserNotifs = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(
        `${API}/user-notifications?email=${encodeURIComponent(user.email)}`
      );
      setUserNotifs(res.data || []);
    } catch {
      /* silent catch */
    }
  }, [user?.email]);

  useEffect(() => {
    fetchNotifications();
    fetchUserNotifs();

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    // Admin broadcast notifications
    const onNew = (notif) => setNotifications((prev) => [notif, ...prev]);
    const onDeleted = ({ id }) =>
      setNotifications((prev) => prev.filter((n) => String(n._id) !== id));
    socket.on("notification:new", onNew);
    socket.on("notification:deleted", onDeleted);

    // Persistent user-specific notifications (schedule events)
    const onUserNotif = (notif) => {
      setUserNotifs((prev) => {
        if (prev.some((n) => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
    };
    socket.on("user-notification:new", onUserNotif);

    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:deleted", onDeleted);
      socket.off("user-notification:new", onUserNotif);
    };
  }, [fetchNotifications, fetchUserNotifs]);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Count unread
  const userNotifsUnread = userNotifs.filter((n) => !n.isRead).length;
  const adminUnread = notifications.filter(
    (n) => !readIds.has(String(n._id))
  ).length;
  const unreadCount = adminUnread + userNotifsUnread;

  const markAllRead = () => {
    const allIds = notifications.map((n) => String(n._id));
    const newSet = new Set([...readIds, ...allIds]);
    setReadIds(newSet);
    localStorage.setItem("cse_read_notifs", JSON.stringify([...newSet]));

    if (user?.email && userNotifsUnread > 0) {
      axios
        .patch(`${API}/user-notifications/read`, { email: user.email })
        .catch(() => {});
      setUserNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const markRead = (id) => {
    const newSet = new Set([...readIds, String(id)]);
    setReadIds(newSet);
    localStorage.setItem("cse_read_notifs", JSON.stringify([...newSet]));
  };

  const markUserNotifRead = (id) => {
    setUserNotifs((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    axios.patch(`${API}/user-notifications/${id}/read`).catch(() => {});
  };

  // Merge & sort all notifications newest-first
  const allNotifications = [
    ...userNotifs.map((n) => ({
      ...n,
      _userNotif: true,
      _isRead: n.isRead,
    })),
    ...notifications.map((n) => ({
      ...n,
      _userNotif: false,
      _isRead: readIds.has(String(n._id)),
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const displayedNotifications =
    activeTab === "unread"
      ? allNotifications.filter((n) => !n._isRead)
      : allNotifications;

  const formatTime = (iso) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
        }}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          open
            ? "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
        }`}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-950 shadow-sm"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-[360px] sm:w-[380px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/10 rounded-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200/60 dark:border-indigo-800/40">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchNotifications}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw size={13} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                    >
                      <CheckCheck size={13} />
                      Mark read
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-3 p-0.5 bg-slate-100/80 dark:bg-slate-800/70 rounded-lg">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  All ({allNotifications.length})
                </button>
                <button
                  onClick={() => setActiveTab("unread")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === "unread"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>
            </div>

            {/* List Container */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedNotifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Bell size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    No notifications
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeTab === "unread"
                      ? "You're all caught up!"
                      : "Meeting updates and platform alerts will appear here."}
                  </p>
                </div>
              ) : (
                displayedNotifications.map((n) => {
                  const cfg = n._userNotif
                    ? userNotifConfig[n.type] || userNotifConfig.schedule_invite
                    : notifConfig[n.type] || notifConfig.info;

                  return (
                    <div
                      key={String(n._id)}
                      onClick={() => {
                        if (n._userNotif) {
                          markUserNotifRead(n._id);
                        } else {
                          markRead(n._id);
                          if (n.link) window.open(n.link, "_blank");
                        }
                      }}
                      className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        !n._isRead
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} ${cfg.text} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        {cfg.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs font-semibold leading-snug ${
                              !n._isRead
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        {n.link && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-1.5 hover:underline">
                            View details <ExternalLink size={10} />
                          </span>
                        )}
                      </div>

                      {!n._isRead && (
                        <span
                          className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1.5`}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Collaborative Skill Engine Alerts
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
