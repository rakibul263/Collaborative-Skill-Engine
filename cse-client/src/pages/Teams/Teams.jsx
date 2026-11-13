import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Users,
  Sparkles,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  Award,
  Star,
  Send,
  RefreshCw,
  Plus,
  Sliders,
  Compass,
  MessageSquare,
  Video,
  Trash2,
  UserMinus,
  Crown,
  Check,
  ExternalLink,
  Flame,
  Search,
  X,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import VideoCallOverlay from "@/components/shared/video/VideoCallOverlay";
import { getSocket } from "@/lib/socket";
import TeamInvitationModal from "@/components/teams/TeamInvitationModal";

const PROJECT_DOMAINS = [
  "Artificial Intelligence & Robotics",
  "Fullstack Web & SaaS Application",
  "Mobile App & Cross-Platform",
  "Cloud & DevOps Infrastructure",
  "Cybersecurity & Network Defense",
  "Data Engineering & Analytics Platform",
  "Embedded Systems & IoT Hardware",
  "Game Development & Interactive Media",
];

const AVAILABLE_ROLES = [
  { id: "frontend", title: "Frontend Engineer", domain: "Web & Mobile", color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  { id: "backend", title: "Backend & API Architect", domain: "Web & Systems", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "designer", title: "UI/UX & Product Designer", domain: "Design & UX", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { id: "aiml", title: "AI / Machine Learning Specialist", domain: "Artificial Intelligence", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  { id: "devops", title: "DevOps & Cloud Engineer", domain: "Cloud & Infrastructure", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "mobile", title: "Mobile App Developer", domain: "Mobile", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { id: "cybersecurity", title: "Cybersecurity Specialist", domain: "Security", color: "text-red-400 bg-red-500/10 border-red-500/30" },
  { id: "data_engineer", title: "Big Data & Data Engineer", domain: "Data", color: "text-teal-400 bg-teal-500/10 border-teal-500/30" },
  { id: "embedded_iot", title: "Embedded & IoT Engineer", domain: "Hardware & IoT", color: "text-lime-400 bg-lime-500/10 border-lime-500/30" },
  { id: "qa_engineer", title: "QA & Test Automation", domain: "Quality Assurance", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
];

const Teams = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("builder"); // "builder" | "my-teams"

  // Builder Parameters
  const [teamName, setTeamName] = useState("AI-Powered Medical Diagnostic Assistant");
  const [projectDescription, setProjectDescription] = useState(
    "A fullstack web application integrating deep learning computer vision to analyze medical scans and recommend treatment plans."
  );
  const [projectTopic, setProjectTopic] = useState(PROJECT_DOMAINS[0]);
  const [targetSquadSize, setTargetSquadSize] = useState(4);
  const [selectedRoles, setSelectedRoles] = useState(["frontend", "backend", "designer", "aiml"]);
  const [analyzingScope, setAnalyzingScope] = useState(false);
  const [detectedScopeInfo, setDetectedScopeInfo] = useState(null);

  // Optimization & Formation Results
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [formedSquads, setFormedSquads] = useState([]);
  const [totalEvaluated, setTotalEvaluated] = useState(0);
  const [selectedSquadIndex, setSelectedSquadIndex] = useState(0);
  const [savingSquad, setSavingSquad] = useState(false);

  // Post-Formation Success Modal
  const [createdTeamData, setCreatedTeamData] = useState(null);

  // My Teams
  const [myTeams, setMyTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");

  // Live Video Call Overlay State
  const [activeCall, setActiveCall] = useState(null);
  const [activeCallPeer, setActiveCallPeer] = useState("");

  // Team Invitation Review Modal
  const [invitedTeamModal, setInvitedTeamModal] = useState(null);

  // Fetch My Teams
  const fetchMyTeams = async () => {
    if (!user?.email) return;
    try {
      setLoadingTeams(true);
      const res = await apiClient.get(`/api/teams/my-squads?email=${user.email}`);
      setMyTeams(res.data || []);
    } catch {
      toast.error("Failed to load your active squads.");
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (activeTab === "my-teams") {
      fetchMyTeams();
    }
  }, [activeTab, user?.email]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onTeamUpdate = () => {
      fetchMyTeams();
    };

    socket.on("team:deleted", onTeamUpdate);
    socket.on("team:member_removed", onTeamUpdate);
    socket.on("team:updated", onTeamUpdate);

    return () => {
      socket.off("team:deleted", onTeamUpdate);
      socket.off("team:member_removed", onTeamUpdate);
      socket.off("team:updated", onTeamUpdate);
    };
  }, [user?.email]);

  // AI Project Title & Idea Analysis
  const handleAnalyzeProjectScope = async () => {
    if (!teamName.trim()) {
      toast.warning("Please enter a project title to analyze.");
      return;
    }

    try {
      setAnalyzingScope(true);
      const res = await apiClient.post("/api/teams/analyze-project", {
        projectTitle: teamName,
        projectDescription,
      });

      const { detectedDomain, suggestedRoles, suggestedSkills, confidenceScore } = res.data;
      if (detectedDomain) {
        setProjectTopic(detectedDomain);
      }
      if (suggestedRoles?.length > 0) {
        setSelectedRoles(suggestedRoles);
      }
      setDetectedScopeInfo({
        detectedDomain,
        suggestedSkills,
        confidenceScore,
      });

      toast.success(`AI analyzed "${teamName}" — auto-configured required competencies!`);
    } catch {
      toast.error("Scope analysis failed.");
    } finally {
      setAnalyzingScope(false);
    }
  };

  const toggleRole = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      if (selectedRoles.length <= 1) {
        toast.warning("A project squad requires at least 1 core competency.");
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  // Run Squad Matching (Strict Domain Filtering + Fit Percent Calculation)
  const handleRunSquadMatching = async () => {
    if (!user?.email) {
      toast.error("Please login to assemble a team.");
      return;
    }
    if (!teamName.trim()) {
      toast.warning("Please provide a project title.");
      return;
    }

    try {
      setIsOptimizing(true);
      const res = await apiClient.post("/api/teams/squad-formation", {
        targetSquadSize,
        requiredRoles: selectedRoles,
        projectTitle: teamName,
        projectDescription,
        requesterEmail: user.email,
        generations: 25,
        populationSize: 40,
      });

      setFormedSquads(res.data.optimalSquads || []);
      setTotalEvaluated(res.data.totalEvaluatedSquads || 1000);
      setSelectedSquadIndex(0);

      if (res.data.optimalSquads?.length > 0) {
        toast.success(`AI evaluated candidate pool! Found top ${res.data.optimalSquads.length} squad proposals.`);
      } else {
        toast.warning("No candidates found strictly matching all selected criteria. Try adjusting role constraints.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Squad formation failed.");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Save official team and auto-create Messenger Group Conversation
  const handleFormSquadAndCreateGroup = async (squad) => {
    if (!squad || !user?.email) return;

    try {
      setSavingSquad(true);
      const res = await apiClient.post("/api/teams/create-squad", {
        teamName,
        projectTopic,
        description: projectDescription || `Project squad for "${teamName}"`,
        members: squad.members,
        metrics: squad.metrics,
        leaderEmail: user.email,
      });

      const { squadId, conversationId } = res.data;

      setCreatedTeamData({
        teamId: squadId,
        teamName,
        conversationId,
        membersCount: squad.members?.length || targetSquadSize,
      });

      toast.success("Squad successfully formed and Project Messenger Group created!");
      fetchMyTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create squad.");
    } finally {
      setSavingSquad(false);
    }
  };

  // Admin removes a member from the squad and messenger group
  const handleRemoveMember = async (teamId, memberEmail, memberName) => {
    const { isConfirmed } = await showConfirm({
      title: "Remove Squad Member",
      badge: "TEAM UPDATE",
      message: `Are you sure you want to remove "${memberName || memberEmail}" from this project squad and group chat?`,
      variant: "danger",
      confirmText: "Remove Member",
      cancelText: "Cancel",
    });
    if (!isConfirmed) return;

    try {
      const res = await apiClient.delete(`/api/teams/${teamId}/members/${encodeURIComponent(memberEmail)}`, {
        data: { requesterEmail: user.email },
      });
      toast.success(res.data.message || "Member removed successfully.");
      fetchMyTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member.");
    }
  };

  // Team Leader permanently deletes the entire squad, its messenger group, and all messages
  const handleDeleteTeam = async (teamId, squadTitle) => {
    const { isConfirmed } = await showConfirm({
      title: `Delete "${squadTitle}"?`,
      badge: "PERMANENT DELETE",
      message: `Are you sure you want to permanently delete the project team "${squadTitle}"?\n\nThis will permanently delete the entire squad, its Messenger project group chat, and ALL messages exchanged in this squad. Only the squad leader can perform this action.`,
      variant: "delete",
      confirmText: "Delete Squad & All Messages",
      cancelText: "Keep Team",
    });
    if (!isConfirmed) return;

    try {
      const res = await apiClient.delete(`/api/teams/${teamId}`, {
        data: { requesterEmail: user.email },
      });
      toast.success(res.data.message || "Project team and all messages permanently deleted.");
      fetchMyTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete team.");
    }
  };

  // Start instant team video call
  const handleStartTeamVideoCall = async (team) => {
    try {
      const socket = getSocket();
      await apiClient.post(`/api/teams/${team._id}/video-call`, {
        callerEmail: user.email,
      });

      setActiveCall({
        _id: team._id,
        isInstantCall: true,
        title: team.teamName,
        startTime: new Date().toISOString(),
        durationMinutes: 120,
      });

      const peer = team.members?.find((m) => m.email !== user.email)?.email || "group";
      setActiveCallPeer(peer);

      toast.success("Instant project video meeting room opened! Squad members alerted.");
    } catch {
      toast.error("Failed to start team video meeting.");
    }
  };

  const activeSquad = formedSquads[selectedSquadIndex] || null;

  // Filter My Teams by search query
  const filteredMyTeams = useMemo(() => {
    if (!teamSearch.trim()) return myTeams;
    const q = teamSearch.toLowerCase().trim();
    return myTeams.filter(
      (t) =>
        t.teamName?.toLowerCase().includes(q) ||
        t.projectTopic?.toLowerCase().includes(q) ||
        (t.members || []).some((m) => m.fullName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
    );
  }, [myTeams, teamSearch]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-transparent text-slate-100 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Background ambient spotlight glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-emerald-600/15 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header Section - Modern, Polished, Professional */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} className="text-amber-400" />
              <span>Smart Project Squad Formation & Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Project Team Workspace & AI Matching</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Assembles high-synergy student teams based on your project title, required domain competencies, and schedule harmony. Instantly creates a shared group workspace in Messenger with live video meetings.
            </p>
          </div>

          {/* Navigation Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "builder"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles size={14} />
              <span>Squad Matcher</span>
            </button>
            <button
              onClick={() => setActiveTab("my-teams")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "my-teams"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users size={14} />
              <span>My Active Teams</span>
              {myTeams.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-black">
                  {myTeams.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── TAB 1: SQUAD BUILDER & OPTIMIZER ─── */}
        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Project Brief & Strict Constraints */}
            <div className="lg:col-span-5 rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-5 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Project Scope & Competencies</h3>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Strict Domain Matching
                </span>
              </div>

              {/* Step 1: Project Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Project Title / Idea Name <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    disabled={analyzingScope}
                    onClick={handleAnalyzeProjectScope}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    {analyzingScope ? <ButtonSpinner size="xs" /> : <Sparkles size={11} />}
                    <span>Auto-Analyze Scope</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. AI-Powered Medical Diagnostic Assistant"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 font-medium transition"
                />
              </div>

              {/* Step 2: Project Idea Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Project Brief & Key Deliverables
                </label>
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Briefly describe what your team will build..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 font-medium transition resize-none"
                />
              </div>

              {/* Project Primary Domain */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Primary Domain Discipline
                </label>
                <select
                  value={projectTopic}
                  onChange={(e) => setProjectTopic(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/80 font-medium cursor-pointer"
                >
                  {PROJECT_DOMAINS.map((domain) => (
                    <option key={domain} value={domain} className="bg-slate-900">
                      {domain}
                    </option>
                  ))}
                </select>
              </div>

              {/* Squad Size Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Target Squad Capacity
                  </label>
                  <span className="text-xs font-bold text-indigo-400">
                    {targetSquadSize} Members
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 6].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTargetSquadSize(size)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        targetSquadSize === size
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                          : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {size} Members
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Competencies (Strict Domain Filter) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Required Roles & Domain Filters
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {selectedRoles.length} Selected
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = selectedRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition text-left ${
                          isSelected
                            ? role.color
                            : "bg-slate-950/40 border-slate-800/80 text-slate-500 hover:text-slate-400"
                        }`}
                      >
                        <span className="truncate">{role.title}</span>
                        {isSelected ? (
                          <CheckCircle2 size={13} className="shrink-0 ml-1" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-emerald-400 font-medium pt-1">
                  ✓ Strict constraint active: Candidates from unselected domains are automatically excluded.
                </p>
              </div>

              {/* Run Squad Matching Button */}
              <button
                disabled={isOptimizing}
                onClick={handleRunSquadMatching}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isOptimizing ? (
                  <>
                    <ButtonSpinner size="xs" />
                    <span>Analyzing Candidate Pool & Matching Fit...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Find Optimal Squad Candidates</span>
                  </>
                )}
              </button>
            </div>

            {/* Right 7 Cols: Optimal Squad Proposals & Candidate Fit */}
            <div className="lg:col-span-7 space-y-4">
              {formedSquads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Users size={28} />
                  </div>
                  <h3 className="text-base font-bold text-white">No Squad Proposals Yet</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Set your project title and required competencies on the left, then click <strong>"Find Optimal Squad Candidates"</strong> to find best-matched peers.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Proposal Switcher Tabs */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {formedSquads.map((squad, idx) => (
                        <button
                          key={squad.squadId}
                          onClick={() => setSelectedSquadIndex(idx)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border whitespace-nowrap ${
                            selectedSquadIndex === idx
                              ? "bg-indigo-600/30 border-indigo-500 text-white shadow-sm"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Award size={12} className={idx === 0 ? "text-amber-400" : "text-slate-400"} />
                          <span>Squad Proposal #{idx + 1}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {squad.metrics?.overallSynergy || 92}% Fit
                          </span>
                        </button>
                      ))}
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium shrink-0 hidden sm:inline">
                      Ranked by Compatibility
                    </span>
                  </div>

                  {activeSquad && (
                    <motion.div
                      key={activeSquad.squadId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-6 shadow-2xl backdrop-blur-2xl"
                    >
                      {/* Synergy Metrics Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Overall Synergy
                          </span>
                          <p className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            {activeSquad.metrics?.overallSynergy || 94}%
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Role Coverage
                          </span>
                          <p className="text-xl font-extrabold text-sky-400">
                            {activeSquad.metrics?.roleCoverage || 100}%
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Schedule Harmony
                          </span>
                          <p className="text-xl font-extrabold text-emerald-400">
                            {activeSquad.metrics?.scheduleHarmony || 95}%
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Skill Synergy
                          </span>
                          <p className="text-xl font-extrabold text-purple-400">
                            {activeSquad.metrics?.skillSynergy || 90}%
                          </p>
                        </div>
                      </div>

                      {/* Candidate Members List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users size={14} className="text-indigo-400" />
                            <span>Recommended Squad Roster ({activeSquad.members?.length || 0} Members)</span>
                          </span>
                          <span className="text-[11px] text-emerald-400 font-normal">
                            Strictly filtered to selected competencies
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {activeSquad.members?.map((member) => (
                            <div
                              key={member.email}
                              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5 hover:border-slate-700 transition relative overflow-hidden"
                            >
                              {member.isLeader && (
                                <span className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-amber-500 text-slate-950 font-black text-[8px] uppercase tracking-wider flex items-center gap-0.5">
                                  <Crown size={8} />
                                  Initiator (You)
                                </span>
                              )}

                              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold shrink-0 overflow-hidden mt-0.5">
                                {member.profileImage ? (
                                  <img
                                    src={member.profileImage}
                                    alt={member.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  (member.fullName || "P")[0]
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className="text-xs font-bold text-white truncate">
                                    {member.fullName}
                                  </h5>
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                    {member.fitPercent || 92}% Fit
                                  </span>
                                </div>

                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  {member.roleTitle || "Specialist"}
                                </span>

                                {member.matchingSkills?.length > 0 && (
                                  <div className="pt-1 space-y-0.5">
                                    <span className="text-[9px] text-slate-400 block font-medium">
                                      Matching Skills:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {member.matchingSkills.slice(0, 3).map((sk) => (
                                        <span
                                          key={sk}
                                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-medium border border-slate-700/60"
                                        >
                                          {sk}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Formation CTA - Automatically creates Messenger Group Chat */}
                      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-slate-400">
                          Forming this squad automatically creates a dedicated <strong>Messenger Group Chat</strong> and notifies all members.
                        </div>

                        <button
                          disabled={savingSquad}
                          onClick={() => handleFormSquadAndCreateGroup(activeSquad)}
                          className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                        >
                          {savingSquad ? (
                            <ButtonSpinner size="xs" />
                          ) : (
                            <>
                              <MessageSquare size={14} />
                              <span>Form Team & Create Messenger Group</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: MY ACTIVE TEAMS & WORKSPACES ─── */}
        {activeTab === "my-teams" && (
          <div className="space-y-5">
            {/* Filter & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-indigo-400" />
                  <span>My Active Project Squads ({myTeams.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Manage members, launch instant video meetings, and chat in project groups.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search project or member..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition"
                />
                {teamSearch && (
                  <button
                    onClick={() => setTeamSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {loadingTeams ? (
              <div className="p-16 text-center">
                <ButtonSpinner size="md" />
                <p className="text-xs text-slate-400 mt-2">Loading your active project squads...</p>
              </div>
            ) : filteredMyTeams.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Users size={28} />
                </div>
                <h3 className="text-base font-bold text-white">No Project Squads Found</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {teamSearch
                    ? `No teams match "${teamSearch}".`
                    : "You haven't formed or joined any project teams yet. Use the Squad Matcher tab to build one!"}
                </p>
                {teamSearch ? (
                  <button
                    onClick={() => setTeamSearch("")}
                    className="text-xs font-bold text-indigo-400 hover:underline"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab("builder")}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    Build a Project Team
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredMyTeams.map((team) => {
                  const isLeader = team.leaderEmail === user?.email;
                  const userMember = (team.members || []).find(
                    (m) => (m.email || "").toLowerCase() === (user?.email || "").toLowerCase()
                  );
                  const isPendingInvite = userMember?.status === "invited";

                  return (
                    <div
                      key={team._id}
                      className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl backdrop-blur-xl relative flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Team Title & Domain */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 inline-block">
                              {team.projectTopic || "Project Squad"}
                            </span>
                            <h4 className="text-base font-bold text-white leading-snug">
                              {team.teamName}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                                {team.metrics?.overallSynergy || 94}% Synergy
                              </span>
                              {isLeader && (
                                <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                                  <Crown size={9} />
                                  Squad Admin
                                </span>
                              )}
                            </div>
                            {isLeader && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTeam(team._id, team.teamName)}
                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 transition shadow-sm shrink-0"
                                title="Delete Squad & erase all group messages (Leader Only)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Invitation Pending Banner for Invited Member */}
                        {isPendingInvite && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/60 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Sparkles size={13} className="text-amber-400" />
                                <span>Squad Invitation Pending</span>
                              </p>
                              <p className="text-[10px] text-slate-300 mt-0.5">
                                Invited as: <strong className="text-indigo-300">{userMember.roleTitle || userMember.role || "Specialist"}</strong> ({userMember.fitPercent || 92}% Compatibility)
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInvitedTeamModal(team)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white text-xs font-extrabold transition shadow-sm shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Users size={12} />
                              <span>Review & Respond</span>
                            </button>
                          </div>
                        )}

                        {/* Squad Members Roster */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Team Roster ({team.members?.length || 0})</span>
                            {isLeader && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                Admin can remove members
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {team.members?.map((m) => {
                              const isMemberLeader = m.email === team.leaderEmail;
                              const canRemove = isLeader && !isMemberLeader;

                              return (
                                <div
                                  key={m.email}
                                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 text-xs transition"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold shrink-0 overflow-hidden text-xs">
                                      {m.profileImage ? (
                                        <img
                                          src={m.profileImage}
                                          alt={m.fullName}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        (m.fullName || "P")[0]
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="font-bold text-white truncate flex items-center gap-1.5">
                                        <span>{m.fullName || m.email}</span>
                                        {isMemberLeader && (
                                          <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-black uppercase">
                                            Leader
                                          </span>
                                        )}
                                      </p>
                                      <span className="text-[10px] text-slate-400 block truncate">
                                        {m.roleTitle || "Specialist"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {m.status === "invited" &&
                                    (m.email || "").toLowerCase() === (user?.email || "").toLowerCase() ? (
                                      <button
                                        type="button"
                                        onClick={() => setInvitedTeamModal(team)}
                                        className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 shadow-sm cursor-pointer"
                                      >
                                        <Users size={10} />
                                        <span>Respond</span>
                                      </button>
                                    ) : (
                                      <span
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                          m.status === "accepted"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        }`}
                                      >
                                        {m.status === "accepted" ? "Active" : "Invited"}
                                      </span>
                                    )}

                                    {/* Admin Remove Button */}
                                    {canRemove && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(team._id, m.email, m.fullName)}
                                        className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition"
                                        title={`Remove ${m.fullName} from squad`}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar: Direct Messenger Group Chat, Video Meeting & Leader Delete */}
                      <div className="pt-4 border-t border-slate-800/80 space-y-2 mt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (team.conversationId) {
                                navigate(`/message?conversationId=${team.conversationId}`);
                              } else {
                                navigate("/message");
                              }
                            }}
                            className="py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare size={13} className="text-indigo-400" />
                            <span>Project Chat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartTeamVideoCall(team)}
                            className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Video size={13} className="text-emerald-400" />
                            <span>Start Video Call</span>
                          </button>
                        </div>

                        {isLeader && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(team._id, team.teamName)}
                            className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Trash2 size={12} className="text-rose-400" />
                            <span>Delete Team & Erase Group Messages</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── SUCCESS POST-FORMATION MODAL ─── */}
        <AnimatePresence>
          {createdTeamData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl relative"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={32} />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Squad Formation Successful
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    "{createdTeamData.teamName}" is Live!
                  </h3>
                  <p className="text-xs text-slate-400">
                    A dedicated project group chat has been created in Messenger for all {createdTeamData.membersCount} members.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      const cId = createdTeamData.conversationId;
                      setCreatedTeamData(null);
                      if (cId) {
                        navigate(`/message?conversationId=${cId}`);
                      } else {
                        navigate("/message");
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Open Project Chat in Messenger</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={() => {
                      setCreatedTeamData(null);
                      setActiveTab("my-teams");
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                  >
                    View in My Active Teams
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── VIDEO CALL OVERLAY INTEGRATION ─── */}
        {activeCall && (
          <VideoCallOverlay
            schedule={activeCall}
            currentUserEmail={user?.email}
            peerEmail={activeCallPeer}
            socket={getSocket()}
            onClose={() => setActiveCall(null)}
          />
        )}

        {/* ─── TEAM INVITATION REVIEW MODAL ─── */}
        <TeamInvitationModal
          isOpen={!!invitedTeamModal}
          teamId={invitedTeamModal?._id}
          notification={invitedTeamModal}
          onClose={() => setInvitedTeamModal(null)}
          onResponded={() => {
            fetchMyTeams();
            setInvitedTeamModal(null);
          }}
        />
      </div>
    </div>
  );
};

export default Teams;
