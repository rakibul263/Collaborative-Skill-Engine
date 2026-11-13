import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  MessageSquare,
  X,
  Send,
  ArrowLeft,
  ExternalLink,
  Search,
  Check,
  CheckCheck,
  Loader2,
  Users,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";
import { playNotificationSound } from "@/lib/notificationSound";
import { LoadingSpinner, ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import ChatWallpaperBg from "@/components/shared/chat/ChatWallpaperBg";
import { CHAT_WALLPAPER_THEMES } from "@/components/shared/chat/chatThemes";

const formatMessageTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const FloatingChatWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isMessagePage = useMemo(
    () => location.pathname.startsWith("/message"),
    [location.pathname]
  );

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [peerTyping, setPeerTyping] = useState(null);
  const typingTimerRef = useRef(null);
  const peerTypingSafetyRef = useRef(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [wallpaperTheme, setWallpaperTheme] = useState(() => {
    try {
      return localStorage.getItem("cse_chat_wallpaper") || "emerald";
    } catch {
      return "emerald";
    }
  });

  const cycleWallpaper = () => {
    const keys = Object.keys(CHAT_WALLPAPER_THEMES);
    const nextKey = keys[(keys.indexOf(wallpaperTheme) + 1) % keys.length];
    setWallpaperTheme(nextKey);
    try {
      localStorage.setItem("cse_chat_wallpaper", nextKey);
    } catch {
      // ignore storage errors
    }
  };

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isPeerOnline = useCallback(
    (targetEmail) => {
      if (!targetEmail || !Array.isArray(onlineUsers)) return false;
      const clean = targetEmail.toLowerCase().trim();
      return onlineUsers.some((e) => String(e).toLowerCase().trim() === clean);
    },
    [onlineUsers]
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c._id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  // Fetch all conversations for the user
  const fetchConversations = useCallback(async () => {
    if (!user?.email) return;
    try {
      setLoadingList(true);
      const res = await apiClient.get(
        `/conversations?email=${encodeURIComponent(user.email)}`
      );
      const list = res.data || [];
      setConversations(list);
      const unread = list.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setNewMessageCount(unread);
    } catch (err) {
      // Graceful fallback without breaking UI
      console.warn("Could not load conversations:", err?.message);
    } finally {
      setLoadingList(false);
    }
  }, [user?.email]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(
    async (convId) => {
      if (!convId || !user?.email) return;
      try {
        setLoadingMessages(true);
        const res = await apiClient.get(
          `/conversations/${convId}/messages?requesterEmail=${encodeURIComponent(
            user.email
          )}`
        );
        setMessages(res.data || []);

        // Mark messages as seen
        apiClient
          .patch(`/conversations/${convId}/seen`, { viewerEmail: user.email })
          .catch(() => {});

        if (socketRef.current?.connected) {
          socketRef.current.emit("message:seen", {
            conversationId: convId,
            viewerEmail: user.email,
          });
        }
      } catch (err) {
        console.warn("Could not load messages:", err?.message);
      } finally {
        setLoadingMessages(false);
      }
    },
    [user?.email]
  );

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (activeConversationId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeConversationId]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);

      const socket = socketRef.current || getSocket();
      if (socket?.connected && user?.email) {
        socket.emit("conversation:join", {
          conversationId: activeConversationId,
          email: user.email,
        });
      }
    }
  }, [activeConversationId, fetchMessages, user?.email]);

  // Socket connection and real-time listeners
  useEffect(() => {
    if (!user?.email || isMessagePage) return;

    fetchConversations();

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    socket.emit("presence:join", { email: user.email });

    const onOnlineUsers = (emails) => {
      setOnlineUsers(emails || []);
    };
    socket.on("presence:online-users", onOnlineUsers);

    const onTyping = (data) => {
      if (data?.conversationId === activeConversationId && data?.userEmail !== user?.email) {
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

    const onConversationUpdated = () => {
      fetchConversations();
    };

    const onNewMessage = (newMsg) => {
      if (newMsg.conversationId === activeConversationId) {
        setMessages((prev) => {
          const newId = String(newMsg._id);
          if (prev.some((m) => String(m._id) === newId)) return prev;
          return [...prev, newMsg];
        });
        socket.emit("message:seen", {
          conversationId: activeConversationId,
          viewerEmail: user.email,
        });
        setPeerTyping(null);
      }
      if (newMsg.senderEmail !== user.email) {
        playNotificationSound("chime");
      }
      fetchConversations();
    };

    socket.on("conversation:updated", onConversationUpdated);
    socket.on("message:new", onNewMessage);

    return () => {
      socket.off("presence:online-users", onOnlineUsers);
      socket.off("conversation:typing", onTyping);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("message:new", onNewMessage);
    };
  }, [user?.email, isMessagePage, activeConversationId, fetchConversations]);

  const handleDraftChange = (e) => {
    const val = e.target.value;
    setDraft(val);

    if (!activeConversation || !user?.email) return;
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

  // Send message
  const handleSendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeConversation || sending || !user?.email) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    const socket = socketRef.current || getSocket();
    socket?.emit("conversation:typing", {
      conversationId: activeConversation._id,
      recipientEmail: activeConversation.peer?.email,
      isTyping: false,
      userEmail: user.email,
    });

    setSending(true);
    const payload = {
      conversationId: activeConversation._id,
      senderEmail: user.email,
      text,
    };

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("message:send", payload, (response) => {
          setSending(false);
          if (!response?.ok) {
            toast.error(response?.error || "Failed to send message.");
            return;
          }
          playNotificationSound("sent");
          setDraft("");
          setMessages((prev) => {
            if (!response?.message) return prev;
            const newId = String(response.message._id);
            if (prev.some((m) => String(m._id) === newId)) return prev;
            return [...prev, response.message];
          });
          fetchConversations();
        });
      } else {
        const res = await apiClient.post(
          `/conversations/${activeConversation._id}/messages`,
          payload
        );
        playNotificationSound("sent");
        setDraft("");
        if (res.data) {
          setMessages((prev) => {
            const newId = String(res.data._id);
            if (prev.some((m) => String(m._id) === newId)) return prev;
            return [...prev, res.data];
          });
        }
        fetchConversations();
        setSending(false);
      }
    } catch (err) {
      setSending(false);
      const errMsg =
        err?.response?.data?.message || err?.message || "Failed to send message.";
      toast.error(errMsg);
    }
  };

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.peer?.fullName?.toLowerCase().includes(q) ||
        c.peer?.email?.toLowerCase().includes(q) ||
        c.lastMessage?.text?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Deduplicated messages list to guarantee 0 duplicate renders
  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    return messages.filter((m) => {
      const id = String(m._id || `${m.senderEmail}-${m.createdAt}`);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    if (uniqueMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [uniqueMessages]);

  // If user is already on the dedicated message page, don't show the widget
  if (isMessagePage) return null;

  return (
    <aside
      aria-label="Quick Chat"
      className="fixed bottom-6 right-6 z-[70] flex flex-col items-end pointer-events-none select-none"
    >
      {/* ── Chat Window Popup ── */}
      {open && (
        <div className="pointer-events-auto select-auto mb-3 w-[340px] sm:w-[380px] h-[520px] max-h-[calc(100vh-120px)] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/40 flex flex-col overflow-hidden text-slate-100 transition-all animate-in fade-in zoom-in-95 duration-200">
          {!user ? (
            /* ── Guest State (Not Logged In) ── */
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Quick Chat
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">
                  Connect & Collaborate
                </h4>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-[260px]">
                  Sign in to send direct messages, chat with mentors, and share project updates in real-time.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/login");
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Sign In to Chat
                </button>
              </div>
            </div>
          ) : activeConversationId ? (
            /* ── Active Conversation View ── */
            <div className="flex-1 flex flex-col h-full min-h-0">
              {/* Active Conversation Header */}
              <div className="px-3.5 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(null)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="relative shrink-0">
                    {activeConversation?.peer?.profileImage ? (
                      <img
                        src={activeConversation.peer.profileImage}
                        alt={activeConversation.peer.fullName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-violet-700 flex items-center justify-center text-white font-bold text-xs ring-1 ring-slate-700">
                        {(
                          activeConversation?.peer?.fullName ||
                          activeConversation?.peer?.email ||
                          "U"
                        )[0].toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                        isPeerOnline(activeConversation?.peer?.email)
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-slate-500"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {activeConversation?.peer?.fullName ||
                        activeConversation?.peer?.email}
                    </h4>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                      {peerTyping ? (
                        <span className="text-cyan-400 font-bold flex items-center gap-1 animate-pulse">
                          <span>typing...</span>
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                          </span>
                        </span>
                      ) : isPeerOnline(activeConversation?.peer?.email) ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online Now
                        </span>
                      ) : (
                        "Offline"
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={cycleWallpaper}
                    className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                    title="Change Chat Art Wallpaper"
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                  {activeConversation?.peer?.email && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate(
                          `/message?peer=${encodeURIComponent(
                            activeConversation.peer.email
                          )}`
                        );
                      }}
                      className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 flex items-center justify-center transition-colors cursor-pointer"
                      title="Open full chat"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message List with WhatsApp-Style Artistic Doodle Wallpaper */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                <ChatWallpaperBg themeKey={wallpaperTheme} />

                <div className="relative z-10 h-full overflow-y-auto p-3 space-y-2.5">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center py-8">
                      <LoadingSpinner size="sm" showGlow={true} />
                    </div>
                  ) : uniqueMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-300">
                      <MessageSquare className="w-7 h-7 mb-1.5 text-emerald-400 opacity-80" />
                      <p className="text-xs font-semibold text-white">No messages yet</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Say hello to start the conversation! 👋
                      </p>
                    </div>
                  ) : (
                    uniqueMessages.map((msg, index) => {
                      const isMine = msg.senderEmail === user.email;
                      return (
                        <div
                          key={msg._id || index}
                          className={`flex flex-col ${
                            isMine ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`px-3 py-2 text-xs rounded-2xl max-w-[85%] break-words shadow-md ${
                              isMine
                                ? "bg-gradient-to-br from-emerald-600/95 via-teal-600/95 to-indigo-600/95 text-white rounded-br-xs border border-white/15"
                                : "bg-[#121c2a]/92 backdrop-blur-md text-slate-100 rounded-bl-xs border border-white/10"
                            }`}
                          >
                            {msg.imageData && (
                              <img
                                src={msg.imageData}
                                alt="attachment"
                                className="rounded-lg max-h-36 object-cover mb-1.5 border border-white/10"
                              />
                            )}
                            <p className="leading-relaxed whitespace-pre-wrap">
                              {msg.text}
                            </p>
                          </div>
                          <span className="text-[9px] text-slate-300/80 mt-0.5 px-1 flex items-center gap-1 drop-shadow">
                            {formatMessageTime(msg.createdAt)}
                            {isMine && (
                              <span>
                                {msg.seenAt ? (
                                  <CheckCheck className="w-2.5 h-2.5 text-sky-300 inline" />
                                ) : (
                                  <Check className="w-2.5 h-2.5 inline" />
                                )}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}

                  {/* Peer Typing Indicator Bubble */}
                  {peerTyping && (
                    <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-slate-900 border border-indigo-500/30 text-indigo-300 text-[11px] w-fit shadow-md my-1">
                      <span className="font-semibold text-white">
                        {peerTyping.userName || "User"}
                      </span>
                      <span className="text-slate-300">is typing</span>
                      <span className="flex items-center gap-1 ml-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input Footer */}
              <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={handleDraftChange}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 bg-slate-800/80 border border-slate-700/70 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="w-8 h-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer shrink-0"
                    title="Send"
                  >
                    {sending ? (
                      <ButtonSpinner size="xs" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* ── Conversation List View ── */
            <div className="flex-1 flex flex-col h-full min-h-0">
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Quick Chat
                    {unreadTotal > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {unreadTotal} new
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Direct messages & peers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-2.5 border-b border-slate-800/60 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 min-h-0">
                {loadingList ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="flex items-center gap-3 animate-pulse"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-slate-800 rounded w-1/2" />
                          <div className="h-2.5 bg-slate-800/60 rounded w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <Users className="w-8 h-8 mb-2 text-slate-600" />
                    <p className="text-xs font-semibold text-slate-300">
                      No conversations yet
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                      Connect with members in Network or Mentor Directory to start messaging!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate("/network");
                      }}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer"
                    >
                      Explore Network
                    </button>
                  </div>
                ) : (
                  filteredConversations.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setActiveConversationId(c._id)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800/60 transition-colors flex items-center gap-3 group cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        {c.peer?.profileImage ? (
                          <img
                            src={c.peer.profileImage}
                            alt={c.peer.fullName}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-700 to-violet-700 flex items-center justify-center text-white font-bold text-xs ring-1 ring-slate-700">
                            {(
                              c.peer?.fullName ||
                              c.peer?.email ||
                              "U"
                            )[0].toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                            isPeerOnline(c.peer?.email)
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-slate-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                            {c.peer?.fullName || c.peer?.email}
                          </h4>
                          <span className="text-[9px] text-slate-500 shrink-0">
                            {formatMessageTime(c.lastMessageAt || c.updatedAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {c.lastMessage?.text || "Started conversation"}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Floating Toggle Button ── */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            setNewMessageCount(0);
          }
        }}
        aria-label={open ? "Close quick chat" : "Open quick chat"}
        className="pointer-events-auto relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
      >
        {open ? (
          <X className="w-6 h-6 transition-transform duration-200 rotate-0 hover:rotate-90" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
        {!open && newMessageCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center ring-2 ring-slate-900 shadow-md">
            {newMessageCount > 99 ? "99+" : newMessageCount}
          </span>
        )}
      </button>
    </aside>
  );
};

export default FloatingChatWidget;
