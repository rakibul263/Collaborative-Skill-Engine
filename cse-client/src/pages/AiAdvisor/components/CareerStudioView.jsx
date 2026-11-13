/* eslint-disable no-unused-vars */
import React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Target,
  Zap,
  BookOpen,
  Route,
  Lightbulb,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Briefcase,
  Layers,
  ChevronRight,
  Award,
  DollarSign,
  GraduationCap,
  FileDown,
} from "lucide-react";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";

export const CareerStudioView = ({ profile, latestResponse, onPromptClick, onDownloadReport }) => {
  const intel = generateCareerIntelligence(profile, latestResponse);

  const currentSkills = intel?.currentSkills || intel?.masteredSkills || [];
  const missingGaps = intel?.missingGaps || [];
  const careerDirections = intel?.careerDirections || [];
  const roadmap = intel?.roadmap || [];
  const strengths = intel?.strengths || [];
  const weaknesses = intel?.weaknesses || [];
  const portfolioSuggestions = intel?.portfolioSuggestions || [];
  const readiness = intel?.readiness || {
    overall: { score: 0 },
    frontend: { score: 0 },
    backend: { score: 0 },
    fullstack: { score: 0 },
  };
  const nextBestAction = intel?.nextBestAction || {
    title: "System Design Foundations",
    why: "Strengthen high-level software engineering architecture.",
  };
  const inferredGoal = intel?.inferredGoal || "Full Stack Developer";
  const summary =
    intel?.summary ||
    "Continuous career intelligence assessment based on verified profile competencies.";

  return (
    <div className="space-y-6 pb-8 text-slate-100 font-sans">
      {/* ── 1. Top Executive KPI Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Readiness */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 backdrop-blur-xl relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Market Readiness
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {readiness.overall.score}%
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {readiness.overall.score >= 70 ? "High Competitive" : "Accelerating"}
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readiness.overall.score}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full"
            />
          </div>
        </motion.div>

        {/* KPI 2: Target Vector */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 backdrop-blur-xl relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Active Career Vector
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Target size={16} />
            </div>
          </div>
          <p className="text-xl font-black text-white truncate font-sans">
            {inferredGoal}
          </p>
          <p className="text-xs text-indigo-400/90 mt-1 font-medium">
            Personalized from {currentSkills.length} verified competencies
          </p>
        </motion.div>

        {/* KPI 3: Mastered Skills */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 backdrop-blur-xl relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Verified Skills
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Award size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {currentSkills.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              In Live Portfolio
            </span>
          </div>
          <p className="text-xs text-purple-400/90 mt-1 font-medium truncate">
            {currentSkills.slice(0, 3).join(", ") || "Skills in review"}
          </p>
        </motion.div>

        {/* KPI 4: Identified Gaps */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 backdrop-blur-xl relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              High-Impact Gaps
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">
              {missingGaps.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Prioritized Tools
            </span>
          </div>
          <p className="text-xs text-amber-300/80 mt-1 font-medium truncate">
            Next target: {missingGaps[0]?.skill || "System Design"}
          </p>
        </motion.div>
      </div>

      {/* ── 2. Next Best Action Spotlight Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-[#0d152b] to-purple-950/40 p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-bold tracking-wider uppercase">
            <Zap size={13} className="text-amber-400" />
            <span>Highest Leverage Career Action</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {nextBestAction.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            {nextBestAction.why}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              type="button"
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-slate-200 hover:text-white font-bold text-xs transition-all shadow-md group"
            >
              <FileDown size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Download Career Roadmap (PDF)</span>
            </button>
          )}

          <button
            onClick={() =>
              onPromptClick?.(
                `How should I implement the next step: "${nextBestAction.title}"? Give me a concrete 14-day study plan.`
              )
            }
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-95"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>Formulate Action Plan ↗</span>
          </button>
        </div>
      </motion.div>

      {/* ── 3. Main Bento Grid: Career Matches vs Readiness & Skill Gaps ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on desktop): Ranked Career Matches & Skill Gap Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Ranked Career Matches */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ranked Career Path Alignment
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Calculated by matching your tech stack against live industry job specifications
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              {careerDirections.map((dir, idx) => (
                <div
                  key={dir.role}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-mono font-black flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <h4 className="text-sm font-black text-white">{dir.role}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                        {dir.readiness} Readiness
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {dir.matchPercentage}% Fit
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${dir.matchPercentage}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                    />
                  </div>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {dir.whyFit}
                  </p>

                  {/* Supported & Missing Skills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {dir.supportedSkills?.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        {s}
                      </span>
                    ))}
                    {dir.missingSkills?.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          onPromptClick?.(
                            `Why is ${s} important for a ${dir.role}? How can I learn it effectively?`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:border-rose-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        +{s} (Missing)
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: High-Impact Skill Gaps */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Prioritized Skill Gap Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Critical technologies to acquire to achieve senior engineering parity
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {missingGaps.map((gap) => (
                <div
                  key={gap.skill}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-white">{gap.skill}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wide uppercase ${
                          gap.priority?.toLowerCase() === "high" || gap.priority?.toLowerCase() === "critical"
                            ? "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                            : "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                        }`}
                      >
                        {gap.priority} Priority
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {gap.whyImportant}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-slate-500" />
                      {gap.time}
                    </span>
                    <button
                      onClick={() =>
                        onPromptClick?.(`Create a step-by-step masterclass tutorial to learn ${gap.skill}.`)
                      }
                      className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors flex items-center gap-0.5"
                    >
                      <span>Learn Stack</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width on desktop): 90-Day Roadmap & Readiness Radar */}
        <div className="space-y-6">
          {/* Readiness by Domain */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Domain Readiness</h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Frontend Architecture</span>
                  <span className="text-indigo-400 font-mono">{readiness.frontend.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${readiness.frontend.score}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Backend & Distributed APIs</span>
                  <span className="text-purple-400 font-mono">{readiness.backend.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${readiness.backend.score}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Full Stack System Integration</span>
                  <span className="text-emerald-400 font-mono">{readiness.fullstack.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${readiness.fullstack.score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sequenced Roadmap Tree */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Route size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">90-Day Sequenced Roadmap</h3>
            </div>

            <div className="space-y-4 pt-1">
              {roadmap.map((step, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-indigo-500/30 pb-3 last:pb-0">
                  <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#0b101f] border-2 border-indigo-500 flex items-center justify-center text-[8px] font-bold text-indigo-300">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
                    {step.phase}
                  </span>
                  <h5 className="text-xs font-bold text-white mb-1">{step.focus}</h5>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    <strong className="text-slate-300">Outcome:</strong> {step.whyNow}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* SWOT Highlights Card */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Engineering SWOT</h3>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300">Executive Summary</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed italic bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                "{summary}"
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400 block mb-1">
                  Key Strengths
                </span>
                <ul className="space-y-1">
                  {strengths.slice(0, 2).map((st, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400 block mb-1">
                  Growth Opportunities
                </span>
                <ul className="space-y-1">
                  {weaknesses.slice(0, 2).map((wk, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{wk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Portfolio Recommendations Card */}
          {portfolioSuggestions?.length > 0 && (
            <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Lightbulb size={16} />
                </div>
                <h3 className="text-sm font-bold text-white">Portfolio Upgrades</h3>
              </div>

              <div className="space-y-2.5">
                {portfolioSuggestions.slice(0, 2).map((ps, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <span className="text-xs font-bold text-white block">{ps.area}</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{ps.suggestion}</p>
                    <span className="text-[10px] font-mono text-purple-400 font-bold block">Impact: {ps.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerStudioView;

