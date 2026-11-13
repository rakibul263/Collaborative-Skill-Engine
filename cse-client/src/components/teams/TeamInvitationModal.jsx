import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Users,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  Layers,
  MessageSquare,
  Shield,
  ArrowRight,
  X,
  Target,
  Award,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/components/ui/toast-system";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

/**
 * TeamInvitationModal — Displays comprehensive project squad details
 * and allows invited users to Accept or Decline the invitation.
 */
const TeamInvitationModal = ({
  isOpen,
  onClose,
  teamId,
  notification,
  onResponded,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [respondedStatus, setRespondedStatus] = useState(
    notification?.responded || null
  );

  const effectiveTeamId = teamId || notification?.teamId;

  // Fetch full team details when modal opens
  useEffect(() => {
    if (!isOpen || !effectiveTeamId) return;

    let isMounted = true;
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/api/teams/${effectiveTeamId}`);
        if (isMounted) {
          setTeam(res.data);
          // Check if current user already accepted or declined in team members array
          const userMember = (res.data?.members || []).find(
            (m) => (m.email || "").toLowerCase() === (user?.email || "").toLowerCase()
          );
          if (userMember?.status) {
            setRespondedStatus(userMember.status);
          }
        }
      } catch (err) {
        console.error("[TeamInvitationModal] fetch error:", err);
        // Fallback to basic notification info if full team lookup fails
        if (isMounted && notification) {
          setTeam({
            _id: effectiveTeamId,
            teamName: notification.teamName || notification.title?.replace("Squad Invitation: ", ""),
            projectTopic: notification.projectTopic || "Collaborative Project",
            description: notification.message || "You have been invited to collaborate in this project squad.",
            leaderEmail: notification.leaderEmail || "Squad Leader",
            members: [
              {
                email: user?.email,
                fullName: user?.displayName || user?.email?.split("@")[0],
                role: notification.role || "Developer",
                roleTitle: notification.roleTitle || "Specialist",
                fitPercent: notification.fitPercent || 90,
                status: "invited",
              },
            ],
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTeam();
    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveTeamId, user?.email, notification]);

  if (!isOpen) return null;

  // Find invited user's designated role in this squad
  const currentMember = (team?.members || []).find(
    (m) => (m.email || "").toLowerCase() === (user?.email || "").toLowerCase()
  );

  const designatedRole =
    currentMember?.roleTitle ||
    currentMember?.role ||
    notification?.roleTitle ||
    notification?.role ||
    "Specialist";

  const fitPercent = currentMember?.fitPercent || notification?.fitPercent || 92;
  const isLeader = (team?.leaderEmail || "").toLowerCase() === (user?.email || "").toLowerCase();

  const handleRespond = async (action) => {
    if (!effectiveTeamId) return;

    try {
      setResponding(true);
      const res = await apiClient.post(`/api/teams/${effectiveTeamId}/respond-invite`, {
        action,
        email: user?.email,
      });

      const updatedStatus = action === "accept" ? "accepted" : "declined";
      setRespondedStatus(updatedStatus);

      if (action === "accept") {
        toast.success(
          res.data?.message || "Successfully joined the squad! Messenger workspace is ready."
        );
      } else {
        toast.info("You declined this invitation.");
      }

      if (onResponded) {
        onResponded(updatedStatus, effectiveTeamId);
      }
    } catch (err) {
      console.error("[TeamInvitationModal] respond error:", err);
      toast.error(
        err.response?.data?.message || `Failed to ${action} the team invitation.`
      );
    } finally {
      setResponding(false);
    }
  };

  const handleOpenMessenger = () => {
    const convId = team?.conversationId || notification?.conversationId;
    if (convId) {
      navigate(`/message?conversationId=${convId}`);
    } else {
      navigate("/message");
    }
    onClose();
  };

  const handleGoToTeams = () => {
    navigate("/teams");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-indigo-950/40 overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-2xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles size={12} className="text-amber-400" />
                  Project Squad Invitation
                </span>
                {team?.projectTopic && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 truncate">
                    {team.projectTopic}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug break-words">
                {team?.teamName || notification?.teamName || "Project Squad"}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <ButtonSpinner size="md" />
                <p className="text-slate-400 font-medium">Loading squad overview and members...</p>
              </div>
            ) : (
              <>
                {/* 1. Designated Role & Fit Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                      <Target size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider block">
                        Your Invited Role
                      </span>
                      <p className="text-sm font-extrabold text-white mt-0.5">
                        {designatedRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-1">
                      <Award size={13} />
                      {fitPercent}% Compatibility
                    </span>
                  </div>
                </div>

                {/* 2. Project Description / Scope */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-400" />
                    <span>Project Scope & Mission</span>
                  </label>
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 leading-relaxed text-slate-300 font-normal">
                    {team?.description || "Collaborative engineering squad working on real-world milestones with integrated group chat and video conferencing."}
                  </div>
                </div>

                {/* 3. Team Leader Information */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Crown size={13} className="text-amber-400" />
                    <span>Squad Founder & Leader</span>
                  </label>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold overflow-hidden shrink-0 text-xs">
                        {team?.leader?.profileImage ? (
                          <img
                            src={team.leader.profileImage}
                            alt={team.leader.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (team?.leader?.fullName || team?.leaderEmail || "L")[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate text-xs">
                          {team?.leader?.fullName || team?.leaderEmail?.split("@")[0] || "Squad Leader"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {team?.leader?.email || team?.leaderEmail}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase shrink-0">
                      Leader
                    </span>
                  </div>
                </div>

                {/* 4. Squad Roster */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-indigo-400" />
                      <span>Squad Roster ({team?.members?.length || 0} Members)</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 lowercase font-medium">
                      integrated messenger group
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(team?.members || []).map((m) => {
                      const isSelf = (m.email || "").toLowerCase() === (user?.email || "").toLowerCase();
                      const isMemLeader = (m.email || "").toLowerCase() === (team?.leaderEmail || "").toLowerCase();

                      return (
                        <div
                          key={m.email}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                            isSelf
                              ? "bg-indigo-950/30 border-indigo-500/30 ring-1 ring-indigo-500/20"
                              : "bg-slate-950/40 border-slate-800/80"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shrink-0 text-[10px]">
                              {m.profileImage ? (
                                <img
                                  src={m.profileImage}
                                  alt={m.fullName}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                (m.fullName || m.email || "M")[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate text-xs flex items-center gap-1.5">
                                <span>{m.fullName || m.email?.split("@")[0]}</span>
                                {isSelf && (
                                  <span className="text-[9px] text-indigo-400 font-bold">(You)</span>
                                )}
                              </p>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {m.roleTitle || m.role || "Developer"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isMemLeader ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Leader
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                  m.status === "accepted"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                                }`}
                              >
                                {m.status === "accepted" ? "Active" : "Invited"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Response Status Banner if already acted */}
                {respondedStatus === "accepted" && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <div>
                      <p className="font-bold text-xs">You are an active member of this squad!</p>
                      <p className="text-[11px] text-emerald-300/80">
                        The group conversation and video meeting room are active in Messenger.
                      </p>
                    </div>
                  </div>
                )}

                {respondedStatus === "declined" && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400">
                    <XCircle size={18} className="shrink-0" />
                    <div>
                      <p className="font-bold text-xs">You declined this invitation.</p>
                      <p className="text-[11px] text-rose-300/80">
                        You can still form your own squad anytime from the Teams page.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer / Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            {respondedStatus === "accepted" || isLeader ? (
              <div className="w-full flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleGoToTeams}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition"
                >
                  View in My Teams
                </button>
                <button
                  type="button"
                  onClick={handleOpenMessenger}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  <MessageSquare size={14} />
                  <span>Open Messenger Workspace</span>
                </button>
              </div>
            ) : respondedStatus === "declined" ? (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={responding}
                  onClick={() => handleRespond("reject")}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {responding ? <ButtonSpinner size="xs" /> : <XCircle size={14} />}
                  <span>Decline Invitation</span>
                </button>

                <button
                  type="button"
                  disabled={responding}
                  onClick={() => handleRespond("accept")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {responding ? (
                    <>
                      <ButtonSpinner size="xs" />
                      <span>Joining Squad...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Accept & Join Squad</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TeamInvitationModal;

