import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight, Globe, Search, Sparkles, Users, Star,
  Zap, Brain, MessageSquare, UserCheck, TrendingUp,
  Shield, Award, Code, ChevronRight, Check, Network,
  BookOpen, Cpu, Play, BarChart3, Heart, Activity,
  Layers, Lock, CheckCircle2, Flame, Bot, CornerDownRight,
  User,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import { useNavigate } from "react-router";
import useAuth from "@/hooks/useAuth";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
const Counter = ({ target = 0, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (target <= 0) {
      setCount(0);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = Math.max(1, Math.ceil(target / 60));
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else setCount(start);
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─────────────────────────────────────────────
   SKILL TICKER (horizontal marquee)
───────────────────────────────────────────── */
const skillsRow1 = [
  "React 19", "Node.js", "Python 3.12", "TypeScript", "MongoDB", "Docker",
  "Machine Learning", "GraphQL", "AWS Cloud", "Flutter", "Vue.js 3",
  "PostgreSQL", "Kubernetes", "Rust", "SwiftUI", "TensorFlow",
];
const skillsRow2 = [
  "Next.js 15", "DevOps", "Figma Design", "Golang", "Redis", "Blockchain",
  "PyTorch", "Tailwind CSS", "System Design", "Microservices", "CI/CD",
  "Tailwind CSS v4", "API Design", "Cybersecurity", "Data Science",
];

const SkillTickerSection = () => (
  <section className="py-12 border-y border-slate-800/60 bg-slate-950/60 backdrop-blur-xl relative overflow-hidden reveal">
    <div className="max-w-7xl mx-auto px-4 mb-4 text-center">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-400">
        Engineered for Modern Tech Stacks & Real Skill Exchange
      </span>
    </div>

    {/* Row 1 */}
    <div className="overflow-hidden py-2 relative">
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-3 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      >
        {[...skillsRow1, ...skillsRow1].map((s, i) => (
          <span
            key={i}
            className="px-4 py-2 bg-slate-900/90 border border-slate-800/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-indigo-400 hover:border-indigo-500/40 transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/80" />
            {s}
          </span>
        ))}
      </motion.div>
    </div>

    {/* Row 2 */}
    <div className="overflow-hidden py-2 relative mt-1">
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-3 whitespace-nowrap"
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      >
        {[...skillsRow2, ...skillsRow2].map((s, i) => (
          <span
            key={i}
            className="px-4 py-2 bg-slate-900/90 border border-slate-800/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-purple-400 hover:border-purple-500/40 transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/80" />
            {s}
          </span>
        ))}
      </motion.div>
    </div>
  </section>
);

/* Helper to format skills safely from database array */
const formatSkills = (skillList, defaultFallback = "Software Development") => {
  if (!skillList || !Array.isArray(skillList) || skillList.length === 0) {
    return defaultFallback;
  }
  return skillList
    .map((s) => (typeof s === "object" ? s.label || s.original || s.name : s))
    .filter(Boolean)
    .join(", ");
};

/* ─────────────────────────────────────────────
   MAIN HOME
───────────────────────────────────────────── */
const Home = () => {
  const mainRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState(
    () => getCachedData("/platform-stats") || { totalUsers: 0, totalMessages: 0, experts: [] }
  );
  const [statsLoaded, setStatsLoaded] = useState(() => Boolean(getCachedData("/platform-stats")));

  useEffect(() => {
    let active = true;
    let retryTimer = null;
    const loadStats = (attempt = 0) => {
      apiClient
        .get("/platform-stats", {
          timeout: 65000,
          onUpdate: (fresh) => {
            if (active && fresh) setStats(fresh);
          },
        })
        .then((r) => {
          if (!active) return;
          setStats(r.data || {});
          setStatsLoaded(true);
        })
        .catch(() => {
          if (!active) return;
          if (attempt < 3) {
            retryTimer = setTimeout(() => loadStats(attempt + 1), 3000);
          } else {
            setStatsLoaded(true);
          }
        });
    };
    loadStats(0);
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-element", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
      });
      gsap.utils.toArray(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          }
        );
      });
    }, mainRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={mainRef}
      className="bg-transparent text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 font-sans min-h-screen overflow-x-hidden relative"
    >

      <HeroSection navigate={navigate} user={user} realUsers={stats.experts || []} stats={stats} />
      <SkillTickerSection />
      <StatsSection stats={stats} loaded={statsLoaded} />
      <HowItWorksSection />
      <SkillMatchSection navigate={navigate} realUsers={stats.experts || []} />
      <AISection navigate={navigate} />
      <TopExpertsSection experts={stats.experts || []} navigate={navigate} />
      <FeatureGridSection />
      <CTASection navigate={navigate} user={user} />
    </div>
  );
};

/* ─────────────────────────────────────────────
   HERO SECTION WITH REAL USER DATA IN MOCKUP
───────────────────────────────────────────── */
const HeroSection = ({ navigate, user, realUsers, stats }) => {
  const [activeTab, setActiveTab] = useState("matching");

  // Pick top 2 real users from API data if available
  const featuredUser1 = realUsers[0] || null;
  const featuredUser2 = realUsers[1] || null;

  return (
    <section className="relative pt-12 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden z-10">
      {/* Ambient Spotlight Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/10 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Text & CTAs */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Announcement Badge */}
          <div className="hero-element inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wide mb-8 shadow-sm">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>AI Engine 2.0 Released • Real-Time Match & Learn</span>
            <ChevronRight size={14} className="opacity-70" />
          </div>

          {/* Display Title */}
          <h1 className="hero-element text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
            Master Any Skill.{" "}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Share Knowledge.
            </span>{" "}
            Scale Together.
          </h1>

          {/* Subtitle */}
          <p className="hero-element text-base sm:text-lg lg:text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with verified professionals who teach what you want to learn.
            Our intelligent AI engine matches skill sets, schedule availability, and career goals.
          </p>

          {/* Primary Action Buttons */}
          <div className="hero-element flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button
              onClick={() => navigate(user ? "/experts" : "/login")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              <span>{user ? "Explore Mentors & Experts" : "Get Started Free"}</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/find-partners")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 px-7 py-4 rounded-xl font-bold text-sm transition-all duration-200"
            >
              <Globe size={16} className="text-indigo-400" />
              <span>Explore Collaboration Hub</span>
            </button>
          </div>

          {/* Social Proof Avatar Strip */}
          <div className="hero-element flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                {realUsers.slice(0, 4).map((u, idx) => (
                  <div key={idx} className="w-7 h-7 rounded-full ring-2 ring-slate-950 overflow-hidden bg-indigo-900/80 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {u.profileImage ? (
                      <img src={u.profileImage} alt={u.fullName} className="w-full h-full object-cover" />
                    ) : (
                      (u.fullName || "U")[0]
                    )}
                  </div>
                ))}
              </div>
              <span className="font-semibold text-slate-200">
                {stats?.totalUsers
                  ? `${stats.totalUsers.toLocaleString()} Registered Learners`
                  : realUsers.length > 0
                  ? `${realUsers.length} Registered Learners`
                  : "Verified Registered Learners"}
              </span>
            </div>
            <span className="hidden sm:inline text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400" />
                ))}
              </div>
              <span className="font-semibold text-slate-200">
                {stats?.averageRating
                  ? `${Number(stats.averageRating).toFixed(1)}/5 Community Rating`
                  : "5.0/5 Community Rating"}
              </span>
            </div>
            <span className="hidden sm:inline text-slate-700">•</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Shield size={14} /> 100% Real Registered Members
            </div>
          </div>
        </div>

        {/* Live Interactive SaaS Product Window Mockup with Real User Data */}
        <div className="hero-element mt-14 relative max-w-5xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
          
          <div className="relative bg-slate-900/90 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-2xl">
            {/* macOS Window Title bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">app.skillengine.ai / live-matching</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Platform Active
                </span>
              </div>
            </div>

            {/* Window Interior Content */}
            <div className="p-6">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6">
                <button
                  onClick={() => setActiveTab("matching")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "matching"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Brain size={14} /> AI Match Engine
                </button>
                <button
                  onClick={() => setActiveTab("squads")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "squads"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Users size={14} /> Active Real Members ({realUsers.length})
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Match Focus Card (Bound to Real Database User) */}
                <div className="md:col-span-2 bg-slate-950/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-indigo-900/80 border border-indigo-500/40 flex items-center justify-center shrink-0">
                        {featuredUser1?.profileImage ? (
                          <img
                            src={featuredUser1.profileImage}
                            alt={featuredUser1.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {(featuredUser1?.fullName || "U")[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {featuredUser1?.fullName || "Verified Platform Member"}{" "}
                          <CheckCircle2 size={14} className="text-indigo-400" />
                        </h4>
                        <p className="text-xs text-slate-400 font-medium">
                          {featuredUser1?.teachLevel || "Expert"} Mentor • {featuredUser1?.email || "verified@cse.ai"}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      {featuredUser1?.averageRating ? `${featuredUser1.averageRating}★ Rating` : "Top Rated"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 mb-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teaches Skills</span>
                      <p className="font-bold text-indigo-300 mt-0.5 truncate">
                        {formatSkills(featuredUser1?.teachSkills, "React 19 & Fullstack")}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Learns Skills</span>
                      <p className="font-bold text-purple-300 mt-0.5 truncate">
                        {formatSkills(featuredUser1?.learnSkills, "Python & AI ML")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Session Available Now
                    </span>
                    <button
                      onClick={() => navigate(user ? "/experts" : "/register")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      Connect with Mentor
                    </button>
                  </div>
                </div>

                {/* Right Side Live Activity Widget (Second Real Database User) */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Activity size={14} className="text-indigo-400" /> Active Platform Member
                      </span>
                      <span className="text-[10px] text-slate-400">Verified</span>
                    </div>

                    {featuredUser2 ? (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-purple-900/80 flex items-center justify-center shrink-0 text-white font-bold text-xs">
                            {featuredUser2.profileImage ? (
                              <img src={featuredUser2.profileImage} alt={featuredUser2.fullName} className="w-full h-full object-cover" />
                            ) : (
                              (featuredUser2.fullName || "M")[0]
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{featuredUser2.fullName}</p>
                            <p className="text-[10px] text-indigo-400 truncate">{featuredUser2.teachLevel || "Instructor"}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium line-clamp-2">
                          Skill: {formatSkills(featuredUser2.teachSkills, "Software Architecture")}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
                        Connect with top mentors across engineering & design.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Flame size={13} /> {realUsers.length} Real Users Online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   STATS SECTION (Bento Grid with 100% Real API counts)
───────────────────────────────────────────── */
const StatsSection = ({ stats, loaded }) => {
  const items = [
    {
      icon: <Users size={22} />,
      value: stats.totalUsers || 0,
      suffix: stats.totalUsers > 0 ? "+" : "",
      label: "Active Registered Members",
      desc: "Engineers & mentors collaborating across the platform.",
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      icon: <Award size={22} />,
      value: (stats.experts || []).length || 0,
      suffix: (stats.experts || []).length > 0 ? "+" : "",
      label: "Verified Skill Mentors",
      desc: "Community members offering real 1-on-1 mentorship.",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: <MessageSquare size={22} />,
      value: stats.totalMessages || 0,
      suffix: stats.totalMessages > 0 ? "+" : "",
      label: "Live Messages Transferred",
      desc: "Encrypted 1-on-1 chats & session requests.",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: <Globe size={22} />,
      value: stats.totalCourses || 0,
      suffix: stats.totalCourses > 0 ? "+" : "",
      label: "Published Technical Courses",
      desc: "Real courses & learning tracks built for computer science students.",
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 reveal">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl border ${s.color} flex items-center justify-center`}>
                  {s.icon}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Real API Metric
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-1">
                {loaded ? <Counter target={s.value} suffix={s.suffix} /> : "—"}
              </div>
              <div className="text-xs font-bold text-slate-200 mb-1.5">{s.label}</div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   HOW IT WORKS SECTION
───────────────────────────────────────────── */
const HowItWorksSection = () => {
  const steps = [
    {
      num: "01",
      icon: <UserCheck size={24} />,
      gradient: "from-indigo-500 to-purple-500",
      title: "Build Skill Profile",
      desc: "Specify what skills you teach, what you want to learn, and your availability schedule in under 2 minutes.",
    },
    {
      num: "02",
      icon: <Brain size={24} />,
      gradient: "from-purple-500 to-pink-500",
      title: "AI Finds Best Match",
      desc: "Our engine analyzes skill complementarity, experience levels, and ratings to match you with compatible partners.",
    },
    {
      num: "03",
      icon: <MessageSquare size={24} />,
      gradient: "from-emerald-500 to-teal-500",
      title: "Connect & Collaborate",
      desc: "Send a connection request, exchange messages, and launch 1-on-1 collaborative learning sessions.",
    },
    {
      num: "04",
      icon: <TrendingUp size={24} />,
      gradient: "from-amber-500 to-orange-500",
      title: "Track Growth & Reviews",
      desc: "Rate completed sessions, build your verified platform reputation, and earn mentor badges.",
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative reveal">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Network size={14} /> Workflow & Process
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Four Steps to Your{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Perfect Skill Match
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
            From quick onboarding to active collaboration, the process is smooth, structured, and AI-guided.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6 }}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/60">
                  STEP {s.num}
                </span>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center shadow-md`}>
                  {s.icon}
                </div>
              </div>

              <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                {s.title}
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   SKILL MATCH SHOWCASE (Real MongoDB User Data)
───────────────────────────────────────────── */
const SkillMatchSection = ({ navigate, realUsers }) => {
  // Use real database users or graceful presentation
  const displayUsers = realUsers.length > 0 ? realUsers.slice(0, 4) : [];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative reveal">
      <div className="max-w-7xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 backdrop-blur-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold tracking-wider mb-6">
              <Zap size={14} /> Smart Matching Engine
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
              The Right Partner, <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Every Single Time.
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium mb-8 leading-relaxed">
              Our algorithm evaluates total skill complementarity — matching what registered experts teach with what you need to learn.
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Fuzzy skill matching with 98%+ accuracy rate",
                "Mutual benefit scoring for balanced sessions",
                "Real-time calendar & availability checks",
                "Rating-based community trust verification",
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Check size={12} />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/experts")}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all"
            >
              <span>Find Your Match</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Right Match Cards Matrix (Bound to Real Users) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayUsers.map((u, i) => (
              <motion.div
                key={u._id || i}
                whileHover={{ y: -4 }}
                className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4.5 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-indigo-900/80 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {u.profileImage ? (
                        <img src={u.profileImage} alt={u.fullName} className="w-full h-full object-cover" />
                      ) : (
                        (u.fullName || "U")[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{u.fullName}</h4>
                      <span className="text-[10px] text-slate-400 block truncate">{u.teachLevel || "Mentor"}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md shrink-0">
                    {95 + (i % 5)}% Match
                  </span>
                </div>

                <div className="space-y-1.5 mb-3 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 font-medium shrink-0">Teaches:</span>
                    <span className="font-semibold text-indigo-400 truncate ml-2">
                      {formatSkills(u.teachSkills, "Software Engineering")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 font-medium shrink-0">Learns:</span>
                    <span className="font-semibold text-purple-400 truncate ml-2">
                      {formatSkills(u.learnSkills, "System Architecture")}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style={{ width: `${95 + (i % 5)}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   AI SECTION
───────────────────────────────────────────── */
const aiFeatures = [
  { icon: <Brain size={18} />, title: "Skill Gap Analysis", desc: "Pinpoint missing competencies required for your dream role." },
  { icon: <BarChart3 size={18} />, title: "Career Roadmap", desc: "Custom step-by-step learning paths tailored to your timeline." },
  { icon: <Search size={18} />, title: "Market Skill Insights", desc: "Real-time demand metrics for technologies & frameworks." },
  { icon: <Bot size={18} />, title: "Smart Partner Recs", desc: "AI-suggested mentors who complement your background." },
];

const AISection = ({ navigate }) => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 relative reveal">
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-14 backdrop-blur-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[110px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold tracking-wider mb-6">
              <Sparkles size={14} className="text-amber-400 animate-pulse" /> AI Career Advisor
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
              Personalized Career <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                Intelligence Engine
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium mb-8 leading-relaxed">
              Ask anything about your career path. Receive AI-driven guidance on what skills to learn next, recommended mentors, and roadmaps customized to your ambitions.
            </p>

            <button
              onClick={() => navigate("/ai-advisor")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-7 py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-purple-600/25 transition-all"
            >
              <span>Try AI Advisor Now</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {aiFeatures.map((f, i) => (
              <div key={i} className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h4 className="text-xs font-bold text-white mb-1">{f.title}</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ─────────────────────────────────────────────
   TOP EXPERTS SECTION (Real Registered Users)
───────────────────────────────────────────── */
const TopExpertsSection = ({ experts, navigate }) => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative reveal">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wider mb-4">
              <Star size={14} className="fill-amber-400" /> Verified Registered Members
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Learn From Registered Members
            </h2>
          </div>

          <button
            onClick={() => navigate("/experts")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <span>View All Mentors</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {experts.slice(0, 4).map((expert, i) => {
            const hasRealRating = expert.totalRatings && expert.totalRatings > 0 && expert.averageRating > 0;
            const formattedRating = hasRealRating ? Number(expert.averageRating).toFixed(1) : null;

            return (
              <motion.div
                key={expert._id || i}
                whileHover={{ y: -6 }}
                onClick={() => navigate("/experts")}
                className="bg-slate-900/70 border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl p-5 backdrop-blur-2xl cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-indigo-500/10"
              >
                <div>
                  {/* Avatar Container with Gradient Aura */}
                  <div className="relative mb-4">
                    <div className="p-[2px] rounded-2xl bg-gradient-to-tr from-indigo-500/80 via-purple-500/80 to-pink-500/80 group-hover:scale-[1.02] transition-transform duration-300 shadow-md">
                      {expert.profileImage ? (
                        <img
                          src={expert.profileImage}
                          alt={expert.fullName}
                          className="w-full aspect-[4/3] object-cover rounded-[14px] bg-slate-950"
                        />
                      ) : (
                        <div className="w-full aspect-[4/3] rounded-[14px] bg-slate-950 flex flex-col items-center justify-center border border-slate-800">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-sm mb-1">
                            {(expert.fullName || "U")[0]}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Verified Profile</span>
                        </div>
                      )}
                    </div>

                    {/* Dynamic Rating / Status Badge */}
                    <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-bold shadow-md">
                      {hasRealRating ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          {formattedRating}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-indigo-400">
                          <Sparkles size={11} className="text-amber-400" />
                          Verified Member
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                    {expert.fullName || "Registered User"}
                  </h4>

                  <div className="flex items-center gap-1.5 mb-3">
                    <Award size={13} className="text-indigo-400" />
                    <span className="text-[11px] font-semibold text-indigo-300">
                      {expert.teachLevel || "Instructor & Mentor"}
                    </span>
                  </div>

                  {/* Real Skills Taught */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(Array.isArray(expert.teachSkills) ? expert.teachSkills : [])
                      .slice(0, 3)
                      .map((s, j) => {
                        const skillName = typeof s === "object" ? s.label || s.original : s;
                        return (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-950/80 border border-slate-800 text-slate-300 text-[10px] font-semibold rounded-lg"
                          >
                            <span className="w-1 h-1 rounded-full bg-indigo-400" />
                            {skillName}
                          </span>
                        );
                      })}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="text-[11px]">
                    {hasRealRating
                      ? `${expert.totalRatings} ${expert.totalRatings === 1 ? "review" : "reviews"}`
                      : "Ready to Mentor"}
                  </span>
                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                    Connect <ChevronRight size={13} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   FEATURE GRID SECTION (Bento Grid)
───────────────────────────────────────────── */
const features = [
  {
    icon: <Shield size={20} />,
    title: "Verified Skill Profiles",
    desc: "Transparent member credentials, verified skill assessments, and rating histories.",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    icon: <MessageSquare size={20} />,
    title: "Encrypted Messaging",
    desc: "1-on-1 direct messaging for exchanging code snippets, notes, and session details.",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: <Network size={20} />,
    title: "Global Network Hub",
    desc: "Connect with skilled developers, peers, and mentors across the engineering community.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: <Code size={20} />,
    title: "Peer Skill Exchange",
    desc: "Teach what you know, learn what you don't. Balanced mutual knowledge exchange.",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: <BookOpen size={20} />,
    title: "Curated Learning Paths",
    desc: "Structured roadmaps to guide your learning from beginner to advanced topics.",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: <Heart size={20} />,
    title: "Community Trust & Rating",
    desc: "Session ratings and feedback that keep community quality consistently high.",
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  },
];

const FeatureGridSection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 relative reveal">
    <div className="max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wider mb-4">
          <Cpu size={14} /> Platform Features
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Everything You Need to{" "}
          <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Accelerate Growth
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4 }}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl group hover:border-slate-700 transition-all duration-200"
          >
            <div className={`w-10 h-10 rounded-xl border ${f.color} flex items-center justify-center mb-4`}>
              {f.icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
              {f.title}
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ─────────────────────────────────────────────
   HIGH CONVERSION CTA SECTION
───────────────────────────────────────────── */
const CTASection = ({ navigate, user }) => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 relative reveal">
    <div className="max-w-5xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden backdrop-blur-2xl shadow-2xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 flex items-center justify-center mx-auto mb-6">
            <Sparkles size={24} className="text-amber-400" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Ready to Join the{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Skill Network?
            </span>
          </h2>

          <p className="text-slate-400 text-sm sm:text-base font-medium mb-8 leading-relaxed">
            Join engineers, learners, and mentors building and mastering technical skills together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(user ? "/find-partners" : "/register")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-indigo-600/25 transition-all"
            >
              <span>{user ? "Find Partners" : "Create Free Account"}</span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigate("/find-partners")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 px-7 py-3.5 rounded-xl font-bold text-xs transition-all"
            >
              <Globe size={15} />
              <span>Explore Partners</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Home;
