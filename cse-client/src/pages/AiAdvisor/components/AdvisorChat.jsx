/* eslint-disable no-unused-vars */
import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Clock,
  Copy,
  Check,
  Zap,
  Target,
  Route,
  Lightbulb,
  ChevronRight,
  ArrowUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import aiLogo from "@/assets/ai_advisor_logo.png";
import { LoadingSpinner, ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import CodePlaygroundBlock from "./CodePlaygroundBlock";
import MarkdownContent from "./MarkdownContent";

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
    navigator.clipboard?.writeText(text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all text-xs flex items-center gap-1.5 shrink-0"
      title="Copy response"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      <span className="text-[11px] font-medium">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
};

const ThinkingDots = () => (
  <div className="flex items-center gap-2.5 py-2">
    <Sparkles size={15} className="text-indigo-400 animate-pulse" />
    <span className="text-xs text-slate-400 font-medium font-mono">
      Synthesizing personalized strategy...
    </span>
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-indigo-400"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  </div>
);

const STARTER_CARDS = [
  {
    icon: Target,
    title: "Career Direction",
    description: "Analyze which engineering roles best fit my verified skills.",
    prompt: "Perform a comprehensive career trajectory assessment based on my current verified skills.",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    icon: Zap,
    title: "Skill Gap Audit",
    description: "Find critical missing skills separating me from senior tiers.",
    prompt: "Perform a skill gap analysis on my profile and list top 3 missing skills with priority.",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Route,
    title: "90-Day Roadmap",
    description: "Design an actionable weekly milestone roadmap for mastery.",
    prompt: "Build an actionable 90-day learning roadmap to prepare me for modern software engineering.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: Lightbulb,
    title: "Portfolio Projects",
    description: "Suggest 3 production-grade projects tailored to my stack.",
    prompt: "Suggest 3 production-grade portfolio projects I should build to stand out in interviews.",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
];

const QUICK_CHIPS = [
  "🐞 Debug My Code",
  "What should I learn next?",
  "Audit my skill gaps",
  "DSA & LeetCode Roadmap",
  "Full-Stack Microservices",
  "AI & Deep Learning Roadmap",
  "Cybersecurity & Ethical Hacking",
  "System Design & Cloud Scaling",
  "Tech Interview Prep",
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

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = useMemo(() => {
    return userName ? userName.split(" ")[0] : "Engineer";
  }, [userName]);

  // Scroll inside message container only
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  // Focus input when ready
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
        if (inputRef.current) inputRef.current.style.height = "auto";
      }
    }
  };

  const handleTextareaChange = (e) => {
    onMessageChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleChipClick = (text) => {
    if (text.includes("Debug")) {
      const template = "Please analyze and debug this code error:\n\n```python\n# Paste your code here\ndef solution():\n    pass\n```\n\nError output or problem description:\n";
      onMessageChange(template);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus({ preventScroll: true });
          inputRef.current.style.height = "130px";
        }
      }, 50);
      return;
    }
    onMessageChange(text);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  };

  const handleCardClick = (prompt) => {
    onMessageChange(prompt);
    setTimeout(() => {
      onSubmit(prompt);
    }, 80);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#060913] text-slate-100 font-sans relative">
      {/* Subtle Ambient Center Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* ── 1. Scrollable Center Reading Thread ── */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 pt-6 pb-4"
      >
        <div className="max-w-3xl w-full mx-auto space-y-6">
          {/* Loading state */}
          {loadingHistory && (
            <div className="flex flex-col items-center justify-center py-28">
              <LoadingSpinner size="lg" label="Loading your AI Coach session..." />
            </div>
          )}

          {/* Claude-Inspired Empty Welcome State */}
          {!loadingHistory && history.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 sm:py-12 text-center space-y-8"
            >
              {/* Warm Glowing Logo Badge */}
              <div className="flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-2xl shadow-indigo-500/20">
                  <div className="w-full h-full bg-[#090d18] rounded-[14px] flex items-center justify-center">
                    <Sparkles size={26} className="text-indigo-400" />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  How can I help your career today?
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md font-medium leading-relaxed">
                  I am synchronized with your verified skills and career targets. Ask a question below or pick a diagnostic blueprint to begin.
                </p>
              </div>

              {/* 2x2 Clean Interactive Starter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {STARTER_CARDS.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCardClick(card.prompt)}
                      className="p-4 rounded-2xl bg-[#0e1320]/90 hover:bg-[#141a2b] border border-slate-800/80 hover:border-indigo-500/40 transition-all text-left group shadow-sm flex flex-col justify-between space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.color}`}>
                          <Icon size={15} />
                        </div>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-100 group-hover:text-white transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5">
                          {card.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Conversation Messages (Claude Focused Reading Format) */}
          <AnimatePresence initial={false}>
            {history.map((turn, index) => (
              <motion.div
                key={turn._id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* User Turn: Sleek Elevated Card */}
                <div className="flex items-start justify-end gap-3">
                  <div className="max-w-[85%] space-y-1">
                    <div className="rounded-2xl rounded-tr-sm bg-[#161c2e] border border-indigo-500/20 px-4 py-3 text-xs sm:text-[13.5px] font-medium leading-relaxed text-slate-100 shadow-sm">
                      {turn.userMessage}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pr-1 text-[10px] text-slate-500 font-mono">
                      <span>{formatTime(turn.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt={userName || "You"}
                        className="h-7 w-7 rounded-xl object-cover ring-1 ring-slate-700"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                        {firstName[0]}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Coach Turn: Clean Editorial Style */}
                <div className="flex items-start gap-3.5">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1.5px] shadow-md">
                    <img src={aiLogo} alt="AI" className="h-full w-full rounded-[10px] object-cover" />
                  </div>

                  {turn.pending && !turn.reply ? (
                    <div className="flex-1 pt-0.5">
                      <ThinkingDots />
                    </div>
                  ) : (
                    (turn.reply || turn.pending) && (
                      <div className="flex-1 min-w-0 space-y-3 group">
                        <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-5 sm:p-6 shadow-xl hover:border-indigo-500/30 transition-colors relative overflow-hidden">
                          {/* Ambient top right soft glow */}
                          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                          {/* Minimal Elegant Header Bar */}
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3.5 text-[11px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-[10px]">
                                <Sparkles size={11} className="text-indigo-400" />
                                AI Strategic Advisor
                              </span>
                              <span className="hidden sm:inline text-slate-500 text-[10px]">CSE Verified Engine</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{formatTime(turn.createdAt)}</span>
                          </div>

                          <MarkdownContent
                            content={turn.reply || ""}
                            onDebugWithAi={(prompt) => {
                              onMessageChange(prompt);
                              setTimeout(() => onSubmit(prompt), 60);
                            }}
                          />
                          {turn.streaming && (
                            <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 animate-pulse align-middle" />
                          )}
                        </div>

                        {/* Interactive Follow-up Actions & Action Toolbar */}
                        <div className="space-y-2 px-1">
                          {/* Contextual Action Chips (when reply is complete) */}
                          {!turn.streaming && !turn.pending && turn.reply && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {[
                                { label: "Give Code Example", prompt: "Can you provide a complete, runnable code example with edge-case handling for this?" },
                                { label: "Explain Simpler (ELI5)", prompt: "Can you explain this concept more simply with real-world analogies?" },
                                { label: "Edge Cases & Gotchas", prompt: "What are the common edge cases, production gotchas, and performance pitfalls?" },
                                { label: "Interview Question", prompt: "How would a top tech interviewer test this concept in a coding or system design round?" },
                              ].map((action, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    onMessageChange(action.prompt);
                                    setTimeout(() => onSubmit(action.prompt), 50);
                                  }}
                                  className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 transition-all font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{action.label} ↗</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Subtle Action Toolbar */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                              <Sparkles size={11} className="text-indigo-400" />
                              {turn.streaming ? "Streaming live response..." : "SkillEngine Strategic Output"}
                            </span>
                            {!turn.streaming && <CopyButton text={turn.reply} />}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 2. Claude Signature Floating Input Dock (Fixed at Bottom) ── */}
      <div className="shrink-0 px-4 sm:px-6 pb-3.5 pt-2 bg-gradient-to-t from-[#060913] via-[#060913]/95 to-transparent">
        <div className="max-w-3xl w-full mx-auto space-y-2">
          {/* Quick Suggestion Ticker */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={loading}
                onClick={() => handleChipClick(chip)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-[#0e1320] hover:bg-[#161d30] border border-slate-800/90 text-[10px] font-semibold text-slate-400 hover:text-slate-200 whitespace-nowrap transition-all disabled:opacity-40"
              >
                + {chip}
              </button>
            ))}
          </div>

          {/* Rounded Floating Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
              if (inputRef.current) inputRef.current.style.height = "auto";
            }}
            className="rounded-2xl border border-slate-700/70 bg-[#101627]/95 p-2 shadow-2xl transition-all focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Reply to AI Career Coach..."
              className="w-full min-h-[42px] max-h-[140px] resize-none bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-medium outline-none disabled:opacity-50 leading-relaxed"
            />

            {/* Bottom Toolbar inside Composer */}
            <div className="flex items-center justify-between pt-1.5 px-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-400/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Profile Context
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="hidden sm:inline text-slate-500">Enter to send</span>
              </div>

              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-35 disabled:shadow-none"
                title="Send message"
              >
                {loading ? <ButtonSpinner size="xs" /> : <ArrowUp size={15} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdvisorChat;
