import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import axios from "axios";
import { FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import useAuth from "@/hooks/useAuth";
import { getSocket } from "@/lib/socket";

const API_URL = import.meta.env.VITE_API_URL;

const FloatingChatWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMessagePage = useMemo(
    () => location.pathname.startsWith("/message"),
    [location.pathname],
  );
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [draft, setDraft] = useState("");
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c._id === activeConversationId) || null,
    [activeConversationId, conversations],
  );

  const fetchConversations = async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(`${API_URL}/conversations?email=${user.email}`);
      setConversations(res.data || []);
      const unread = (res.data || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setNewMessageCount(unread);
      if (!activeConversationId && res.data?.length) {
        setActiveConversationId(res.data[0]._id);
      }
    } catch (err) {
      setError("Failed to load chat widget.");
    }
  };

  const sendReply = async () => {
    if (!draft.trim() || !activeConversation || sending) return;
    try {
      setSending(true);
      setError("");
      const payload = {
        conversationId: activeConversation._id,
        senderEmail: user.email,
        text: draft,
      };
      if (socketRef.current?.connected) {
        socketRef.current.emit("message:send", payload, (response) => {
          if (!response?.ok) {
            setError(response?.error || "Send failed.");
            return;
          }
          setDraft("");
          fetchConversations();
        });
      } else {
        await axios.post(`${API_URL}/conversations/${activeConversation._id}/messages`, payload);
        setDraft("");
        fetchConversations();
      }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!user?.email || isMessagePage) return;
    fetchConversations();

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    socket.emit("presence:join", { email: user.email });

    const onUpdated = () => fetchConversations();
    const onNew = () => fetchConversations();
    socket.on("conversation:updated", onUpdated);
    socket.on("message:new", onNew);

    return () => {
      socket.off("conversation:updated", onUpdated);
      socket.off("message:new", onNew);
    };
  }, [user?.email, isMessagePage]);

  if (!user || isMessagePage) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <div className="w-[320px] sm:w-[360px] mb-4 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-black text-slate-900">Quick Chat</h4>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-800">
              <FiX />
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => setActiveConversationId(conversation._id)}
                  className={`w-full px-4 py-3 text-left border-b border-slate-100 ${
                    conversation._id === activeConversationId ? "bg-indigo-50" : "bg-white"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-800">{conversation.peer?.fullName || conversation.peer?.email}</p>
                  <p className="text-xs text-slate-500 truncate">{conversation.lastMessage?.text || "Start conversation"}</p>
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-slate-100">
            {error ? <p className="text-xs text-red-600 mb-2">{error}</p> : null}
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder="Reply..."
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                disabled={!draft.trim() || !activeConversation || sending}
                onClick={sendReply}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50"
              >
                <FiSend />
              </button>
            </div>
            {activeConversation && (
              <button
                onClick={() => navigate(`/message?peer=${encodeURIComponent(activeConversation.peer.email)}`)}
                className="mt-2 text-xs text-indigo-600 font-bold"
              >
                Open full chat
              </button>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setOpen((prev) => !prev);
          setNewMessageCount(0);
        }}
        className="relative w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition flex items-center justify-center"
      >
        <FiMessageCircle size={24} />
        {newMessageCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {newMessageCount > 99 ? "99+" : newMessageCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingChatWidget;
