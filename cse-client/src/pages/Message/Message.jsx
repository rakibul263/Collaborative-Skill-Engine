import ChatWallpaperBg from "@/components/shared/chat/ChatWallpaperBg";
import { CHAT_WALLPAPER_THEMES } from "@/components/shared/chat/chatThemes";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import ScheduleBanner from "@/components/shared/schedule/ScheduleBanner";
import ScheduleCard from "@/components/shared/schedule/ScheduleCard";
import ScheduleModal from "@/components/shared/schedule/ScheduleModal";
import VideoCallOverlay from "@/components/shared/video/VideoCallOverlay";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { playNotificationSound } from "@/lib/notificationSound";
import { getSocket } from "@/lib/socket";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    Calendar,
    Check,
    CheckCheck,
    Clock,
    Copy,
    Edit2,
    Image,
    Loader2,
    MessageSquare,
    Palette,
    Search,
    Send,
    Sparkles,
    Trash2,
    Users,
    Video,
    X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

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

/* ─── Skeleton Component for Chat Messages (Active thread loading) ─── */
const MessageBubbleSkeleton = () => (
  <div className="space-y-4 p-2 sm:p-4 animate-pulse">
    <div className="flex justify-start items-end gap-2">
      <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 mb-1" />
      <div className="w-2/3 max-w-sm h-16 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-bl-xs p-3 space-y-2">
        <div className="h-3 bg-slate-700/60 rounded w-5/6" />
        <div className="h-2.5 bg-slate-700/40 rounded w-3/5" />
      </div>
    </div>
    <div className="flex justify-end">
      <div className="w-1/2 max-w-xs h-14 bg-gradient-to-br from-indigo-950/50 to-slate-900/90 border border-indigo-800/30 rounded-2xl rounded-br-xs p-3 space-y-2">
        <div className="h-3 bg-indigo-400/30 rounded w-4/5" />
        <div className="h-2.5 bg-indigo-400/20 rounded w-1/2" />
      </div>
    </div>
    <div className="flex justify-start items-end gap-2">
      <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 mb-1" />
      <div className="w-3/5 max-w-sm h-20 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-bl-xs p-3 space-y-2">
        <div className="h-3 bg-slate-700/60 rounded w-11/12" />
        <div className="h-3 bg-slate-700/50 rounded w-3/4" />
        <div className="h-2.5 bg-slate-700/30 rounded w-1/3" />
      </div>
    </div>
    <div className="flex justify-end">
      <div className="w-2/5 max-w-xs h-12 bg-gradient-to-br from-indigo-950/50 to-slate-900/90 border border-indigo-800/30 rounded-2xl rounded-br-xs p-3 space-y-2">
        <div className="h-3 bg-indigo-400/30 rounded w-3/4" />
      </div>
    </div>
  </div>
);

/* ─── Premium Skeleton for Entire Chat Workspace (Header + Message Bubbles + Input) ─── */
const ChatWorkspaceSkeleton = () => (
  <div className="flex flex-col h-full w-full bg-slate-900/40 relative overflow-hidden">
    {/* Ambient Glow */}
    <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/5 blur-3xl pointer-events-none" />

    {/* Header Skeleton */}
    <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0" />
        <div className="space-y-1.5">
          <div className="w-32 h-3.5 bg-slate-800 rounded-md" />
          <div className="w-16 h-2.5 bg-slate-800/60 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 h-7 rounded-xl bg-slate-800/70 border border-slate-700/40" />
      </div>
    </div>

    {/* Messages Body Skeleton */}
    <div className="flex-1 p-5 space-y-4 overflow-hidden relative">
      {/* Left Message Bubble 1 */}
      <div className="flex justify-start items-end gap-2 animate-pulse">
        <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 mb-1" />
        <div className="space-y-2 max-w-[65%] w-64 bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-bl-xs p-3.5">
          <div className="h-3 bg-slate-700/60 rounded w-5/6" />
          <div className="h-3 bg-slate-700/40 rounded w-3/5" />
          <div className="h-2 bg-slate-700/30 rounded w-12 mt-2" />
        </div>
      </div>

      {/* Right Message Bubble 1 */}
      <div className="flex justify-end animate-pulse">
        <div className="space-y-2 max-w-[65%] w-72 bg-gradient-to-br from-indigo-900/40 to-slate-800/60 border border-indigo-700/30 rounded-2xl rounded-br-xs p-3.5">
          <div className="h-3 bg-indigo-400/30 rounded w-11/12" />
          <div className="h-3 bg-indigo-400/20 rounded w-4/6" />
          <div className="flex justify-end gap-1 items-center mt-2">
            <div className="h-2 bg-indigo-400/30 rounded w-10" />
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400/40" />
          </div>
        </div>
      </div>

      {/* Left Message Bubble 2 */}
      <div className="flex justify-start items-end gap-2 animate-pulse">
        <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 mb-1" />
        <div className="space-y-2 max-w-[65%] w-52 bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-bl-xs p-3.5">
          <div className="h-3 bg-slate-700/60 rounded w-4/5" />
          <div className="h-2 bg-slate-700/30 rounded w-12 mt-2" />
        </div>
      </div>

      {/* Right Message Bubble 2 */}
      <div className="flex justify-end animate-pulse">
        <div className="space-y-2 max-w-[65%] w-80 bg-gradient-to-br from-indigo-900/40 to-slate-800/60 border border-indigo-700/30 rounded-2xl rounded-br-xs p-3.5">
          <div className="h-3 bg-indigo-400/30 rounded w-full" />
          <div className="h-3 bg-indigo-400/20 rounded w-3/4" />
          <div className="flex justify-end gap-1 items-center mt-2">
            <div className="h-2 bg-indigo-400/30 rounded w-10" />
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400/40" />
          </div>
        </div>
      </div>

      {/* Bottom Loading Indicator Badge */}
      <div className="flex justify-center pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[11px] font-medium backdrop-blur-sm">
          <Loader2 size={12} className="animate-spin text-indigo-400" />
          <span>Synchronizing chat messages...</span>
        </div>
      </div>
    </div>

    {/* Input Skeleton */}
    <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center gap-2 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 shrink-0" />
      <div className="flex-1 h-10 bg-slate-950/80 border border-slate-800 rounded-xl" />
      <div className="w-20 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 shrink-0" />
    </div>
  </div>
);

const Message = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { peerFromQuery, conversationIdFromQuery, scheduleFromQuery, topicFromQuery, autoJoinFromQuery } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      peerFromQuery: params.get("peer"),
      conversationIdFromQuery: params.get("conversationId"),
      scheduleFromQuery: params.get("schedule") === "true",
      topicFromQuery: params.get("topic") || "",
      autoJoinFromQuery: params.get("autoJoin") || "",
    };
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
  const [peerTyping, setPeerTyping] = useState(null);
  const typingTimerRef = useRef(null);
  const peerTypingSafetyRef = useRef(null);

  const [schedules, setSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const autoScheduleTriggeredRef = useRef(false);
  const autoJoinTriggeredRef = useRef("");

  useEffect(() => {
    if (activeConversation && scheduleFromQuery && !autoScheduleTriggeredRef.current) {
      autoScheduleTriggeredRef.current = true;
      setShowScheduleModal(true);
    }
  }, [activeConversation, scheduleFromQuery]);

  // Auto-open the scheduled call when clicking "Join Meeting" from a notification
  useEffect(() => {
    if (!autoJoinFromQuery || !activeConversation || schedules.length === 0) return;
    if (autoJoinTriggeredRef.current === autoJoinFromQuery) return;
    const match = schedules.find(
      (s) => String(s._id) === String(autoJoinFromQuery) && s.status === "accepted"
    );
    if (match) {
      autoJoinTriggeredRef.current = autoJoinFromQuery;
      setActiveCall(match);
    }
  }, [autoJoinFromQuery, activeConversation, schedules]);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingRtcOffer, setIncomingRtcOffer] = useState(null);
  const [activeCallPeerEmail, setActiveCallPeerEmail] = useState(null);
  const activeCallRef = useRef(null);
  const schedulesRef = useRef([]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);
  const [wallpaperTheme, setWallpaperTheme] = useState(() => {
    try {
      return localStorage.getItem("cse_chat_wallpaper") || "emerald";
    } catch {
      return "emerald";
    }
  });

  const isUserOnline = useCallback(
    (targetEmail) => {
      if (!targetEmail || !Array.isArray(onlineUsers)) return false;
      const clean = targetEmail.toLowerCase().trim();
      return onlineUsers.some((e) => String(e).toLowerCase().trim() === clean);
    },
    [onlineUsers]
  );

  const handleSelectWallpaper = (key) => {
    setWallpaperTheme(key);
    try {
      localStorage.setItem("cse_chat_wallpaper", key);
    } catch {
      // ignore storage quota errors
    }
  };

  const socketRef = useRef(null);
  const listRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeConversationRef = useRef(null);
  const serverOffsetRef = useRef(0);

  const scrollToBottom = useCallback((behavior = "auto") => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      } catch {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }
  }, []);

  const activeSchedule = useMemo(
    () => schedules.find((s) => s.status === "pending" || s.status === "accepted") ?? null,
    [schedules]
  );

  // Deduplicate messages by ID to prevent duplicate items in chat history
  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const msg of messages) {
      const id = String(msg._id);
      if (!seen.has(id)) {
        seen.add(id);
        result.push(msg);
      }
    }
    return result;
  }, [messages]);

  useEffect(() => {
    apiClient
      .get(`/server-time`)
      .then((res) => {
        serverOffsetRef.current = Date.parse(res.data.serverTime) - Date.now();
      })
      .catch(() => {});
  }, []);

  const convRetryTimerRef = useRef(null);
  const lastConvFetchAtRef = useRef(0);

  const fetchConversations = useCallback(async () => {
    if (!user?.email) return;
    lastConvFetchAtRef.current = Date.now();
    const emailKey = user.email.toLowerCase().trim();
    const cacheKey = `cse_convs_${emailKey}`;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations((prev) => (prev.length === 0 ? parsed : prev));
          setLoadingList(false);
        }
      }
    } catch {
      // ignore invalid session cache
    }

    const attemptLoad = async (attempt = 0) => {
      try {
        const res = await apiClient.get(`/conversations?email=${encodeURIComponent(user.email)}`, {
          timeout: 60000,
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setConversations(list);
        setError("");
        setLoadingList(false);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(list));
        } catch {
          // ignore storage limits
        }

        // Auto-select conversation smoothly without empty-state flashing
        if (conversationIdFromQuery) {
          const matched = list.find((c) => c._id === conversationIdFromQuery);
          if (matched) {
            setActiveConversation(matched);
            activeConversationRef.current = matched;
            return;
          }
        }
        if (!peerFromQuery && list.length > 0) {
          setActiveConversation((prev) => {
            if (prev) {
              const updated = list.find((c) => c._id === prev._id);
              if (!updated) {
                sessionStorage.removeItem("cse_chat_active_conv_id");
                const fallback = list[0] || null;
                activeConversationRef.current = fallback;
                return fallback;
              }
              return updated;
            }
            const savedId = sessionStorage.getItem("cse_chat_active_conv_id");
            const matched = list.find((c) => c._id === savedId);
            const chosen = matched || list[0];
            activeConversationRef.current = chosen;
            return chosen;
          });
        } else if (list.length === 0) {
          setActiveConversation(null);
          activeConversationRef.current = null;
          setMessages([]);
          sessionStorage.removeItem("cse_chat_active_conv_id");
        }
      } catch {
        if (attempt < 3) {
          if (convRetryTimerRef.current) clearTimeout(convRetryTimerRef.current);
          convRetryTimerRef.current = setTimeout(() => {
            attemptLoad(attempt + 1);
          }, 2500);
          return;
        }
        setError("Failed to load conversation list.");
        setLoadingList(false);
      }
    };

    await attemptLoad(0);
  }, [user?.email, peerFromQuery, conversationIdFromQuery]);

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
        activeConversationRef.current = opened;
        sessionStorage.setItem("cse_chat_active_conv_id", opened._id);
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
      const msgCacheKey = `cse_msgs_${conversationId}`;
      let hadCache = false;
      try {
        const cached = sessionStorage.getItem(msgCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.messages)) {
            setMessages(parsed.messages);
            if (Array.isArray(parsed.schedules)) setSchedules(parsed.schedules);
            setLoadingMessages(false);
            hadCache = true;
          }
        }
      } catch {
        // ignore invalid cache
      }

      try {
        if (!hadCache) setLoadingMessages(true);
        // Fetch latest 40 messages + schedules concurrently for crisp load speed
        const [messagesRes, schedulesRes] = await Promise.all([
          apiClient.get(
            `/conversations/${conversationId}/messages?requesterEmail=${encodeURIComponent(user.email)}&limit=40`,
            { timeout: 60000 }
          ),
          apiClient.get(
            `/conversations/${conversationId}/schedules?requesterEmail=${encodeURIComponent(user.email)}`,
            { timeout: 60000 }
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
        setError("");
        try {
          // Cache lightweight snapshot (skip oversized base64 blobs to fit quota)
          const lightMsgs = combined.map((m) =>
            m.imageData && m.imageData.length > 50000 ? { ...m, imageData: "" } : m
          );
          sessionStorage.setItem(
            msgCacheKey,
            JSON.stringify({ messages: lightMsgs.slice(-30), schedules: fetchedSchedules })
          );
        } catch {
          // ignore storage quota errors
        }

        // Mark seen non-blocking so message UI renders immediately
        apiClient.patch(`/conversations/${conversationId}/seen`, {
          viewerEmail: user.email,
        }).catch(() => {});
      } catch {
        if (!hadCache) setError("Failed to load conversation history.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [user?.email]
  );

  const onSelectConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    activeConversationRef.current = conversation;
    sessionStorage.setItem("cse_chat_active_conv_id", conversation._id);
    setPeerTyping(null);
    setMobileView("chat");
  }, []);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (!activeConversation?._id || !user?.email) return;
    const socket = socketRef.current || getSocket();
    if (!socket?.connected) return;

    socket.emit("conversation:typing", {
      conversationId: activeConversation._id,
      recipientEmail: activeConversation.peer?.email,
      isTyping: true,
      userEmail: user.email,
      userName: user.displayName || user.email.split("@")[0],
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("conversation:typing", {
        conversationId: activeConversation._id,
        recipientEmail: activeConversation.peer?.email,
        isTyping: false,
        userEmail: user.email,
        userName: user.displayName || user.email.split("@")[0],
      });
    }, 2500);
  };

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

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socketRef.current?.emit("conversation:typing", {
        conversationId: activeConversation._id,
        recipientEmail: activeConversation.peer?.email,
        isTyping: false,
        userEmail: user.email,
      });

      if (socketRef.current?.connected) {
        socketRef.current.emit("message:send", payload, (response) => {
          if (!response?.ok) {
            setError(response?.error || "Failed to send message.");
          } else {
            playNotificationSound("sent");
            setMessages((prev) => {
              if (prev.some((m) => String(m._id) === String(response.message._id))) return prev;
              return [...prev, response.message];
            });
            setTimeout(() => scrollToBottom("smooth"), 50);
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
        playNotificationSound("sent");
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(res.data._id))) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
      setText("");
      setImagePreview("");
      setError("");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (message) => {
    const result = await showConfirm({
      variant: "confirm",
      badge: "EDIT MESSAGE",
      title: "Update Message",
      description: "Modify the text of your sent message below.",
      input: {
        type: "text",
        label: "Message Content",
        defaultValue: message.text || "",
        placeholder: "Update message text...",
        validator: (value) => {
          if (!String(value || "").trim() && !message.imageData) {
            return "Message cannot be empty.";
          }
          return null;
        },
      },
      confirmText: "Save Changes",
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
          } else {
            toast.confirmed("Message Updated", { badge: "EDITED" });
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
      toast.confirmed("Message Updated", { badge: "EDITED" });
    } catch {
      setError("Failed to edit message.");
    }
  };

  const handleDeleteMessage = async (message) => {
    const result = await showConfirm({
      variant: "delete",
      badge: "DELETE MESSAGE",
      title: "Delete Message Permanently?",
      description: "This message will be permanently removed from this conversation for both participants.",
      notice: "This action cannot be undone.",
      confirmText: "Delete Message",
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
          } else {
            toast.deleted("Message Deleted", {
              description: "Message removed from chat history.",
            });
          }
        }
      );
      return;
    }

    try {
      await apiClient.delete(
        `/messages/${message._id}?requesterEmail=${encodeURIComponent(user.email)}`
      );
      toast.deleted("Message Deleted", {
        description: "Message removed from chat history.",
      });
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
      if (Date.now() - lastConvFetchAtRef.current > 5000) {
        fetchConversations();
      }
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
          if (prev.some((m) => String(m._id) === String(message._id))) return prev;
          return [...prev, message];
        });
        socket.emit("message:seen", {
          conversationId: currentConversationId,
          viewerEmail: user.email,
        });
        setPeerTyping(null);
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
      if (message.senderEmail !== user?.email) {
        playNotificationSound("chime");
      }
      fetchConversations();
    };
    socket.on("message:new", onNewMessage);

    const onTyping = (data) => {
      if (
        data?.conversationId === activeConversationRef.current?._id &&
        data?.userEmail !== user?.email
      ) {
        if (data.isTyping) {
          setPeerTyping(data);
          if (peerTypingSafetyRef.current) clearTimeout(peerTypingSafetyRef.current);
          peerTypingSafetyRef.current = setTimeout(() => {
            setPeerTyping(null);
          }, 4000);
        } else {
          setPeerTyping(null);
        }
      }
    };
    socket.on("conversation:typing", onTyping);

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

    const onConversationDeleted = ({ conversationId }) => {
      if (
        activeConversationRef.current?._id &&
        String(activeConversationRef.current._id) === String(conversationId)
      ) {
        setActiveConversation(null);
        activeConversationRef.current = null;
        setMessages([]);
        sessionStorage.removeItem("cse_chat_active_conv_id");
      }
      fetchConversations();
    };
    socket.on("conversation:deleted", onConversationDeleted);

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
      if (activeCallRef.current) return;

      // Group / Team Conversation: Allow instant video call anytime without schedule
      if (activeConversationRef.current?.isGroup) {
        setIncomingRtcOffer({ from, offer, scheduleId });
        setActiveCallPeerEmail(from || null);
        setActiveCall({
          _id: activeConversationRef.current._id,
          isInstantCall: true,
          startTime: new Date().toISOString(),
          durationMinutes: 120,
          title: activeConversationRef.current.groupName || "Team Video Meeting",
        });
        return;
      }

      // 1-on-1 Personal Chat: Require an accepted schedule (using live schedulesRef)
      const currentActiveSchedule = schedulesRef.current.find(
        (s) => String(s._id) === String(scheduleId) && s.status === "accepted"
      );
      if (currentActiveSchedule) {
        setIncomingRtcOffer({ from, offer, scheduleId });
        setActiveCallPeerEmail(from || null);
        setActiveCall(currentActiveSchedule);
      } else {
        console.warn("[WebRTC] Ignored call: 1-on-1 calls require an accepted schedule.");
      }
    };
    socket.on("rtc:offer", onRtcOffer);

    const onMeetingPeerJoined = ({ from, senderName, scheduleTitle }) => {
      if (activeCallRef.current) return;
      if (from && user?.email && from.toLowerCase() === user.email.toLowerCase()) return;
      toast.info(`${senderName || from || "Your partner"} joined "${scheduleTitle || "the meeting"}"!`, {
        duration: 6000,
      });
    };
    socket.on("meeting:peer-joined", onMeetingPeerJoined);

    return () => {
      socket.off("connect", onConnect);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("conversation:typing", onTyping);
      socket.off("message:new", onNewMessage);
      socket.off("message:seen", onSeen);
      socket.off("message:edited", onEdited);
      socket.off("message:deleted", onDeleted);
      socket.off("conversation:deleted", onConversationDeleted);
      socket.off("schedule:new", onScheduleNew);
      socket.off("schedule:updated", onScheduleUpdated);
      socket.off("schedule:expired", onScheduleExpired);
      socket.off("rtc:offer", onRtcOffer);
      socket.off("meeting:peer-joined", onMeetingPeerJoined);
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

  // Auto-scroll to bottom whenever active conversation opens or messages update
  useEffect(() => {
    if (!loadingMessages && uniqueMessages.length > 0) {
      scrollToBottom("auto");
      const t1 = setTimeout(() => scrollToBottom("auto"), 50);
      const t2 = setTimeout(() => scrollToBottom("auto"), 220);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [loadingMessages, activeConversation?._id, uniqueMessages.length, scrollToBottom]);

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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-transparent text-slate-100 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Background ambient spotlight glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-transparent blur-[120px] pointer-events-none" />

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
                const isOnline = isUserOnline(conversation.peer?.email);
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
                      <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-bold text-sm ${
                        conversation.isGroup
                          ? "bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-400/40 text-white shadow-md shadow-indigo-500/20"
                          : "bg-slate-800 border border-slate-700 text-indigo-300"
                      }`}>
                        {conversation.isGroup ? (
                          <Users size={18} />
                        ) : conversation.peer?.profileImage ? (
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
                          conversation.isGroup
                            ? "bg-indigo-400"
                            : isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                        }`}
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                          {conversation.isGroup && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider shrink-0 border border-indigo-500/30">
                              Squad
                            </span>
                          )}
                          <span className="truncate">{peerName}</span>
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
                    <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center font-bold text-sm ${
                      activeConversation.isGroup
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-400/40 text-white shadow-md shadow-indigo-500/20"
                        : "bg-slate-800 border border-slate-700 text-indigo-300"
                    }`}>
                      {activeConversation.isGroup ? (
                        <Users size={16} />
                      ) : activeConversation.peer?.profileImage ? (
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
                        activeConversation.isGroup
                          ? "bg-indigo-400"
                          : isUserOnline(activeConversation.peer?.email)
                          ? "bg-emerald-400"
                          : "bg-slate-500"
                      }`}
                    />
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                      <span className="truncate">
                        {activeConversation.groupName || activeConversation.peer?.fullName || activeConversation.peer?.email}
                      </span>
                      {activeConversation.isGroup && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider shrink-0 border border-indigo-500/30">
                          Project Team
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                      {activeConversation.isGroup ? (
                        <span className="text-indigo-300 flex items-center gap-1 font-semibold">
                          <Users size={11} />
                          <span>{activeConversation.participants?.length || 0} Team Members</span>
                        </span>
                      ) : peerTyping ? (
                        <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
                          <span>typing...</span>
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                          </span>
                        </span>
                      ) : isUserOnline(activeConversation.peer?.email) ? (
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
                  {/* GROUP / TEAM CONVERSATION: Instant Video Call (No schedule required) */}
                  {activeConversation.isGroup && (
                    <button
                      onClick={() => {
                        setActiveCall({
                          _id: activeConversation._id,
                          isInstantCall: true,
                          startTime: new Date().toISOString(),
                          durationMinutes: 120,
                          title: activeConversation.groupName || "Team Video Meeting",
                        });
                        toast.success("Live team video meeting room opened!");

                        // Broadcast notification to group conversation
                        socketRef.current?.emit("message:send", {
                          conversationId: activeConversation._id,
                          senderEmail: user.email,
                          receiverEmail: "group",
                          isGroup: true,
                          groupName: activeConversation.groupName,
                          text: `📹 ${user.fullName || user.name || user.email.split("@")[0]} started an instant team video meeting! Click 'Team Video Call' in the header to join.`,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition shadow-sm cursor-pointer"
                      title="Start Live Team Video Call (Instant group meeting without schedule)"
                    >
                      <Video size={14} className="text-emerald-400" />
                      <span className="hidden sm:inline">Team Video Call</span>
                    </button>
                  )}

                  {/* 1-ON-1 DIRECT CHAT: Video call ONLY if an accepted schedule exists */}
                  {!activeConversation.isGroup && activeSchedule?.status === "accepted" && (
                    <button
                      onClick={() => setActiveCall(activeSchedule)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition shadow-sm animate-pulse cursor-pointer"
                      title={`Join Scheduled Meeting: ${activeSchedule.title}`}
                    >
                      <Video size={14} className="text-emerald-400" />
                      <span className="hidden sm:inline">Join Scheduled Call</span>
                    </button>
                  )}

                  {/* Art Wallpaper Theme Picker */}
                  <div
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800"
                    title="Chat Art Wallpaper Theme"
                  >
                    <Palette size={13} className="text-slate-400 mr-0.5" />
                    {Object.values(CHAT_WALLPAPER_THEMES).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectWallpaper(t.id)}
                        aria-label={t.label}
                        title={t.label}
                        className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${t.dot} ${
                          wallpaperTheme === t.id
                            ? "ring-2 ring-white scale-110"
                            : "opacity-55 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>

                  {/* 1-ON-1 DIRECT CHAT: Schedule Session Button (Required for 1-on-1 calls) */}
                  {!activeConversation.isGroup && (
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      disabled={
                        !!activeSchedule &&
                        activeSchedule.status !== "rejected" &&
                        activeSchedule.status !== "expired"
                      }
                      title="Schedule 1-on-1 Meeting (Required for video calls)"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                    >
                      <Calendar size={14} />
                      <span className="hidden sm:inline">Schedule Session</span>
                    </button>
                  )}
                </div>
              </header>

              {/* Message List with Pinned Artistic WhatsApp-Style Doodle Wallpaper */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                <ChatWallpaperBg themeKey={wallpaperTheme} />

                <div
                  ref={listRef}
                  className="relative z-10 h-full overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar"
                >
                  {loadingMessages ? (
                    <MessageBubbleSkeleton />
                  ) : uniqueMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 backdrop-blur-md shadow-lg">
                        <Sparkles size={22} />
                      </div>
                      <h4 className="text-sm font-bold text-white drop-shadow">
                        Start your conversation
                      </h4>
                      <p className="text-xs text-slate-200/80 max-w-xs leading-relaxed">
                        Say hello to {activeConversation.peer?.fullName || "your partner"} and set up your collaborative skill session!
                      </p>
                    </div>
                  ) : (
                    uniqueMessages.map((message) => {
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
                              className={`rounded-2xl p-3.5 shadow-lg ${
                                mine
                                  ? "bg-gradient-to-br from-emerald-600/95 via-teal-600/95 to-indigo-600/95 text-white rounded-br-xs border border-white/15"
                                  : "bg-[#121c2a]/92 backdrop-blur-md border border-white/10 text-slate-100 rounded-bl-xs"
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
                                  mine ? "text-emerald-100/85 justify-end" : "text-slate-400"
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
                                      <Check size={12} className="text-emerald-100" />
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

                  {/* Realtime Peer Typing Bubble Indicator */}
                  <AnimatePresence>
                    {peerTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="flex items-center gap-2.5 p-2.5 px-3.5 rounded-2xl bg-slate-900 border border-indigo-500/40 text-indigo-300 text-xs w-fit shadow-lg shadow-indigo-950/40"
                      >
                        <div className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold text-white">
                          {(peerTyping.userName || "U")[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">
                          {peerTyping.userName || "User"}
                        </span>
                        <span className="text-slate-300">is typing</span>
                        <span className="flex items-center gap-1 ml-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Anchor element to guarantee scroll lands on the latest message */}
                  <div ref={messagesEndRef} className="h-2 w-full shrink-0" />
                </div>
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
                    onChange={handleTextChange}
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
                      <ButtonSpinner size="xs" />
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
                initialTitle={topicFromQuery}
              />
            </>
          ) : loadingList || peerFromQuery || conversations.length > 0 ? (
            <ChatWorkspaceSkeleton />
          ) : (
            <div className="relative flex-1 h-full overflow-hidden flex flex-col items-center justify-center p-8 text-center">
              <ChatWallpaperBg themeKey={wallpaperTheme} />
              <div className="relative z-10 flex flex-col items-center space-y-3 bg-slate-950/60 backdrop-blur-md border border-white/10 px-7 py-6 rounded-3xl shadow-2xl">
                <MessageSquare size={36} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">No conversations yet</h3>
                <p className="text-xs text-slate-300 max-w-xs">
                  Connect with a mentor or peer to start 1-on-1 chatting.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Video Call Overlay Integration */}
      {activeCall && (
        <VideoCallOverlay
          schedule={activeCall}
          currentUserEmail={user?.email}
          peerEmail={
            activeCallPeerEmail ||
            (activeConversation?.isGroup
              ? (() => {
                  const found = activeConversation.participants?.find((p) => {
                    const em = typeof p === "string" ? p : p?.email;
                    return em && em.toLowerCase() !== user?.email?.toLowerCase();
                  });
                  return (typeof found === "string" ? found : found?.email) || "group";
                })()
              : activeConversation?.peer?.email)
          }
          socket={getSocket()}
          peerProfile={activeConversation?.isGroup ? null : activeConversation?.peer}
          serverOffset={serverOffsetRef.current}
          initialOffer={incomingRtcOffer}
          onClose={() => {
            setActiveCall(null);
            setIncomingRtcOffer(null);
            setActiveCallPeerEmail(null);
          }}
        />
      )}
    </div>
  );
};

export default Message;
