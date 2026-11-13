/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Target,
  Zap,
  ChevronRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";

const CATEGORIZED_PROMPTS = [
  {
    category: "Career Strategy",
    icon: Target,
    items: [
      "What roles fit my profile best?",
      "How close am I to a Senior title?",
      "Compare Frontend vs Full Stack for me",
    ],
  },
  {
    category: "Skill Gap Audits",
    icon: Zap,
    items: [
      "What are my top 3 missing skills?",
      "Why is TypeScript essential for my stack?",
      "How to transition from React to Next.js?",
    ],
  },
  {
    category: "Roadmap & Projects",
    icon: Layers,
    items: [
      "Build a 90-day learning roadmap",
      "Suggest 3 production portfolio projects",
      "How to prepare for system design?",
    ],
  },
];

const AdvisorSidebar = ({
  profile,
  onPromptClick,
  loading,
  latestResponse,
  onNewSession,
}) => {
  const intel = generateCareerIntelligence(profile, latestResponse);
  const currentSkills = intel?.currentSkills || intel?.masteredSkills || [];
  const missingGaps = intel?.missingGaps || [];
  const strengths = intel?.strengths || [];
  const weaknesses = intel?.weaknesses || [];
  const readiness = intel?.readiness || {
    overall: { score: 0 },
    frontend: { score: 0 },
    backend: { score: 0 },
    fullstack: { score: 0 },
  };
  const nextBestAction = intel?.nextBestAction || { title: "Explore Skills" };

  const [activeTab, setActiveTab] = useState("prompts"); // "prompts" | "skills" | "swot"

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#090d18] text-slate-100 font-sans">
      {/* ── 1. Clean Top New Session Action ── */}
      {onNewSession && (
        <div className="p-3 border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={onNewSession}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all shadow-xs"
          >
            <span className="flex items-center gap-2">
              <Plus size={14} className="text-indigo-400" />
              <span>New Session</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.2 rounded">
              Clean
            </span>
          </button>
        </div>
      )}

      {/* ── 2. Compact Readiness Meter ── */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-[#060913]/60 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
              Market Readiness
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {readiness.overall.score}%
          </span>
        </div>

        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${readiness.overall.score}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full"
          />
        </div>

        <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
          <div className="bg-slate-900/70 py-1 rounded-lg border border-slate-800/60">
            <div className="text-[9px] font-semibold text-slate-500 uppercase">FE</div>
            <div className="text-[10px] font-mono font-bold text-indigo-400">{readiness.frontend.score}%</div>
          </div>
          <div className="bg-slate-900/70 py-1 rounded-lg border border-slate-800/60">
            <div className="text-[9px] font-semibold text-slate-500 uppercase">BE</div>
            <div className="text-[10px] font-mono font-bold text-purple-400">{readiness.backend.score}%</div>
          </div>
          <div className="bg-slate-900/70 py-1 rounded-lg border border-slate-800/60">
            <div className="text-[9px] font-semibold text-slate-500 uppercase">FS</div>
            <div className="text-[10px] font-mono font-bold text-emerald-400">{readiness.fullstack.score}%</div>
          </div>
        </div>
      </div>

      {/* ── 3. Clean 3-Segment Navigation Tabs ── */}
      <div className="px-3 pt-2.5 flex gap-1 border-b border-slate-800/80 shrink-0">
        {[
          { id: "prompts", label: "Prompts" },
          { id: "skills", label: "Skills" },
          { id: "swot", label: "SWOT" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 pb-2 text-[11px] font-bold transition-all border-b-2 text-center ${
              activeTab === tab.id
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 4. Scrollable Content Area (Only this region scrolls internally) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
        {activeTab === "prompts" && (
          <div className="space-y-4">
            {CATEGORIZED_PROMPTS.map((group, idx) => {
              const Icon = group.icon;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
                    <Icon size={11} className="text-indigo-400" />
                    <span>{group.category}</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        disabled={loading}
                        onClick={() => onPromptClick?.(item)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-[#0e1320]/70 hover:bg-[#161d30] border border-slate-800/70 hover:border-indigo-500/40 text-xs font-medium text-slate-300 hover:text-white transition-all group flex items-center justify-between disabled:opacity-50"
                      >
                        <span className="truncate pr-2">{item}</span>
                        <ChevronRight size={11} className="text-slate-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-2 px-1">
                Verified Mastered ({currentSkills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold flex items-center gap-1"
                  >
                    <CheckCircle2 size={10} className="text-emerald-400" />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-2 px-1">
                Top Missing Gaps ({missingGaps.length})
              </span>
              <div className="space-y-1.5">
                {missingGaps.slice(0, 4).map((gap) => (
                  <button
                    key={gap.skill}
                    onClick={() =>
                      onPromptClick?.(`How do I master ${gap.skill} in ${gap.time}? Give me a study plan.`)
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-[#0e1320]/70 hover:bg-[#161d30] border border-slate-800/70 hover:border-amber-500/40 text-xs transition-all group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-white text-[11px] group-hover:text-amber-300 transition-colors">
                        {gap.skill}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {gap.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {gap.whyImportant}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "swot" && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-2 px-1">
                Core Strengths
              </span>
              <div className="space-y-1.5">
                {strengths.map((st, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-[#0e1320]/70 border border-slate-800/70 text-xs text-slate-300 flex items-start gap-2">
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium leading-relaxed">{st}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-2 px-1">
                Areas for Growth
              </span>
              <div className="space-y-1.5">
                {weaknesses.map((wk, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-[#0e1320]/70 border border-slate-800/70 text-xs text-slate-300 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium leading-relaxed">{wk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Compact Next Best Action Footer ── */}
      <div className="p-3 border-t border-slate-800/80 bg-[#060913]/90 shrink-0">
        <button
          onClick={() =>
            onPromptClick?.(
              `How can I tackle the next best action: "${nextBestAction.title}"?`
            )
          }
          className="w-full p-2.5 rounded-xl bg-gradient-to-r from-indigo-950/80 to-purple-950/60 border border-indigo-500/30 hover:border-indigo-500/60 text-left transition-all group"
        >
          <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider font-bold text-amber-300 mb-0.5">
            <Zap size={10} className="text-amber-400" />
            <span>Next Priority Action</span>
          </div>
          <p className="text-[11px] font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
            {nextBestAction.title}
          </p>
        </button>
      </div>
    </div>
  );
};

export default AdvisorSidebar;
