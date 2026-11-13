import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Compass,
  Sparkles,
  GitBranch,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  Award,
  Zap,
  Target,
  BookOpen,
  Filter,
  Check,
  TrendingUp,
  Users,
  Star,
  ExternalLink,
  Search,
  X,
  ChevronDown,
  UploadCloud,
  FileText,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/components/ui/toast-system";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import SkillGraphVisualizer from "@/components/skillGraph/SkillGraphVisualizer";
import CvUploadModal from "@/components/skillGraph/CvUploadModal";

const DOMAIN_GROUPS = [
  { id: "all", label: "All CS Disciplines (18)", icon: "🌐" },
  { id: "ai", label: "AI, ML & Robotics", icon: "🤖", domains: ["Artificial Intelligence", "Data Science & ML", "Data Engineering", "Robotics & Perception"] },
  { id: "web", label: "Web & Mobile", icon: "💻", domains: ["Web & Enterprise", "Frontend Architecture", "Backend Systems", "Mobile Development"] },
  { id: "cloud", label: "Cloud & DevOps", icon: "☁️", domains: ["Cloud & DevOps"] },
  { id: "security", label: "Cyber & Web3", icon: "🛡️", domains: ["Cybersecurity", "Web3 & Decentralization"] },
  { id: "systems", label: "Low-Level & Hardware", icon: "⚙️", domains: ["Embedded & Hardware", "Low-Level Systems"] },
  { id: "creative", label: "Gaming, QA & Design", icon: "🎮", domains: ["Game Development", "Quality Assurance", "Product Design"] },
];

const AVAILABLE_CATEGORIES = [
  "all",
  "Core",
  "Frontend",
  "Backend",
  "AI/ML",
  "DevOps",
  "Mobile",
  "Cybersecurity",
  "Data Engineering",
  "Computer Vision",
  "Systems",
  "Embedded/IoT",
  "Game Development",
  "Blockchain/Web3",
  "QA & Testing",
  "Design",
];

const SkillGraphPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [careerTracks, setCareerTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState("ai-engineer");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("graph"); // "graph" | "unlockable" | "path"
  const [viewMode, setViewMode] = useState("personalized"); // "personalized" | "full"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDomainGroup, setSelectedDomainGroup] = useState("all");
  const [trackSearch, setTrackSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial graph ontology and gap analysis from user's portfolio and profile
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const ontoRes = await apiClient.get("/api/skill-graph/ontology");
        setCareerTracks(ontoRes.data.careerTracks || []);

        const initialSkills = [
          ...(user?.teachSkills || []),
          ...(user?.learnSkills || []),
        ];

        const gapRes = await apiClient.post("/api/skill-graph/gap-analysis", {
          userSkills: initialSkills,
          careerTrackId: selectedTrackId,
          email: user?.email,
        });

        const data = gapRes.data;
        setAnalysisResult(data);

        // If user is registered but has no CV or skills yet, open CV modal
        if (user?.email && data.hasCvOrSkills === false) {
          setIsCvModalOpen(true);
        }

        // Auto-select user's best recommended track if available
        if (data.evaluatedCareerTracks?.length > 0) {
          const recommended = data.evaluatedCareerTracks.find((t) => t.isRecommended);
          if (recommended && recommended.id !== selectedTrackId) {
            setSelectedTrackId(recommended.id);
          }
        }
      } catch (err) {
        console.error("[SkillGraphPage] init error:", err);
        if (user?.email) {
          setIsCvModalOpen(true);
        }
        toast.error("Upload your CV to calculate your exact personalized roadmap.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user?.email]);

  // Re-run gap analysis when track changes
  const handleSelectTrack = async (trackId) => {
    setSelectedTrackId(trackId);
    try {
      setAnalyzing(true);
      const res = await apiClient.post("/api/skill-graph/gap-analysis", {
        userSkills: [
          ...(user?.teachSkills || []),
          ...(user?.learnSkills || []),
        ],
        careerTrackId: trackId,
        email: user?.email,
      });
      setAnalysisResult(res.data);
    } catch {
      toast.error("Could not update career path analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Sync with current user profile and portfolio projects
  const handleSyncProfile = async () => {
    try {
      setAnalyzing(true);
      const res = await apiClient.post("/api/skill-graph/gap-analysis", {
        userSkills: [
          ...(user?.teachSkills || []),
          ...(user?.learnSkills || []),
        ],
        careerTrackId: selectedTrackId,
        email: user?.email,
      });
      setAnalysisResult(res.data);
      const count = res.data?.portfolioSourceInfo?.skillsCount || res.data?.effectiveSkills?.length;
      toast.success(
        count
          ? `Synced ${count} competencies directly from your portfolio and projects!`
          : "Skill graph updated with your portfolio!"
      );
    } catch {
      toast.error("Failed to sync profile skills.");
    } finally {
      setAnalyzing(false);
    }
  };

  const metrics = analysisResult?.metrics || {
    matchScore: 0,
    totalTrackNodes: 0,
    masteredCount: 0,
    gapCount: 0,
    immediateUnlockableCount: 0,
    estimatedRemainingHours: 0,
    estimatedWeeks: 0,
  };

  const allEvaluatedTracks =
    analysisResult?.evaluatedCareerTracks?.length > 0
      ? analysisResult.evaluatedCareerTracks
      : careerTracks;

  const displayedTracks = useMemo(() => {
    return allEvaluatedTracks.filter((track) => {
      // 1. Group filter
      if (selectedDomainGroup !== "all") {
        const groupObj = DOMAIN_GROUPS.find((g) => g.id === selectedDomainGroup);
        if (groupObj && !groupObj.domains.includes(track.domain)) {
          return false;
        }
      }
      // 2. Search query filter
      if (trackSearch.trim()) {
        const q = trackSearch.toLowerCase().trim();
        const matchesTitle = track.title?.toLowerCase().includes(q);
        const matchesDomain = track.domain?.toLowerCase().includes(q);
        const matchesDesc = track.description?.toLowerCase().includes(q);
        const matchesBadge = track.badge?.toLowerCase().includes(q);
        const matchesSkills = (track.targetSkills || []).some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDomain && !matchesDesc && !matchesBadge && !matchesSkills) {
          return false;
        }
      }
      return true;
    });
  }, [allEvaluatedTracks, selectedDomainGroup, trackSearch]);

  const selectedTrack = useMemo(() => {
    return (
      allEvaluatedTracks.find((t) => t.id === selectedTrackId) ||
      allEvaluatedTracks[0] ||
      null
    );
  }, [allEvaluatedTracks, selectedTrackId]);

  const skillResources = analysisResult?.skillResources || {};

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-4 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <ButtonSpinner size="md" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-white">Loading Skill Graph & AI Path...</h3>
          <p className="text-xs text-slate-400">Synthesizing competencies and career track ontology</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-transparent text-slate-100 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Background ambient spotlight glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-transparent blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header Title Section - Clean and Professional */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} className="text-amber-400" />
              <span>Personalized Skill Path & Gap Analysis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Interactive Career Learning Path</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                & AI Roadmap
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              An intelligent competency roadmap tailored specifically to your current skills and what you want to learn next. Get direct course and mentor recommendations to bridge your exact gap.
            </p>
          </div>

          {/* Portfolio Sync Status & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold shadow-sm">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>
                {analysisResult?.portfolioSourceInfo?.skillsCount
                  ? `Portfolio Synced (${analysisResult.portfolioSourceInfo.skillsCount} Skills Active)`
                  : "Portfolio Skills Auto-Fetched"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsCvModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
              title="Upload your CV or Resume to extract skills and save to your profile"
            >
              <UploadCloud size={14} />
              <span>{analysisResult?.hasCvOrSkills ? "Update CV" : "Upload CV / Resume"}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncProfile}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-md disabled:opacity-50"
              title="Refresh and re-sync competencies from your portfolio and projects"
            >
              {analyzing ? <ButtonSpinner size="xs" /> : <RefreshCw size={14} />}
              <span>Refresh Portfolio</span>
            </button>
          </div>
        </div>

        {/* ─── TARGET CAREER TRACK DROPDOWN BOX ─── */}
        <div ref={dropdownRef} className="relative z-30">
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Compass size={14} className="text-indigo-400" />
                  <span>Select Domain & Career Track ({allEvaluatedTracks.length} Computer Science Disciplines)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Choose your Computer Science domain discipline and specific engineering milestone to view your prerequisite roadmap.
                </p>
              </div>

              {/* Quick domain preview */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold self-start sm:self-auto">
                <span>Domain:</span>
                <span className="text-white font-bold">{selectedTrack?.domain || "Computer Science"}</span>
              </div>
            </div>

            {/* Side-by-side Domain Dropdown & Career Track Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              {/* 1. Domain Dropdown (4 cols) */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Compass size={13} className="text-indigo-400" />
                  <span>Domain Discipline</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedDomainGroup}
                    onChange={(e) => {
                      const newGroupId = e.target.value;
                      setSelectedDomainGroup(newGroupId);
                      const group = DOMAIN_GROUPS.find((g) => g.id === newGroupId);
                      if (group && group.domains) {
                        const firstTrack = allEvaluatedTracks.find((t) =>
                          group.domains.includes(t.domain)
                        );
                        if (firstTrack) {
                          handleSelectTrack(firstTrack.id);
                        }
                      }
                    }}
                    className="w-full bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-2xl px-3.5 py-3.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition appearance-none cursor-pointer pr-10 shadow-sm"
                  >
                    {DOMAIN_GROUPS.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-white py-1">
                        {g.icon} {g.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* 2. Career Track Selector Dropdown (8 cols) */}
              <div className="md:col-span-8 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Target size={13} className="text-indigo-400" />
                    <span>Target Career Milestone ({displayedTracks.length} in Domain)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Click to switch milestones
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 bg-slate-950/80 hover:bg-slate-950 ${
                      isDropdownOpen
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                        <Target size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 bg-indigo-500/10 px-2 py-0.2 rounded border border-indigo-500/20">
                            {selectedTrack?.domain || "Computer Science"}
                          </span>
                          {selectedTrack?.isRecommended && (
                            <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                              <Star size={9} className="fill-amber-300" /> Best Fit For You
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5">
                          {selectedTrack?.title || "Choose a Career Milestone..."}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-400 block font-medium">Your Readiness</span>
                        <span className="text-sm font-extrabold text-emerald-400 font-mono">
                          {selectedTrack?.userReadiness !== undefined
                            ? `${selectedTrack.userReadiness}% Ready`
                            : "Calculating..."}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${
                            isDropdownOpen ? "rotate-180 text-indigo-400" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Floating Dropdown Menu */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.99 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden backdrop-blur-2xl p-3 space-y-3 max-h-[460px] flex flex-col"
                      >
                        {/* Search inside dropdown */}
                        <div className="relative shrink-0">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={trackSearch}
                            onChange={(e) => setTrackSearch(e.target.value)}
                            placeholder="Search tracks or competencies (e.g. ai, web, devops, security, game)..."
                            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            autoFocus
                          />
                          {trackSearch && (
                            <button
                              type="button"
                              onClick={() => setTrackSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Scrollable List of Tracks */}
                        <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[300px] custom-scrollbar">
                          {displayedTracks.map((track) => {
                            const isSelected = track.id === selectedTrackId;
                            return (
                              <button
                                key={track.id}
                                type="button"
                                onClick={() => {
                                  handleSelectTrack(track.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? "bg-indigo-600/20 border-indigo-500 text-white"
                                    : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold uppercase text-indigo-400">
                                      {track.domain}
                                    </span>
                                    {track.isRecommended && (
                                      <span className="text-[8px] font-black uppercase text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                                        <Star size={8} className="fill-amber-300" /> Best Fit
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-white truncate mt-0.5">
                                    {track.title}
                                  </h4>
                                  {track.description && (
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {track.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                    {track.userReadiness !== undefined ? `${track.userReadiness}%` : "0%"}
                                  </span>
                                  {isSelected ? (
                                    <Check size={14} className="text-indigo-400" />
                                  ) : (
                                    <div className="w-3.5" />
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          {displayedTracks.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No career tracks matching "{trackSearch}".
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Target Skills Preview for the selected track */}
            {selectedTrack?.targetSkills?.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Required Competencies:
                </span>
                {selectedTrack.targetSkills.map((sk) => (
                  <span
                    key={sk}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── GAP ANALYSIS SUMMARY METRICS ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Metric 1: Track Readiness */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-extrabold text-base">
              {metrics.matchScore}%
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Target Readiness
              </span>
              <p className="text-sm font-extrabold text-white mt-0.5">
                {metrics.matchScore >= 75
                  ? "Advanced Alignment"
                  : metrics.matchScore >= 40
                  ? "Intermediate"
                  : "Foundation Stage"}
              </p>
            </div>
          </div>

          {/* Metric 2: Mastered Skills */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Mastered Competencies
              </span>
              <p className="text-sm font-extrabold text-white mt-0.5">
                {metrics.masteredCount} of {metrics.totalTrackNodes} Steps
              </p>
            </div>
          </div>

          {/* Metric 3: Ready to Learn Now */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Zap size={22} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Ready to Learn Today
              </span>
              <p className="text-sm font-extrabold text-white mt-0.5">
                {metrics.immediateUnlockableCount} Unlocked & Actionable
              </p>
            </div>
          </div>

          {/* Metric 4: Estimated Study Effort */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Estimated Study Effort
              </span>
              <p className="text-sm font-extrabold text-white mt-0.5">
                {metrics.estimatedRemainingHours}h (~{metrics.estimatedWeeks} Weeks)
              </p>
            </div>
          </div>
        </div>

        {/* ─── TABS NAVIGATION BAR (Clean, Single Line, Never Wraps into 2-3 Lines) ─── */}
        <div className="space-y-3 border-b border-slate-800 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Segmented Controller Tab Strip */}
            <div className="p-1 rounded-2xl bg-slate-900/90 border border-slate-800 inline-flex items-center gap-1 overflow-x-auto max-w-full scrollbar-none shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("graph")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "graph"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Layers size={14} />
                <span>Interactive Path</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unlockable")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "unlockable"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Zap
                  size={14}
                  className={
                    activeTab === "unlockable"
                      ? "fill-slate-950 text-slate-950"
                      : "fill-amber-400 text-amber-400"
                  }
                />
                <span>Ready to Learn (Courses & Mentors)</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === "unlockable"
                      ? "bg-black/25 text-slate-950"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {analysisResult?.immediateNext?.length || (analysisResult?.criticalPath?.length ? Math.min(analysisResult.criticalPath.length, 3) : 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("path")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "path"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <TrendingUp size={14} />
                <span>Step-by-Step Path</span>
                <span className="px-2 py-0.5 bg-slate-800 rounded-full text-[10px] font-bold text-slate-300 border border-slate-700">
                  {analysisResult?.criticalPath?.length || 0} Steps
                </span>
              </button>
            </div>

            {/* Quick Action when CV not uploaded */}
            {!analysisResult?.hasCvOrSkills && (
              <button
                type="button"
                onClick={() => setIsCvModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition self-start lg:self-auto cursor-pointer"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Upload CV to Personalize Roadmap</span>
              </button>
            )}
          </div>

          {/* Sub-bar Category Pills ONLY when on graph tab */}
          {activeTab === "graph" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 max-w-full scrollbar-thin scrollbar-thumb-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 shrink-0">Filter Nodes:</span>
              {AVAILABLE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition shrink-0 ${
                    categoryFilter === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-950/80 border border-slate-800/80 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── TAB CONTENT ─── */}
        <div className="w-full">
          {/* TAB 1: INTERACTIVE SKILL PATH VISUALIZER (FULL WIDTH) */}
          {activeTab === "graph" && (
            <SkillGraphVisualizer
              graphData={analysisResult}
              selectedCategory={categoryFilter}
              viewMode={viewMode}
              onToggleViewMode={setViewMode}
            />
          )}

          {/* TAB 2: READY TO LEARN (RECOMMENDS REAL PLATFORM COURSES & MENTORS) */}
          {activeTab === "unlockable" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Zap size={20} className="shrink-0 text-amber-400 fill-amber-400" />
                  <p>
                    {analysisResult?.immediateNext?.length > 0
                      ? "You already meet 100% of the prerequisites for these competencies! Here are matching courses and verified mentors on our platform to start mastering them right away."
                      : "Here are the recommended foundational starting milestones for this career track with matching platform courses and verified mentors."}
                  </p>
                </div>
              </div>

              {(() => {
                const readyItems =
                  analysisResult?.immediateNext?.length > 0
                    ? analysisResult.immediateNext
                    : (analysisResult?.criticalPath || []).slice(0, 4);

                if (readyItems.length === 0) {
                  return (
                    <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">All Milestones Completed</h4>
                      <p className="text-xs text-slate-400">
                        You have mastered all ready milestones in this track. Check the Step-by-Step Path for next frontiers!
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {readyItems.map((item) => {
                      const resources = skillResources[item.id] || { courses: [], mentors: [] };
                      return (
                        <div
                          key={item.id}
                          className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-xl shadow-amber-950/20 space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                              {item.category}
                            </span>
                            <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                              <Zap size={12} className="fill-amber-400" />
                              0 Blockers • Ready to Learn
                            </span>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-white">{item.name}</h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {item.learningHours} hours
                            </span>
                            <span>•</span>
                            <span>Level {item.difficulty} of 5</span>
                          </div>

                          {/* ── RECOMMENDED COURSES ── */}
                          {resources.courses?.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-800/80">
                              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1.5 text-emerald-400">
                                  <BookOpen size={13} />
                                  <span>Courses on Our Platform</span>
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {resources.courses.map((course) => (
                                  <div
                                    key={course._id}
                                    className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {course.thumbnailUrl ? (
                                        <img
                                          src={course.thumbnailUrl}
                                          alt={course.title}
                                          className="w-10 h-9 rounded-lg object-cover shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                                          <BookOpen size={14} />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <h6 className="text-xs font-bold text-white truncate">
                                          {course.title}
                                        </h6>
                                        <span className="text-[10px] text-slate-400">
                                          {course.instructorName} • ★ {course.rating}
                                        </span>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => navigate(`/courses/${course._id}`)}
                                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shrink-0 transition"
                                    >
                                      ৳{course.price}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── RECOMMENDED MENTORS ── */}
                          {resources.mentors?.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-800/80">
                              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1.5 text-purple-400">
                                  <Users size={13} />
                                  <span>Verified Mentors</span>
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {resources.mentors.map((mentor) => (
                                  <div
                                    key={mentor._id}
                                    className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold shrink-0 overflow-hidden text-xs">
                                        {mentor.profileImage ? (
                                          <img
                                            src={mentor.profileImage}
                                            alt={mentor.fullName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          (mentor.fullName || "M")[0]
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h6 className="text-xs font-bold text-white truncate">
                                          {mentor.fullName}
                                        </h6>
                                        <span className="text-[10px] text-slate-400 truncate block">
                                          {mentor.headline || "Specialist"} • ★ {mentor.averageRating}
                                        </span>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/experts/${mentor._id || encodeURIComponent(mentor.email)}`
                                        )
                                      }
                                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shrink-0 transition"
                                    >
                                      Connect
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Direct Search Link */}
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                          <button
                            onClick={() => navigate("/courses")}
                            className="text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>Explore All Courses</span>
                            <ExternalLink size={11} />
                          </button>

                          <button
                            onClick={() => navigate("/experts")}
                            className="text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>Find Mentors</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

          {/* TAB 3: STEP-BY-STEP PATH (WITH INTEGRATED COURSES & MENTORS) */}
          {activeTab === "path" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-3">
                <Sparkles size={20} className="shrink-0 text-indigo-400" />
                <p>
                  This roadmap is calculated using <strong>shortest prerequisite graph traversal</strong>. Each missing skill is topologically ordered so all prerequisites are strictly met before advanced competencies.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisResult?.criticalPath?.map((step) => {
                  const resources = skillResources[step.id] || { courses: [], mentors: [] };
                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        step.isReadyNow
                          ? "bg-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-950/20"
                          : "bg-slate-900/70 border-slate-800"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                            Step {step.step}
                          </span>
                          {step.isReadyNow ? (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              <Zap size={11} className="fill-amber-400" />
                              Ready to Learn
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Lock size={11} /> Prereq Needed
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white">
                          {step.name}
                        </h4>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {step.description}
                        </p>

                        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {step.learningHours}h study
                          </span>
                          <span className="font-mono text-[10px]">
                            Lvl {step.difficulty}
                          </span>
                        </div>

                        {/* Top Course if Available */}
                        {resources.courses?.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/60">
                            <span className="text-[10px] text-emerald-400 font-bold block mb-1">
                              Recommended Course:
                            </span>
                            <button
                              onClick={() => navigate(`/courses/${resources.courses[0]._id}`)}
                              className="w-full text-left p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 text-xs flex items-center justify-between transition"
                            >
                              <span className="truncate text-white font-medium">
                                {resources.courses[0].title}
                              </span>
                              <span className="text-emerald-400 font-bold shrink-0 ml-2">
                                ৳{resources.courses[0].price}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Prerequisites */}
                      {step.prerequisites?.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap gap-1">
                          {step.prerequisites.map((p) => (
                            <span
                              key={p.id}
                              className={`text-[9px] px-1.5 py-0.5 rounded-md border ${
                                p.isMastered
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Automated CV Upload & Skill Extraction Modal */}
        <CvUploadModal
          isOpen={isCvModalOpen}
          onClose={() => setIsCvModalOpen(false)}
          careerTrackId={selectedTrackId}
          onSuccess={(data) => {
            if (data?.gapAnalysis) {
              setAnalysisResult(data.gapAnalysis);
            }
          }}
        />
      </div>
    </div>
  );
};

export default SkillGraphPage;
