import React from "react";
import { Award, Lock, CheckCircle2, Play, Sparkles, Maximize2 } from "lucide-react";
import CourseCertificateSheet from "./CourseCertificateSheet";

/**
 * CertificateLessonPanel — Rendered inside the Classroom Workspace when the user selects
 * the permanent final "Certificate" lesson item at the bottom of the curriculum sidebar.
 */
const CertificateLessonPanel = ({
  course,
  certificateState,
  computedProgress,
  recipientFallbackName,
  onResumeLessons,
  onOpenFullscreenModal,
}) => {
  const threshold = certificateState?.thresholdPercent || 80;
  const currentPercent = computedProgress?.percent ?? certificateState?.currentPercent ?? 0;
  const unlocked = Boolean(certificateState?.unlocked && certificateState?.data);
  const videosNeeded =
    certificateState?.videosNeeded ??
    (computedProgress?.totalVideos > 0
      ? Math.max(
          0,
          Math.ceil(computedProgress.totalVideos * (threshold / 100)) -
            (computedProgress.completedVideos || 0)
        )
      : 0);

  if (unlocked) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-amber-500/35 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-amber-950/35 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  Unlocked ({currentPercent}% Done)
                </span>
                <span className="text-[11px] font-mono text-amber-300">
                  {certificateState.data.certificateCode}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1">
                Congratulations, {certificateState.data.recipientName}! Your Certificate is Ready
              </h2>
              <p className="text-xs text-slate-300">
                Download your high-resolution verified diploma as PNG or print it directly to PDF.
              </p>
            </div>
          </div>

          {onOpenFullscreenModal && (
            <button
              type="button"
              onClick={onOpenFullscreenModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 shrink-0 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Preview</span>
            </button>
          )}
        </div>

        <CourseCertificateSheet certificate={certificateState.data} showActions={true} />
      </div>
    );
  }

  const ratioToward80 = Math.min(100, Math.round((currentPercent / threshold) * 100));

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-[#0a1020] to-slate-950 p-6 sm:p-10 shadow-2xl space-y-7">
      <div className="max-w-2xl mx-auto text-center space-y-5">
        <div className="relative w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/35 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
          <Award className="w-9 h-9 opacity-60" />
          <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-300 flex items-center justify-center shadow">
            <Lock className="w-4 h-4" />
          </span>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
            <Lock className="w-3 h-3" />
            Final Milestone • Locked Until {threshold}% Completion
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Official Course Completion Certificate
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Finish at least <strong className="text-white">{threshold}%</strong> of{" "}
            <strong className="text-indigo-300">{course?.title}</strong> to unlock &amp; download an
            official signed diploma issued in the name of{" "}
            <strong className="text-amber-300">{recipientFallbackName || "you"}</strong>.
          </p>
        </div>

        {/* Progress Meter toward 80% */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-300">Progress Toward Certificate Unlock</span>
            <span className="font-mono font-black text-amber-300">
              {currentPercent}% completed • Target {threshold}%
            </span>
          </div>

          <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${ratioToward80}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              {computedProgress?.completedVideos || 0} of {computedProgress?.totalVideos || 0} videos completed
            </span>
            <span className="text-amber-300 font-semibold">
              {computedProgress?.totalVideos > 0
                ? videosNeeded > 0
                  ? `${videosNeeded} more video${videosNeeded > 1 ? "s" : ""} required to unlock`
                  : "Almost there! Refresh or complete next lesson"
                : "Certificate unlocks once course video modules are 80% completed"}
            </span>
          </div>
        </div>

        {/* Preview checklist of what's inside the certificate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {[
            {
              title: "Personalized Recipient",
              desc: `Issued directly to ${recipientFallbackName || "your name"}`,
            },
            {
              title: "Course & Platform Seal",
              desc: `${course?.title || "Course"} • Collaborative Skill Engine`,
            },
            {
              title: "Dual Official Signatures",
              desc: "Course Instructor & Authorized Platform Director Sign",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1"
            >
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {item.title}
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>

        {onResumeLessons && (
          <button
            type="button"
            onClick={onResumeLessons}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Continue Video Lessons</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CertificateLessonPanel;

