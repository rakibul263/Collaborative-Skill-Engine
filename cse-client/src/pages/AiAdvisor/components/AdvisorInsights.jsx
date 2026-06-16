import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  BookOpen,
  Route,
  Lightbulb,
  Users,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Zap,
} from "lucide-react";
import { NavLink } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";

const TABS = [
  { id: "direction", label: "Direction", icon: Target, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  { id: "gaps", label: "Gaps", icon: BookOpen, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "roadmap", label: "Plan", icon: Route, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "projects", label: "Build", icon: Lightbulb, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { id: "mentors", label: "Mentors", icon: Users, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
];

const priorityColor = (p) => {
  const map = {
    critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    high:     "bg-rose-500/10 text-rose-400 border-rose-500/20",
    medium:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return map[p?.toLowerCase()] || "bg-slate-800 text-slate-400 border-slate-700";
};

const TabButton = ({ tab, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all border ${
      isActive
        ? `${tab.bg} ${tab.color} shadow-md`
        : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
    }`}
  >
    <tab.icon size={13} />
    {tab.label}
  </button>
);

const SkillGapCard = ({ gap }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-indigo-500/40"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">{gap.skill}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityColor(gap.priority)}`}>
            {gap.priority}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400 font-medium">{gap.whyImportant || gap.reason}</p>
      </div>
      <div className="shrink-0">
        {["high", "critical"].includes(gap.priority?.toLowerCase()) ? (
          <AlertTriangle size={16} className="text-rose-400" />
        ) : gap.priority?.toLowerCase() === "medium" ? (
          <Clock size={16} className="text-amber-400" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-400" />
        )}
      </div>
    </div>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
      <motion.div
        initial={{ width: 0 }}
        animate={{
          width: ["high", "critical"].includes(gap.priority?.toLowerCase()) ? "85%" : gap.priority?.toLowerCase() === "medium" ? "50%" : "25%",
        }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className={`h-full rounded-full ${
          ["high", "critical"].includes(gap.priority?.toLowerCase())
            ? "bg-gradient-to-r from-rose-500 to-rose-400"
            : gap.priority?.toLowerCase() === "medium"
              ? "bg-gradient-to-r from-amber-500 to-amber-400"
              : "bg-gradient-to-r from-emerald-500 to-emerald-400"
        }`}
      />
    </div>
  </motion.div>
);

const RoadmapStep = ({ step, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="relative flex gap-4"
  >
    <div className="flex flex-col items-center">
      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-[10px] font-extrabold text-white shadow-md">
        {index + 1}
      </div>
      {index < 4 && <div className="mt-1 h-full w-px bg-gradient-to-b from-indigo-500/30 to-transparent" />}
    </div>
    <div className="mb-4 flex-1">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-indigo-500/40">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
            {step.phase}
          </span>
          <ArrowRight size={12} className="text-slate-500" />
        </div>
        <p className="mt-1 text-xs font-bold text-white">{step.focus}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400 font-medium">{step.action || step.whyNow}</p>
      </div>
    </div>
  </motion.div>
);

const ProjectCard = ({ project, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="group flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-purple-500/40"
  >
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 shadow-sm">
      {index + 1}
    </div>
    <div className="flex-1">
      <p className="text-xs font-medium leading-relaxed text-slate-200 group-hover:text-white">{project}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
        <Lightbulb size={11} className="text-amber-400" />
        <span>Portfolio Project Blueprint</span>
      </div>
    </div>
  </motion.div>
);

const MentorCard = ({ mentor }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-rose-500/40"
  >
    <Avatar className="h-10 w-10 shrink-0 ring-2 ring-rose-500/30">
      <AvatarImage src={mentor.profileImage} />
      <AvatarFallback className="bg-gradient-to-br from-rose-600 to-pink-600 font-bold text-white text-xs">
        {mentor.fullName?.[0] || "?"}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-bold text-white group-hover:text-rose-400 transition-colors">{mentor.fullName}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{mentor.reason}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${mentor.matchPercentage || 0}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
          />
        </div>
        <span className="shrink-0 text-[10px] font-bold text-rose-400">
          {mentor.matchPercentage || 0}%
        </span>
      </div>
    </div>
    <NavLink
      to="/experts"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/15 transition-all"
    >
      <ChevronRight size={14} />
    </NavLink>
  </motion.div>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-3 rounded-2xl bg-slate-950 border border-slate-800 p-3 shadow-md">
      <Icon size={24} className="text-slate-400" />
    </div>
    <p className="text-xs font-bold text-white">{title}</p>
    <p className="mt-1 text-[11px] text-slate-400 max-w-xs font-medium">{description}</p>
  </div>
);

const AdvisorInsights = ({ data, profile, loading }) => {
  const [tab, setTab] = useState("direction");

  // Fallback to calculated intelligence if backend data is not yet generated
  const computedData = data || generateCareerIntelligence(profile, null);

  if (loading && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-900/90 text-slate-100 p-6 text-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-3 w-3 rounded-full bg-indigo-500"
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
            />
          ))}
        </div>
        <p className="text-xs font-semibold text-slate-300">Analyzing career vector...</p>
        <p className="text-[10px] text-slate-500">Synthesizing skill matrices</p>
      </div>
    );
  }

  const activeData = computedData;
  const hasDirection = activeData?.careerDirection || activeData?.summary;
  const hasGaps = (activeData?.skillGapAnalysis || activeData?.missingGaps || []).length > 0;
  const hasRoadmap = (activeData?.learningRoadmap || activeData?.roadmap || []).length > 0;
  const hasProjects = (activeData?.suggestedProjects || activeData?.portfolioSuggestions || []).length > 0;
  const hasMentors = (activeData?.mentorSuggestions || []).length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900/90 text-slate-100 border-l border-slate-800/80">
      {/* Header Tabs Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/90 px-4 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-white">
            {tab === "direction" && "Career Vector & Direction"}
            {tab === "gaps" && "Identified Skill Gaps"}
            {tab === "roadmap" && "Learning Roadmap"}
            {tab === "projects" && "Portfolio Blueprints"}
            {tab === "mentors" && "Recommended Mentors"}
          </h2>
          {activeData?.mode && (
            <span className="rounded-full bg-slate-950 border border-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400">
              {activeData.mode}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((t) => (
            <TabButton
              key={t.id}
              tab={t}
              isActive={tab === t.id}
              onClick={() => setTab(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {tab === "direction" && (
              <>
                {!hasDirection ? (
                  <EmptyState icon={Target} title="No direction data yet" description="Ask the AI advisor about your target career direction." />
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 shadow-md"
                    >
                      <div className="mb-2.5 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                          <Target size={14} />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                          Target Vector
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
                        {activeData.careerDirection || activeData.summary}
                      </p>
                    </motion.div>

                    {(activeData.recommendedSkills || activeData.masteredSkills)?.length > 0 && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-md">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          <TrendingUp size={12} className="text-indigo-400" />
                          Recommended Core Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(activeData.recommendedSkills || activeData.masteredSkills).map((s) => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeData.prioritySteps?.length > 0 && (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 shadow-md">
                        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                          <Zap size={13} />
                          Priority Action Steps
                        </p>
                        <div className="space-y-3">
                          {activeData.prioritySteps.map((step, i) => (
                            <div key={i} className="flex gap-2.5">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold shadow-sm">
                                {i + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white">{step.step}</p>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                  <span className="rounded bg-slate-950 border border-amber-500/30 px-1.5 py-0.5 text-amber-400 font-bold">{step.timeframe}</span>
                                  <span>{step.why}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {tab === "gaps" && (
              <>
                {!hasGaps ? (
                  <EmptyState icon={BookOpen} title="No skill gaps identified" description="Ask the AI to perform a detailed skill gap analysis." />
                ) : (
                  <div className="space-y-3">
                    {(activeData.skillGapAnalysis || activeData.missingGaps || []).map((gap, i) => (
                      <SkillGapCard key={gap.skill || i} gap={gap} />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "roadmap" && (
              <>
                {!hasRoadmap ? (
                  <EmptyState icon={Route} title="No learning plan generated" description="Ask the AI to create a personalized learning roadmap." />
                ) : (
                  <div className="space-y-1">
                    {(activeData.learningRoadmap || activeData.roadmap || []).map((step, i) => (
                      <RoadmapStep key={step.phase || i} step={step} index={i} />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "projects" && (
              <>
                {!hasProjects ? (
                  <EmptyState icon={Lightbulb} title="No project blueprints" description="Ask the AI for portfolio project suggestions." />
                ) : (
                  <div className="space-y-3">
                    {(activeData.suggestedProjects || activeData.portfolioSuggestions || []).map((p, i) => (
                      <ProjectCard key={typeof p === "string" ? p : p.area} project={typeof p === "string" ? p : `${p.area}: ${p.suggestion}`} index={i} />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "mentors" && (
              <>
                {!hasMentors ? (
                  <EmptyState icon={Users} title="No mentor matches" description="Add learn skills to your profile to generate mentor matches." />
                ) : (
                  <div className="space-y-3">
                    {(activeData.mentorSuggestions || []).map((m) => (
                      <MentorCard key={m.email} mentor={m} />
                    ))}
                    <NavLink
                      to="/experts"
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 py-3 text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-all"
                    >
                      <span>Explore All Verified Experts</span>
                      <ChevronRight size={14} />
                    </NavLink>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdvisorInsights;
