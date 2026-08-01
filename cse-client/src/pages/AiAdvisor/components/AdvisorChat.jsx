import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Sparkles,
  Clock,
  User,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import aiLogo from "@/assets/ai_advisor_logo.png";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all text-xs flex items-center gap-1 shrink-0"
      title="Copy response"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
};

const MarkdownContent = ({ content }) => (
  <div className="prose prose-invert prose-sm max-w-none
    [&>p:first-child]:mt-0 [&>p:last-child]:mb-0
    [&_code]:rounded-md [&_code]:bg-slate-950 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-indigo-300
    [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:border [&_pre]:border-slate-800 [&_pre]:p-4 [&_pre]:text-xs [&_pre]:overflow-x-auto
    [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:text-slate-200
    [&_ul]:pl-5 [&_ol]:pl-5 [&_li::marker]:text-indigo-400
    [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-0
    [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-4
    [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-indigo-300
    [&_strong]:text-white [&_a]:text-indigo-400 [&_a]:underline
    [&_hr]:my-4 [&_hr]:border-slate-800">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);

const ThinkingDots = () => (
  <div className="flex items-center gap-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
    <span className="text-xs text-slate-400 font-medium mr-1">Thinking</span>
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-indigo-400"
        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.18, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const SUGGESTION_CHIPS = [
  "What should I learn next?",
  "Analyze my skill gaps",
  "Create a roadmap",
  "Portfolio project ideas",
];

const AdvisorChat = ({
  history,
  loading,
  loadingHistory,
  message,
  onMessageChange,
  onSubmit,
  userPhoto,
  userName,
}) => {
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll chat container (NOT window) on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  // Focus input when not loading
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && message.trim()) {
        onSubmit();
        // Reset textarea height
        if (inputRef.current) {
          inputRef.current.style.height = "auto";
        }
      }
    }
  };

  const handleTextareaChange = (e) => {
    onMessageChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleChipClick = (text) => {
    onMessageChange(text);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900/90 text-slate-100">
      {/* ── Sticky Header ────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 border-b border-slate-800/80 bg-slate-900/90 px-5 py-3.5">
        <div className="relative h-9 w-9 shrink-0">
          <img
            src={aiLogo}
            alt="AI Advisor"
            className="h-9 w-9 rounded-xl object-cover ring-2 ring-indigo-500/30 shadow-lg"
          />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">AI Career Coach</h2>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-400">
              Career Intelligence
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            Personalized guidance powered by your real skills & profile
          </p>
        </div>
        {history.length > 0 && (
          <span className="hidden sm:inline-block rounded-full bg-slate-950 border border-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400 shrink-0">
            {history.length} turn{history.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Scrollable Chat Thread ────────────────────────────────────────────── */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-4 py-5 sm:px-6 bg-slate-950/40 space-y-6"
      >
        {/* Loading history skeleton */}
        {loadingHistory && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-indigo-400" size={24} />
            <p className="text-xs font-semibold text-slate-400">Loading conversation history...</p>
          </div>
        )}

        {/* Empty state with suggestion chips */}
        {!loadingHistory && history.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="mb-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5 shadow-xl">
              <Sparkles size={32} className="text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Your AI Career Coach is ready
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6 font-medium">
              Ask anything about your career path, skill gaps, learning roadmap, or what to build next.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTION_CHIPS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleChipClick(prompt)}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-600/10 hover:text-white transition-all shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chat messages */}
        <AnimatePresence initial={false}>
          {history.map((turn, index) => (
            <motion.div
              key={turn._id || index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* User message bubble */}
              <div className="flex justify-end gap-3">
                <div className="max-w-[88%]">
                  <div className="rounded-2xl rounded-br-sm bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-xs sm:text-sm font-medium leading-relaxed text-white shadow-md">
                    {turn.userMessage}
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1.5 pr-1">
                    <Clock size={9} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500 font-medium">{formatTime(turn.createdAt)}</span>
                  </div>
                </div>
                <div className="mt-1 shrink-0">
                  {userPhoto ? (
                    <img src={userPhoto} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-indigo-500/30" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-indigo-400">
                      <User size={13} />
                    </div>
                  )}
                </div>
              </div>

              {/* AI response or thinking indicator */}
              <div className="flex gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-md">
                  <img src={aiLogo} alt="AI" className="h-full w-full object-cover" />
                </div>
                {turn.pending && loading ? (
                  <div className="flex items-center">
                    <ThinkingDots />
                  </div>
                ) : (
                  turn.reply && (
                    <div className="max-w-[88%] group flex items-start gap-2">
                      <div className="flex-1 rounded-2xl rounded-tl-sm border border-slate-800/90 bg-slate-900/90 p-4 sm:p-5 text-xs sm:text-sm leading-relaxed text-slate-100 shadow-xl backdrop-blur-xl">
                        <MarkdownContent content={turn.reply} />
                      </div>
                      <CopyButton text={turn.reply} />
                    </div>
                  )
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Sticky Input Bar ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/90 px-4 pb-4 pt-3 sm:px-5">
        {/* Quick suggestion chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-1 scrollbar-none">
          {SUGGESTION_CHIPS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => handleChipClick(prompt)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-400 hover:text-white hover:border-indigo-500/40 whitespace-nowrap transition-all disabled:opacity-40"
            >
              + {prompt}
            </button>
          ))}
        </div>

        {/* Input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
            if (inputRef.current) inputRef.current.style.height = "auto";
          }}
          className="flex items-end gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 shadow-xl transition-all focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/40"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask your AI Career Coach anything..."
            className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 font-medium outline-none disabled:opacity-50 leading-relaxed"
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? <Loader2 className="animate-spin" size={15} /> : <Send size={14} />}
          </button>
        </form>

        {/* Keyboard shortcuts hint */}
        <p className="mt-2 text-center text-[10px] font-medium text-slate-600">
          <kbd className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[9px] text-slate-500 font-mono">Enter</kbd> to send
          {" · "}
          <kbd className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[9px] text-slate-500 font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
};

export default AdvisorChat;
