import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  TrendingUp,
  Target,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Award,
  BookOpen,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  ArrowRight,
  GitBranch,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";

const AdvisorSidebar = ({
  profile,
  prompts = [],
  onPromptClick,
  loading,
  latestResponse,
}) => {
  const intel = generateCareerIntelligence(profile, latestResponse);
  const [openSection, setOpenSection] = useState("readiness"); // default expanded section

  const toggleSection = (section) => {
    setOpenSection((prev) => (prev === section ? "" : section));
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 bg-slate-900/90 border-r border-slate-800/80 text-slate-100 selection:bg-indigo-500/30 font-sans">
      {/* ─── 1. AI CAREER SUMMARY BANNER ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 p-4 shadow-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
              AI Career Intelligence
            </span>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Real Profile Verified
          </span>
        </div>

        <p className="text-xs font-medium text-slate-200 leading-relaxed">
          {intel.summary}
        </p>

        {/* User Quick Info Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 ring-1 ring-indigo-500/40">
              <AvatarImage src={profile?.profileImage} />
              <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-[10px]">
                {profile?.fullName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-bold text-white truncate max-w-[130px]">
              {profile?.fullName || "Skill Engine User"}
            </span>
          </div>

          <span className="text-[10px] font-bold text-slate-400">
            Vector: <span className="text-indigo-400">{intel.inferredGoal}</span>
          </span>
        </div>
      </motion.div>

      {/* ─── 2. NEXT BEST ACTION (ALERT CARD) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 shadow-lg"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 mb-1.5">
          <Zap size={13} />
          <span>Next Best Action</span>
        </div>
        <h4 className="text-xs font-bold text-white mb-1">
          {intel.nextBestAction.title}
        </h4>
        <p className="text-[11px] text-amber-300/90 font-medium leading-relaxed">
          {intel.nextBestAction.why}
        </p>
      </motion.div>

      {/* ─── 3. INDUSTRY READINESS METER ─── */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Industry Readiness
            </h3>
          </div>
          <span className="text-xs font-black text-emerald-400">
            {intel.readiness.overall.score}%
          </span>
        </div>

        {/* Overall Progress Bar */}
        <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intel.readiness.overall.score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500"
          />
        </div>

        {/* Breakdown Meters */}
        <div className="space-y-2.5 text-xs font-medium">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-300 font-semibold">Frontend Architecture</span>
              <span className="text-indigo-400 font-bold">{intel.readiness.frontend.score}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${intel.readiness.frontend.score}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-300 font-semibold">Backend & Database</span>
              <span className="text-purple-400 font-bold">{intel.readiness.backend.score}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${intel.readiness.backend.score}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-300 font-semibold">Full Stack Engineering</span>
              <span className="text-emerald-400 font-bold">{intel.readiness.fullstack.score}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${intel.readiness.fullstack.score}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. RANKED CAREER PATH RECOMMENDATIONS ─── */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-xl">
        <button
          onClick={() => toggleSection("careers")}
          className="w-full flex items-center justify-between text-left mb-2"
        >
          <div className="flex items-center gap-2">
            <Target size={14} className="text-indigo-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Ranked Career Directions
            </h3>
          </div>
          {openSection === "careers" ? (
            <ChevronDown size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-slate-400" />
          )}
        </button>

        {openSection === "careers" && (
          <div className="space-y-3 pt-2">
            {intel.careerDirections.map((path, idx) => (
              <div
                key={path.role}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-extrabold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {path.role}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {path.matchPercentage}% Match
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-2">
                  {path.whyFit}
                </p>

                {path.missingSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[9px] font-semibold text-slate-400">
                    <span className="text-slate-500">Missing:</span>
                    {path.missingSkills.map((s) => (
                      <span key={s} className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                        +{s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 5. SKILL GAP ANALYSIS ─── */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-xl">
        <button
          onClick={() => toggleSection("gaps")}
          className="w-full flex items-center justify-between text-left mb-2"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-amber-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Skill Gap Analysis
            </h3>
          </div>
          {openSection === "gaps" ? (
            <ChevronDown size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-slate-400" />
          )}
        </button>

        {openSection === "gaps" && (
          <div className="space-y-3 pt-2">
            {intel.missingGaps.map((gap) => (
              <div
                key={gap.skill}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{gap.skill}</span>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {gap.priority} Priority
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {gap.whyImportant}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-1">
                  <span>Est: {gap.time}</span>
                  <span>Level: {gap.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 6. PERSONALIZED LEARNING ROADMAP ─── */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-xl">
        <button
          onClick={() => toggleSection("roadmap")}
          className="w-full flex items-center justify-between text-left mb-2"
        >
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-purple-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Learning Roadmap
            </h3>
          </div>
          {openSection === "roadmap" ? (
            <ChevronDown size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-slate-400" />
          )}
        </button>

        {openSection === "roadmap" && (
          <div className="space-y-3 pt-2">
            {intel.roadmap.map((step, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 block mb-1">
                  {step.phase}
                </span>
                <p className="text-xs font-bold text-white mb-1">{step.focus}</p>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  <strong className="text-slate-300">Why now:</strong> {step.whyNow}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 7. STRENGTHS & WEAKNESSES ─── */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-xl">
        <button
          onClick={() => toggleSection("swot")}
          className="w-full flex items-center justify-between text-left mb-2"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Strengths & Areas to Grow
            </h3>
          </div>
          {openSection === "swot" ? (
            <ChevronDown size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-slate-400" />
          )}
        </button>

        {openSection === "swot" && (
          <div className="space-y-3 pt-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1.5">
                Technical Strengths
              </span>
              <ul className="space-y-1">
                {intel.strengths.map((st, i) => (
                  <li key={i} className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-1.5">
                Growth Areas
              </span>
              <ul className="space-y-1">
                {intel.weaknesses.map((wk, i) => (
                  <li key={i} className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                    <span>{wk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ─── 8. PORTFOLIO IMPROVEMENT SUGGESTIONS ─── */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-xl">
        <button
          onClick={() => toggleSection("portfolio")}
          className="w-full flex items-center justify-between text-left mb-2"
        >
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-sky-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Portfolio & Profile Upgrades
            </h3>
          </div>
          {openSection === "portfolio" ? (
            <ChevronDown size={14} className="text-slate-400" />
          ) : (
            <ChevronRight size={14} className="text-slate-400" />
          )}
        </button>

        {openSection === "portfolio" && (
          <div className="space-y-2.5 pt-2">
            {intel.portfolioSuggestions.map((ps, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="text-xs font-bold text-white block mb-0.5">{ps.area}</span>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-1">
                  {ps.suggestion}
                </p>
                <span className="text-[10px] font-semibold text-sky-400">Impact: {ps.impact}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorSidebar;
