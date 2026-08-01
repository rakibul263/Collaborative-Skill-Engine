import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Zap,
  ArrowUpRight,
  Star,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  BookOpen,
  Target,
  MessageSquare,
  Sparkles,
  User,
  Award,
} from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router";

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
    teachLevel = "Mentor",
    learnLevel = "Learner",
    education = "Not Specified",
    connectionStatus: initialConnectionStatus = "none",
    bio = "Dedicated platform mentor passionate about collaborative skill sharing.",
  } = mentor;

  const displayImage = profileImage || image || null;

  const [connectionStatus, setConnectionStatus] = useState(
    initialConnectionStatus
  );

  useEffect(() => {
    setConnectionStatus(initialConnectionStatus);
  }, [initialConnectionStatus]);

  useEffect(() => {
    setRatingSummary({
      averageRating: mentor?.averageRating || 0,
      totalRatings: mentor?.totalRatings || 0,
    });
  }, [mentor?.averageRating, mentor?.totalRatings]);

  const handleRate = async () => {
    if (!authUser?.email || connectionStatus !== "connected") return;
    const result = await Swal.fire({
      title: `Rate ${fullName}`,
      html: `
        <div style="display:flex;flex-direction:column;gap:12px;text-align:left">
          <label style="font-size:13px;color:#94a3b8">Rating (1-5)</label>
          <input id="swal-rating" type="range" min="1" max="5" value="5" style="accent-color:#6366f1;" />
          <textarea id="swal-review" placeholder="Write a short review..." style="width:100%;min-height:90px;padding:10px;border:1px solid #334155;background:#0f172a;color:#fff;border-radius:10px;"></textarea>
        </div>
      `,
      background: "#090d16",
      color: "#fff",
      showCancelButton: true,
      confirmButtonText: "Submit Rating",
      confirmButtonColor: "#6366f1",
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
      Swal.fire({
        title: "Feedback Submitted!",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
        background: "#090d16",
        color: "#fff",
      });
      if (refetch) await refetch();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Rating failed.",
        icon: "error",
        background: "#090d16",
        color: "#fff",
      });
    }
  };

  const handleConnect = async () => {
    if (!authUser) {
      return Swal.fire({
        title: "Login Required",
        text: "Please log in to connect with mentors.",
        icon: "warning",
        background: "#090d16",
        color: "#fff",
        confirmButtonColor: "#6366f1",
      });
    }

    const confirmResult = await Swal.fire({
      title: "Send Connection Request?",
      text: `Send a mentorship request to ${fullName}?`,
      icon: "question",
      showCancelButton: true,
      background: "#090d16",
      color: "#fff",
      confirmButtonColor: "#6366f1",
      confirmButtonText: "Send Request",
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    try {
      const requestData = {
        senderUid: authUser?.uid || authUser?._id,
        senderEmail: authUser?.email,
        senderName: authUser?.displayName || authUser?.name || "Learner",
        senderImage:
          authUser?.photoURL ||
          authUser?.profileImage ||
          "",
        receiverEmail: email,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/connections/requests`,
        requestData
      );

      setConnectionStatus("sent");
      Swal.fire({
        title: "Request Sent!",
        text: `Connection request sent to ${fullName}.`,
        icon: "success",
        background: "#090d16",
        color: "#fff",
        confirmButtonColor: "#6366f1",
      });
      if (refetch) await refetch();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Could not send request.",
        icon: "error",
        background: "#090d16",
        color: "#fff",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirmResult = await Swal.fire({
      title: "Withdraw Request?",
      text: "Are you sure you want to cancel this connection request?",
      icon: "warning",
      showCancelButton: true,
      background: "#090d16",
      color: "#fff",
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Withdraw",
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
      Swal.fire({
        title: "Withdrawn",
        text: "Request cancelled successfully.",
        icon: "success",
        background: "#090d16",
        color: "#fff",
        confirmButtonColor: "#6366f1",
      });
      if (refetch) await refetch();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not cancel request.",
        icon: "error",
        background: "#090d16",
        color: "#fff",
      });
    } finally {
      setLoading(false);
    }
  };

  const matchPercentage = useMemo(
    () => Math.min(82 + (teachSkills?.length || 0) * 4, 99),
    [teachSkills]
  );

  const hasRealRating =
    ratingSummary.totalRatings > 0 && ratingSummary.averageRating > 0;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.05 }}
        whileHover={{ y: -6 }}
        className="relative h-full flex flex-col justify-between"
      >
        <div className="relative h-full bg-slate-900/70 border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl p-6 backdrop-blur-2xl flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-indigo-500/10 group">
          {/* Top Info Bar */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <Zap className="text-emerald-400 size-3" />
                <span className="text-emerald-400 font-extrabold text-[10px] tracking-wide">
                  {matchPercentage}% MATCH
                </span>
              </div>

              {hasRealRating ? (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-400 text-[11px] font-bold">
                  <Star className="fill-amber-400 size-3" />
                  <span>{Number(ratingSummary.averageRating).toFixed(1)}</span>
                  <span className="text-slate-500 font-medium text-[10px]">
                    ({ratingSummary.totalRatings})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full text-indigo-400 text-[10px] font-bold">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>Verified Member</span>
                </div>
              )}
            </div>

            {/* Profile Avatar Header */}
            <div
              onClick={() => navigate(`/experts/${_id || encodeURIComponent(email)}`)}
              className="flex items-center gap-3.5 mb-5 cursor-pointer"
            >
              <div className="p-[2px] rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-slate-950 flex items-center justify-center">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl">
                      {(fullName || "M")[0]}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white truncate leading-tight group-hover:text-indigo-400 transition-colors">
                  {fullName}
                </h3>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-medium flex items-center gap-1">
                  <Mail size={12} className="text-slate-500 shrink-0" />
                  <span className="truncate">{email}</span>
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-300">
                  <Award size={11} className="text-indigo-400" />
                  <span>{teachLevel} Instructor</span>
                </div>
              </div>
            </div>

            {/* Skills Area */}
            <div className="space-y-3 mb-6">
              <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen size={11} className="text-indigo-400" /> Teaching Expertise
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {teachSkills.length > 0 ? (
                    teachSkills.slice(0, 3).map((s, i) => {
                      const skillName = typeof s === "object" ? s.label || s.original : s;
                      return (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-900 border border-slate-700/80 text-slate-200 inline-flex items-center gap-1"
                        >
                          <span className="w-1 h-1 rounded-full bg-indigo-400" />
                          {skillName}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">General Mentorship</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => navigate(`/experts/${_id || encodeURIComponent(email)}`)}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60 focus-visible:outline-none"
              title="View Full Expert Profile"
            >
              <Eye size={16} />
            </button>

            {connectionStatus === "connected" ? (
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => navigate(`/message?peer=${encodeURIComponent(email)}`)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <MessageSquare size={14} /> Message
                </button>
                <button
                  onClick={handleRate}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Star size={13} /> Rate
                </button>
              </div>
            ) : connectionStatus === "received" ? (
              <button
                disabled
                className="flex-1 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                Request Received
              </button>
            ) : connectionStatus === "sent" ? (
              <button
                disabled={loading}
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={14} />
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
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <>
                    <span>Connect</span> <ArrowUpRight size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-100"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="p-[2px] rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg">
                  <div className="w-20 h-20 rounded-[14px] overflow-hidden bg-slate-950 flex items-center justify-center">
                    {displayImage ? (
                      <img src={displayImage} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-3xl">
                        {(fullName || "M")[0]}
                      </div>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold text-white">{fullName}</h2>
                <p className="text-xs text-slate-400 font-medium mb-3">{email}</p>

                <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1 rounded-full border border-slate-800 mb-6">
                  <BookOpen className="text-indigo-400" size={13} />
                  <span className="text-xs font-semibold text-slate-300">{education}</span>
                </div>

                <div className="w-full space-y-6 text-left">
                  {/* Teaching Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Teaching Expertise
                      </h4>
                      <span className="text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                        {teachLevel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {teachSkills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 text-indigo-300 rounded-xl text-xs font-semibold"
                        >
                          <CheckCircle2 size={13} className="text-indigo-400" />
                          <span>{skill.label || skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Learning Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Learning Interests
                      </h4>
                      <span className="text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md">
                        {learnLevel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {learnSkills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 text-purple-300 rounded-xl text-xs font-semibold"
                        >
                          <Target size={13} className="text-purple-400" />
                          <span>{skill.label || skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>

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

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MentorCard;
