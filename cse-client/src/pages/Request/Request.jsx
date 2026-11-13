import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";
import { useNavigate } from "react-router";
import useAuth from "@/hooks/useAuth";

import {
  Zap,
  Inbox,
  User,
  Mail,
  Clock,
  Check,
  X,
  Eye,
  ShieldCheck,
  MapPin,
  GraduationCap,
  Briefcase,
  Globe,
  Github,
  Linkedin,
  ExternalLink,
  Code,
  FolderGit2,
  Award,
  Sparkles,
  MessageSquare,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Cloud,
  Cpu,
  LayoutGrid,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import EngineLoadingComponent from "@/components/shared/loading/EngineLoadingComponent";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── SKILL CATEGORIZATION CONFIG ───────────────────────────────────────────────
const CATEGORIES = {
  Frontend: ["react", "javascript", "js", "typescript", "ts", "html", "css", "tailwind", "next.js", "nextjs", "vue", "angular", "redux", "zustand"],
  Backend: ["node.js", "nodejs", "node", "express", "mongodb", "python", "sql", "postgresql", "postgres", "java", "rest api", "graphql", "prisma", "redis"],
  "DevOps & Cloud": ["docker", "kubernetes", "aws", "ci/cd", "cicd", "linux", "git", "github", "nginx", "cloud"],
  "AI & Tools": ["jest", "vitest", "vite", "webpack", "figma", "machine learning", "tensorflow", "pytorch", "python"],
};

const categorizeSkills = (teachSkills = [], learnSkills = []) => {
  const teachList = (teachSkills || []).map((s) => ({ name: String(s).trim(), type: "teach" })).filter((s) => s.name);
  const learnList = (learnSkills || []).map((s) => ({ name: String(s).trim(), type: "learn" })).filter((s) => s.name);
  const combined = [...teachList, ...learnList];

  const grouped = {
    Frontend: [],
    Backend: [],
    "DevOps & Cloud": [],
    "AI & Tools": [],
  };

  combined.forEach((item) => {
    const lower = item.name.toLowerCase();
    let placed = false;
    for (const [cat, keywords] of Object.entries(CATEGORIES)) {
      if (keywords.some((k) => lower.includes(k))) {
        grouped[cat].push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      grouped["AI & Tools"].push(item);
    }
  });

  return grouped;
};

// ─── COMPATIBILITY & MUTUAL SKILLS ENGINE ─────────────────────────────────────
const computeCompatibility = (myProfile, reqProfile) => {
  if (!myProfile || !reqProfile) return { mutualSkills: [], matchPercentage: 75 };

  const myTeach = (myProfile.teachSkills || []).map((s) => String(s).trim().toLowerCase());
  const myLearn = (myProfile.learnSkills || []).map((s) => String(s).trim().toLowerCase());

  const reqTeach = (reqProfile.teachSkills || []).map((s) => String(s).trim().toLowerCase());
  const reqLearn = (reqProfile.learnSkills || []).map((s) => String(s).trim().toLowerCase());

  const allMySkills = new Set([...myTeach, ...myLearn]);

  const mutualSkills = [];
  (reqProfile.teachSkills || []).forEach((skill) => {
    const sLower = String(skill).trim().toLowerCase();
    if (allMySkills.has(sLower) && !mutualSkills.includes(skill)) {
      mutualSkills.push(skill);
    }
  });

  let score = 60;
  reqTeach.forEach((skill) => {
    if (myLearn.some((l) => l.includes(skill) || skill.includes(l))) score += 12;
  });
  myTeach.forEach((skill) => {
    if (reqLearn.some((l) => l.includes(skill) || skill.includes(l))) score += 12;
  });
  score += mutualSkills.length * 8;

  const matchPercentage = Math.min(98, Math.max(65, score));

  return { mutualSkills, matchPercentage };
};

const Request = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfileData, setMyProfileData] = useState(null);

  // Map of senderEmail -> enriched user profile
  const [requesterProfiles, setRequesterProfiles] = useState({});

  // Preview Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch My Profile
  const fetchMyProfile = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(`${API_URL}/users?email=${encodeURIComponent(user.email)}`);
      setMyProfileData(res.data);
    } catch (err) {
      console.error("Failed to fetch current user profile:", err);
    }
  }, [user?.email]);

  // 2. Fetch Incoming Requests & Enrich Requesters
  const fetchRequests = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(
        `${API_URL}/connections/requests/incoming?email=${encodeURIComponent(user.email)}`
      );
      const incomingList = res.data || [];
      setRequests(incomingList);

      // Fetch enriched profiles for requesters in background
      incomingList.forEach(async (req) => {
        if (!requesterProfiles[req.senderEmail]) {
          try {
            const pRes = await axios.get(`${API_URL}/users?email=${encodeURIComponent(req.senderEmail)}`);
            if (pRes.data) {
              setRequesterProfiles((prev) => ({
                ...prev,
                [req.senderEmail]: pRes.data,
              }));
            }
          } catch {
            // silent fallback
          }
        }
      });
    } catch (error) {
      console.error("Fetch requests error:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.email, requesterProfiles]);

  useEffect(() => {
    fetchMyProfile();
    fetchRequests();

    const intervalId = setInterval(() => {
      fetchRequests();
    }, 4000);

    return () => clearInterval(intervalId);
  }, [fetchMyProfile, fetchRequests]);

  // ─── OPEN PROFILE PREVIEW MODAL ─────────────────────────────────────────────
  const handleOpenPreview = async (req) => {
    setSelectedReq(req);
    setPreviewOpen(true);

    if (!requesterProfiles[req.senderEmail]) {
      setLoadingPreview(true);
      try {
        const pRes = await axios.get(`${API_URL}/users?email=${encodeURIComponent(req.senderEmail)}`);
        if (pRes.data) {
          setRequesterProfiles((prev) => ({
            ...prev,
            [req.senderEmail]: pRes.data,
          }));
        }
      } catch (err) {
        console.error("Failed to load requester profile details:", err);
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  // ─── CONFIRMATION & RESPOND HANDLER ─────────────────────────────────────────
  const handleRespond = async (senderEmail, action) => {
    const senderProfile = requesterProfiles[senderEmail];
    const senderName = senderProfile?.fullName || selectedReq?.senderName || senderEmail;

    const confirm = await showConfirm({
      variant: action === "accept" ? "approve" : "delete",
      badge: action === "accept" ? "COLLABORATION ACCEPT" : "DECLINE INVITE",
      title: action === "accept" ? "Accept Collaboration Request?" : "Decline Collaboration Request?",
      description:
        action === "accept"
          ? "Accepting will unlock direct messaging, scheduling, and knowledge exchange."
          : "This pending collaboration invitation will be declined and removed from your inbox.",
      targetLabel: "Requester",
      targetValue: senderName,
      confirmText: action === "accept" ? "Accept Collaboration" : "Decline Invite",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.patch(`${API_URL}/connections/requests/respond`, {
        senderEmail,
        receiverEmail: user.email,
        responderEmail: user.email,
        action,
      });

      if (res.data?.status) {
        setRequests((prev) => prev.filter((req) => req.senderEmail !== senderEmail));
        setPreviewOpen(false);

        if (action === "accept") {
          toast.confirmed(`Connected with ${senderName}!`, {
            description: "Direct chat channel is now unlocked.",
            badge: "CONNECTED",
          });
          navigate(`/message?peer=${encodeURIComponent(senderEmail)}`);
        } else {
          toast.deleted("Collaboration Request Declined", {
            description: "The invitation was removed from your queue.",
            target: senderName,
            badge: "DECLINED",
          });
        }
      }
    } catch (error) {
      console.error("Respond error:", error);
      toast.error("Could not process response. Please try again.");
    }
  };

  // Filter requests by search query
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchQuery.toLowerCase();
      const p = requesterProfiles[req.senderEmail];
      const name = (p?.fullName || req.senderName || "").toLowerCase();
      const email = (req.senderEmail || "").toLowerCase();
      const role = (p?.role || "").toLowerCase();
      return !q || name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [requests, requesterProfiles, searchQuery]);

  if (loading) return <EngineLoadingComponent />;

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-indigo-500/30 pb-28 relative overflow-x-hidden">
      {/* Background Ambient Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[180px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-indigo-950/20 blur-[200px] pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 relative z-10 space-y-8">
        
        {/* ─── HEADER BAR ────────────────────────────────────────────────────── */}
        <section aria-label="Requests Header" className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold text-xs tracking-wider uppercase">
              <Zap size={14} className="fill-indigo-400" /> Collaboration Inbox
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Connection Requests <span className="text-indigo-500">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl">
              Review incoming mentorship and peer collaboration invitations. Inspect skills, portfolio builds, and AI compatibility before accepting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#0b101d] border border-slate-800/90 text-slate-200 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5">
              <Inbox size={18} className="text-indigo-400" />
              <span className="font-extrabold text-xs tracking-wider uppercase text-slate-300">
                {requests.length} Pending Invites
              </span>
            </div>
          </div>
        </section>

        {/* ─── SEARCH & FILTER BAR ────────────────────────────────────────────── */}
        {requests.length > 0 && (
          <div className="flex items-center gap-3 bg-[#0b101d] border border-slate-800/90 p-3 rounded-2xl shadow-xl">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requests by requester name, email, or role..."
                className="w-full bg-slate-950 border border-slate-800/90 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* ─── REQUEST LIST ───────────────────────────────────────────────────── */}
        {requests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b101d] border border-slate-800/90 rounded-3xl p-16 text-center shadow-xl max-w-2xl mx-auto"
          >
            <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Inbox size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-white">Your Inbox is Clear</h3>
            <p className="text-xs text-slate-400 mt-2 font-medium max-w-md mx-auto leading-relaxed">
              You have reviewed all incoming collaboration requests. New connection invites from peers and mentors will appear here.
            </p>
            <Button
              onClick={() => navigate("/experts")}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-10 px-5 shadow-lg shadow-indigo-600/20"
            >
              Explore Mentors & Partners
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((req) => {
                const reqProfile = requesterProfiles[req.senderEmail];
                const senderName = reqProfile?.fullName || req.senderName || req.senderEmail;
                const senderImage = reqProfile?.profileImage || req.senderImage;
                const role = reqProfile?.role || "Software Developer";
                const headline = reqProfile?.headline || `${role} · ${reqProfile?.education || "Tech Contributor"}`;
                const location = reqProfile?.location || "Global";

                // Compatibility score calculation
                const { mutualSkills, matchPercentage } = computeCompatibility(myProfileData, reqProfile);

                return (
                  <motion.div
                    key={req.senderEmail || req.requestId}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-6 shadow-xl hover:border-indigo-500/40 transition-all group">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        
                        {/* Requester Identity Brief */}
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-indigo-500/30 shrink-0">
                            <AvatarImage src={senderImage} alt={senderName} />
                            <AvatarFallback className="bg-indigo-600 text-white font-extrabold text-lg">
                              {senderName[0] || "U"}
                            </AvatarFallback>
                          </Avatar>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors truncate">
                                {senderName}
                              </h3>
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold text-[10px]">
                                <Zap size={11} className="mr-1 fill-emerald-400" />
                                {matchPercentage}% Match
                              </Badge>
                            </div>

                            <p className="text-xs text-indigo-300/90 font-semibold line-clamp-1">
                              {headline}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium pt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail size={13} className="text-slate-500" /> {req.senderEmail}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={13} className="text-slate-500" /> {location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={13} className="text-slate-500" /> Received {new Date(req.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Mutual Skills Pills */}
                            {mutualSkills.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1">Mutual Skills:</span>
                                {mutualSkills.slice(0, 4).map((skill) => (
                                  <span key={skill} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800/80">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenPreview(req)}
                            className="flex-1 lg:flex-none bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold text-xs rounded-xl h-10 px-4"
                          >
                            <Eye size={14} className="mr-1.5 text-indigo-400" /> Review Profile
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => handleRespond(req.senderEmail, "reject")}
                            className="bg-slate-950 hover:bg-rose-500/20 text-rose-400 border-slate-800 hover:border-rose-500/40 font-bold text-xs rounded-xl h-10 px-4"
                          >
                            <X size={14} className="mr-1" /> Decline
                          </Button>

                          <Button
                            onClick={() => handleOpenPreview(req)}
                            className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-10 px-5 shadow-lg shadow-indigo-600/20"
                          >
                            <Check size={14} className="mr-1.5" /> Accept Request
                          </Button>
                        </div>

                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ─── PROFILE PREVIEW DIALOG MODAL ─────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl" onClose={() => setPreviewOpen(false)}>
          {selectedReq && (() => {
            const reqProfile = requesterProfiles[selectedReq.senderEmail];
            const senderName = reqProfile?.fullName || selectedReq.senderName || selectedReq.senderEmail;
            const senderImage = reqProfile?.profileImage || selectedReq.senderImage;
            const role = reqProfile?.role || "Software Developer";
            const headline = reqProfile?.headline || `${role} · ${reqProfile?.education || "Tech Contributor"}`;
            const bio = reqProfile?.bio || "No summary provided by requester.";
            const location = reqProfile?.location || "Global";

            const { mutualSkills, matchPercentage } = computeCompatibility(myProfileData, reqProfile);
            const categorized = categorizeSkills(reqProfile?.teachSkills, reqProfile?.learnSkills);

            return (
              <>
                {/* Modal Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/60 border-b border-slate-800/90 relative">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <Avatar className="h-20 w-20 rounded-2xl ring-4 ring-indigo-500/30 shrink-0">
                      <AvatarImage src={senderImage} alt={senderName} />
                      <AvatarFallback className="bg-indigo-600 text-white font-extrabold text-2xl">
                        {senderName[0] || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-xl font-black text-white tracking-tight">{senderName}</h2>
                        <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-extrabold text-xs">
                          <Zap size={12} className="mr-1 fill-emerald-400" />
                          {matchPercentage}% Match Rating
                        </Badge>
                      </div>

                      <p className="text-xs font-bold text-indigo-300">{headline}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium pt-1">
                        <span className="flex items-center gap-1">
                          <GraduationCap size={14} className="text-indigo-400" /> {reqProfile?.education || "Education Not Specified"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-indigo-400" /> {location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                  
                  {/* AI Compatibility & Mutual Skills Card */}
                  <Card className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Sparkles size={14} /> AI Collaboration Assessment
                      </span>
                      <span className="text-xs font-bold text-emerald-400">{matchPercentage}% Strategic Alignment</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      Connecting with <strong className="text-white">{senderName}</strong> creates strong mutual learning opportunities in {mutualSkills.join(", ") || "full-stack development"}.
                    </p>

                    {mutualSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400">Mutual Skills:</span>
                        {mutualSkills.map((skill) => (
                          <span key={skill} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* About / Bio */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">About & Background</h4>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                      {bio}
                    </p>
                  </div>

                  {/* Categorized Skills */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Categorized Skills Matrix</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(categorized).map(([catName, skills]) => (
                        <div key={catName} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                          <h5 className="text-[11px] font-bold text-indigo-300 uppercase">{catName} ({skills.length})</h5>
                          {skills.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">No skills listed</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {skills.map((item, idx) => (
                                <span
                                  key={idx}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    item.type === "teach"
                                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
                                      : "bg-purple-500/10 border-purple-500/30 text-purple-200"
                                  }`}
                                >
                                  {item.name} ({item.type === "teach" ? "Teach" : "Goal"})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Projects */}
                  {reqProfile?.projects?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Featured Portfolio Projects</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {reqProfile.projects.map((proj) => (
                          <div key={proj.id || proj.title} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                            <h5 className="text-xs font-bold text-white">{proj.title}</h5>
                            <p className="text-[11px] text-slate-400 font-medium line-clamp-2">{proj.description}</p>
                            <div className="flex items-center gap-3 text-[11px] font-bold pt-1">
                              {proj.githubUrl && (
                                <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white flex items-center gap-1">
                                  <Github size={12} /> Code
                                </a>
                              )}
                              {proj.demoUrl && (
                                <a href={proj.demoUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                                  <ExternalLink size={12} /> Live Demo
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certificates */}
                  {reqProfile?.certificates?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Licenses & Certificates</h4>
                      <div className="space-y-2">
                        {reqProfile.certificates.map((cert) => (
                          <div key={cert.id || cert.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-white">{cert.name}</h5>
                              <p className="text-[10px] text-slate-400 font-medium">{cert.organization} · Issued {cert.issueDate}</p>
                            </div>
                            {cert.credentialUrl && (
                              <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1">
                                Verified <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Web Links */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-2 border-t border-slate-800/80">
                    {reqProfile?.github && (
                      <a href={reqProfile.github.startsWith("http") ? reqProfile.github : `https://${reqProfile.github}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white flex items-center gap-1.5">
                        <Github size={14} /> GitHub Profile
                      </a>
                    )}
                    {reqProfile?.linkedin && (
                      <a href={reqProfile.linkedin.startsWith("http") ? reqProfile.linkedin : `https://${reqProfile.linkedin}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline flex items-center gap-1.5">
                        <Linkedin size={14} /> LinkedIn Profile
                      </a>
                    )}
                    {reqProfile?.website && (
                      <a href={reqProfile.website.startsWith("http") ? reqProfile.website : `https://${reqProfile.website}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1.5">
                        <Globe size={14} /> Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Modal Action Area */}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewOpen(false)}
                    className="bg-slate-950 border-slate-800 text-slate-300 font-bold text-xs rounded-xl h-10 px-4"
                  >
                    Close
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRespond(selectedReq.senderEmail, "reject")}
                    className="bg-slate-950 hover:bg-rose-500/20 text-rose-400 border-slate-800 hover:border-rose-500/40 font-bold text-xs rounded-xl h-10 px-4"
                  >
                    <X size={14} className="mr-1" /> Decline Request
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleRespond(selectedReq.senderEmail, "accept")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-10 px-6 shadow-lg shadow-indigo-600/20"
                  >
                    <Check size={14} className="mr-1.5" /> Accept Request & Connect
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Request;
