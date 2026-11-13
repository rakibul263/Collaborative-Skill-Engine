import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Lock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Award,
  Video,
  UserCheck,
  Star,
  BookOpen,
  Zap,
  BarChart3,
  DollarSign,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Users,
  GraduationCap,
  Sparkle,
  Clock,
  Compass,
  FileCheck2,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

/**
 * StudioOnboardingView — Ultra-modern, professional Creator Gate & Onboarding
 * Displayed when an account has not yet met the mentorship session (>= 1) and rating (>= 4.0) criteria.
 * Strictly locks the Studio and provides an actionable, engaging path to qualification.
 */
const StudioOnboardingView = ({ accessStatus, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const {
    requirements = [],
    metrics = {},
  } = accessStatus || {};

  const sessionsCount = metrics?.sessionCount || 0;
  const averageRating = metrics?.averageRating || 0;
  const ratingCount = metrics?.ratingCount || 0;

  const sessionOk = sessionsCount >= 1;
  const ratingOk = averageRating >= 4.0 && sessionsCount >= 1;

  // The 2 primary criteria determining access
  const primaryMilestonesMet = (sessionOk ? 1 : 0) + (ratingOk ? 1 : 0);
  const primaryProgressPercent = Math.round((primaryMilestonesMet / 2) * 100);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const toastId = toast.loading("Checking mentorship standing...", {
      description: "Verifying peer sessions and student reputation score...",
    });

    try {
      if (typeof onRefresh === "function") {
        await onRefresh();
      }
      if (sessionOk && ratingOk) {
        toast.success("Congratulations! All criteria met. Unlocking Studio...", { id: toastId });
      } else {
        toast.info(
          `Status refreshed: ${primaryMilestonesMet} of 2 criteria met.`,
          {
            id: toastId,
            description: "Complete your peer mentoring session to unlock Studio.",
            duration: 4000,
          }
        );
      }
    } catch (err) {
      toast.error("Could not refresh eligibility. Please try again.", { id: toastId });
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const creatorPerks = [
    {
      icon: <GraduationCap className="w-5 h-5 text-indigo-400" />,
      badge: "Core Studio",
      badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      title: "Interactive Course Studio",
      desc: "Build comprehensive curriculums with rich Markdown, code snippets, video lectures, and live chapter attachments.",
    },
    {
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      badge: "85% Revenue Share",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      title: "Monetize Your Skills",
      desc: "Set your own enrollment fees and receive guaranteed creator royalties, tracked transparently through your revenue ledger.",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-cyan-400" />,
      badge: "Deep Analytics",
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      title: "Real-Time Learner Intelligence",
      desc: "Monitor student enrollment velocity, watch-time completion rates, and chapter engagement drop-offs.",
    },
    {
      icon: <Award className="w-5 h-5 text-amber-400" />,
      badge: "Platform Credential",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      title: "Verified Instructor Seal",
      desc: "Receive an official Gold Verified Instructor badge displayed on your public profile, discussions, and course listings.",
    },
  ];

  const fastTrackSteps = [
    {
      num: "01",
      title: "Find a Learning Partner",
      desc: "Browse our active developer community. Filter by topics like React, Node.js, Python, or Architecture and request a 1-on-1 session.",
      cta: "Browse Directory",
      link: "/find-partners",
      icon: <Users className="w-4 h-4 text-indigo-400" />,
    },
    {
      num: "02",
      title: "Deliver 1 Mentoring Session",
      desc: "Conduct a 15–30 minute knowledge share, code walkthrough, or mock interview with your peer partner.",
      cta: "View My Requests",
      link: "/requests",
      icon: <Video className="w-4 h-4 text-purple-400" />,
    },
    {
      num: "03",
      title: "Receive 4.0+ Star Rating",
      desc: "Once your peer reviews the completed session with 4.0 stars or higher, the system unlocks Creator Studio instantly.",
      cta: "Check My Profile",
      link: "/profile",
      icon: <Star className="w-4 h-4 text-amber-400" />,
    },
  ];

  const faqs = [
    {
      q: "Why is Creator Studio locked by default?",
      a: "To ensure that every published course meets rigorous engineering standards and pedagogical quality, Collaborative Skill Engine requires creators to prove their mentorship and communication skills through at least one verified peer session.",
    },
    {
      q: "How long after completing a session does Studio unlock?",
      a: "Instantly. As soon as your partner marks the session as finished and leaves a rating of 4.0 or above, our automated background checks unlock your Studio within seconds.",
    },
    {
      q: "Can I do a peer session with a colleague or friend?",
      a: "Yes! Any registered user on the platform can book a session with you through Find Partners or via direct invitation. Both parties benefit from the collaboration credit.",
    },
    {
      q: "Is there any cost to create or publish courses?",
      a: "No, Creator Studio is 100% free for all qualified mentors. There are no monthly fees, and instructors retain 85% of all course enrollment earnings.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 pt-24 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* ── BACKGROUND AMBIENT GLOWS ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-48 left-10 w-96 h-96 bg-rose-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-96 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Cybernetic Grid Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-12">

        {/* ── BREADCRUMB / TOP META ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/" className="hover:text-indigo-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Creator Workspace</span>
            <span>/</span>
            <span className="text-indigo-400 font-bold">Instructor Accreditation</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Creator Studio Locked
            </span>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Checking..." : "Re-check Status"}</span>
            </button>
          </div>
        </div>

        {/* ── HERO BANNER: STUDIO ACCREDITATION GATEWAY ── */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/80 border border-slate-800/90 p-8 sm:p-12 shadow-2xl backdrop-blur-2xl overflow-hidden">
          {/* Subtle accent border glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-rose-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/15 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-5 max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300 text-xs font-semibold shadow-inner">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Accreditation Verification Required</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Unlock Your{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                  Creator Studio
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                To protect student trust and deliver world-class curriculum quality, Course Creation is exclusively unlocked for verified peer mentors. Satisfy the two fundamental milestones below to publish courses, build lessons, and collect creator royalties.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                <Link
                  to="/find-partners"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Users className="w-4 h-4" />
                  <span>Find a Peer Partner Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-900/80 hover:bg-slate-850 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:border-slate-600"
                >
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>Update Profile & Skills</span>
                </Link>
              </div>
            </div>

            {/* ── GAUGE CARD ── */}
            <div className="w-full lg:w-auto shrink-0 flex flex-col items-center justify-center p-7 sm:p-8 bg-slate-950/80 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl relative">
              <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest">
                Verification Progress
              </div>

              {/* Radial Meter */}
              <div className="relative w-36 h-36 flex items-center justify-center mb-4 mt-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className="stroke-slate-800/80"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className={`${
                      primaryMilestonesMet === 2
                        ? "stroke-emerald-400"
                        : primaryMilestonesMet === 1
                        ? "stroke-indigo-400"
                        : "stroke-rose-500"
                    } transition-all duration-1000 ease-out`}
                    strokeWidth="11"
                    strokeDasharray={376.99}
                    strokeDashoffset={376.99 - (376.99 * primaryProgressPercent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <Lock className="w-6 h-6 text-rose-400 mb-0.5 animate-pulse" />
                  <span className="text-3xl font-black text-white">{primaryProgressPercent}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unlocked</span>
                </div>
              </div>

              <div className="text-center space-y-1.5 max-w-[220px]">
                <div className="text-xs font-bold text-slate-200">
                  <span className="text-indigo-400 font-black">{primaryMilestonesMet}</span> of 2 Core Milestones Met
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {primaryMilestonesMet === 0 && "Complete your first 1-on-1 session to begin qualification."}
                  {primaryMilestonesMet === 1 && "Session complete! Waiting for student review rating."}
                  {primaryMilestonesMet === 2 && "All requirements satisfied! Studio ready to launch."}
                </p>
              </div>

              <div className="w-full mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Estimated Time:</span>
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" /> ~15-30 mins
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── THE TWO CORE MILESTONES (PRIMARY ACTION CARDS) ── */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <h2 className="text-lg font-black text-white tracking-tight">
                  Core Mentorship Criteria
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Both requirements are queried dynamically in real time from platform records.
              </p>
            </div>

            <span className="text-[11px] font-semibold text-slate-400">
              Pass Criteria: <span className="text-indigo-400 font-bold">100% Mandatory</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── MILESTONE 1: 1-ON-1 MENTORING SESSION ── */}
            <div
              className={`relative rounded-3xl border p-7 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                sessionOk
                  ? "bg-slate-900/60 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                  : "bg-slate-900/70 border-slate-800 hover:border-indigo-500/40 shadow-xl"
              }`}
            >
              {/* Background ambient corner glow */}
              <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-2xl pointer-events-none ${
                sessionOk ? "bg-emerald-500/10" : "bg-indigo-500/5"
              }`} />

              <div className="space-y-5 relative z-10">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                      sessionOk
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25"
                    }`}>
                      <Video className="w-6 h-6" />
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                        Milestone 01
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Deliver 1 Peer Mentoring Session
                      </h3>
                    </div>
                  </div>

                  {sessionOk ? (
                    <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Met
                    </span>
                  ) : (
                    <span className="shrink-0 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Demonstrate hands-on teaching capability. Connect with any peer looking to learn web development, software engineering, or computer science fundamentals and hold a 1-on-1 session.
                </p>

                {/* Progress bar box */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Verified Sessions Completed:</span>
                    <span className={sessionOk ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
                      {sessionsCount} / 1 required
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        sessionOk ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${sessionOk ? 100 : Math.min(100, sessionsCount * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Source: Peer Schedules Collection</span>
                    <span>Status: {sessionOk ? "Verified ✓" : "Needs 1 Completed"}</span>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="pt-6 relative z-10">
                <Link
                  to="/find-partners"
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                    sessionOk
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 hover:shadow-indigo-600/40"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{sessionOk ? "Schedule Additional Sessions" : "Schedule Session on Find Partners"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* ── MILESTONE 2: REPUTATION SCORE ── */}
            <div
              className={`relative rounded-3xl border p-7 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                ratingOk
                  ? "bg-slate-900/60 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                  : "bg-slate-900/70 border-slate-800 hover:border-amber-500/40 shadow-xl"
              }`}
            >
              {/* Background ambient corner glow */}
              <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-2xl pointer-events-none ${
                ratingOk ? "bg-emerald-500/10" : "bg-amber-500/5"
              }`} />

              <div className="space-y-5 relative z-10">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                      ratingOk
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    }`}>
                      <Star className="w-6 h-6 fill-amber-400/80 text-amber-400" />
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        Milestone 02
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Reputation Rating ≥ 4.0 Stars
                      </h3>
                    </div>
                  </div>

                  {ratingOk ? (
                    <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Met
                    </span>
                  ) : (
                    <span className="shrink-0 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Reflects pedagogical feedback from students. When your peer or mentee rates your completed session with 4.0 stars or higher, this criterion will turn green instantly.
                </p>

                {/* Progress bar box */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Current Peer Rating:</span>
                    <span className={`font-black flex items-center gap-1 ${ratingOk ? "text-emerald-400" : "text-amber-400"}`}>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {averageRating > 0 ? `${averageRating.toFixed(1)} / 5.0` : "0.0 / 5.0 (No reviews yet)"}
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        ratingOk ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, (averageRating / 4.0) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Total Peer Reviews: {ratingCount}</span>
                    <span>Target: ≥ 4.00</span>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="pt-6 relative z-10">
                <Link
                  to="/profile"
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>Inspect Feedback & Reviews</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* ── FAST-TRACK ROADMAP: 3 STEPS TO UNLOCK TODAY ── */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-10 shadow-xl space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400">
              Fast-Track Qualification
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              How to Unlock Creator Studio Today
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Most developers complete qualification within a single afternoon. Follow these three simple steps:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {fastTrackSteps.map((step, idx) => (
              <div
                key={step.num}
                className="relative rounded-2xl bg-slate-950/80 border border-slate-800/90 p-6 flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-700 group-hover:text-indigo-400 transition-colors">
                      {step.num}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                      {step.icon}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {step.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to={step.link}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <span>{step.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── THE CREATOR ADVANTAGE: WHAT YOU UNLOCK IN STUDIO ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-lg font-black text-white tracking-tight">
                  What You Unlock Inside Creator Studio
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full access to our pro-grade developer authoring environment once qualified.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {creatorPerks.map((perk, i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all hover:translate-y-[-2px] shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                      {perk.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${perk.badgeColor}`}>
                      {perk.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {perk.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {perk.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LIVE VERIFICATION CRITERIA FROM DATABASE ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-400" />
                Real-Time Eligibility Report
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verified live against your authenticated user account.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Checking..." : "Refresh Eligibility"}</span>
            </button>
          </div>

          <div className="grid gap-3">
            {requirements.map((req, idx) => (
              <div
                key={req.id || idx}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  req.fulfilled
                    ? "bg-slate-950/60 border-emerald-500/30"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 shrink-0">
                    {req.fulfilled ? (
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{req.title}</h4>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          req.fulfilled
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {req.fulfilled ? "Fulfilled ✓" : "Action Required"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{req.description}</p>
                    <div className="text-[11px] font-medium text-slate-400">
                      Current Score: <span className="text-indigo-400 font-bold">{req.current}</span> / Required: {req.required} {req.unit}
                    </div>
                  </div>
                </div>

                {!req.fulfilled && (
                  <Link
                    to={req.id === "sessions" ? "/find-partners" : req.id === "rating" ? "/profile" : "/profile"}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-sm"
                  >
                    <span>{req.id === "sessions" ? "Find Partners" : "View Details"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ACCORDION ── */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-10 shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid gap-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-200 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${
                      openFaq === idx ? "rotate-180 text-indigo-400" : ""
                    }`}
                  />
                </button>

                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER CALLOUT ── */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-slate-900 border border-indigo-500/20 p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white">
            Ready to become a recognized instructor?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Take the first step today by connecting with peer learners. Share your engineering knowledge, gain credibility, and unlock your creator workspace.
          </p>
          <div className="pt-2">
            <Link
              to="/find-partners"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Active Learners on Find Partners</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudioOnboardingView;
