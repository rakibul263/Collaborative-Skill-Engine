/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Send,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Play,
  Briefcase,
  ChevronRight,
  Code2,
  Check,
  Star,
  Flame,
  ArrowRight,
  Shield,
  Layers,
  HelpCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodePlaygroundBlock from "./CodePlaygroundBlock";
import MarkdownContent from "./MarkdownContent";
import { streamInterviewTurn } from "@/lib/advisorApi";
import { toast } from "@/components/ui/toast-system";

const PRESET_ROLES = [
  {
    id: "backend",
    title: "Backend Systems Engineer",
    stack: "Node.js, Go, Microservices, Redis, Kafka",
    desc: "Concurrency, Event Loop, ACID, Distributed Transactions, Caching",
    icon: Layers,
    color: "from-blue-600 to-indigo-600 border-indigo-500/30 text-indigo-400",
  },
  {
    id: "fullstack",
    title: "Full-Stack Engineer",
    stack: "React 19, TypeScript, Node.js, WebSockets",
    desc: "SSR vs CSR, State Management, API Design, Security, Real-time",
    icon: Briefcase,
    color: "from-emerald-600 to-teal-600 border-emerald-500/30 text-emerald-400",
  },
  {
    id: "dsa",
    title: "DSA & Problem Solving",
    stack: "C++, Python, Dynamic Programming, Graphs",
    desc: "Asymptotic Analysis, Trees, Heaps, LeetCode Hard Patterns",
    icon: Code2,
    color: "from-purple-600 to-pink-600 border-purple-500/30 text-purple-400",
  },
  {
    id: "cloud",
    title: "DevOps & Cloud Systems Architect",
    stack: "Docker, Kubernetes, AWS, Terraform, CI/CD",
    desc: "Container Orchestration, Zero Downtime Deployments, Observability",
    icon: Flame,
    color: "from-amber-600 to-orange-600 border-amber-500/30 text-amber-400",
  },
  {
    id: "security",
    title: "Cybersecurity & Application Security",
    stack: "OWASP Top 10, Auth0/JWT, Cryptography",
    desc: "SQLi, XSS, SSRF, Identity & Access Management, Zero-Trust",
    icon: Shield,
    color: "from-rose-600 to-red-600 border-rose-500/30 text-rose-400",
  },
];

const DIFFICULTY_LEVELS = [
  { id: "Junior", label: "Junior", sub: "0–2 Years Exp" },
  { id: "Mid-Level", label: "Mid-Level", sub: "2–5 Years Exp" },
  { id: "Senior", label: "Senior / Lead", sub: "5+ Years Exp" },
];

const MockInterviewView = ({ profile }) => {
  const [selectedRole, setSelectedRole] = useState(PRESET_ROLES[0].title);
  const [selectedLevel, setSelectedLevel] = useState("Mid-Level");
  const [customRole, setCustomRole] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConcluded, setIsConcluded] = useState(false);
  const [scorecard, setScorecard] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const activeRoleName = customRole.trim() || selectedRole;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interviewHistory, loading]);

  const handleStartInterview = async () => {
    setIsActive(true);
    setIsConcluded(false);
    setScorecard(null);
    setInterviewHistory([]);
    setLoading(true);

    const initialInterviewerTurn = {
      role: "interviewer",
      text: "",
      streaming: true,
      createdAt: new Date().toISOString(),
    };
    setInterviewHistory([initialInterviewerTurn]);

    let accumulated = "";

    await streamInterviewTurn(
      {
        role: activeRoleName,
        level: selectedLevel,
        action: "start",
        interviewHistory: [],
        candidateAnswer: "",
      },
      (token) => {
        accumulated += token;
        setInterviewHistory([
          {
            role: "interviewer",
            text: accumulated,
            streaming: true,
            createdAt: initialInterviewerTurn.createdAt,
          },
        ]);
      },
      (done) => {
        setInterviewHistory([
          {
            role: "interviewer",
            text: done.reply || accumulated,
            streaming: false,
            createdAt: initialInterviewerTurn.createdAt,
          },
        ]);
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 100);
      },
      (err) => {
        toast.error(err.message || "Failed to start interview");
        setLoading(false);
        setIsActive(false);
      }
    );
  };

  const handleSendAnswer = async (e) => {
    e?.preventDefault();
    const answer = candidateAnswer.trim();
    if (!answer || loading) return;

    setCandidateAnswer("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const updatedHistory = [
      ...interviewHistory,
      {
        role: "candidate",
        text: answer,
        createdAt: new Date().toISOString(),
      },
    ];

    const newInterviewerTurn = {
      role: "interviewer",
      text: "",
      streaming: true,
      createdAt: new Date().toISOString(),
    };

    setInterviewHistory([...updatedHistory, newInterviewerTurn]);
    setLoading(true);

    let accumulated = "";

    await streamInterviewTurn(
      {
        role: activeRoleName,
        level: selectedLevel,
        action: "answer",
        interviewHistory: updatedHistory,
        candidateAnswer: answer,
      },
      (token) => {
        accumulated += token;
        setInterviewHistory([
          ...updatedHistory,
          {
            role: "interviewer",
            text: accumulated,
            streaming: true,
            createdAt: newInterviewerTurn.createdAt,
          },
        ]);
      },
      (done) => {
        setInterviewHistory([
          ...updatedHistory,
          {
            role: "interviewer",
            text: done.reply || accumulated,
            streaming: false,
            createdAt: newInterviewerTurn.createdAt,
          },
        ]);
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 100);
      },
      (err) => {
        toast.error(err.message || "Failed to submit answer");
        setLoading(false);
      }
    );
  };

  const handleConcludeInterview = async () => {
    if (loading || interviewHistory.length === 0) return;
    setLoading(true);

    const scorecardTurn = {
      role: "interviewer",
      text: "",
      isScorecard: true,
      streaming: true,
      createdAt: new Date().toISOString(),
    };

    setInterviewHistory((prev) => [...prev, scorecardTurn]);

    let accumulated = "";

    await streamInterviewTurn(
      {
        role: activeRoleName,
        level: selectedLevel,
        action: "conclude",
        interviewHistory,
        candidateAnswer: "Candidate requested conclusion and formal evaluation scorecard.",
      },
      (token) => {
        accumulated += token;
        setInterviewHistory((prev) =>
          prev.map((turn, i) =>
            i === prev.length - 1
              ? { ...turn, text: accumulated, streaming: true }
              : turn
          )
        );
      },
      (done) => {
        setInterviewHistory((prev) =>
          prev.map((turn, i) =>
            i === prev.length - 1
              ? { ...turn, text: done.reply || accumulated, streaming: false }
              : turn
          )
        );
        setIsConcluded(true);
        setScorecard(done.reply || accumulated);
        setLoading(false);
        toast.success("Interview completed! Scorecard generated.");
      },
      (err) => {
        toast.error(err.message || "Failed to generate scorecard");
        setLoading(false);
      }
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#060913] text-slate-100 font-sans">
      {/* ── 1. Top Sub-header Bar ── */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-800/80 bg-[#090d18] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white shadow-md">
            <Mic size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Technical Mock Interview
              </h2>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                FAANG / Tier-1 Standard
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Target: <span className="text-slate-200 font-semibold">{activeRoleName}</span> ({selectedLevel})
            </p>
          </div>
        </div>

        {isActive && (
          <div className="flex items-center gap-2">
            {!isConcluded && (
              <button
                type="button"
                disabled={loading}
                onClick={handleConcludeInterview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Finish interview and generate scorecard"
              >
                <Award size={13} />
                <span>Finish & Scorecard</span>
              </button>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => setIsActive(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition"
              title="Reset and pick new role"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">New Interview</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Setup Screen (When not in an active interview) ── */}
      {!isActive ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold">
              <Sparkles size={13} />
              <span>Simulate Real Technical Rounds</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Choose Your Target Technical Role
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Our AI Lead Interviewer evaluates your system architecture, algorithmic correctness, edge cases, and delivers an official Scorecard out of 10.
            </p>
          </div>

          {/* Preset Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {PRESET_ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.title && !customRole;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r.title);
                    setCustomRole("");
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    isSelected
                      ? "bg-[#10182b] border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg"
                      : "bg-[#0b101d] border-slate-800/90 hover:border-slate-700 hover:bg-[#0f1526]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${r.color}`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {r.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {r.desc}
                  </p>
                  <p className="text-[10px] font-mono text-indigo-400/90 mt-2 truncate">
                    Focus: {r.stack}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Experience Level Selector */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-300 block">
              Experience Level & Depth:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    selectedLevel === lvl.id
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold shadow-md"
                      : "bg-[#0b101d] border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold">{lvl.label}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">{lvl.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <div className="text-center pt-3 pb-6">
            <button
              type="button"
              onClick={handleStartInterview}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-rose-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Mic size={18} />
              <span>Start Technical Interview</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* ── 3. Active Interview Chat Area ── */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Interview Message Stream */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {interviewHistory.map((turn, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {turn.role === "candidate" ? (
                  /* Candidate Turn */
                  <div className="flex justify-end gap-3">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#161c2e] border border-indigo-500/20 px-4 py-3 text-xs sm:text-sm text-slate-100 shadow-md">
                      <p className="text-[10px] font-mono font-bold uppercase text-indigo-400 mb-1">
                        Candidate Answer:
                      </p>
                      <div className="whitespace-pre-wrap leading-relaxed">{turn.text}</div>
                    </div>
                  </div>
                ) : (
                  /* Interviewer Turn */
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shrink-0 shadow-md text-white mt-1">
                      <Mic size={15} />
                    </div>
                    <div className="flex-1 min-w-0 rounded-2xl border border-slate-800/90 bg-[#0b101d] p-4 sm:p-5 shadow-lg space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                          <Sparkles size={11} />
                          Lead Technical Interviewer ({selectedLevel})
                        </span>
                        {turn.streaming && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 animate-pulse font-mono">
                            <Clock size={10} className="animate-spin" />
                            Speaking...
                          </span>
                        )}
                      </div>

                      <MarkdownContent content={turn.text || ""} />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Candidate Floating Input Dock */}
          {!isConcluded ? (
            <div className="shrink-0 p-3 sm:p-4 border-t border-slate-800/80 bg-[#090d18]">
              <form onSubmit={handleSendAnswer} className="max-w-4xl mx-auto space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
                  <span>Type your architectural explanation or code solution:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateAnswer((prev) =>
                        prev + "\n```python\n# Write code here\n\n```\n"
                      );
                      textareaRef.current?.focus();
                    }}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px]"
                  >
                    <Code2 size={11} />
                    <span>Insert Code Block</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-700/80 bg-[#101627] p-2 focus-within:border-indigo-500/60 shadow-xl flex gap-2">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={candidateAnswer}
                    onChange={(e) => setCandidateAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSendAnswer();
                      }
                    }}
                    disabled={loading}
                    placeholder="Explain your approach, system trade-offs, or algorithm (Press Ctrl+Enter to send)..."
                    className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none resize-y min-h-[44px] max-h-48"
                  />
                  <div className="flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={loading || !candidateAnswer.trim()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <Clock size={13} className="animate-spin" />
                      ) : (
                        <>
                          <span>Answer</span>
                          <Send size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="shrink-0 p-4 border-t border-slate-800/80 bg-[#090d18] text-center">
              <button
                type="button"
                onClick={handleStartInterview}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:scale-105 transition"
              >
                <RotateCcw size={13} />
                <span>Start New Mock Interview Round</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MockInterviewView;

