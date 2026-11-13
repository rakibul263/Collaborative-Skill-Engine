/* eslint-disable no-unused-vars */
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
  Briefcase,
  Layers,
  Award,
  GraduationCap,
  Calendar,
  ExternalLink,
  FileDown,
} from "lucide-react";
import { NavLink } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";
import { saveAdvisorRoadmap } from "@/lib/advisorApi";
import { toast } from "@/components/ui/toast-system";

const TABS = [
  { id: "direction", label: "Direction", icon: Target, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/25" },
  { id: "gaps", label: "Skill Gaps", icon: BookOpen, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25" },
  { id: "roadmap", label: "Roadmap", icon: Route, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
  { id: "courses", label: "Courses", icon: GraduationCap, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25" },
  { id: "projects", label: "Projects", icon: Lightbulb, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/25" },
  { id: "mentors", label: "Mentors", icon: Users, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25" },
];

const priorityColor = (p) => {
  const map = {
    critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    high:     "bg-rose-500/10 text-rose-400 border-rose-500/25",
    medium:   "bg-amber-500/10 text-amber-400 border-amber-500/25",
    low:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  };
  return map[p?.toLowerCase()] || "bg-slate-800 text-slate-400 border-slate-700";
};

const TabButton = ({ tab, isActive, onClick }) => {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
        isActive
          ? `${tab.bg} ${tab.color} shadow-sm`
          : "bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700"
      }`}
    >
      <Icon size={13} />
      <span>{tab.label}</span>
    </button>
  );
};

const SkillGapCard = ({ gap, onAction }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="group rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-md transition-all hover:border-amber-500/40 space-y-2.5"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-white">{gap.skill}</span>
          <span className={`rounded-full border px-2 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider ${priorityColor(gap.priority)}`}>
            {gap.priority}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400 font-medium">{gap.whyImportant || gap.reason}</p>
      </div>
      <div className="shrink-0 mt-0.5">
        {["high", "critical"].includes(gap.priority?.toLowerCase()) ? (
          <AlertTriangle size={15} className="text-rose-400" />
        ) : (
          <Clock size={15} className="text-amber-400" />
        )}
      </div>
    </div>

    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
      <span>Est: {gap.time || "2–3 weeks"}</span>
      <button
        onClick={() => onAction?.(`Provide a comprehensive learning curriculum for mastering ${gap.skill}.`)}
        className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors flex items-center gap-1"
      >
        <span>Curriculum</span>
        <ArrowRight size={10} />
      </button>
    </div>
  </motion.div>
);

const RoadmapStep = ({ step, index, onAction }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.08 }}
    className="relative flex gap-3.5 group"
  >
    <div className="flex flex-col items-center">
      <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-[10px] font-extrabold text-white shadow-md">
        {index + 1}
      </div>
      {index < 4 && <div className="mt-1 h-full w-px bg-gradient-to-b from-indigo-500/40 to-transparent" />}
    </div>
    <div className="mb-3.5 flex-1">
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-indigo-500/40 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
            {step.phase}
          </span>
          <button
            onClick={() => onAction?.(`Give me detailed learning resources and milestone goals for ${step.phase}: ${step.focus}`)}
            className="text-[10px] text-slate-500 hover:text-indigo-400 font-bold transition-colors"
          >
            Plan Phase ↗
          </button>
        </div>
        <p className="text-xs font-bold text-white">{step.focus}</p>
        <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
          <strong className="text-slate-300">Target:</strong> {step.action || step.whyNow}
        </p>
      </div>
    </div>
  </motion.div>
);

const ProjectCard = ({ project, index, onAction }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="group flex gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-purple-500/40"
  >
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 shadow-sm">
      {index + 1}
    </div>
    <div className="flex-1 space-y-1.5">
      <p className="text-xs font-medium leading-relaxed text-slate-200 group-hover:text-white">
        {typeof project === "object" ? project.suggestion || project.area : project}
      </p>
      <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1 text-amber-400">
          <Lightbulb size={11} />
          Portfolio Blueprint
        </span>
        <button
          onClick={() =>
            onAction?.(
              `Give me an architectural breakdown and schema design for: "${
                typeof project === "object" ? project.suggestion : project
              }"`
            )
          }
          className="text-purple-400 hover:text-purple-300 font-bold transition-colors flex items-center gap-0.5"
        >
          <span>Blueprint</span>
          <ArrowRight size={10} />
        </button>
      </div>
    </div>
  </motion.div>
);

const MentorCard = ({ mentor }) => {
  const scheduleTopic = mentor.reason || "Mentorship & Career Strategy Session";
  const mentorEmail = mentor.email || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-rose-500/40"
    >
      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-rose-500/30">
        <AvatarImage src={mentor.profileImage} />
        <AvatarFallback className="bg-gradient-to-br from-rose-600 to-pink-600 font-bold text-white text-xs">
          {mentor.fullName?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
            {mentor.fullName}
          </p>
          <span className="text-[10px] font-mono font-bold text-rose-400">
            {mentor.matchPercentage || 90}% Fit
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium truncate">
          {mentor.reason || "Matched on complementary skill interests"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {mentorEmail && (
          <NavLink
            to={`/message?peer=${encodeURIComponent(mentorEmail)}&schedule=true&topic=${encodeURIComponent(scheduleTopic)}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/30 text-rose-300 text-[10px] font-bold transition shadow-sm cursor-pointer"
            title="1-Click Book 1-on-1 Session"
          >
            <Calendar size={12} className="text-rose-400" />
            <span>Book</span>
          </NavLink>
        )}
        <NavLink
          to={mentor._id ? `/experts/${mentor._id}` : "/experts"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/15 transition-all"
          title="View mentor profile"
        >
          <ChevronRight size={13} />
        </NavLink>
      </div>
    </motion.div>
  );
};

const CourseCard = ({ course, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="group rounded-2xl border border-slate-800/90 bg-slate-950/80 p-3.5 shadow-md transition-all hover:border-blue-500/40 space-y-2.5"
  >
    <div className="flex gap-3 items-start">
      {course.thumbnailUrl ? (
        <img
          src={course.thumbnailUrl}
          alt={course.title}
          className="w-16 h-14 rounded-xl object-cover shrink-0 border border-slate-800 bg-slate-900"
        />
      ) : (
        <div className="w-16 h-14 rounded-xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
          <GraduationCap size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
            {course.title}
          </h4>
          <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
            {course.price === 0 ? "Free" : `৳${course.price}`}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
          {course.description}
        </p>
      </div>
    </div>

    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
      <span className="text-slate-400 font-medium truncate max-w-[140px]">
        By {course.instructorName} {course.totalLessons > 0 && `· ${course.totalLessons} lessons`}
      </span>
      <NavLink
        to={`/courses/${course._id}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-sm"
      >
        <span>Preview & Enroll</span>
        <ExternalLink size={10} />
      </NavLink>
    </div>
  </motion.div>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 shadow-md text-slate-400">
      <Icon size={24} />
    </div>
    <p className="text-xs font-bold text-white">{title}</p>
    <p className="text-[11px] text-slate-400 max-w-xs font-medium leading-relaxed">{description}</p>
  </div>
);

const AdvisorInsights = ({ data, profile, onAction, onDownloadReport }) => {
  const [tab, setTab] = useState("direction");
  const [savingRoadmap, setSavingRoadmap] = useState(false);
  const [roadmapSaved, setRoadmapSaved] = useState(false);

  const computedData = data || generateCareerIntelligence(profile, null);
  const activeData = computedData;
  const hasDirection = activeData?.careerDirection || activeData?.summary;
  const hasGaps = (activeData?.skillGapAnalysis || activeData?.missingGaps || []).length > 0;
  const hasRoadmap = (activeData?.learningRoadmap || activeData?.roadmap || []).length > 0;
  const hasCourses = (activeData?.courseSuggestions || []).length > 0;
  const hasProjects = (activeData?.suggestedProjects || activeData?.portfolioSuggestions || []).length > 0;
  const hasMentors = (activeData?.mentorSuggestions || []).length > 0;

  const handleSaveRoadmap = async () => {
    if (savingRoadmap || roadmapSaved) return;
    const steps = activeData.learningRoadmap || activeData.roadmap || [];
    if (steps.length === 0) return;

    setSavingRoadmap(true);
    try {
      await saveAdvisorRoadmap({
        goal: activeData.careerDirection || activeData.summary || "Software Engineering Career Path",
        roadmap: steps,
        careerDirection: activeData.careerDirection || activeData.summary || "",
        prioritySteps: activeData.prioritySteps || [],
      });
      setRoadmapSaved(true);
      toast.success("Learning roadmap synced to your profile!");
      setTimeout(() => setRoadmapSaved(false), 4000);
    } catch (err) {
      toast.error(err.message || "Failed to save roadmap to profile");
    } finally {
      setSavingRoadmap(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#090d18] text-slate-100 font-sans">
      {/* Header Tabs */}
      <div className="border-b border-slate-800/80 bg-[#090d18] px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-indigo-400" />
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              {tab === "direction" && "Career Vector"}
              {tab === "gaps" && "Skill Gaps"}
              {tab === "roadmap" && "Milestone Plan"}
              {tab === "courses" && "Live Courses"}
              {tab === "projects" && "Portfolio Blueprints"}
              {tab === "mentors" && "Peer Mentors"}
            </h2>
          </div>
          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.2 rounded-full border border-indigo-500/20">
            Artifacts
          </span>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
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
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 bg-[#060913]/60">
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
                  <EmptyState icon={Target} title="No vector calculated yet" description="Ask the AI coach about your target career direction." />
                ) : (
                  <>
                    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-purple-950/40 p-4 shadow-lg space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                        <Target size={13} className="text-indigo-400" />
                        <span>Recommended Trajectory</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
                        {activeData.careerDirection || activeData.summary}
                      </p>
                    </div>

                    {/* Career directions */}
                    {activeData.careerDirections && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                          Role Matches
                        </span>
                        {activeData.careerDirections.slice(0, 3).map((cd) => (
                          <div
                            key={cd.role}
                            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{cd.role}</span>
                              <span className="text-[10px] font-mono font-bold text-indigo-400">
                                {cd.matchPercentage}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${cd.matchPercentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {tab === "gaps" && (
              <>
                {!hasGaps ? (
                  <EmptyState icon={BookOpen} title="No skill gaps detected" description="Your core skill profile aligns with standard industry requirements." />
                ) : (
                  (activeData.skillGapAnalysis || activeData.missingGaps).map((gap, i) => (
                    <SkillGapCard key={i} gap={gap} onAction={onAction} />
                  ))
                )}
              </>
            )}

            {tab === "roadmap" && (
              <>
                {!hasRoadmap ? (
                  <EmptyState icon={Route} title="Roadmap in synthesis" description="Ask the AI advisor to build a structured milestone trajectory." />
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Route size={15} className="text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white">Active Roadmap</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">Sync or export audit PDF</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onDownloadReport && (
                          <button
                            type="button"
                            onClick={onDownloadReport}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                            title="Download Official Career Roadmap PDF"
                          >
                            <FileDown size={11} />
                            <span>PDF</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveRoadmap}
                          disabled={savingRoadmap}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-sm cursor-pointer ${
                            roadmapSaved
                              ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          {roadmapSaved ? (
                            <>
                              <CheckCircle2 size={12} className="text-emerald-400" />
                              <span>Synced</span>
                            </>
                          ) : savingRoadmap ? (
                            <>
                              <Clock size={12} className="animate-spin text-white" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              <span>1-Click Sync</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {(activeData.learningRoadmap || activeData.roadmap).map((step, i) => (
                      <RoadmapStep key={i} step={step} index={i} onAction={onAction} />
                    ))}
                  </>
                )}
              </>
            )}

            {tab === "courses" && (
              <>
                {!hasCourses ? (
                  <div className="space-y-4">
                    <EmptyState
                      icon={GraduationCap}
                      title="No specific courses matched yet"
                      description="Ask the AI coach for course recommendations or explore our complete catalog."
                    />
                    <div className="text-center pt-2">
                      <NavLink
                        to="/courses"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md"
                      >
                        <span>Explore Marketplace</span>
                        <ArrowRight size={13} />
                      </NavLink>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/25 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} className="text-blue-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Recommended Courses</p>
                          <p className="text-[10px] text-slate-400 font-medium">Curated for your target skill gaps</p>
                        </div>
                      </div>
                      <NavLink
                        to="/courses"
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition"
                      >
                        All Courses ↗
                      </NavLink>
                    </div>
                    {activeData.courseSuggestions.map((c, i) => (
                      <CourseCard key={c._id || i} course={c} index={i} />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "projects" && (
              <>
                {!hasProjects ? (
                  <EmptyState icon={Lightbulb} title="No project blueprints" description="Ask the AI advisor for project suggestions that match your stack." />
                ) : (
                  (activeData.suggestedProjects || activeData.portfolioSuggestions).map((p, i) => (
                    <ProjectCard key={i} project={p} index={i} onAction={onAction} />
                  ))
                )}
              </>
            )}

            {tab === "mentors" && (
              <>
                {!hasMentors ? (
                  <EmptyState icon={Users} title="Finding peer mentors" description="We're matching peer mentors across our verified community." />
                ) : (
                  activeData.mentorSuggestions.map((m, i) => (
                    <MentorCard key={i} mentor={m} />
                  ))
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
