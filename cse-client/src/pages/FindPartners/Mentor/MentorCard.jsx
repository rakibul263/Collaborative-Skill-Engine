import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Zap,
  ArrowUpRight,
  Star,
  Eye,
  X,
  CheckCircle2,
  BookOpen,
  Target,
  MessageSquare,
  Sparkles,
  User,
  Award,
  GraduationCap,
  ShieldCheck,
  Clock,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";
import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

const MentorCard = ({ mentor, index, refetch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ratingSummary, setRatingSummary] = useState({
    averageRating: mentor?.averageRating || 0,
    totalRatings: mentor?.totalRatings || 0,
  });
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const {
    _id,
    fullName = "Expert Mentor",
    email = "Not Available",
    profileImage,
    image,
    teachSkills = [],
    learnSkills = [],
    teachLevel = "Expert",
    learnLevel = "Learner",
    education = "Verified Practitioner",
    headline = "",
    connectionStatus: initialConnectionStatus = "none",
    bio = "Dedicated platform mentor passionate about collaborative skill sharing and high-impact engineering growth.",
    matchPercentage: apiMatchPercentage,
    matchedSkills = [],
  } = mentor;

  const displayImage = profileImage || image || null;

  const [connectionStatus, setConnectionStatus] = useState(initialConnectionStatus);

  useEffect(() => {
    setConnectionStatus(initialConnectionStatus);
  }, [initialConnectionStatus]);

  useEffect(() => {
    setRatingSummary({
      averageRating: mentor?.averageRating || 0,
      totalRatings: mentor?.totalRatings || 0,
    });
  }, [mentor?.averageRating, mentor?.totalRatings]);

  const handleRate = async (e) => {
    e?.stopPropagation();
    if (!authUser?.email || connectionStatus !== "connected") return;
    const result = await Swal.fire({
      title: `Rate & Review ${fullName}`,
      html: `
        <div style="display:flex;flex-direction:column;gap:14px;text-align:left;font-family:sans-serif;">
          <div>
            <label style="font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Rating (1 to 5 Stars)</label>
            <input id="swal-rating" type="range" min="1" max="5" value="5" style="width:100%;accent-color:#6366f1;margin-top:6px;" />
          </div>
          <div>
            <label style="font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Feedback Review</label>
            <textarea id="swal-review" placeholder="Share your experience learning with this mentor..." style="width:100%;min-height:95px;padding:12px;border:1px solid #334155;background:#090d16;color:#f8fafc;border-radius:12px;font-size:13px;outline:none;margin-top:6px;"></textarea>
          </div>
        </div>
      `,
      background: "#0b101f",
      color: "#f8fafc",
      showCancelButton: true,
      confirmButtonText: "Submit Feedback",
      confirmButtonColor: "#6366f1",
      cancelButtonColor: "#1e293b",
      preConfirm: () => {
        const rating = Number(document.getElementById("swal-rating")?.value || 5);
        const review = document.getElementById("swal-review")?.value || "";
        return { rating, review };
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/ratings`, {
        reviewerEmail: authUser.email,
        targetEmail: email,
        rating: result.value.rating,
        review: result.value.review,
      });
      setRatingSummary(res.data.summary);
      toast.success("Feedback submitted successfully!");
      if (refetch) await refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || "Rating failed.");
    }
  };

  const handleConnect = async (e) => {
    e?.stopPropagation();
    if (!authUser) {
      toast.warning("Please sign in to connect with mentors.");
      return;
    }

    const confirmResult = await showConfirm({
      variant: "confirm",
      badge: "MENTORSHIP INVITE",
      title: "Send Mentorship Request?",
      description:
        "Connect with this expert to unlock direct 1-on-1 messaging and learning sessions.",
      targetLabel: "Mentor",
      targetValue: fullName,
      confirmText: "Send Request",
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    try {
      const requestData = {
        senderUid: authUser?.uid || authUser?._id,
        senderEmail: authUser?.email,
        senderName: authUser?.displayName || authUser?.name || "Learner",
        senderImage: authUser?.photoURL || authUser?.profileImage || "",
        receiverEmail: email,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/connections/requests`,
        requestData
      );

      setConnectionStatus("sent");
      toast.confirmed("Connection Request Sent", {
        description: `Invitation sent to ${fullName}.`,
        badge: "SENT",
      });
      if (refetch) await refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send request.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e) => {
    e?.stopPropagation();
    const confirmResult = await showConfirm({
      variant: "delete",
      badge: "WITHDRAW INVITE",
      title: "Withdraw Request?",
      description: "Cancel your pending connection request for this mentor.",
      targetLabel: "Recipient",
      targetValue: fullName,
      confirmText: "Yes, Withdraw",
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/connections/requests/cancel`,
        {
          data: { senderEmail: authUser?.email, receiverEmail: email },
        }
      );
      setConnectionStatus("none");
      toast.deleted("Connection Request Withdrawn", {
        description: "Pending invitation removed.",
        target: fullName,
        badge: "WITHDRAWN",
      });
      if (refetch) await refetch();
    } catch (error) {
      toast.error("Could not cancel request.");
    } finally {
      setLoading(false);
    }
  };

  const calculatedMatch = useMemo(() => {
    if (typeof apiMatchPercentage === "number" && apiMatchPercentage > 0) {
      return apiMatchPercentage;
    }
    return Math.min(84 + (teachSkills?.length || 0) * 3, 98);
  }, [apiMatchPercentage, teachSkills]);

  const hasRealRating =
    ratingSummary.totalRatings > 0 && ratingSummary.averageRating > 0;

  // Level visual badge configuration
  const levelBadge = useMemo(() => {
    const lvl = (teachLevel || "").toLowerCase();
    if (lvl.includes("expert") || lvl.includes("lead") || lvl.includes("senior")) {
      return {
        label: "Expert Mentor",
        badgeClass: "bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border-purple-500/40 text-purple-300",
        icon: <Award size={12} className="text-purple-400" />,
      };
    }
    if (lvl.includes("intermediate") || lvl.includes("mid")) {
      return {
        label: "Specialist",
        badgeClass: "bg-cyan-950/80 border-cyan-500/40 text-cyan-300",
        icon: <Zap size={12} className="text-cyan-400" />,
      };
    }
    return {
      label: "Mentor Practitioner",
      badgeClass: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300",
      icon: <CheckCircle2 size={12} className="text-emerald-400" />,
    };
  }, [teachLevel]);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.05 }}
        whileHover={{ y: -6 }}
        onClick={() => navigate(`/experts/${_id || encodeURIComponent(email)}`)}
        className="group relative h-full flex flex-col justify-between rounded-3xl bg-gradient-to-b from-slate-900/90 via-[#0b101f]/90 to-[#060a14]/95 border border-slate-800/80 hover:border-indigo-500/60 p-6 backdrop-blur-2xl transition-all duration-300 shadow-xl hover:shadow-[0_20px_45px_-10px_rgba(99,102,241,0.22)] overflow-hidden cursor-pointer selection:bg-indigo-500/30"
      >
        {/* Top Glowing Neon Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Ambient Hover Spotlight */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none transition-colors duration-300" />

        {/* Card Body */}
        <div className="relative z-10 flex-1 flex flex-col">
          {/* 1. Header Badges: Match % & Level / Rating */}
          <div className="flex items-center justify-between gap-2 mb-4">
            {/* Match Percentage Pill */}
            {mentor.hybridMetrics ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-[10px] font-mono font-black tracking-wider shadow-xs">
                <Sparkles size={11} className="text-indigo-400 fill-indigo-400 animate-pulse" />
                <span>{mentor.hybridMetrics.hybridScore}% HYBRID MATCH</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-black tracking-wider shadow-xs">
                <Zap size={11} className="text-emerald-400 fill-emerald-400 animate-pulse" />
                <span>{calculatedMatch}% MATCH</span>
              </div>
            )}

            {/* Right: Level Badge or Star Rating */}
            <div className="flex items-center gap-1.5">
              {hasRealRating ? (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-300 text-[11px] font-bold shadow-xs">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>{Number(ratingSummary.averageRating).toFixed(1)}</span>
                  <span className="text-slate-400 text-[10px] font-normal">
                    ({ratingSummary.totalRatings})
                  </span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide shadow-xs ${levelBadge.badgeClass}`}
                >
                  {levelBadge.icon}
                  <span>{levelBadge.label}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Mentor Identity (Avatar + Name + Bio) */}
          <div className="flex items-start gap-4 mb-3.5">
            {/* Glowing Avatar */}
            <div className="relative shrink-0">
              <div className="p-[2px] rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg group-hover:rotate-3 transition-transform duration-300">
                <div className="w-16 h-16 rounded-[14px] overflow-hidden bg-slate-950 flex items-center justify-center">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={fullName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-2xl">
                      {(fullName || "M")[0]}
                    </div>
                  )}
                </div>
              </div>
              {/* Online Presence Indicator */}
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 absolute -bottom-0.5 -right-0.5 shadow-sm animate-pulse" />
            </div>

            {/* Profile Text */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-indigo-300 transition-colors tracking-tight leading-snug truncate">
                  {fullName}
                </h3>
                <ShieldCheck size={14} className="text-indigo-400 shrink-0" title="Verified Mentor" />
              </div>

              {headline ? (
                <p className="text-xs font-semibold text-indigo-300 truncate mt-0.5">
                  {headline}
                </p>
              ) : (
                <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1 font-medium">
                  <Mail size={12} className="text-slate-500 shrink-0" />
                  <span className="truncate">{email}</span>
                </p>
              )}

              <p className="text-[11px] text-slate-400 truncate mt-1 flex items-center gap-1.5 font-mono">
                <GraduationCap size={12} className="text-indigo-400 shrink-0" />
                <span className="truncate">{education || "Verified Practitioner"}</span>
              </p>
            </div>
          </div>

          {/* 3. Mentor Bio Quote Strip */}
          <div className="bg-slate-950/60 border border-slate-800/70 rounded-2xl p-3 my-3 shadow-inner">
            <p className="text-xs text-slate-300/90 leading-relaxed italic line-clamp-2">
              "{bio}"
            </p>
          </div>

          {/* 3b. Hybrid AI Semantic & BM25 Match Breakdown */}
          {mentor.hybridMetrics && (
            <div className="mb-3 p-3 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-200 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-white flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-400" />
                  Semantic Dense: {mentor.hybridMetrics.denseScore}%
                </span>
                <span className="font-mono text-slate-300">
                  BM25 Keyword: {mentor.hybridMetrics.bm25Score}%
                </span>
              </div>
              <p className="text-[11px] text-indigo-300 leading-snug">
                {mentor.hybridMetrics.matchReason}
              </p>
              {mentor.hybridMetrics.matchedTokens?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {mentor.hybridMetrics.matchedTokens.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Teaching Skills Badges */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-400" />
                <span>Teaching Expertise</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-400 font-extrabold">
                {teachSkills.length} SKILLS
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {teachSkills.length > 0 ? (
                teachSkills.slice(0, 4).map((s, i) => {
                  const skillName = typeof s === "object" ? s.label || s.original || "" : s;
                  return (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-indigo-950/40 border border-indigo-700/50 hover:border-indigo-400 text-indigo-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      {skillName}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-slate-500 italic">General Software Engineering & Guidance</span>
              )}

              {teachSkills.length > 4 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                  className="px-2 py-1 text-[10px] font-mono font-bold rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-indigo-500 transition-colors"
                >
                  +{teachSkills.length - 4} more
                </button>
              )}
            </div>
          </div>

          {/* 5. Micro-Metrics Ribbon */}
          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center font-mono text-[10px] text-slate-400 mb-4">
            <div>
              <p className="text-slate-500 uppercase tracking-widest text-[9px]">LEVEL</p>
              <p className="font-bold text-slate-200 truncate mt-0.5">{teachLevel || "Senior"}</p>
            </div>
            <div className="border-x border-slate-800/80 px-1">
              <p className="text-slate-500 uppercase tracking-widest text-[9px]">SESSION</p>
              <p className="font-bold text-slate-200 truncate mt-0.5">1-on-1 P2P</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase tracking-widest text-[9px]">REPUTATION</p>
              <p className="font-bold text-amber-300 truncate mt-0.5">
                {hasRealRating ? `★ ${Number(ratingSummary.averageRating).toFixed(1)}` : "Verified"}
              </p>
            </div>
          </div>
        </div>

        {/* 6. Footer Action Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex items-center gap-2 pt-3 border-t border-slate-800/80"
        >
          {/* Quick Profile View Button */}
          <button
            onClick={() => navigate(`/experts/${_id || encodeURIComponent(email)}`)}
            className="p-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700/70 shadow-sm shrink-0 focus-visible:outline-none"
            title="View Complete Expert Profile"
            aria-label="View Complete Expert Profile"
          >
            <Eye size={16} />
          </button>

          {/* Connection Status Buttons */}
          {connectionStatus === "connected" ? (
            <div className="flex-1 flex gap-2">
              <button
                onClick={() => navigate(`/message?peer=${encodeURIComponent(email)}`)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
              >
                <MessageSquare size={14} /> Message
              </button>
              <button
                onClick={handleRate}
                className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Star size={13} className="fill-amber-400" /> Rate
              </button>
            </div>
          ) : connectionStatus === "received" ? (
            <button
              disabled
              className="flex-1 py-2.5 rounded-xl bg-indigo-950/70 text-indigo-300 border border-indigo-700/50 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} className="text-indigo-400" /> Request Received
            </button>
          ) : connectionStatus === "sent" ? (
            <button
              disabled={loading}
              onClick={handleCancel}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {loading ? (
                <ButtonSpinner size="xs" />
              ) : (
                <>
                  <X size={14} /> Withdraw Request
                </>
              )}
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={handleConnect}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <ButtonSpinner size="xs" />
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Connect with Mentor</span>
                  <ArrowUpRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Quick Preview Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-gradient-to-b from-[#0e1629] via-[#090d18] to-[#060912] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-100 font-sans"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700 transition-colors"
                aria-label="Close Modal"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="p-[2.5px] rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 mb-4 shadow-xl">
                  <div className="w-20 h-20 rounded-[14px] overflow-hidden bg-slate-950 flex items-center justify-center">
                    {displayImage ? (
                      <img src={displayImage} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-3xl">
                        {(fullName || "M")[0]}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <h2 className="text-2xl font-black text-white">{fullName}</h2>
                  <ShieldCheck size={18} className="text-indigo-400" />
                </div>
                <p className="text-xs text-slate-400 font-medium mb-3">{email}</p>

                <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-full border border-slate-800 mb-6 font-mono text-xs text-slate-300">
                  <GraduationCap className="text-indigo-400" size={14} />
                  <span>{education || "Verified Practitioner"}</span>
                </div>

                <div className="w-full space-y-6 text-left">
                  {/* Teaching Skills */}
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen size={13} className="text-indigo-400" />
                        Teaching Expertise
                      </h4>
                      <span className="text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-mono">
                        {teachLevel || "Expert"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {teachSkills.map((skill, idx) => {
                        const skillName = typeof skill === "object" ? skill.label || skill.original || "" : skill;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800/80 text-indigo-200 rounded-xl text-xs font-semibold"
                          >
                            <CheckCircle2 size={13} className="text-indigo-400" />
                            <span>{skillName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Learning Interests */}
                  {learnSkills.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2.5">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Target size={13} className="text-purple-400" />
                          Learning Interests
                        </h4>
                        <span className="text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md font-mono">
                          {learnLevel || "Learner"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {learnSkills.map((skill, idx) => {
                          const skillName = typeof skill === "object" ? skill.label || skill.original || "" : skill;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800/80 text-purple-200 rounded-xl text-xs font-semibold"
                            >
                              <Target size={13} className="text-purple-400" />
                              <span>{skillName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Mentor Bio
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{bio}"
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-3 w-full">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      navigate(`/experts/${_id || encodeURIComponent(email)}`);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                  >
                    View Full Profile & Experience
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MentorCard;
