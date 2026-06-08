import React, { useState, useMemo } from "react";
import { BookOpen, Target, Sparkles, CheckCircle2, Search, Award } from "lucide-react";
import ExpertEmptyState from "./ExpertEmptyState";

const ExpertSkills = ({
  teachSkills = [],
  learnSkills = [],
  teachLevel = "Mentor",
  learnLevel = "Learner",
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const formatSkillName = (s) => {
    if (!s) return "";
    if (typeof s === "object") return s.label || s.original || s.value || "";
    return s.toString();
  };

  const formattedTeach = useMemo(
    () => teachSkills.map(formatSkillName).filter(Boolean),
    [teachSkills]
  );
  const formattedLearn = useMemo(
    () => learnSkills.map(formatSkillName).filter(Boolean),
    [learnSkills]
  );

  const hasAnySkills = formattedTeach.length > 0 || formattedLearn.length > 0;

  const filteredTeach = useMemo(() => {
    if (!searchTerm) return formattedTeach;
    return formattedTeach.filter((s) =>
      s.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [formattedTeach, searchTerm]);

  const filteredLearn = useMemo(() => {
    if (!searchTerm) return formattedLearn;
    return formattedLearn.filter((s) =>
      s.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [formattedLearn, searchTerm]);

  if (!hasAnySkills) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl">
        <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-400" />
          <span>Skills & Expertise</span>
        </h3>
        <ExpertEmptyState
          icon={BookOpen}
          title="No Skills Listed Yet"
          description="This expert has not specified any teaching expertise or learning interests."
        />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-400" />
            <span>Skills & Expertise</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Verified platform skill mapping & technical interests
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-60">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter skills..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
      </div>

      {/* Skills Matrix */}
      <div className="space-y-6">
        {/* Teaching Expertise */}
        {formattedTeach.length > 0 && (
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <CheckCircle2 size={15} />
                </div>
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  Teaching Expertise
                </h4>
              </div>
              <span className="text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                {teachLevel} Instructor
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {filteredTeach.length > 0 ? (
                filteredTeach.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs font-semibold hover:border-indigo-500/60 hover:bg-indigo-900/40 transition-all cursor-default shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">
                  No matching teaching skills
                </span>
              )}
            </div>
          </div>
        )}

        {/* Learning Interests */}
        {formattedLearn.length > 0 && (
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Target size={15} />
                </div>
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  Learning Interests
                </h4>
              </div>
              <span className="text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-md">
                {learnLevel} Level
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {filteredLearn.length > 0 ? (
                filteredLearn.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs font-semibold hover:border-purple-500/60 hover:bg-purple-900/40 transition-all cursor-default shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">
                  No matching learning skills
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertSkills;
