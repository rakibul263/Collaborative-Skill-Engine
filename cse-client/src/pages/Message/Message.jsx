import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useLocation } from "react-router";
import useAuth from "@/hooks/useAuth";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MessageSquare,
  Clock,
  Check,
  CheckCheck,
  Edit2,
  Trash2,
  Image,
  X,
  Calendar,
  Search,
  ArrowLeft,
  Sparkles,
  User,
  Copy,
  Paperclip,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import ScheduleModal from "@/components/shared/schedule/ScheduleModal";
import ScheduleCard from "@/components/shared/schedule/ScheduleCard";
import ScheduleBanner from "@/components/shared/schedule/ScheduleBanner";
import VideoCallOverlay from "@/components/shared/video/VideoCallOverlay";

/* ─── Skeleton Component for Conversations List ─── */
const ConversationSkeleton = () => (
  <div className="space-y-2 p-3">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse"
      >
        <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-800 rounded-md w-3/4" />
          <div className="h-2.5 bg-slate-800/60 rounded-md w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Skeleton Component for Chat Messages ─── */
const MessageBubbleSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="flex justify-start">
      <div className="w-2/3 h-14 bg-slate-900/80 border border-slate-800/80 rounded-2xl animate-pulse" />
    </div>
    <div className="flex justify-end">
      <div className="w-1/2 h-12 bg-indigo-950/40 border border-indigo-900/40 rounded-2xl animate-pulse" />
    </div>
    <div className="flex justify-start">
      <div className="w-3/5 h-16 bg-slate-900/80 border border-slate-800/80 rounded-2xl animate-pulse" />
    </div>
  </div>
);

const Message = () => {
  const { user } = useAuth();
  const location = useLocation();
  const peerFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("peer");
  }, [location.search]);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [schedules, setSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeCall, setActiveCall] = useState(null);

  const socketRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeConversationRef = useRef(null);
  const serverOffsetRef = useRef(0);

  const activeSchedule = useMemo(
    () => schedules.find((s) => s.status === "pending" || s.status === "accepted") ?? null,
    [schedules]
  );

  useEffect(() => {
    apiClient
      .get(`/server-time`)
      .then((res) => {
        serverOffsetRef.current = Date.parse(res.data.serverTime) - Date.now();
      })
      .catch(() => {});
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await apiClient.get(`/conversations?email=${user.email}`);
      setConversations(res.data || []);
    } catch {
      setError("Failed to load conversation list.");
    } finally {
      setLoadingList(false);
    }
  }, [user?.email]);

  const openConversation = useCallback(
    async (peerEmail) => {
      if (!peerEmail || !user?.email) return;
      try {
        const res = await apiClient.post(`/conversations/open`, {
          requesterEmail: user.email,
          peerEmail,
        });
        const opened = res.data;
        setConversations((prev) => {
          const without = prev.filter((c) => c._id !== opened._id);
          return [opened, ...without];
        });
        setActiveConversation(opened);
        setMobileView("chat");
      } catch (_err) {
        setError(
          _err.response?.data?.message || "Unable to open conversation for messaging."
        );
      }
    },
    [user?.email]
  );

  const fetchConversationContent = useCallback(
    async (conversationId) => {
      if (!conversationId || !user?.email) return;
      try {
        setLoadingMessages(true);
        // Execute both requests concurrently with Promise.all to guarantee 0 race conditions
        const [messagesRes, schedulesRes] = await Promise.all([
          apiClient.get(
            `/conversations/${conversationId}/messages?requesterEmail=${user.email}`
          ),
          apiClient.get(
            `/conversations/${conversationId}/schedules?requesterEmail=${user.email}`
          ).catch(() => ({ data: [] })),
        ]);

        const rawMessages = messagesRes.data || [];
        const fetchedSchedules = schedulesRes.data || [];

        setSchedules(fetchedSchedules);

        const syntheticItems = fetchedSchedules.map((s) => ({
          _id: `schedule-${s._id}`,
          type: "schedule",
          schedule: s,
          createdAt: s.createdAt,
          conversationId: s.conversationId,
        }));

        const combined = [...rawMessages, ...syntheticItems].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        setMessages(combined);

        await apiClient.patch(`/conversations/${conversationId}/seen`, {
          viewerEmail: user.email,
        }).catch(() => {});
      } catch {
        setError("Failed to load conversation history.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [user?.email]
  );

  const onSelectConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    activeConversationRef.current = conversation;
    setMobileView("chat");
  }, []);

  const handleSendMessage = async () => {
    if (
      !activeConversation?._id ||
      !user?.email ||
      (!text.trim() && !imagePreview) ||
      sending
    )
      return;
    try {
      setSending(true);
      const payload = {
        conversationId: activeConversation._id,
        senderEmail: user.email,
        text,
        imageData: imagePreview,
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit("message:send", payload, (response) => {
          if (!response?.ok) {
            setError(response?.error || "Failed to send message.");
          } else {
            setMessages((prev) => {
              if (prev.some((m) => m._id === response.message._id)) return prev;
              return [...prev, response.message];
            });
            setConversations((prev) =>
              [...prev]
                .map((conversation) =>
                  conversation._id === activeConversationRef.current?._id
                    ? {
                        ...conversation,
                        lastMessage: {
                          text: response.message.text,
                          senderEmail: response.message.senderEmail,
                          createdAt: response.message.createdAt,
                        },
                        lastMessageAt: response.message.createdAt,
                      }
                    : conversation
                )
                .sort(
                  (a, b) =>
                    new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
                )
            );
            socketRef.current?.emit("message:seen", {
              conversationId: activeConversationRef.current?._id,
              viewerEmail: user.email,
            });
          }
        });
      } else {
        const res = await apiClient.post(
          `/conversations/${activeConversation._id}/messages`,
          payload
        );
        setMessages((prev) => [...prev, res.data]);
      }
      setText("");
      setImagePreview("");
      setError("");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (message) => {
    const result = await Swal.fire({
      title: "Edit Message",
      input: "text",
      inputValue: message.text || "",
      inputPlaceholder: "Update message text...",
      showCancelButton: true,
      background: "#090d16",
      color: "#fff",
      confirmButtonText: "Save Changes",
      confirmButtonColor: "#6366f1",
      inputValidator: (value) => {
        if (!value.trim() && !message.imageData) {
          return "Message cannot be empty.";
        }
        return null;
      },
    });
    if (!result.isConfirmed) return;
    const nextText = (result.value || "").trim();
    if (nextText === (message.text || "").trim()) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit(
        "message:edit",
        {
          messageId: message._id,
          editorEmail: user.email,
          text: nextText,
        },
        (response) => {
          if (!response?.ok) {
            setError(response?.error || "Failed to edit message.");
          }
        }
      );
      return;
    }

    try {
      await apiClient.patch(`/messages/${message._id}`, {
        editorEmail: user.email,
        text: nextText,
      });
    } catch {
      setError("Failed to edit message.");
    }
  };

  const handleDeleteMessage = async (message) => {
    const result = await Swal.fire({
      title: "Delete Message?",
      text: "This action cannot be undone.",
      icon: "warning",
      background: "#090d16",
      color: "#fff",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit(
        "message:delete",
        {
          messageId: message._id,
          requesterEmail: user.email,
        },
        (response) => {
          if (!response?.ok) {
            setError(response?.error || "Failed to delete message.");
          }
        }
      );
      return;
    }

    try {
      await apiClient.delete(
        `/messages/${message._id}?requesterEmail=${encodeURIComponent(user.email)}`
      );
    } catch {
      setError("Failed to delete message.");
    }
  };

  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleScheduleAccept = async (scheduleId) => {
    try {
      const res = await apiClient.patch(`/schedules/${scheduleId}`, {
        responderEmail: user.email,
        action: "accept",
      });
      const updated = res.data;
      if (updated?._id) {
        setSchedules((prev) =>
          prev.map((s) => (String(s._id) === String(updated._id) ? updated : s))
        );
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id) === `schedule-${updated._id}`
              ? { ...m, schedule: updated }
              : m
          )
        );
      }
    } catch {
      /* silent catch */
    }
  };

  const handleScheduleReject = async (scheduleId) => {
    try {
      const res = await apiClient.patch(`/schedules/${scheduleId}`, {
        responderEmail: user.email,
        action: "reject",
      });
      const updated = res.data;
      if (updated?._id) {
        setSchedules((prev) =>
          prev.map((s) => (String(s._id) === String(updated._id) ? updated : s))
        );
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id) === `schedule-${updated._id}`
              ? { ...m, schedule: updated }
              : m
          )
        );
      }
    } catch {
      /* silent catch */
    }
  };

  const handleCreateSchedule = async ({ title, startTime, durationMinutes }) => {
    if (!activeConversation?._id || !user?.email) {
      throw new Error("You must be logged in and have an active conversation to schedule a meeting.");
    }
    try {
      const res = await apiClient.post(
        `/conversations/${activeConversation._id}/schedules`,
        {
          schedulerEmail: user.email,
          title,
          startTime,
          durationMinutes: parseInt(durationMinutes, 10),
        }
      );
      const newSchedule = res.data;
      if (newSchedule?._id) {
        setSchedules((prev) => {
          if (prev.some((s) => String(s._id) === String(newSchedule._id))) return prev;
          return [...prev, newSchedule];
        });
        setMessages((prev) => {
          const syntheticId = `schedule-${newSchedule._id}`;
          if (prev.some((m) => String(m._id) === syntheticId)) return prev;
          const syntheticItem = {
            _id: syntheticId,
            type: "schedule",
            schedule: newSchedule,
            createdAt: newSchedule.createdAt,
            conversationId: newSchedule.conversationId,
          };
          return [...prev, syntheticItem].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        });
      }
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      if (err?.response?.status === 409) {
        throw new Error("A pending or accepted meeting already exists for this conversation. Wait for it to complete or be rejected first.");
      }
      if (err?.response?.status === 422) {
        throw new Error(serverMsg || "Invalid meeting details. Check the title, start time, and duration.");
      }
      if (err?.response?.status === 403) {
        throw new Error("You are not authorized to schedule a meeting in this conversation.");
      }
      if (err?.response?.status === 400) {
        throw new Error(serverMsg || "Invalid request. Please refresh and try again.");
      }
      if (!err?.response) {
        throw new Error("Network error. Check your connection and try again.");
      }
      throw new Error(serverMsg || "Failed to create meeting. Please try again.");
    }
  };

  const handleScheduleExpired = useCallback((scheduleId) => {
    setSchedules((prev) =>
      prev.map((s) => (s._id === scheduleId ? { ...s, status: "expired" } : s))
    );
    setMessages((prev) =>
      prev.map((m) =>
        m._id === `schedule-${scheduleId}`
          ? { ...m, schedule: { ...m.schedule, status: "expired" } }
          : m
      )
    );
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    fetchConversations();

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      socket.emit("presence:join", { email: user.email });
      fetchConversations();
    };
    socket.on("connect", onConnect);

    socket.on("presence:online-users", (emails) => {
      setOnlineUsers(emails || []);
    });

    const onConversationUpdated = () => {
      fetchConversations();
    };
    socket.on("conversation:updated", onConversationUpdated);

    const onNewMessage = (message) => {
      const currentConversationId = activeConversationRef.current?._id;
      if (message.conversationId === currentConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        socket.emit("message:seen", {
          conversationId: currentConversationId,
          viewerEmail: user.email,
        });
      }
      fetchConversations();
    };
    socket.on("message:new", onNewMessage);

    const onSeen = ({ conversationId, viewerEmail, seenAt }) => {
      if (conversationId !== activeConversationRef.current?._id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.receiverEmail === viewerEmail && !m.seenAt
            ? { ...m, seenAt, status: "seen" }
            : m
        )
      );
    };
    socket.on("message:seen", onSeen);

    const onEdited = (editedMessage) => {
      if (editedMessage.conversationId !== activeConversationRef.current?._id) {
        fetchConversations();
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m._id === editedMessage._id ? editedMessage : m))
      );
      fetchConversations();
    };
    socket.on("message:edited", onEdited);

    const onDeleted = ({ messageId, conversationId }) => {
      if (conversationId === activeConversationRef.current?._id) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
      fetchConversations();
    };
    socket.on("message:deleted", onDeleted);

    const onScheduleNew = (schedule) => {
      if (schedule.conversationId !== activeConversationRef.current?._id) return;
      setSchedules((prev) => {
        if (prev.some((s) => s._id === schedule._id)) return prev;
        return [...prev, schedule];
      });
      setMessages((prev) => {
        if (prev.some((m) => m._id === `schedule-${schedule._id}`)) return prev;
        const synthetic = {
          _id: `schedule-${schedule._id}`,
          type: "schedule",
          schedule,
          createdAt: schedule.createdAt,
          conversationId: schedule.conversationId,
        };
        return [...prev, synthetic].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
    };
    socket.on("schedule:new", onScheduleNew);

    const onScheduleUpdated = (updated) => {
      setSchedules((prev) =>
        prev.map((s) => (s._id === updated._id ? updated : s))
      );
      setMessages((prev) =>
        prev.map((m) =>
          m._id === `schedule-${updated._id}` ? { ...m, schedule: updated } : m
        )
      );
    };
    socket.on("schedule:updated", onScheduleUpdated);

    const onScheduleExpired = ({ scheduleId }) => {
      setSchedules((prev) =>
        prev.map((s) => (s._id === scheduleId ? { ...s, status: "expired" } : s))
      );
      setMessages((prev) =>
        prev.map((m) =>
          m._id === `schedule-${scheduleId}`
            ? { ...m, schedule: { ...m.schedule, status: "expired" } }
            : m
        )
      );
    };
    socket.on("schedule:expired", onScheduleExpired);

    const onRtcOffer = ({ from, offer, scheduleId }) => {
      if (activeCall) return;
      const currentActiveSchedule = schedules.find(
        (s) => s._id === scheduleId && s.status === "accepted"
      );
      if (currentActiveSchedule) {
        setActiveCall(currentActiveSchedule);
      }
    };
    socket.on("rtc:offer", onRtcOffer);

    return () => {
      socket.off("connect", onConnect);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("message:new", onNewMessage);
      socket.off("message:seen", onSeen);
      socket.off("message:edited", onEdited);
      socket.off("message:deleted", onDeleted);
      socket.off("schedule:new", onScheduleNew);
      socket.off("schedule:updated", onScheduleUpdated);
      socket.off("schedule:expired", onScheduleExpired);
      socket.off("rtc:offer", onRtcOffer);
    };
  }, [user?.email, fetchConversations]);

  useEffect(() => {
    if (!loadingList && peerFromQuery) {
      openConversation(peerFromQuery);
    }
  }, [peerFromQuery, loadingList, openConversation]);

  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      onSelectConversation(conversations[0]);
    }
  }, [conversations, activeConversation, onSelectConversation]);

  useEffect(() => {
    if (!activeConversation?._id || !user?.email) return;
    fetchConversationContent(activeConversation._id);
    socketRef.current?.emit("conversation:join", {
      conversationId: activeConversation._id,
      email: user.email,
    });
  }, [activeConversation?._id, user?.email, fetchConversationContent]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (isNearBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages]);

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("Image file size must be smaller than 1.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result?.toString() || "");
    reader.readAsDataURL(file);
  };

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const name = c.peer?.fullName || c.peer?.email || "";
      const lastMsg = c.lastMessage?.text || "";
      return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Background ambient spotlight glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto h-[86vh] grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 relative z-10">
        {/* ─── SIDEBAR: Conversation List ─── */}
        <aside
          className={`rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl flex flex-col overflow-hidden shadow-2xl transition-all ${
            mobileView === "chat" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-900/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-indigo-400" size={18} />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Messages Hub
                </h2>
              </div>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full">
                {conversations.length} Direct
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 bg-slate-900/60">
            {loadingList ? (
              <ConversationSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <MessageSquare size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  {searchQuery ? "No matching conversations" : "No conversations yet"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {searchQuery
                    ? "Try a different search keyword."
                    : "Connect with mentors to start 1-on-1 chatting."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isOnline = onlineUsers.includes(conversation.peer?.email);
                const isActive = activeConversation?._id === conversation._id;
                const peerName = conversation.peer?.fullName || "Skill Partner";

                return (
                  <button
                    key={conversation._id}
                    onClick={() => onSelectConversation(conversation)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-all ${
                      isActive
                        ? "bg-indigo-600/20 border-l-4 border-indigo-400 text-white"
                        : "hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    {/* Avatar Ring */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold text-sm">
                        {conversation.peer?.profileImage ? (
                          <img
                            src={conversation.peer.profileImage}
                            alt={peerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (peerName || "P")[0]
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                          isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                        }`}
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {peerName}
                        </h4>
                        {conversation.lastMessageAt && (
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {new Date(conversation.lastMessageAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 truncate mt-0.5 font-medium">
                        {conversation.lastMessage?.text || "No messages yet"}
                      </p>
                    </div>

                    {/* Unread Pill */}
                    {conversation.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 shadow-sm">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── CHAT PANEL: Active Chat Thread ─── */}
        <section
          className={`rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl flex flex-col overflow-hidden shadow-2xl transition-all ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* Header */}
              <header className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView("list")}
                    className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 border border-slate-700"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  {/* Active Peer Info */}
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold text-sm">
                      {activeConversation.peer?.profileImage ? (
                        <img
                          src={activeConversation.peer.profileImage}
                          alt={activeConversation.peer?.fullName || "Peer"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (activeConversation.peer?.fullName || "P")[0]
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                        onlineUsers.includes(activeConversation.peer?.email)
                          ? "bg-emerald-400"
                          : "bg-slate-500"
                      }`}
                    />
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      {activeConversation.peer?.fullName || activeConversation.peer?.email}
                    </h3>
                    <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                      {onlineUsers.includes(activeConversation.peer?.email) ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online Now
                        </span>
                      ) : (
                        "Offline"
                      )}
                    </span>
                  </div>
                </div>

                {/* Right Action Trigger Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    disabled={
                      !!activeSchedule &&
                      activeSchedule.status !== "rejected" &&
                      activeSchedule.status !== "expired"
                    }
                    title="Schedule 1-on-1 Meeting"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Calendar size={14} />
                    <span className="hidden sm:inline">Schedule Session</span>
                  </button>
                </div>
              </header>

              {/* Message List */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/50"
              >
                {loadingMessages ? (
                  <MessageBubbleSkeleton />
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Sparkles size={22} />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      Start your conversation
                    </h4>
                    <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                      Say hello to {activeConversation.peer?.fullName || "your partner"} and set up your collaborative skill session!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    if (message.type === "schedule") {
                      return (
                        <ScheduleCard
                          key={message._id}
                          schedule={message.schedule}
                          currentUserEmail={user?.email}
                          onAccept={handleScheduleAccept}
                          onReject={handleScheduleReject}
                        />
                      );
                    }
                    const mine = message.senderEmail === user?.email;
                    return (
                      <motion.div
                        key={message._id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div className="group relative max-w-[85%] sm:max-w-[75%]">
                          {/* Bubble Container */}
                          <div
                            className={`rounded-2xl p-3.5 shadow-md ${
                              mine
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs"
                                : "bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-bl-xs"
                            }`}
                          >
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                              {message.text}
                            </p>

                            {message.imageData && (
                              <img
                                src={message.imageData}
                                alt="shared content"
                                className="mt-2.5 rounded-xl max-h-64 w-full object-cover border border-white/10"
                              />
                            )}

                            {/* Meta & Status Bar */}
                            <div
                              className={`mt-2 text-[10px] flex items-center gap-1.5 ${
                                mine ? "text-indigo-200 justify-end" : "text-slate-400"
                              }`}
                            >
                              <Clock size={10} />
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>

                              {mine && (
                                <>
                                  {message.status === "seen" || message.seenAt ? (
                                    <CheckCheck size={13} className="text-sky-300" />
                                  ) : (
                                    <Check size={12} className="text-indigo-200" />
                                  )}
                                  {message.isEdited && (
                                    <span className="italic opacity-80">(edited)</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hover Action Bar */}
                          <div
                            className={`absolute top-2 ${
                              mine ? "-left-20" : "-right-20"
                            } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-lg`}
                          >
                            <button
                              onClick={() => handleCopyText(message.text)}
                              className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
                              title="Copy text"
                            >
                              <Copy size={12} />
                            </button>
                            {mine && (
                              <>
                                <button
                                  onClick={() => handleEditMessage(message)}
                                  className="p-1 text-slate-300 hover:text-indigo-400 rounded-lg hover:bg-slate-800"
                                  title="Edit message"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message)}
                                  className="p-1 text-slate-300 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                                  title="Delete message"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Schedule Banner if Active */}
              <ScheduleBanner
                schedule={activeSchedule?.status === "accepted" ? activeSchedule : null}
                serverOffset={serverOffsetRef.current}
                onJoin={() => setActiveCall(activeSchedule)}
                onScheduleExpired={() =>
                  activeSchedule && handleScheduleExpired(activeSchedule._id)
                }
              />

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/90">
                {error && (
                  <p className="text-xs text-rose-400 mb-2 font-medium">{error}</p>
                )}

                {imagePreview && (
                  <div className="mb-3 relative inline-block">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-16 w-16 rounded-xl object-cover border border-indigo-500/40"
                    />
                    <button
                      onClick={() => setImagePreview("")}
                      className="absolute -top-1.5 -right-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-full p-1 border border-slate-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelected}
                    className="hidden"
                  />
                  <button
                    onClick={handlePickImage}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                    title="Attach image"
                  >
                    <Image size={16} />
                  </button>

                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all font-medium"
                  />

                  <button
                    disabled={(!text.trim() && !imagePreview) || sending}
                    onClick={handleSendMessage}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {sending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Schedule Modal */}
              <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSubmit={handleCreateSchedule}
                serverOffset={serverOffsetRef.current}
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
              <MessageSquare size={36} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white">No active conversation selected</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Select a partner from the sidebar to open the chat history and start messaging.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Video Call Overlay Integration */}
      {activeCall && (
        <VideoCallOverlay
          schedule={activeCall}
          currentUserEmail={user?.email}
          peerEmail={activeConversation?.peer?.email}
          socket={socketRef.current}
          serverOffset={serverOffsetRef.current}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};

export default Message;
