import React, { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  AlertCircle,
  PanelRightOpen,
  PanelRightClose,
  MessageSquare,
  BarChart3,
  Sparkles,
} from "lucide-react";
import aiLogo from "@/assets/ai_advisor_logo.png";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import { Navigate } from "react-router";
import EngineLoadingComponent from "@/components/shared/loading/EngineLoadingComponent";
import {
  postAdvisorMessage,
  fetchAdvisorHistory,
} from "@/lib/advisorApi";
import AdvisorChat from "./components/AdvisorChat";
import AdvisorInsights from "./components/AdvisorInsights";
import AdvisorSidebar from "./components/AdvisorSidebar";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const QUICK_PROMPTS = [
  "What should I learn next for my profile?",
  "Perform a skill gap analysis on my profile",
  "Build a 3-month career learning roadmap",
  "Suggest 3 portfolio projects to build",
];

const AiAdvisor = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [latestResponse, setLatestResponse] = useState(null);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("chat");
  const [insightsOpen, setInsightsOpen] = useState(true);
  const insightsRef = useRef(null);

  // Infer dynamic goal from user profile & skills
  const intel = generateCareerIntelligence(profile, latestResponse);
  const goal = intel.inferredGoal;

  const fetchProfile = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(
        `${API_URL}/users?email=${encodeURIComponent(user.email)}`,
      );
      setProfile(res.data);
    } catch {
      setProfile(null);
    }
  }, [user?.email]);

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
        })),
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
    window.scrollTo(0, 0);
    fetchProfile();
    loadHistory();
  }, [fetchProfile, loadHistory]);

  const sendMessage = async (text) => {
    const trimmed = (text || message).trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setMessage("");
    setActiveView("chat");

    const optimistic = {
      _id: `temp-${Date.now()}`,
      userMessage: trimmed,
      reply: null,
      pending: true,
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => [...prev, optimistic]);

    try {
      const data = await postAdvisorMessage({ goal, message: trimmed });
      setLatestResponse(data);
      setHistory((prev) => {
        const rest = prev.filter((t) => t._id !== optimistic._id);
        return [
          ...rest,
          {
            _id: data.sessionId,
            userMessage: trimmed,
            reply: data.reply,
            careerDirection: data.careerDirection,
            goal,
            createdAt: new Date().toISOString(),
          },
        ];
      });
      setTimeout(() => setActiveView("insights"), 300);
    } catch (err) {
      setHistory((prev) => prev.filter((t) => t._id !== optimistic._id));
      setError(err.message || "Failed to get AI advice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <EngineLoadingComponent />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Ambient Spotlight Background Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-20 pb-6">
        {/* Top Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl shadow-xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={aiLogo}
                alt="AI Advisor"
                className="h-11 w-11 rounded-2xl object-cover ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/20"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 bg-emerald-400 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  AI Career Coach Workspace
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full">
                  AI Career Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {profile?.fullName
                  ? `Welcome back, ${profile.fullName.split(" ")[0]}`
                  : "Personalized AI Career Guidance"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Goal Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Goal: {goal}</span>
            </div>

            {/* Insights Panel Toggle */}
            <button
              type="button"
              onClick={() => setInsightsOpen(!insightsOpen)}
              className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
                insightsOpen
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
              title={insightsOpen ? "Hide insights panel" : "Show insights panel"}
            >
              {insightsOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              <span className="hidden sm:inline">
                {insightsOpen ? "Hide Insights" : "Show Insights"}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 backdrop-blur-xl shadow-lg">
                <span className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-400 shrink-0" />
                  {error}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    loadHistory();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/30"
                >
                  <RefreshCw size={13} /> Retry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile View Toggle Tabs */}
        <div className="mb-4 lg:hidden">
          <div className="flex gap-2 rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-md">
            {[
              { id: "chat", label: "Chat Conversation", icon: MessageSquare },
              { id: "insights", label: "Career Insights", icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  activeView === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main 3-Column AI Workspace Grid */}
        <div
          className="relative grid rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl shadow-2xl overflow-hidden"
          style={{
            height: "calc(100vh - 220px)",
            minHeight: "560px",
            gridTemplateColumns: insightsOpen
              ? "260px 1fr 340px"
              : "260px 1fr",
          }}
        >
          {/* Left Sidebar Panel */}
          <div className="hidden lg:flex flex-col h-full overflow-hidden border-r border-slate-800/80">
            <AdvisorSidebar
              profile={profile}
              prompts={QUICK_PROMPTS}
              onPromptClick={(p) => sendMessage(p)}
              loading={loading}
              latestResponse={latestResponse}
            />
          </div>

          {/* Center Chat Workspace */}
          <div
            className={`flex flex-col h-full overflow-hidden ${
              activeView === "chat" ? "flex" : "hidden lg:flex"
            }`}
          >
            <AdvisorChat
              history={history}
              loading={loading}
              loadingHistory={loadingHistory}
              message={message}
              onMessageChange={setMessage}
              onSubmit={() => sendMessage()}
              userPhoto={profile?.profileImage || user.photoURL}
              userName={profile?.fullName || user.displayName}
            />
          </div>

          {/* Right Insights Workspace Panel */}
          <AnimatePresence mode="wait">
            {insightsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col h-full overflow-hidden border-l border-slate-800/80 ${
                  activeView === "insights" ? "flex" : "hidden lg:flex"
                }`}
              >
                <AdvisorInsights data={latestResponse} profile={profile} loading={loading} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AiAdvisor;
