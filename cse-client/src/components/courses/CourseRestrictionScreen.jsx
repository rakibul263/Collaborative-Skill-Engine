import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ShieldAlert,
  Clock,
  MessageSquare,
  FileQuestion,
  User,
  Calendar,
  ArrowLeft,
  Send,
  Sparkles,
} from "lucide-react";
import StudentAppealModal from "./StudentAppealModal";
import AdminDisputeModal from "./AdminDisputeModal";
import BottomNotificationPopup from "@/components/shared/notifications/BottomNotificationPopup";
import { getSocket } from "@/lib/socket";
import { playNotificationSound } from "@/lib/notificationSound";

/**
 * CourseRestrictionScreen — Clear, informative restriction screen displayed when
 * a student's course enrollment has been banned or temporarily suspended.
 * Allows the learner to clearly understand why they were restricted, view appeal history,
 * send detailed explanation messages to the instructor, and report to admin if necessary.
 */
const CourseRestrictionScreen = ({ course, enrollmentMeta, onRefresh }) => {
  const navigate = useNavigate();
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [adminDisputeModalOpen, setAdminDisputeModalOpen] = useState(false);
  const [initialNow] = useState(() => Date.now());
  const [instructorTyping, setInstructorTyping] = useState(null);
  const typingSafetyRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleAppealTyping = (data) => {
      if (data?.role === "instructor" || data?.recipientEmail) {
        if (data.isTyping) {
          setInstructorTyping(data);
          if (typingSafetyRef.current) clearTimeout(typingSafetyRef.current);
          typingSafetyRef.current = setTimeout(() => {
            setInstructorTyping(null);
          }, 4000);
        } else {
          setInstructorTyping(null);
        }
      }
    };

    const handleAppealUpdated = () => {
      setInstructorTyping(null);
      playNotificationSound("chime");
      if (onRefresh) onRefresh();
    };

    const handleEnrollmentUpdated = () => {
      playNotificationSound("chime");
      if (onRefresh) onRefresh();
    };

    socket.on("appeal:typing", handleAppealTyping);
    socket.on("appeal:updated", handleAppealUpdated);
    socket.on("enrollment:updated", handleEnrollmentUpdated);

    return () => {
      socket.off("appeal:typing", handleAppealTyping);
      socket.off("appeal:updated", handleAppealUpdated);
      socket.off("enrollment:updated", handleEnrollmentUpdated);
    };
  }, [onRefresh]);

  const isBanned = enrollmentMeta?.status === "banned" || enrollmentMeta?.banned;
  const isSuspended = enrollmentMeta?.status === "suspended" || enrollmentMeta?.suspended;

  const restrictionReason = isBanned
    ? enrollmentMeta?.banReason || "Violation of course guidelines"
    : enrollmentMeta?.suspendReason || "Temporary course suspension for administrative review";

  const restrictionDate = isBanned
    ? enrollmentMeta?.bannedAt
    : enrollmentMeta?.suspendedAt;

  const suspendedUntil = enrollmentMeta?.suspendedUntil;
  const suspendedDays = enrollmentMeta?.suspendedDays;

  // Compute remaining time if suspended
  const remainingText = useMemo(() => {
    if (!isSuspended || !suspendedUntil) return null;
    const diffMs = new Date(suspendedUntil).getTime() - initialNow;
    if (diffMs > 0) {
      const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return `${remainingDays} day${remainingDays > 1 ? "s" : ""} remaining`;
    }
    return "Suspension period ending soon (Refresh to check)";
  }, [isSuspended, suspendedUntil, initialNow]);

  const appeals = enrollmentMeta?.appeals || [];
  const latestAppeal = enrollmentMeta?.activeAppeal || appeals[0] || null;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar Navigation */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80">
        <button
          onClick={() => navigate("/courses/my-purchases")}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>My Purchases</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">Invoice:</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-mono text-[11px] font-bold text-cyan-300">
            {enrollmentMeta?.invoiceNumber || "INV-LEDGER"}
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="max-w-4xl w-full mx-auto my-6 space-y-6">
        
        {/* Restriction Alert Header */}
        <div
          className={`rounded-3xl p-6 sm:p-8 border shadow-2xl relative overflow-hidden ${
            isBanned
              ? "bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/30 shadow-rose-950/20"
              : "bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/30 shadow-amber-950/20"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isBanned
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                }`}
              >
                {isBanned ? (
                  <ShieldAlert className="w-7 h-7" />
                ) : (
                  <Clock className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      isBanned
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    {isBanned ? "ENROLLMENT RESTRICTED (BANNED)" : "TEMPORARILY SUSPENDED"}
                  </span>
                  {remainingText && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {remainingText}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {isBanned
                    ? "Your Course Access Has Been Restricted"
                    : "Your Course Access Is Temporarily Paused"}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Course: <strong className="text-slate-200">{enrollmentMeta?.courseTitle || course?.title || "Course"}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => onRefresh && onRefresh()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 cursor-pointer self-start sm:self-auto shrink-0"
              title="Refresh status"
            >
              Check Status
            </button>
          </div>

          {/* Reason Box — "আসলে কি হয়েছে" */}
          <div className="mt-6 space-y-3">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
              Reason Provided by Instructor (কেন রেস্ট্রিকশন দেওয়া হয়েছে):
            </span>
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl relative">
              <p className="text-sm font-semibold text-slate-200 italic leading-relaxed">
                "{restrictionReason}"
              </p>
            </div>

            {/* Metadata pills */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              {restrictionDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Applied on:{" "}
                    <strong className="text-slate-300">
                      {new Date(restrictionDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                </div>
              )}

              {isSuspended && suspendedUntil && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Suspended until:{" "}
                    <strong className="text-amber-300">
                      {new Date(suspendedUntil).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </strong>
                    {suspendedDays ? ` (${suspendedDays} days total)` : ""}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Instructor:{" "}
                  <strong className="text-slate-300">
                    {enrollmentMeta?.instructorName || enrollmentMeta?.instructorEmail || "Instructor"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* What This Means Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
            Current Restrictions on Your Account:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Protected lesson video streaming is locked</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>PDF study material downloads disabled</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Classroom forum &amp; discussion access suspended</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Certificate issuing is temporarily paused</span>
            </div>
          </div>
        </div>

        {/* Appeals & Messages Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-black text-white">
                  Appeals &amp; Instructor Communication (ইনস্ট্রাক্টরের সাথে বার্তা ও সমাধান)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Explain your problem or misunderstanding in detail. The instructor will receive an instant notification and can reply or restore your access.
              </p>
            </div>

            <button
              onClick={() => setAppealModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{latestAppeal ? "Send Follow-up Message" : "Message Instructor (Submit Appeal)"}</span>
            </button>
          </div>

          {/* Conversation / Appeal Timeline */}
          {appeals.length > 0 ? (
            <div className="space-y-4">
              {appeals.map((appeal) => (
                <div
                  key={appeal._id}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        Appeal #{appeal._id.slice(-6)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          appeal.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : appeal.status === "replied"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {appeal.status === "resolved"
                          ? "Resolved (Access Restored)"
                          : appeal.status === "replied"
                          ? "Instructor Replied"
                          : "Awaiting Instructor Review"}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {new Date(appeal.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Messages list */}
                  <div className="space-y-3">
                    {(appeal.messages || []).map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                          msg.sender === "instructor"
                            ? "bg-indigo-950/40 border border-indigo-500/30 ml-3 sm:ml-6"
                            : "bg-slate-900 border border-slate-800 mr-3 sm:mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              {msg.sender === "instructor" ? (
                                <span className="text-indigo-300 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Instructor: {msg.senderName || "Instructor"}
                                </span>
                              ) : (
                                <span className="text-slate-300">You (Student)</span>
                              )}
                            </span>
                            {msg.liftedRestriction && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                Lifted Restriction
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        <p className="text-slate-200 leading-relaxed font-normal">
                          {msg.message}
                        </p>

                        {msg.issueDetails && (
                          <div className="mt-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                            <span className="font-bold text-slate-400 block text-[10px] uppercase">
                              Problem Details (সমস্যার বিস্তারিত):
                            </span>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.issueDetails}</p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Realtime Instructor Typing Indicator */}
                    {instructorTyping && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs w-fit ml-3 sm:ml-6 shadow-md">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-bold text-white">
                          Instructor ({instructorTyping.userName || "Instructor"})
                        </span>
                        <span>is typing a response</span>
                        <span className="flex items-center gap-1 ml-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
              <FileQuestion className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">
                You haven't messaged the instructor yet regarding this restriction.
              </p>
              <p className="text-[11px] text-slate-500">
                Click <strong>"Message Instructor (Submit Appeal)"</strong> above to describe what happened and request review.
              </p>
            </div>
          )}

          {/* Platform Admin Escalation Link */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-300">
                Feeling this restriction is unjust or the instructor is not replying?
              </span>
              <p className="text-[11px] text-slate-400">
                You can file a formal dispute report directly to Platform Administration.
              </p>
            </div>

            <button
              onClick={() => setAdminDisputeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Report Dispute to Admin</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => navigate("/courses")}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            Browse Course Marketplace
          </button>
          <button
            onClick={() => navigate(`/courses/${course?._id || enrollmentMeta?.courseId}`)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            View Public Course Page
          </button>
        </div>
      </div>

      {/* Modals */}
      {appealModalOpen && (
        <StudentAppealModal
          courseId={course?._id || enrollmentMeta?.courseId}
          courseTitle={course?.title || enrollmentMeta?.courseTitle}
          instructorName={enrollmentMeta?.instructorName}
          instructorEmail={enrollmentMeta?.instructorEmail}
          restrictionType={isBanned ? "ban" : "suspension"}
          restrictionReason={restrictionReason}
          onClose={() => setAppealModalOpen(false)}
          onAppealSubmitted={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {adminDisputeModalOpen && (
        <AdminDisputeModal
          courseId={course?._id || enrollmentMeta?.courseId}
          courseTitle={course?.title || enrollmentMeta?.courseTitle}
          instructorEmail={enrollmentMeta?.instructorEmail}
          onClose={() => setAdminDisputeModalOpen(false)}
        />
      )}

      {/* Realtime Bottom Notification Banner */}
      <BottomNotificationPopup />
    </div>
  );
};

export default CourseRestrictionScreen;
