/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  AlertCircle,
  PanelRightOpen,
  PanelRightClose,
  PanelLeftOpen,
  PanelLeftClose,
  MessageSquare,
  BarChart3,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Target,
  Route,
  Zap,
  Mic,
  FileDown,
} from "lucide-react";
import aiLogo from "@/assets/ai_advisor_logo.png";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router";
import { FullScreenLoader } from "@/components/shared/loading/LoadingSpinner";
import {
  postAdvisorMessage,
  streamAdvisorMessage,
  fetchAdvisorHistory,
  clearAdvisorHistory,
} from "@/lib/advisorApi";
import AdvisorChat from "./components/AdvisorChat";
import AdvisorInsights from "./components/AdvisorInsights";
import AdvisorSidebar from "./components/AdvisorSidebar";
import CareerStudioView from "./components/CareerStudioView";
import MockInterviewView from "./components/MockInterviewView";
import CareerReportModal from "./components/CareerReportModal";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const QUICK_PROMPTS = [
  "What should I learn next for my profile?",
  "Perform a skill gap analysis on my profile",
  "Build a 3-month career learning roadmap",
  "Suggest 3 portfolio projects to build",
];

const AiAdvisor = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [latestResponse, setLatestResponse] = useState(null);
  const [error, setError] = useState("");

  // Top Workspace Mode: "chat" (Claude Coach) | "studio" (Career Studio Dashboard)
  const [workspaceMode, setWorkspaceMode] = useState("chat");

  // Panel Toggles (Claude style collapsible drawers)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);

  // Responsive view toggle for small screens
  const [mobileChatView, setMobileChatView] = useState("chat");

  // Career & Skill Audit PDF Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Infer dynamic goal from user profile & skills
  const intel = generateCareerIntelligence(profile, latestResponse);
  const goal = intel.inferredGoal;

  const fetchProfile = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(
        `${API_URL}/users?email=${encodeURIComponent(user.email)}`
      );
      setProfile(res.data);
    } catch {
      setProfile(null);
    }
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const sessions = await fetchAdvisorHistory();
      setHistory(
        sessions.map((s) => ({
          _id: s._id,
          userMessage: s.userMessage,
          reply: s.reply,
          careerDirection: s.careerDirection,
          goal: s.goal,
          createdAt: s.createdAt,
        }))
      );
      const lastFull = sessions.at(-1);
      if (lastFull?.careerDirection) {
        setLatestResponse((prev) => prev || {
          reply: lastFull.reply,
          careerDirection: lastFull.careerDirection,
          skillGapAnalysis: lastFull.skillGapAnalysis,
          learningRoadmap: lastFull.learningRoadmap,
          suggestedProjects: lastFull.suggestedProjects,
          recommendedSkills: lastFull.recommendedSkills,
          prioritySteps: lastFull.prioritySteps,
          mentorSuggestions: lastFull.mentorSuggestions,
          courseSuggestions: lastFull.courseSuggestions || [],
        });
      }
    } catch (err) {
      setError(err.message);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
    loadHistory();
  }, [fetchProfile, loadHistory]);

  const sendMessage = async (text) => {
    const trimmed = (text || message).trim();
    if (!trimmed || loading) return;

    if (workspaceMode !== "chat") setWorkspaceMode("chat");
    setMobileChatView("chat");

    setLoading(true);
    setError("");
    setMessage("");

    const optimistic = {
      _id: `temp-${Date.now()}`,
      userMessage: trimmed,
      reply: "",
      pending: true,
      streaming: true,
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => [...prev, optimistic]);

    try {
      await streamAdvisorMessage(
        { goal, message: trimmed },
        (token) => {
          setHistory((prev) =>
            prev.map((turn) =>
              turn._id === optimistic._id
                ? {
                    ...turn,
                    reply: (turn.reply || "") + token,
                    pending: false,
                    streaming: true,
                  }
                : turn
            )
          );
        },
        (finalPayload) => {
          setLatestResponse(finalPayload);
          setHistory((prev) =>
            prev.map((turn) =>
              turn._id === optimistic._id
                ? {
                    _id: finalPayload.sessionId || turn._id,
                    userMessage: trimmed,
                    reply: finalPayload.reply || turn.reply,
                    careerDirection: finalPayload.careerDirection,
                    goal,
                    streaming: false,
                    pending: false,
                    createdAt: new Date().toISOString(),
                  }
                : turn
            )
          );
        }
      );
    } catch (streamErr) {
      console.warn("SSE stream failed, falling back to unary POST:", streamErr);
      try {
        const data = await postAdvisorMessage({ goal, message: trimmed });
        setLatestResponse(data);
        setHistory((prev) =>
          prev.map((turn) =>
            turn._id === optimistic._id
              ? {
                  _id: data.sessionId,
                  userMessage: trimmed,
                  reply: data.reply,
                  careerDirection: data.careerDirection,
                  goal,
                  streaming: false,
                  pending: false,
                  createdAt: new Date().toISOString(),
                }
              : turn
          )
        );
      } catch (err) {
        setHistory((prev) => prev.filter((t) => t._id !== optimistic._id));
        setError(err.message || "Failed to get AI advice. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetThread = async () => {
    const result = await showConfirm({
      variant: "reset",
      badge: "AI COACH // NEW SESSION",
      title: "Start New Coaching Session?",
      description:
        "This will clear your current conversation messages with the AI Coach so you can explore a fresh topic.",
      targetLabel: "Active Conversation Thread",
      targetValue: `${history.length} Message${history.length === 1 ? "" : "s"} in Thread`,
      notice:
        "Your verified skills, market readiness score, and career roadmap stay preserved.",
      confirmText: "Yes, Reset Chat",
      cancelText: "Keep Chat",
    });

    if (!result.isConfirmed) return;

    try {
      await clearAdvisorHistory();
      setHistory([]);
      toast.reset("New AI Session Started", {
        description: "Previous conversation thread cleared cleanly.",
        badge: "FRESH THREAD",
      });
    } catch {
      setHistory([]);
      toast.reset("Session Reset", {
        description: "Started a fresh AI Career Coach thread.",
      });
    }
  };

  if (authLoading) {
    return <FullScreenLoader message="Initializing AI Career Intelligence Studio..." />;
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* ── 1. Minimalist Claude-Style Top Bar (Height: 46px) ── */}
      <header className="h-[46px] shrink-0 border-b border-slate-800/80 bg-[#090d18]/95 px-3 sm:px-4 flex items-center justify-between gap-3 backdrop-blur-xl z-20">
        {/* Left: Sidebar Toggle + Brand Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden lg:flex items-center"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <img
                src={aiLogo}
                alt="AI Advisor"
                className="w-6 h-6 rounded-lg object-cover ring-1 ring-indigo-500/40"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-black text-white tracking-tight truncate">
                AI Career Coach
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Segmented Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800/90 shrink-0">
          <button
            type="button"
            onClick={() => setWorkspaceMode("chat")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              workspaceMode === "chat"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare size={12} />
            <span>Coach Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceMode("interview")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              workspaceMode === "interview"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mic size={12} className={workspaceMode === "interview" ? "text-emerald-200" : "text-emerald-400"} />
            <span className="hidden sm:inline">Mock Interview</span>
            <span className="sm:hidden">Interview</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
              LIVE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceMode("studio")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              workspaceMode === "studio"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 size={12} />
            <span className="hidden sm:inline">Career Studio</span>
            <span className="sm:hidden">Studio</span>
          </button>
        </div>

        {/* Right: Telemetry & Drawer Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Goal Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300">
            <Target size={11} className="text-indigo-400" />
            <span className="truncate max-w-[130px]">{goal}</span>
          </div>

          {/* Readiness Score */}
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
            <TrendingUp size={11} className="text-emerald-400" />
            <span>{intel.readiness.overall.score}% Ready</span>
          </div>

          {/* Download Career Roadmap PDF Report */}
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="Download Official Career Roadmap & Skill Audit (PDF)"
          >
            <FileDown size={12} className="text-emerald-200" />
            <span className="hidden lg:inline text-[11px]">Download Roadmap (PDF)</span>
            <span className="lg:hidden text-[11px]">PDF Report</span>
          </button>

          {/* Reset Session Button */}
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleResetThread}
              className="p-1 sm:px-2 sm:py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
              title="Start a new chat session"
            >
              <RotateCcw size={12} />
              <span className="hidden md:inline text-[11px]">New Session</span>
            </button>
          )}

          {/* Right Insights Drawer Toggle */}
          {workspaceMode === "chat" && (
            <button
              type="button"
              onClick={() => setInsightsOpen(!insightsOpen)}
              className={`p-1 sm:px-2.5 sm:py-0.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                insightsOpen
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title={insightsOpen ? "Hide insights drawer" : "Show insights drawer"}
            >
              {insightsOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
              <span className="hidden sm:inline text-[11px]">
                {insightsOpen ? "Hide Artifacts" : "Show Artifacts"}
              </span>
            </button>
          )}

          {/* Sync Skills */}
          <button
            onClick={() => {
              fetchProfile();
              loadHistory();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Sync profile skills"
          >
            <RefreshCw size={12} className={loadingHistory ? "animate-spin text-indigo-400" : ""} />
          </button>
        </div>
      </header>

      {/* ── Error Banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden shrink-0 bg-rose-950/80 border-b border-rose-500/30 px-4 py-1.5 text-xs font-semibold text-rose-300 flex items-center justify-between"
          >
            <span className="flex items-center gap-2 truncate">
              <AlertCircle size={14} className="text-rose-400 shrink-0" />
              <span className="truncate">{error}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setError("");
                loadHistory();
              }}
              className="text-[11px] underline hover:text-white shrink-0 ml-2"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Technical Mock Interview Mode ── */}
      {workspaceMode === "interview" && (
        <MockInterviewView profile={profile} />
      )}

      {/* ── 3. Full Dashboard Mode (Career Studio View) ── */}
      {workspaceMode === "studio" && (
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#060913] p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full">
            <CareerStudioView
              profile={profile}
              latestResponse={latestResponse}
              onPromptClick={(p) => {
                setWorkspaceMode("chat");
                sendMessage(p);
              }}
              onDownloadReport={() => setReportModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* ── 4. Coach Chat Mode: 3-Column Claude Architecture (100% Height Locked) ── */}
      {workspaceMode === "chat" && (
        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          {/* Left Column: Claude-Style Collapsible Sidebar */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 270, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:flex flex-col h-full border-r border-slate-800/80 bg-[#090d18]/95 overflow-hidden shrink-0 z-10"
              >
                <AdvisorSidebar
                  profile={profile}
                  prompts={QUICK_PROMPTS}
                  onPromptClick={(p) => sendMessage(p)}
                  loading={loading}
                  latestResponse={latestResponse}
                  onNewSession={handleResetThread}
                />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Center Column: Focused Reading Area with Claude Max-W Layout */}
          <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#060913]/95 relative">
            {/* Mobile View Toggle Bar */}
            <div className="lg:hidden shrink-0 p-2 border-b border-slate-800/80 bg-[#090d18]">
              <div className="flex gap-2 rounded-xl bg-slate-950 border border-slate-800 p-1">
                {[
                  { id: "chat", label: "Coach Conversation", icon: MessageSquare },
                  { id: "insights", label: "Career Vector & Artifacts", icon: BarChart3 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileChatView(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      mobileChatView === tab.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <tab.icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Body vs Mobile Drawer View */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div
                className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
                  mobileChatView === "chat" ? "flex" : "hidden lg:flex"
                }`}
              >
                <AdvisorChat
                  history={history}
                  loading={loading}
                  loadingHistory={loadingHistory}
                  message={message}
                  onMessageChange={setMessage}
                  onSubmit={(customText) => sendMessage(customText || message)}
                  onResetThread={handleResetThread}
                  userPhoto={profile?.profileImage || user.photoURL}
                  userName={profile?.fullName || user.displayName}
                />
              </div>

              {/* Mobile Insights View */}
              <div
                className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
                  mobileChatView === "insights" ? "flex" : "hidden"
                }`}
              >
                <AdvisorInsights
                  data={latestResponse}
                  profile={profile}
                  onAction={(p) => sendMessage(p)}
                  onDownloadReport={() => setReportModalOpen(true)}
                />
              </div>
            </div>
          </main>

          {/* Right Column: Claude Artifacts-Style Career Intelligence Drawer */}
          <AnimatePresence initial={false}>
            {insightsOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:flex flex-col h-full border-l border-slate-800/80 bg-[#090d18]/95 overflow-hidden shrink-0 z-10"
              >
                <AdvisorInsights
                  data={latestResponse}
                  profile={profile}
                  onAction={(p) => sendMessage(p)}
                  onDownloadReport={() => setReportModalOpen(true)}
                />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Career & Skill Audit PDF Report Modal ── */}
      <CareerReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        profile={profile}
        latestResponse={latestResponse}
      />
    </div>
  );
};

export default AiAdvisor;
