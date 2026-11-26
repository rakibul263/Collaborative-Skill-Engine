import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Globe,
  Github,
  Linkedin,
  ExternalLink,
  MessageSquare,
  Star,
  CheckCircle2,
  Share2,
  UserCheck,
  UserPlus,
  Clock,
  Award,
  Sparkles,
  Zap,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";
import { useNavigate } from "react-router";
import apiClient from "@/lib/apiClient";
import useAuth from "@/hooks/useAuth";

const ExpertProfileHeader = ({
  profile,
  reviewsSummary,
  connectionStatus: initialConnectionStatus,
  isOnline,
  onRefetch,
  onOpenRateModal,
}) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(initialConnectionStatus);

  const {
    fullName = "Verified Expert",
    username,
    email,
    profileImage,
    headline,
    role = "Mentor",
    location,
    education,
    website,
    github,
    linkedin,
    portfolio,
    teachLevel = "Mentor",
  } = profile || {};

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async () => {
    if (!authUser) {
      toast.warning("Please sign in to connect with mentors.");
      return;
    }

    const confirmResult = await showConfirm({
      variant: "confirm",
      badge: "MENTORSHIP INVITE",
      title: "Send Connection Request?",
      description:
        "Send a mentorship connection invite to unlock 1-on-1 messaging and session scheduling.",
      targetLabel: "Mentor",
      targetValue: fullName,
      confirmText: "Send Request",
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    try {
      await apiClient.post("/connections/requests", {
        senderUid: authUser?.uid || authUser?._id,
        senderEmail: authUser?.email,
        senderName: authUser?.displayName || authUser?.name || "Learner",
        senderImage: authUser?.photoURL || authUser?.profileImage || "",
        receiverEmail: email,
      });

      setConnectionStatus("sent");
      toast.confirmed("Mentorship Request Sent", {
        description: `Connection invitation delivered to ${fullName}.`,
        badge: "SENT",
      });
      if (onRefetch) onRefetch();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send connection request.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const confirmResult = await showConfirm({
      variant: "delete",
      badge: "WITHDRAW INVITE",
      title: "Withdraw Connection Request?",
      description: "Cancel your pending connection invitation for this mentor.",
      targetLabel: "Recipient",
      targetValue: fullName,
      confirmText: "Yes, Withdraw",
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    try {
      await apiClient.delete("/connections/requests/cancel", {
        data: { senderEmail: authUser?.email, receiverEmail: email },
      });
      setConnectionStatus("none");
      toast.deleted("Connection Request Withdrawn", {
        description: "Pending invitation cancelled.",
        target: fullName,
        badge: "WITHDRAWN",
      });
      if (onRefetch) onRefetch();
    } catch (error) {
      toast.error("Could not cancel request.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to format social links safely
  const formatUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  return (
    <div className="relative rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-2xl overflow-hidden shadow-2xl">
      {/* Dynamic Cover Header Banner */}
      <div className="h-44 sm:h-52 w-full bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="absolute -top-10 left-1/4 w-72 h-72 bg-indigo-500/20 blur-[90px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-72 h-72 bg-purple-500/20 blur-[90px] rounded-full pointer-events-none" />

        {/* Share Button (Top Right) */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-700/60 text-xs font-bold text-slate-200 hover:text-white backdrop-blur-md transition-all shadow-md active:scale-95"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={14} className="text-indigo-400" />
                <span>Share Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Profile Info Overlay Area */}
      <div className="px-6 sm:px-10 pb-8 relative -mt-16 sm:-mt-20">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          {/* Avatar & Badges */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            <div className="relative p-[3px] rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-2xl">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[22px] overflow-hidden bg-slate-950 flex items-center justify-center relative">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-4xl">
                    {(fullName || "E")[0]}
                  </div>
                )}
              </div>

              {/* Online / Offline status badge indicator */}
              <div
                className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-slate-950 ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
                }`}
                title={isOnline ? "Active Now" : "Offline"}
              />
            </div>

            <div className="space-y-1.5 pt-2 sm:pt-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {fullName}
                </h1>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold">
                  <CheckCircle2 size={13} className="text-indigo-400" />
                  <span>Verified Practitioner</span>
                </div>
              </div>

              {username && (
                <p className="text-xs font-bold text-indigo-400">
                  @{username.replace(/^@/, "")}
                </p>
              )}

              {headline ? (
                <p className="text-sm font-semibold text-slate-300 max-w-xl">
                  {headline}
                </p>
              ) : (
                <p className="text-sm font-medium text-slate-400">
                  {role} • {teachLevel} Level
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-medium">
                {location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-indigo-400 shrink-0" />
                    <span>{location}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="text-indigo-400 shrink-0" />
                    <span>{email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Star size={13} className="fill-amber-400 shrink-0" />
                  <span>
                    {reviewsSummary?.averageRating > 0
                      ? `${reviewsSummary.averageRating} (${reviewsSummary.totalRatings} reviews)`
                      : "Verified Member"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full md:w-auto flex flex-wrap items-center gap-3 pt-4 md:pt-0">
            {connectionStatus === "connected" ? (
              <>
                <button
                  onClick={() => navigate(`/message?peer=${encodeURIComponent(email)}`)}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <MessageSquare size={15} />
                  <span>Message Expert</span>
                </button>
                <button
                  onClick={onOpenRateModal}
                  className="px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Star size={15} />
                  <span>Rate</span>
                </button>
              </>
            ) : connectionStatus === "sent" ? (
              <button
                disabled={loading}
                onClick={handleWithdraw}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <UserCheck size={15} />
                <span>Withdraw Request</span>
              </button>
            ) : connectionStatus === "received" ? (
              <button
                disabled
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Clock size={15} />
                <span>Request Received</span>
              </button>
            ) : connectionStatus === "self" ? (
              <button
                onClick={() => navigate("/profile")}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span>Edit Your Profile</span>
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={handleConnect}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
              >
                <UserPlus size={15} />
                <span>Connect & Request Mentorship</span>
              </button>
            )}
          </div>
        </div>

        {/* Social Links Row - Display only if real links exist in DB */}
        {(github || linkedin || website || portfolio) && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
              Verified Links:
            </span>
            {github && (
              <a
                href={formatUrl(github)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <Github size={14} className="text-slate-400" />
                <span>GitHub</span>
                <ExternalLink size={12} className="text-slate-500 ml-0.5" />
              </a>
            )}
            {linkedin && (
              <a
                href={formatUrl(linkedin)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <Linkedin size={14} className="text-blue-400" />
                <span>LinkedIn</span>
                <ExternalLink size={12} className="text-slate-500 ml-0.5" />
              </a>
            )}
            {website && (
              <a
                href={formatUrl(website)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <Globe size={14} className="text-emerald-400" />
                <span>Website</span>
                <ExternalLink size={12} className="text-slate-500 ml-0.5" />
              </a>
            )}
            {portfolio && (
              <a
                href={formatUrl(portfolio)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Portfolio</span>
                <ExternalLink size={12} className="text-slate-500 ml-0.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertProfileHeader;
