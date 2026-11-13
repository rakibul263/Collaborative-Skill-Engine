import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mail,
  Inbox,
  Send,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Search,
  Phone,
  BookOpen,
  CheckCheck,
  UserCheck,
  ExternalLink,
  Copy,
  Check,
  Archive,
  FileText,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";
import { playNotificationSound } from "@/lib/notificationSound";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";

const FORMAL_EMAIL_TEMPLATES = [
  "Your appeal has been reviewed and accepted. Your course access is restored.",
  "Your restriction has been lifted. Please ensure adherence to community guidelines.",
  "Thank you for clarifying the situation. Your enrollment has been reactivated.",
  "We have removed your temporary suspension. Welcome back to the lessons.",
];

const StudioAppealsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryAppealId = searchParams.get("appealId");

  // Instant data initialization from sessionStorage to prevent any loading delay
  const [appeals, setAppeals] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cse_studio_appeals");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => appeals.length === 0);
  const [selectedAppealId, setSelectedAppealId] = useState(queryAppealId || appeals[0]?._id || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("inbox"); // 'inbox' | 'restricted' | 'resolved' | 'all'

  // Reply Form States
  const [replyText, setReplyText] = useState("");
  const [restoreAccessOnReply, setRestoreAccessOnReply] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [studentTyping, setStudentTyping] = useState(null);
  const appealTypingTimerRef = useRef(null);
  const studentTypingSafetyRef = useRef(null);

  const emailEndRef = useRef(null);

  const scrollToBottom = () => {
    emailEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success(`Copied "${email}" to clipboard.`);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const fetchAppeals = useCallback(async (quiet = false) => {
    if (!quiet && appeals.length === 0) setLoading(true);
    try {
      const res = await apiClient.get("/studio/appeals");
      const list = res.data?.appeals || [];
      setAppeals(list);

      try {
        sessionStorage.setItem("cse_studio_appeals", JSON.stringify(list));
      } catch {
        /* silent catch */
      }

      // Auto-select email
      setSelectedAppealId((prevId) => {
        if (queryAppealId && list.some((a) => a._id === queryAppealId || a.id === queryAppealId)) {
          return queryAppealId;
        }
        if (prevId && list.some((a) => a._id === prevId || a.id === prevId)) {
          return prevId;
        }
        return list[0]?._id || null;
      });
    } catch (err) {
      console.error("[StudioAppealsPage] fetchAppeals error:", err);
      if (!quiet && appeals.length === 0) toast.error("Could not load appeals mailbox.");
    } finally {
      setLoading(false);
    }
  }, [queryAppealId, appeals.length]);

  useEffect(() => {
    fetchAppeals(appeals.length > 0);
  }, [fetchAppeals]);

  // Real-time socket updates without page reload
  useEffect(() => {
    const socket = getSocket();

    const handleNewAppeal = (newAppeal) => {
      setAppeals((prevList) => {
        const appealId = newAppeal._id || newAppeal.id;
        const exists = prevList.some((a) => a._id === appealId || a.id === appealId);
        let updatedList;
        if (exists) {
          updatedList = prevList.map((a) =>
            a._id === appealId || a.id === appealId
              ? {
                  ...a,
                  ...newAppeal,
                  messages: Array.isArray(newAppeal.messages) && newAppeal.messages.length > 0
                    ? newAppeal.messages
                    : a.messages,
                  status: newAppeal.status || a.status,
                  updatedAt: new Date().toISOString(),
                }
              : a
          );
        } else {
          updatedList = [newAppeal, ...prevList];
        }
        try {
          sessionStorage.setItem("cse_studio_appeals", JSON.stringify(updatedList));
        } catch {
          /* silent */
        }
        return updatedList;
      });

      toast.info(`New student appeal email from ${newAppeal.learnerName || newAppeal.learnerEmail}`);
      playNotificationSound("chime");
      scrollToBottom();
    };

    const handleAppealUpdated = (updatedAppeal) => {
      const appealId = updatedAppeal._id || updatedAppeal.id;
      playNotificationSound("chime");
      setStudentTyping(null);
      setAppeals((prevList) => {
        const updatedList = prevList.map((a) =>
          a._id === appealId || a.id === appealId
            ? {
                ...a,
                ...updatedAppeal,
                messages: Array.isArray(updatedAppeal.messages) && updatedAppeal.messages.length > 0
                  ? updatedAppeal.messages
                  : a.messages,
                status: updatedAppeal.status || a.status,
                banned: updatedAppeal.banned !== undefined ? updatedAppeal.banned : a.banned,
                suspended: updatedAppeal.suspended !== undefined ? updatedAppeal.suspended : a.suspended,
                updatedAt: new Date().toISOString(),
              }
            : a
        );
        try {
          sessionStorage.setItem("cse_studio_appeals", JSON.stringify(updatedList));
        } catch {
          /* silent */
        }
        return updatedList;
      });
      scrollToBottom();
    };

    const handleEnrollmentUpdated = (evt) => {
      setAppeals((prevList) =>
        prevList.map((a) => {
          if (a.enrollmentId === evt.enrollmentId || a.courseId === evt.courseId) {
            return {
              ...a,
              banned: Boolean(evt.banned),
              suspended: Boolean(evt.suspended),
              status: evt.active ? "resolved" : a.status,
            };
          }
          return a;
        })
      );
    };

    const handleUserNotification = (notif) => {
      if (notif?.type === "course_appeal") {
        fetchAppeals(true);
      }
    };

    const handleAppealTyping = (data) => {
      if (data?.userEmail !== user?.email) {
        if (data.isTyping) {
          setStudentTyping(data);
          if (studentTypingSafetyRef.current) clearTimeout(studentTypingSafetyRef.current);
          studentTypingSafetyRef.current = setTimeout(() => {
            setStudentTyping(null);
          }, 4000);
        } else {
          setStudentTyping(null);
        }
      }
    };

    socket.on("appeal:new", handleNewAppeal);
    socket.on("appeal:updated", handleAppealUpdated);
    socket.on("appeal:typing", handleAppealTyping);
    socket.on("enrollment:updated", handleEnrollmentUpdated);
    socket.on("user-notification:new", handleUserNotification);

    return () => {
      socket.off("appeal:new", handleNewAppeal);
      socket.off("appeal:updated", handleAppealUpdated);
      socket.off("appeal:typing", handleAppealTyping);
      socket.off("enrollment:updated", handleEnrollmentUpdated);
      socket.off("user-notification:new", handleUserNotification);
    };
  }, [fetchAppeals]);

  const selectedAppeal = appeals.find(
    (a) => a._id === selectedAppealId || a.id === selectedAppealId
  );

  useEffect(() => {
    scrollToBottom();
  }, [selectedAppeal?.messages]);

  const handleReplyTextChange = (e) => {
    const val = e.target.value;
    setReplyText(val);

    if (!selectedAppeal?.learnerEmail || !user?.email) return;
    const socket = getSocket();
    if (!socket?.connected) return;

    socket.emit("appeal:typing", {
      appealId: selectedAppeal._id || selectedAppeal.id,
      recipientEmail: selectedAppeal.learnerEmail,
      isTyping: true,
      userEmail: user.email,
      userName: user.displayName || "Instructor",
      role: "instructor",
    });

    if (appealTypingTimerRef.current) clearTimeout(appealTypingTimerRef.current);
    appealTypingTimerRef.current = setTimeout(() => {
      socket.emit("appeal:typing", {
        appealId: selectedAppeal._id || selectedAppeal.id,
        recipientEmail: selectedAppeal.learnerEmail,
        isTyping: false,
        userEmail: user.email,
        userName: user.displayName || "Instructor",
        role: "instructor",
      });
    }, 2500);
  };

  // Handle formal reply sending
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedAppeal) return;

    if (appealTypingTimerRef.current) clearTimeout(appealTypingTimerRef.current);
    const socket = getSocket();
    socket?.emit("appeal:typing", {
      appealId: selectedAppeal._id || selectedAppeal.id,
      recipientEmail: selectedAppeal.learnerEmail,
      isTyping: false,
      userEmail: user.email,
    });

    setReplyLoading(true);
    try {
      const appealId = selectedAppeal._id || selectedAppeal.id;
      const res = await apiClient.post(`/studio/appeals/${appealId}/reply`, {
        message: replyText.trim(),
        restoreAccess: restoreAccessOnReply,
      });

      playNotificationSound("sent");

      const updated = res.data?.appeal;
      if (updated) {
        setAppeals((prevList) => {
          const updatedList = prevList.map((a) =>
            a._id === appealId || a.id === appealId
              ? {
                  ...a,
                  ...updated,
                  status: restoreAccessOnReply ? "resolved" : "replied",
                  banned: restoreAccessOnReply ? false : a.banned,
                  suspended: restoreAccessOnReply ? false : a.suspended,
                }
              : a
          );
          try {
            sessionStorage.setItem("cse_studio_appeals", JSON.stringify(updatedList));
          } catch {
            /* silent */
          }
          return updatedList;
        });
      }

      toast.success(
        res.data?.message || (restoreAccessOnReply ? "Reply sent & student access restored!" : "Response sent to student.")
      );
      setReplyText("");
      scrollToBottom();
    } catch (err) {
      console.error("Reply error:", err);
      toast.error(err?.response?.data?.message || "Failed to send response.");
    } finally {
      setReplyLoading(false);
    }
  };

  // Direct 1-click unban action
  const handleQuickRestoreAccess = async () => {
    if (!selectedAppeal?.enrollmentId) return;

    const { isConfirmed } = await showConfirm({
      variant: "approve",
      badge: "UNBAN ACCESS",
      title: `Unban & Restore Course Access?`,
      description: `Student: ${selectedAppeal.learnerName} (${selectedAppeal.learnerEmail})\nCourse: "${selectedAppeal.courseTitle}".\nThis will immediately lift all ban/suspension restrictions.`,
      confirmText: "Yes, Unban Student",
    });

    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      await apiClient.patch(`/studio/students/${selectedAppeal.enrollmentId}/status`, {
        action: "unban_and_restore",
        reason: "Access restored by instructor via Appeals Mailbox",
      });

      toast.confirmed("Student Unbanned & Access Restored", {
        description: `Enrollment restriction lifted for ${selectedAppeal.learnerName}.`,
        badge: "RESTORED",
      });

      setAppeals((prevList) => {
        const updatedList = prevList.map((a) =>
          a._id === selectedAppeal._id || a.id === selectedAppeal.id
            ? { ...a, banned: false, suspended: false, status: "resolved" }
            : a
        );
        try {
          sessionStorage.setItem("cse_studio_appeals", JSON.stringify(updatedList));
        } catch {
          /* silent */
        }
        return updatedList;
      });
    } catch (err) {
      console.error("Restore access error:", err);
      toast.error(err?.response?.data?.message || "Failed to unban student.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered mailbox list
  const filteredAppeals = appeals.filter((appeal) => {
    if (folderFilter === "inbox" && appeal.status !== "pending") return false;
    if (folderFilter === "restricted" && !appeal.banned && !appeal.suspended) return false;
    if (folderFilter === "resolved" && appeal.status !== "resolved") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (appeal.learnerName || "").toLowerCase().includes(q);
      const matchEmail = (appeal.learnerEmail || "").toLowerCase().includes(q);
      const matchCourse = (appeal.courseTitle || "").toLowerCase().includes(q);
      const matchMessage = (appeal.messages || []).some((m) =>
        (m.message || "").toLowerCase().includes(q)
      );
      return matchName || matchEmail || matchCourse || matchMessage;
    }
    return true;
  });

  const pendingCount = appeals.filter((a) => a.status === "pending").length;
  const restrictedCount = appeals.filter((a) => a.banned || a.suspended).length;
  const resolvedCount = appeals.filter((a) => a.status === "resolved").length;

  return (
    <div className="w-full h-full min-h-[calc(100vh-65px)] flex flex-col bg-[#0b0f19] text-slate-100 select-none">
      {/* ── TOP SLIM MAILBOX TOOLBAR (Solid Dark, High Contrast) ── */}
      <div className="px-5 py-3 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Folders Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800 mr-1 text-slate-200 font-black text-xs tracking-tight">
            <Mail className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Appeals Mailbox</span>
          </div>

          {[
            { id: "inbox", label: "Inbox", icon: Inbox, count: pendingCount, alert: pendingCount > 0 },
            { id: "restricted", label: "Restricted", icon: ShieldAlert, count: restrictedCount, alert: false },
            { id: "resolved", label: "Restored", icon: CheckCircle2, count: resolvedCount, alert: false },
            { id: "all", label: "All Mail", icon: Archive, count: appeals.length, alert: false },
          ].map((f) => {
            const Icon = f.icon;
            const isActive = folderFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFolderFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-[#1e293b] text-slate-300 hover:text-white border-slate-700/80 hover:bg-[#334155]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{f.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? "bg-white/20 text-white"
                      : f.alert
                      ? "bg-amber-500/25 text-amber-300 font-bold animate-pulse"
                      : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-44 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, email, course..."
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            onClick={() => fetchAppeals(false)}
            className="p-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer shrink-0"
            title="Refresh Mailbox"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2-PANE SOLID FULL-WIDTH MAILBOX SPLIT VIEW ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0 bg-[#0b0f19]">
        {/* ── LEFT PANE: EMAIL LIST (5 Cols) ── */}
        <div className="lg:col-span-5 flex flex-col border-r border-slate-800 bg-[#0f172a] overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-800 bg-[#0c1322] flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="text-slate-300 font-bold">{filteredAppeals.length} messages</span>
            <span className="text-[10px] text-slate-500">Sorted by date</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredAppeals.length === 0 ? (
              <div className="py-28 text-center px-4 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-[#1e293b] border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-200">No emails found</p>
                <p className="text-[11px] text-slate-400">
                  {searchQuery ? "No matches for your query." : "Folder is currently clear."}
                </p>
              </div>
            ) : (
              filteredAppeals.map((appeal) => {
                const isSelected = (appeal._id === selectedAppealId || appeal.id === selectedAppealId);
                const lastMsg = appeal.messages && appeal.messages.length > 0
                  ? appeal.messages[appeal.messages.length - 1]
                  : null;
                const isUnread = appeal.status === "pending";

                return (
                  <div
                    key={appeal._id || appeal.id}
                    onClick={() => {
                      setSelectedAppealId(appeal._id || appeal.id);
                      setSearchParams({ appealId: appeal._id || appeal.id });
                    }}
                    className={`p-4 transition-all cursor-pointer text-left relative border-l-4 group ${
                      isSelected
                        ? "bg-[#1e293b] border-indigo-500 shadow-md text-white"
                        : "bg-[#0f172a] hover:bg-[#182234] border-transparent text-slate-200"
                    }`}
                  >
                    {/* Top Row: Sender Name + Timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                        <h4 className={`text-xs truncate ${isUnread ? "font-black text-white" : "font-bold text-slate-200"}`}>
                          {appeal.learnerName || appeal.learnerEmail.split("@")[0]}
                        </h4>
                      </div>

                      <span className="text-[10px] text-slate-400 shrink-0 font-medium font-mono">
                        {appeal.updatedAt ? new Date(appeal.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>

                    {/* Sender Email Line */}
                    <p className="text-[11px] text-indigo-300 font-mono truncate mt-0.5">
                      &lt;{appeal.learnerEmail}&gt;
                    </p>

                    {/* Subject Line */}
                    <p className="text-xs text-slate-300 font-semibold truncate mt-1">
                      Appeal: Access Restriction in {appeal.courseTitle || "Course"}
                    </p>

                    {/* Snippet / 1-line preview */}
                    {lastMsg && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-normal">
                        {lastMsg.sender === "instructor" ? "You: " : ""}
                        {lastMsg.message}
                      </p>
                    )}

                    {/* Tags row */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-[9px]">
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                          appeal.banned
                            ? "bg-red-500/25 text-red-300 border border-red-500/40"
                            : appeal.suspended
                            ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                            : "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {appeal.banned ? "Banned" : appeal.suspended ? "Suspended" : "Access Active"}
                      </span>

                      <span className="text-slate-400 truncate max-w-[180px]">
                        {appeal.courseTitle}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: EMAIL READING & FORMAL REPLY PANE (7 Cols) ── */}
        <div className="lg:col-span-7 flex flex-col bg-[#0b0f19] overflow-hidden">
          {selectedAppeal ? (
            <>
              {/* Top Action Toolbar (Solid Dark Slate, High Contrast) */}
              <div className="px-6 py-3 border-b border-slate-800 bg-[#0f172a] flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* 1-Click Unban Button */}
                <div className="flex items-center gap-2">
                  {(selectedAppeal.banned || selectedAppeal.suspended) ? (
                    <button
                      type="button"
                      onClick={handleQuickRestoreAccess}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Immediately unban and restore full student access"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Unban &amp; Restore Access</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Access Active (Unbanned)</span>
                    </span>
                  )}
                </div>

                {/* Quick Tools */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(selectedAppeal.learnerEmail)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Copy Student Email"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmail ? "Copied" : "Copy Email"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/studio/students?search=${encodeURIComponent(selectedAppeal.learnerEmail)}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="View in Student Directory"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Directory</span>
                  </button>

                  {selectedAppeal.contactPhone && (
                    <a
                      href={`https://wa.me/${selectedAppeal.contactPhone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-colors cursor-pointer"
                      title={`WhatsApp: ${selectedAppeal.contactPhone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Email Content Body (Scrollable, Solid High Contrast) */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 bg-[#0b0f19]">
                {/* Email Subject Title */}
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-white tracking-tight leading-snug">
                    Appeal: Request to Lift Restriction in "{selectedAppeal.courseTitle}"
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-[#1e293b] border border-slate-700 font-mono text-[10px] text-indigo-300 font-bold">
                      Case #{selectedAppeal._id.slice(-6).toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>Course: <strong className="text-slate-200">{selectedAppeal.courseTitle}</strong></span>
                  </div>
                </div>

                {/* Sender Card (Solid Navy Slate) */}
                <div className="p-4 rounded-2xl bg-[#131b2e] border border-slate-800 flex items-start justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-purple-700 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md">
                      {selectedAppeal.learnerName?.charAt(0).toUpperCase() || "S"}
                    </div>

                    <div className="min-w-0 space-y-0.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {selectedAppeal.learnerName || selectedAppeal.learnerEmail.split("@")[0]}
                        </span>
                        <span className="text-indigo-300 font-mono text-[11px] font-semibold">
                          &lt;{selectedAppeal.learnerEmail}&gt;
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        To: <span className="text-slate-300 font-medium">{user?.fullName || "Course Instructor"}</span> &lt;{user?.email}&gt;
                      </p>

                      {selectedAppeal.contactPhone && (
                        <p className="text-[11px] text-slate-400">
                          Contact Phone: <strong className="text-slate-200 font-mono">{selectedAppeal.contactPhone}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <p className="font-semibold text-slate-300">
                      {selectedAppeal.createdAt
                        ? new Date(selectedAppeal.createdAt).toLocaleDateString([], {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </p>
                    <p className="text-slate-500 font-mono text-[10px]">
                      {selectedAppeal.createdAt
                        ? new Date(selectedAppeal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Reason Banner (Solid High-Contrast) */}
                <div className="p-3.5 rounded-2xl bg-[#1a1c29] border border-amber-900/50 flex items-start gap-2.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 text-slate-200 space-y-0.5">
                    <p className="font-bold text-amber-300">
                      Restriction Reason ({selectedAppeal.banned ? "Banned" : "Suspension"}):
                    </p>
                    <p className="text-slate-200 italic font-medium">
                      "{selectedAppeal.restrictionReason || "Access restricted by instructor."}"
                    </p>
                  </div>
                </div>

                {/* Messages Thread (Solid Opaque Cards) */}
                <div className="space-y-3.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Email Thread
                  </h3>

                  {(!selectedAppeal.messages || selectedAppeal.messages.length === 0) ? (
                    <div className="p-6 rounded-2xl bg-[#131b2e] border border-slate-800 text-center text-xs text-slate-400">
                      No message history recorded.
                    </div>
                  ) : (
                    selectedAppeal.messages.map((m, idx) => {
                      const isInstructor = m.sender === "instructor";
                      return (
                        <div
                          key={m.id || idx}
                          className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-colors shadow-sm ${
                            isInstructor
                              ? "bg-[#1a1f3c] border-indigo-700/50"
                              : "bg-[#131b2e] border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className={`font-bold ${isInstructor ? "text-indigo-300" : "text-amber-300"}`}>
                              {isInstructor ? "Instructor Response (You)" : `Student Message (${selectedAppeal.learnerName})`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {m.createdAt ? new Date(m.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : ""}
                            </span>
                          </div>

                          <div className="text-slate-100 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm font-sans">
                            {m.message}
                          </div>

                          {m.issueDetails && (
                            <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-xs space-y-1">
                              <span className="font-bold text-amber-300 text-[11px] block">
                                Student Problem Explanation:
                              </span>
                              <p className="text-slate-200 whitespace-pre-wrap">{m.issueDetails}</p>
                            </div>
                          )}

                          {m.liftedRestriction && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                              Student Unbanned &amp; Course Access Restored with this resolution
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Realtime Student Typing Indicator */}
                  {studentTyping && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#131b2e] border border-cyan-500/40 text-cyan-300 text-xs w-fit shadow-md my-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="font-bold text-white">
                        {studentTyping.userName || selectedAppeal.learnerName || "Student"}
                      </span>
                      <span>is typing a response</span>
                      <span className="flex items-center gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  )}

                  <div ref={emailEndRef} />
                </div>

                {/* Email Reply Composer (Solid Dark Navy) */}
                <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-indigo-400" />
                      Compose Formal Response
                    </h4>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={restoreAccessOnReply}
                        onChange={(e) => setRestoreAccessOnReply(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-emerald-400">
                        Unban student &amp; restore course access with this reply
                      </span>
                    </label>
                  </div>

                  {/* Fast Template Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Templates:</span>
                    {FORMAL_EMAIL_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setReplyText(tmpl);
                          setRestoreAccessOnReply(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-200 hover:text-white border border-slate-700 text-[10px] font-medium transition-colors shrink-0 cursor-pointer"
                      >
                        {tmpl}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={handleReplyTextChange}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                    placeholder={`Write your formal response to ${selectedAppeal.learnerName} (Ctrl/Cmd + Enter to send)...`}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                    required
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] font-mono text-[9px] text-slate-200 border border-slate-700">Ctrl/Cmd + Enter</kbd> to send
                    </span>

                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={replyLoading || !replyText.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {replyLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending Response...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#0b0f19]">
              <div className="w-14 h-14 rounded-2xl bg-[#1e293b] border border-slate-700 flex items-center justify-center text-slate-400">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Email Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select an appeal email from the left inbox list to view the student's case explanation and send a reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioAppealsPage;
