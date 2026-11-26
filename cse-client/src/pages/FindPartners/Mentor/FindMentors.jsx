import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  ArrowRight,
  Users,
  Filter,
  CheckCircle2,
  Award,
  Zap,
  Star,
  SlidersHorizontal,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Compass,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import { toast } from "@/components/ui/toast-system";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import useAuth from "@/hooks/useAuth";
import MentorCard from "./MentorCard";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";
import { getSocket } from "@/lib/socket";

const POPULAR_SKILL_TAGS = [
  "React",
  "Python",
  "Node.js",
  "Machine Learning",
  "Docker",
  "Tailwind CSS",
  "System Design",
  "TypeScript",
  "Data Science",
];

const HYBRID_SUGGESTIONS = [
  "Build real-time computer vision with PyTorch and deploy on FastAPI",
  "Master Next.js 15 App Router, Server Actions and Postgres indexing",
  "Scale distributed microservices with Redis caching and Docker",
  "UI/UX Design Systems, Figma auto-layout and user journey prototyping",
  "Machine Learning Scikit-Learn data science and statistics foundations",
];

const FindMentors = () => {
  const { user } = useAuth();
  const initialMentors = useMemo(
    () => (user?.email ? getCachedData(`/find-mentors?email=${encodeURIComponent(user.email)}`) : null),
    [user?.email]
  );
  const [mentors, setMentors] = useState(() => initialMentors || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [sortBy, setSortBy] = useState("match"); // "match" | "rating" | "skills" | "name"
  const [loading, setLoading] = useState(() => !initialMentors);

  // Hybrid Vector Retrieval State
  const [searchMode, setSearchMode] = useState("keyword"); // "keyword" | "hybrid"
  const [hybridQuery, setHybridQuery] = useState("");
  const [hybridAlpha, setHybridAlpha] = useState(0.65); // 0.65 dense + 0.35 BM25
  const [hybridLoading, setHybridLoading] = useState(false);
  const [hybridResults, setHybridResults] = useState(null);

  const handleRunHybridSearch = async (customQuery, customAlpha) => {
    const q = customQuery !== undefined ? customQuery : hybridQuery;
    const activeAlpha = customAlpha !== undefined ? customAlpha : hybridAlpha;
    if (!q.trim() || !user) return;

    const payload = {
      query: q.trim(),
      email: user.email || "",
      alpha: activeAlpha,
      limit: 15,
    };

    try {
      setHybridLoading(true);
      let res;
      try {
        res = await apiClient.post("/api/mentors/hybrid-recommend", payload, { timeout: 45000 });
      } catch (firstErr) {
        const st = firstErr?.response?.status;
        if (!firstErr?.response || st === 502 || st === 503 || st === 504) {
          await new Promise((r) => setTimeout(r, 2000));
          res = await apiClient.post("/api/mentors/hybrid-recommend", payload, { timeout: 45000 });
        } else {
          throw firstErr;
        }
      }
      const list = Array.isArray(res?.data) ? res.data : [];
      setHybridResults(list);
      if (list.length > 0) {
        toast.success(`Hybrid retrieval matched ${list.length} relevant mentor${list.length > 1 ? "s" : ""}!`);
      } else {
        toast.info("No relevant mentors matched your query.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Hybrid vector search failed.";
      toast.error(msg);
    } finally {
      setHybridLoading(false);
    }
  };

  const fetchMentors = async (forceRefresh = false) => {
    if (!user?.email) return;
    const url = `/find-mentors?email=${encodeURIComponent(user.email)}`;
    if (!getCachedData(url) && !forceRefresh) {
      setLoading(true);
    }

    try {
      const res = await apiClient.get(url, {
        forceRefresh,
        onUpdate: (fresh) => Array.isArray(fresh) && setMentors(fresh),
      });
      setMentors(res.data || []);
    } catch (error) {
      if (!getCachedData(url)) setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors(false);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("presence:join", { email: user.email });

    const onConnectionsUpdated = () => fetchMentors(true);
    socket.on("connections:updated", onConnectionsUpdated);
    return () => {
      socket.off("connections:updated", onConnectionsUpdated);
    };
  }, [user?.email]);

  // Level counts for quick badges
  const levelCounts = useMemo(() => {
    const counts = { all: mentors.length, expert: 0, intermediate: 0, beginner: 0 };
    mentors.forEach((m) => {
      const lvl = (m.teachLevel || "").toLowerCase();
      if (lvl.includes("expert") || lvl.includes("lead") || lvl.includes("senior")) {
        counts.expert += 1;
      } else if (lvl.includes("intermediate") || lvl.includes("mid") || lvl.includes("specialist")) {
        counts.intermediate += 1;
      } else {
        counts.beginner += 1;
      }
    });
    return counts;
  }, [mentors]);

  // Filtered & Sorted Mentors
  const processedMentors = useMemo(() => {
    if (searchMode === "hybrid" && hybridResults !== null) {
      return hybridResults;
    }

    const term = searchTerm.trim().toLowerCase();

    // 1. Filter
    const filtered = mentors.filter((m) => {
      const nameMatch = m.fullName?.toLowerCase().includes(term);
      const headlineMatch = m.headline?.toLowerCase().includes(term);
      const bioMatch = m.bio?.toLowerCase().includes(term);
      const skillMatch = m.teachSkills?.some((s) => {
        const name = typeof s === "object" ? s.label || s.original || "" : s;
        return name.toLowerCase().includes(term);
      });
      const matchedSkillMatch = m.matchedSkills?.some((s) =>
        s.learnSkill?.toLowerCase().includes(term)
      );

      const matchesSearch =
        !term || nameMatch || headlineMatch || bioMatch || skillMatch || matchedSkillMatch;

      // Level Match
      let matchesLevel = true;
      if (selectedLevel !== "all") {
        const lvl = (m.teachLevel || "").toLowerCase();
        if (selectedLevel === "expert") {
          matchesLevel = lvl.includes("expert") || lvl.includes("lead") || lvl.includes("senior");
        } else if (selectedLevel === "intermediate") {
          matchesLevel = lvl.includes("intermediate") || lvl.includes("mid") || lvl.includes("specialist");
        } else if (selectedLevel === "beginner") {
          matchesLevel = !lvl.includes("expert") && !lvl.includes("lead") && !lvl.includes("senior") && !lvl.includes("intermediate");
        }
      }

      return matchesSearch && matchesLevel;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "rating") {
        const ratingA = Number(a.averageRating || 0);
        const ratingB = Number(b.averageRating || 0);
        if (ratingB !== ratingA) return ratingB - ratingA;
        return Number(b.totalRatings || 0) - Number(a.totalRatings || 0);
      }
      if (sortBy === "skills") {
        return (b.teachSkills?.length || 0) - (a.teachSkills?.length || 0);
      }
      if (sortBy === "name") {
        return (a.fullName || "").localeCompare(b.fullName || "");
      }
      // Default: "match"
      const matchA = typeof a.matchPercentage === "number" ? a.matchPercentage : 85;
      const matchB = typeof b.matchPercentage === "number" ? b.matchPercentage : 85;
      return matchB - matchA;
    });
  }, [mentors, searchTerm, selectedLevel, sortBy, searchMode, hybridResults]);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-transparent text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Ambient Radial Spotlight Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        {/* Header Hero Section */}
        <header className="relative flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wider uppercase shadow-xs">
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span>Verified Mentor & Expert Network</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
              Connect With{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                World-Class Mentors
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
              Find verified industry leaders, peer specialists, and experienced engineers aligned with your learning path. Elevate your technical mastery through 1-on-1 mentorship.
            </p>
          </motion.div>

          {/* Micro Stats Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0 bg-slate-900/60 border border-slate-800/80 p-3 sm:p-4 rounded-2xl backdrop-blur-xl shadow-lg"
          >
            <div className="text-center px-2 sm:px-4 border-r border-slate-800/80">
              <div className="text-lg sm:text-2xl font-black text-white flex items-center justify-center gap-1">
                <span>{mentors.length}</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Experts
              </div>
            </div>

            <div className="text-center px-2 sm:px-4 border-r border-slate-800/80">
              <div className="text-lg sm:text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
                <span>99%</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Match Accuracy
              </div>
            </div>

            <div className="text-center px-2 sm:px-4">
              <div className="text-lg sm:text-2xl font-black text-indigo-400 flex items-center justify-center gap-1">
                <ShieldCheck size={18} className="text-indigo-400 hidden sm:inline" />
                <span>100%</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Verified Peers
              </div>
            </div>
          </motion.div>
        </header>

        {/* Search, Filter Tabs & Sort Toolbar */}
        <section className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-xl space-y-5">
          {/* Search Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
              <button
                onClick={() => setSearchMode("keyword")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  searchMode === "keyword"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Search size={13} />
                <span>Keyword Search</span>
              </button>

              <button
                onClick={() => setSearchMode("hybrid")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  searchMode === "hybrid"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles size={13} className="text-purple-300" />
                <span>AI Hybrid Vector Search (Dense + BM25)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-400/20 text-purple-300 text-[9px] font-extrabold uppercase">
                  Bi-Encoder
                </span>
              </button>
            </div>

            {searchMode === "hybrid" && hybridResults && (
              <button
                onClick={() => {
                  setHybridResults(null);
                  setHybridQuery("");
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                Clear AI Results & Show All
              </button>
            )}
          </div>

          {/* HYBRID VECTOR SEARCH PANEL */}
          {searchMode === "hybrid" ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                    <Sparkles size={18} />
                  </div>
                  <input
                    type="text"
                    value={hybridQuery}
                    onChange={(e) => setHybridQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRunHybridSearch();
                    }}
                    placeholder="Describe what you want to learn (e.g. Build computer vision models with PyTorch on FastAPI)..."
                    className="w-full bg-slate-950/90 border border-purple-500/40 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
                  />
                </div>

                <button
                  disabled={hybridLoading || !hybridQuery.trim()}
                  onClick={() => handleRunHybridSearch()}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition shadow-lg shadow-purple-600/25 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  {hybridLoading ? (
                    <>
                      <ButtonSpinner size="xs" />
                      <span>Computing Cosine & BM25...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Run Hybrid AI Match</span>
                    </>
                  )}
                </button>
              </div>

              {/* Balance Preset Slider Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={13} className="text-purple-400" />
                  <span className="font-semibold text-slate-300">Retrieval Blend:</span>
                  <span className="text-[11px] text-purple-300 font-mono">
                    {Math.round(hybridAlpha * 100)}% Dense Semantic + {Math.round((1 - hybridAlpha) * 100)}% BM25 Sparse
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[
                    { label: "Semantic Heavy", alpha: 0.8 },
                    { label: "Balanced (Recommended)", alpha: 0.65 },
                    { label: "Exact Keyword Heavy", alpha: 0.4 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setHybridAlpha(preset.alpha);
                        if (hybridResults !== null && hybridQuery.trim()) {
                          handleRunHybridSearch(hybridQuery, preset.alpha);
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition ${
                        hybridAlpha === preset.alpha
                          ? "bg-purple-600/30 border-purple-500 text-purple-200"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Suggestions Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Try asking queries like:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {HYBRID_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setHybridQuery(suggestion);
                        handleRunHybridSearch(suggestion);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/50 hover:text-purple-300 text-slate-400 transition text-left"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD KEYWORD SEARCH PANEL */
            <>
              {/* Row 1: Search Input & Sort Dropdown */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 w-full group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search mentors by name, expertise, skill (e.g. React, Python), or keywords..."
                    className="w-full bg-slate-950/80 border border-slate-800/90 rounded-2xl py-3 pl-11 pr-10 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="relative w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-300">
                      <SlidersHorizontal size={14} className="text-indigo-400 shrink-0" />
                      <span className="text-slate-400 uppercase text-[10px] tracking-wider hidden sm:inline">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer pr-2"
                      >
                        <option value="match" className="bg-slate-900 text-white">Best Match</option>
                        <option value="rating" className="bg-slate-900 text-white">Highest Rated</option>
                        <option value="skills" className="bg-slate-900 text-white">Most Skills</option>
                        <option value="name" className="bg-slate-900 text-white">Name (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={fetchMentors}
                    title="Refresh Mentor Network"
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-indigo-500/50 text-slate-400 hover:text-white transition-all shadow-sm"
                  >
                    <RefreshCw size={15} className={loading ? "animate-spin text-indigo-400" : ""} />
                  </button>
                </div>
              </div>

              {/* Row 2: Level Navigation Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden md:inline">
                  Filter Level:
                </span>

                {[
                  { id: "all", label: "All Mentors", icon: Users, count: levelCounts.all },
                  { id: "expert", label: "Lead Experts", icon: Award, count: levelCounts.expert },
                  { id: "intermediate", label: "Specialists", icon: Zap, count: levelCounts.intermediate },
                  { id: "beginner", label: "Practitioners", icon: CheckCircle2, count: levelCounts.beginner },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = selectedLevel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedLevel(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                          : "bg-slate-950/70 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Icon size={13} className={isActive ? "text-white" : "text-slate-500"} />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Quick Skill Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Popular Skills:
                </span>
                {POPULAR_SKILL_TAGS.map((tag) => {
                  const isSelected = searchTerm.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      onClick={() => setSearchTerm(isSelected ? "" : tag)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Results Counter Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/40 border border-slate-800/60 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Compass size={14} className="text-indigo-400" />
            <span>
              Showing {processedMentors.length} of {mentors.length} Verified Mentors
            </span>
            {(searchMode === "hybrid" && hybridResults !== null ? hybridQuery.trim() : searchTerm) && (
              <span className="text-indigo-400 font-mono text-[11px]">
                matching "{searchMode === "hybrid" && hybridResults !== null ? hybridQuery.trim() : searchTerm}"
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
            {searchMode === "hybrid" && hybridResults !== null
              ? "Hybrid Vector + BM25 Ranking Active"
              : "Intelligent Skill Complementarity Active"}
          </span>
        </div>

        {/* Loading State vs Grid */}
        {loading ? (
          <div className="min-h-[50vh] flex flex-col justify-center items-center py-24 bg-slate-900/30 border border-slate-800/60 rounded-3xl backdrop-blur-xl">
            <LoadingSpinner size="lg" label="Surfacing your verified mentor matches..." />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {processedMentors.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                layout
              >
                {processedMentors.map((m, idx) => (
                  <MentorCard
                    key={m._id || m.email}
                    mentor={m}
                    index={idx}
                    refetch={fetchMentors}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-28 bg-slate-900/40 rounded-3xl border border-slate-800 backdrop-blur-xl"
              >
                <div className="mb-4 inline-flex p-5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Search size={36} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                  No Matching Mentors Found
                </h3>
                <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto font-medium leading-relaxed">
                  We couldn't find any mentors matching your current search or filter filters. Try clearing tags or searching broader skills.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedLevel("all");
                    setSortBy("match");
                    setHybridResults(null);
                    setHybridQuery("");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30"
                >
                  <span>Reset All Filters</span>
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default FindMentors;
