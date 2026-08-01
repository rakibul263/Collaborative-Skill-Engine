import React from "react";
import { Link } from "react-router-dom";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Video,
  UserCheck,
  Star,
  BookOpen,
  ChevronRight,
} from "lucide-react";

/**
 * StudioOnboardingView — Premium dynamic eligibility onboarding screen.
 * Displays progress percentage, completed vs remaining requirements,
 * locked badge, step timeline, and actionable CTAs.
 */
const StudioOnboardingView = ({ accessStatus, onRefresh }) => {
  const {
    progressPercent = 0,
    fulfilledCount = 0,
    totalCount = 5,
    requirements = [],
    eligibleTopics = [],
    metrics = {},
  } = accessStatus || {};

  const remainingCount = totalCount - fulfilledCount;

  const getRequirementIcon = (id) => {
    switch (id) {
      case "sessions":
        return <Video className="w-5 h-5 text-indigo-500" />;
      case "rating":
        return <Star className="w-5 h-5 text-amber-500" />;
      case "profile":
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case "verification":
        return <ShieldCheck className="w-5 h-5 text-blue-500" />;
      case "topic":
        return <BookOpen className="w-5 h-5 text-violet-500" />;
      default:
        return <Award className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getCtaLink = (id) => {
    switch (id) {
      case "sessions":
        return { label: "Schedule Session", url: "/find-partners" };
      case "profile":
        return { label: "Complete Profile", url: "/profile" };
      case "rating":
        return { label: "View Feedback", url: "/profile" };
      case "topic":
        return { label: "Find Mentor", url: "/experts" };
      default:
        return { label: "Learn More", url: "/profile" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/80 via-purple-900/70 to-slate-900 border border-indigo-500/30 p-8 sm:p-12 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Instructor Studio Locked
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Unlock Creator Studio & Start Teaching
              </h1>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                Reach at least 50% profile completion or complete a 1-on-1 mentoring session to unlock Creator Studio and start publishing courses.
              </p>
            </div>

            {/* Locked Badge & Circular Progress */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-800/80 border border-slate-700/60 rounded-2xl shadow-inner min-w-[220px]">
              <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-slate-700"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-indigo-500 transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={301.59}
                    strokeDashoffset={301.59 - (301.59 * progressPercent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white">{progressPercent}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Unlocked</span>
                </div>
              </div>
              <div className="text-xs font-medium text-slate-400 text-center">
                <span className="text-indigo-400 font-bold">{fulfilledCount}</span> of {totalCount} Requirements Ready
              </div>
            </div>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Mentoring Sessions</p>
              <p className="text-lg font-bold text-white">{metrics.sessionCount || 0} Completed</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Reputation Rating</p>
              <p className="text-lg font-bold text-white">{metrics.averageRating || 0} / 5.0</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Profile Completeness</p>
              <p className="text-lg font-bold text-white">{metrics.profileCompletionPercent || 0}%</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Eligible Topics</p>
              <p className="text-lg font-bold text-white">{eligibleTopics.length} Topics</p>
            </div>
          </div>
        </div>

        {/* Dynamic Checklist & Timeline */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Eligibility Requirements Checklist</h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Every requirement updates dynamically from backend database records.
              </p>
            </div>
            <button
              onClick={onRefresh}
              className="text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors flex items-center gap-2"
            >
              Refresh Status
            </button>
          </div>

          <div className="grid gap-4">
            {requirements.map((req, idx) => {
              const cta = getCtaLink(req.id);
              return (
                <div
                  key={req.id || idx}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    req.fulfilled
                      ? "bg-slate-800/40 border-emerald-500/30 hover:border-emerald-500/50"
                      : "bg-slate-800/90 border-slate-700/80 hover:border-indigo-500/40 shadow-lg"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      {req.fulfilled ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                          {getRequirementIcon(req.id)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-white">{req.title}</h3>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            req.fulfilled
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {req.fulfilled ? "Fulfilled" : "Action Required"}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm">{req.description}</p>
                      <div className="text-xs font-semibold text-slate-300 pt-1">
                        Current: <span className="text-indigo-400">{req.current}</span> / Required: {req.required} {req.unit}
                      </div>
                    </div>
                  </div>

                  {!req.fulfilled && (
                    <Link
                      to={cta.url}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-indigo-500/20 whitespace-nowrap"
                    >
                      {cta.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Path */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Instructor Unlock Timeline
          </h3>

          <div className="relative border-l-2 border-indigo-500/30 ml-4 space-y-8 pl-6">
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-900" />
              <h4 className="text-sm font-bold text-white">1. Complete Mentoring Session</h4>
              <p className="text-xs text-slate-400 mt-0.5">Participate in 1-on-1 peer mentoring to establish verified expertise in topics.</p>
            </div>

            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-900" />
              <h4 className="text-sm font-bold text-white">2. Complete Instructor Profile & Verification</h4>
              <p className="text-xs text-slate-400 mt-0.5">Fill in bio, headline, teaching skills, and maintain good network standing.</p>
            </div>

            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900" />
              <h4 className="text-sm font-bold text-slate-400">3. Unlock Permanent Studio Access</h4>
              <p className="text-xs text-slate-400 mt-0.5">Build courses, record lesson videos, and sell to students directly.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudioOnboardingView;
