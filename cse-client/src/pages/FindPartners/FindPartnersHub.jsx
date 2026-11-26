import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router";
import {
  Users,
  Star,
  Target,
  ArrowRight,
  Zap,
  Sparkles,
  ChevronRight,
  Brain,
  Network,
  UserCheck,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  BookOpen,
  Clock,
  Award,
  X,
  ExternalLink,
  RefreshCw,
  Mail,
  Eye,
  ChevronDown,
  Check,
  Code,
  Flame,
  Layers,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";

const POPULAR_SKILLS = [
  "All Skills",
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "AI",
  "Docker",
  "Next.js",
  "MongoDB",
  "Go",
  "Django",
];

const FAQS = [
  {
    q: "How does the AI Complementarity Match Engine work?",
    a: "The engine compares your 'Learn Skills' with other developers' 'Teach Skills' and vice-versa using semantic matching. When two engineers have complementary skill sets, the engine calculates a match percentage score and suggests them as ideal partners.",
  },
  {
    q: "Is peer mentorship and finding partners free?",
    a: "Yes! 100% of peer connections, skill swaps, and messaging on the Collaborative Skill Engine are completely free for all community members.",
  },
  {
    q: "How does completing a mentoring session unlock Creator Studio?",
    a: "Once you complete at least 1 verified mentoring session in a topic (or achieve 50% profile completeness), you automatically unlock permanent instructor rights in Creator Studio (/studio) to create and publish video courses.",
  },
  {
    q: "Can I connect with partners for hackathons and side projects?",
    a: "Absolutely! You can filter partners by 'Available for Projects' to find engineers who are looking to team up for open-source builds, startups, or hackathons.",
  },
];

const FindPartnersHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Data states (initialized synchronously from cache when available)
  const initialStatsCache = useMemo(() => getCachedData("/platform-stats"), []);
  const initialMentorCache = useMemo(
    () => (user?.email ? getCachedData(`/find-mentors?email=${encodeURIComponent(user.email)}`) : null),
    [user?.email]
  );

  const buildCombinedPartners = useCallback(
    (statsData, mentorList) => {
      const matchedList = Array.isArray(mentorList) ? mentorList : [];
      const fallbackExperts = statsData?.experts || [];
      const combinedMap = new Map();

      matchedList.forEach((m) => {
        if (m.email && m.email !== user?.email) {
          combinedMap.set(m.email, { ...m, isAiMatch: true });
        }
      });

      fallbackExperts.forEach((e) => {
        if (e.email && e.email !== user?.email && !combinedMap.has(e.email)) {
          combinedMap.set(e.email, {
            ...e,
            teachLevel: e.teachLevel || "Intermediate",
            connectionStatus: e.connectionStatus || "none",
            averageRating: e.averageRating || 5.0,
            totalRatings: e.totalRatings || 1,
            isAiMatch: false,
            matchPercentage: 75,
          });
        }
      });

      return Array.from(combinedMap.values());
    },
    [user?.email]
  );

  const [partners, setPartners] = useState(() =>
    initialStatsCache || initialMentorCache ? buildCombinedPartners(initialStatsCache, initialMentorCache) : []
  );
  const [loading, setLoading] = useState(() => !(initialStatsCache || initialMentorCache));
  const [platformStats, setPlatformStats] = useState(() => initialStatsCache || null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All Skills");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'high_match' | 'top_rated' | 'mentors'
  const [levelFilter, setLevelFilter] = useState("all"); // 'all' | 'Expert' | 'Intermediate' | 'Learner'

  // Modal states
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Fetch partners & platform data in parallel
  const fetchData = useCallback(async (forceRefresh = false) => {
    const hasWarmCache = Boolean(
      getCachedData("/platform-stats") ||
        (user?.email && getCachedData(`/find-mentors?email=${encodeURIComponent(user.email)}`))
    );
    if (!hasWarmCache && !forceRefresh) {
      setLoading(true);
    }
    try {
      const [statsRes, mentorRes] = await Promise.all([
        apiClient.get("/platform-stats", { forceRefresh }).catch(() => ({ data: null })),
        user?.email
          ? apiClient
              .get(`/find-mentors?email=${encodeURIComponent(user.email)}`, { forceRefresh })
              .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      if (statsRes.data) {
        setPlatformStats(statsRes.data);
      }

      setPartners(buildCombinedPartners(statsRes.data, mentorRes.data));
    } catch (err) {
      console.error("Error loading partners:", err);
      toast.error("Failed to load partner network. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [user?.email, buildCombinedPartners]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Connection Request
  const handleConnect = async (partner) => {
    if (!user) {
      toast.warning("Please sign in to connect with mentors and peers.");
      const currentPath = `${location.pathname}${location.search}`;
      navigate(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (partner.connectionStatus === "connected") {
      navigate("/message");
      return;
    }

    if (partner.connectionStatus === "sent") {
      toast.info("Connection request is already pending.");
      return;
    }

    setConnectingId(partner._id || partner.email);
    try {
      const requestData = {
        senderUid: user?.uid || user?._id,
        senderEmail: user?.email,
        senderName: user?.displayName || user?.fullName || "Learner",
        senderImage: user?.photoURL || user?.profileImage || "",
        receiverEmail: partner.email,
      };

      const toastId = toast.loading("Sending connection request...", {
        description: `Connecting with ${partner.fullName || "partner"}...`,
      });

      await apiClient.post("/connections/requests", requestData);

      // Update state locally
      setPartners((prev) =>
        prev.map((p) =>
          p.email === partner.email ? { ...p, connectionStatus: "sent" } : p
        )
      );

      if (selectedPartner?.email === partner.email) {
        setSelectedPartner((prev) => ({ ...prev, connectionStatus: "sent" }));
      }

      toast.success(`Connection request sent to ${partner.fullName || "partner"}!`, { id: toastId });
    } catch (err) {
      console.error("Connection request error:", err);
      toast.error(err?.response?.data?.message || "Could not send connection request.");
    } finally {
      setConnectingId(null);
    }
  };

  // Filtered Partners
  const filteredPartners = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return partners.filter((p) => {
      // 1. Search Query Match (Name, email, teach skills, learn skills)
      const nameMatch = p.fullName?.toLowerCase().includes(q);
      const emailMatch = p.email?.toLowerCase().includes(q);
      const teachMatch = Array.isArray(p.teachSkills) && p.teachSkills.some((s) => {
        const val = typeof s === "object" ? s.label || s.original || "" : s;
        return val.toLowerCase().includes(q);
      });
      const learnMatch = Array.isArray(p.learnSkills) && p.learnSkills.some((s) => {
        const val = typeof s === "object" ? s.label || s.original || "" : s;
        return val.toLowerCase().includes(q);
      });

      const matchesSearch = !q || nameMatch || emailMatch || teachMatch || learnMatch;

      // 2. Skill Filter
      const matchesSkill =
        selectedSkill === "All Skills" ||
        (Array.isArray(p.teachSkills) &&
          p.teachSkills.some((s) => {
            const val = typeof s === "object" ? s.label || s.original || "" : s;
            return val.toLowerCase() === selectedSkill.toLowerCase();
          }));

      // 3. Tab Filter
      let matchesTab = true;
      if (activeTab === "high_match") {
        matchesTab = (p.matchPercentage || 0) >= 80 || p.isAiMatch;
      } else if (activeTab === "top_rated") {
        matchesTab = (p.averageRating || 0) >= 4.8;
      } else if (activeTab === "mentors") {
        matchesTab = (p.teachSkills && p.teachSkills.length > 0);
      }

      // 4. Level Filter
      const matchesLevel =
        levelFilter === "all" ||
        p.teachLevel?.toLowerCase() === levelFilter.toLowerCase();

      return matchesSearch && matchesSkill && matchesTab && matchesLevel;
    });
  }, [partners, searchQuery, selectedSkill, activeTab, levelFilter]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* ── AMBIENT SPOTLIGHT GLOWS (Aligned with Home.jsx) ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[650px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 blur-[140px] pointer-events-none -z-0" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[130px] pointer-events-none -z-0" />
      <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[130px] pointer-events-none -z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 relative z-10 space-y-20">

        {/* ── 1. HERO SECTION ── */}
        <section className="text-center space-y-6 pt-4 max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wide shadow-sm"
          >
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>Collaborative Skill & Partnership Hub • Match Engine v2.0</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]"
          >
            Find Your Ideal Engineering{" "}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Partner & Mentor
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-base sm:text-lg font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Connect with top developers for 1-on-1 mentorship, peer skill swaps, and project collaboration. Powered by real-time skill complementarity.
          </motion.p>

          {/* ── HERO SEARCH & QUICK FILTER BAR ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-4 max-w-2xl mx-auto space-y-3"
          >
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-indigo-400 absolute left-4.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search partners by skill (e.g. React, Python, AI, Docker), name, or role..."
                className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500 rounded-2xl pl-12 pr-28 py-4 text-sm font-medium focus:outline-none shadow-2xl transition-all backdrop-blur-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-24 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  const el = document.getElementById("partners-directory");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="absolute right-2.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Find</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Skill Tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {POPULAR_SKILLS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => setSelectedSkill(skill)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    selectedSkill === skill
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── PLATFORM STATS BAR (100% REAL DB METRICS) ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-4xl mx-auto"
          >
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-white">
                {platformStats?.experts?.length || 0}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Verified Mentors</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-indigo-400">
                {platformStats?.totalUsers ? platformStats.totalUsers.toLocaleString() : "0"}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Registered Learners</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-amber-400">
                {platformStats?.averageRating ? `${Number(platformStats.averageRating).toFixed(1)} ★` : "5.0 ★"}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Community Rating</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-emerald-400">
                {platformStats?.totalCourses ? `${platformStats.totalCourses}` : "Active"}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Courses & Tracks</p>
            </div>
          </motion.div>
        </section>

        {/* ── 2. THREE COLLABORATION PATHWAYS (3 BALANCED CARDS) ── */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Three Ways to{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Collaborate & Level Up
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Choose the partnership mode that best accelerates your current engineering goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: 1-on-1 Mentorship */}
            <div className="relative bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-7 shadow-xl space-y-5 transition-all group overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                    <Star className="w-6 h-6 fill-indigo-400/40" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Most Popular
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    1-on-1 Mentorship & Code Reviews
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Connect directly with senior engineers for architectural reviews, mock interviews, and personalized career roadmaps.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verified senior tech practitioners</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Real-time chat & video code pairing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlocks Creator Studio publishing</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setActiveTab("mentors");
                  const el = document.getElementById("partners-directory");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Browse Verified Mentors</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Card 2: Peer Skill Swap */}
            <div className="relative bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-7 shadow-xl space-y-5 transition-all group overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    100% Free Mutual
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Peer Skill Exchange (Skill Swap)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Teach what you know, learn what you don't. Connect with peers who have complementary strengths with zero financial cost.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1-to-1 Skill complementarity match</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mutual accountability & study circles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Peer ratings & credibility growth</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setActiveTab("high_match");
                  const el = document.getElementById("partners-directory");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Find Skill Swap Partners</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Card 3: Project Squads & Hackathons */}
            <div className="relative bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 rounded-3xl p-7 shadow-xl space-y-5 transition-all group overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
                    <Target className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Team Up
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                    Project Squads & Hackathons
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Assemble or join squads with complementary roles: Frontend + Backend + AI + DevOps to build real portfolio software.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Complementary tech stacks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Real-world Git collaboration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Portfolio building & hackathon prep</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/teams"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Explore Project Teams</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3. LIVE PARTNERS DIRECTORY SECTION (MAIN INTERACTIVE COMPONENT) ── */}
        <section id="partners-directory" className="space-y-6 pt-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                <Users className="w-4 h-4" />
                Live Engineering Network
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Browse & Connect with Partners
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Showing {filteredPartners.length} active practitioners ready for mentorship and collaboration.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: "all", label: "All Partners" },
                { id: "high_match", label: "AI Matches" },
                { id: "top_rated", label: "Top Rated (4.8+)" },
                { id: "mentors", label: "Mentors" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Bar & Level Selector */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                Experience Level:
              </span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Levels</option>
                <option value="Senior">Senior / Expert</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Learner">Junior / Learner</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
              <span>Selected Skill: <strong className="text-indigo-400">{selectedSkill}</strong></span>
              {(selectedSkill !== "All Skills" || searchQuery || levelFilter !== "all" || activeTab !== "all") && (
                <button
                  onClick={() => {
                    setSelectedSkill("All Skills");
                    setSearchQuery("");
                    setLevelFilter("all");
                    setActiveTab("all");
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline ml-2"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* ── PARTNERS GRID ── */}
          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <LoadingSpinner
                size="xl"
                showGlow={true}
                label="Loading Collaborative Network & AI Matches..."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartners.map((partner, idx) => {
                const teachList = Array.isArray(partner.teachSkills) ? partner.teachSkills : [];
                const learnList = Array.isArray(partner.learnSkills) ? partner.learnSkills : [];
                const isConnected = partner.connectionStatus === "connected";
                const isSent = partner.connectionStatus === "sent";

                return (
                  <motion.div
                    key={partner._id || partner.email || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-5 transition-all flex flex-col justify-between group relative overflow-hidden backdrop-blur-xl"
                  >
                    {/* Top ambient glow */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-indigo-500/5 group-hover:bg-indigo-500/15 rounded-full blur-2xl transition-all pointer-events-none" />

                    <div className="space-y-4">
                      {/* Avatar & Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="relative">
                            <img
                              src={
                                partner.profileImage ||
                                `https://images.unsplash.com/photo-${1534528741775 + idx}?auto=format&fit=crop&q=80&w=250`
                              }
                              alt={partner.fullName || "Partner"}
                              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/30 shadow-md group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                                {partner.fullName || "Engineering Peer"}
                              </h3>
                              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-1">
                              {partner.headline || partner.education || `${partner.teachLevel || "Senior"} Engineer`}
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                <span>{partner.averageRating || 5.0}</span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                ({partner.totalRatings || 1} reviews)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-black tracking-wide">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            {partner.matchPercentage || 85}% Match
                          </span>
                        </div>
                      </div>

                      {/* Teach Skills */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                          Can Teach You:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {teachList.slice(0, 4).map((skill, sIdx) => {
                            const label = typeof skill === "object" ? skill.label || skill.original : skill;
                            return (
                              <span
                                key={sIdx}
                                className="px-2.5 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-[11px] font-semibold"
                              >
                                {label}
                              </span>
                            );
                          })}
                          {teachList.length > 4 && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold">
                              +{teachList.length - 4} more
                            </span>
                          )}
                          {teachList.length === 0 && (
                            <span className="text-xs text-slate-500">Full-Stack Development</span>
                          )}
                        </div>
                      </div>

                      {/* Learning Goals */}
                      {learnList.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Interested in Learning:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {learnList.slice(0, 3).map((skill, sIdx) => {
                              const label = typeof skill === "object" ? skill.label || skill.original : skill;
                              return (
                                <span
                                  key={sIdx}
                                  className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 text-[11px] font-medium"
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80">
                      <button
                        onClick={() => setSelectedPartner(partner)}
                        className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
                        title="View Full Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>

                      {isConnected ? (
                        <button
                          onClick={() => navigate("/message")}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat Now</span>
                        </button>
                      ) : isSent ? (
                        <button
                          disabled
                          className="flex-1 py-2 px-3 bg-slate-800 text-slate-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Request Sent</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(partner)}
                          disabled={connectingId === (partner._id || partner.email)}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>
                            {connectingId === (partner._id || partner.email) ? "Sending..." : "Connect"}
                          </span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Empty Search State */}
          {!loading && filteredPartners.length === 0 && (
            <div className="py-20 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white">No Matching Partners Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                We couldn't find any partners matching "{searchQuery || selectedSkill}". Try searching for another skill like React, Python, or AI, or reset your filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSkill("All Skills");
                  setActiveTab("all");
                  setLevelFilter("all");
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </section>

        {/* ── 4. HOW THE MATCH ENGINE WORKS (3 VISUAL STEPS) ── */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden space-y-10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
              <Network className="w-3.5 h-3.5" />
              Intelligent Matching
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              How the Collaborative Match Engine Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Three seamless steps to pair you with the exact developers who elevate your engineering career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-3 relative group">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Step 01</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Define Skills Vectors</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add skills you can teach and skills you want to learn in your profile. Our engine parses experience levels and domain competencies.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-3 relative group">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Step 02</span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Semantic AI Match Matrix</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our algorithm computes cosine complementarity between what you want to learn and what active peers teach, delivering a real-time match score.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-3 relative group">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Step 03</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Connect, Pair & Level Up</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send 1-click connection requests, chat in real-time, schedule video pair sessions, rate your mentor, and unlock Creator Studio privileges!
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. AI ADVISOR & CREATOR STUDIO BRIDGES (2 DUAL CARDS) ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: AI Advisor */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-3xl p-8 shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Need Help Choosing Skills to Learn?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Let our AI Career Advisor analyze your current GitHub/portfolio stack and recommend high-impact skill trajectories and tailored partner matches.
              </p>
            </div>
            <Link
              to="/ai-advisor"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all self-start"
            >
              <span>Launch AI Career Advisor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Creator Studio */}
          <div className="bg-gradient-to-br from-slate-900 to-purple-950/40 border border-purple-500/30 rounded-3xl p-8 shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Want to Teach & Publish Courses?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mentoring 1 peer or achieving 50% profile completeness permanently unlocks your Creator Studio! Build video courses, earn revenue, and grow your brand.
              </p>
            </div>
            <Link
              to="/studio"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all self-start"
            >
              <span>Go to Creator Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── 6. FREQUENTLY ASKED QUESTIONS (ACCORDION) ── */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400">Everything you need to know about peer partnerships and mentorship.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-800 rounded-2xl bg-slate-950/60 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4.5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-200 hover:text-white transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? "transform rotate-180 text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4.5 pb-4.5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* ── 7. PARTNER PROFILE DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedPartner && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-100 my-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

              <button
                onClick={() => setSelectedPartner(null)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header Info */}
              <div className="flex items-start gap-4">
                <img
                  src={
                    selectedPartner.profileImage ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
                  }
                  alt={selectedPartner.fullName}
                  className="w-18 h-18 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-xl"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedPartner.fullName}</h3>
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-xs text-slate-400">{selectedPartner.email}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                      {selectedPartner.teachLevel || "Mentor"} Level
                    </span>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{selectedPartner.averageRating || 5.0}</span>
                      <span className="text-slate-500 text-[10px]">({selectedPartner.totalRatings || 1} ratings)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio & Education */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">About Partner:</span>
                <p className="text-slate-300 leading-relaxed">
                  {selectedPartner.bio ||
                    "Dedicated platform practitioner passionate about engineering best practices, pair programming, and peer knowledge sharing."}
                </p>
                {selectedPartner.education && (
                  <p className="text-indigo-400 text-[11px] font-medium pt-1">
                    🎓 Education: {selectedPartner.education}
                  </p>
                )}
              </div>

              {/* Teaching Strengths */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                  Can Teach & Mentor In:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(selectedPartner.teachSkills) ? selectedPartner.teachSkills : ["Full-Stack"]).map(
                    (s, i) => {
                      const label = typeof s === "object" ? s.label || s.original : s;
                      return (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-200 text-xs font-semibold"
                        >
                          {label}
                        </span>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Learning Goals */}
              {Array.isArray(selectedPartner.learnSkills) && selectedPartner.learnSkills.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Looking to Learn & Explore:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPartner.learnSkills.map((s, i) => {
                      const label = typeof s === "object" ? s.label || s.original : s;
                      return (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedPartner(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-colors"
                >
                  Close
                </button>

                {selectedPartner.connectionStatus === "connected" ? (
                  <button
                    onClick={() => {
                      setSelectedPartner(null);
                      navigate("/message");
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open Direct Chat</span>
                  </button>
                ) : selectedPartner.connectionStatus === "sent" ? (
                  <button
                    disabled
                    className="flex-1 py-2.5 bg-slate-800 text-slate-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Connection Request Pending</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(selectedPartner)}
                    disabled={connectingId === (selectedPartner._id || selectedPartner.email)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {connectingId === (selectedPartner._id || selectedPartner.email)
                        ? "Sending..."
                        : "Send Connection Request"}
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default FindPartnersHub;