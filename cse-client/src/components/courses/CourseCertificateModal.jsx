import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Award, Lock, Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import CourseCertificateSheet from "./CourseCertificateSheet";

/**
 * CourseCertificateModal — Portal modal displaying the user's official
 * completion certificate (or remaining progress needed to hit 80%).
 */
const CourseCertificateModal = ({
  courseId,
  courseTitle = "",
  initialCertificateState = null,
  onClose,
}) => {
  const [certState, setCertState] = useState({
    forCourseId: courseId || "",
    payload: initialCertificateState,
    loading: !initialCertificateState?.data && Boolean(courseId),
    error: "",
  });

  useEffect(() => {
    if (!courseId) return undefined;
    let cancelled = false;

    const loadCertificate = async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const res = await apiClient.get(`/courses/${courseId}/certificate`);
        if (!cancelled) {
          setCertState({
            forCourseId: courseId,
            payload: res.data,
            loading: false,
            error: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setCertState((prev) => ({
            forCourseId: courseId,
            payload: prev.payload || initialCertificateState,
            loading: false,
            error:
              prev.payload || initialCertificateState
                ? ""
                : err?.response?.data?.message || "Failed to load certificate record.",
          }));
        }
      }
    };

    loadCertificate();
    return () => {
      cancelled = true;
    };
  }, [courseId, initialCertificateState]);

  if (typeof document === "undefined") return null;

  const payload = certState.payload;
  const certDoc = payload?.data || null;
  const unlocked = Boolean(payload?.unlocked && certDoc);

  return createPortal(
    <div className="fixed inset-0 z-[9996] bg-[#02050e]/88 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="w-full max-w-5xl rounded-[28px] border border-amber-500/35 bg-[#0b101f] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.95)] overflow-hidden my-auto">
        <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 cert-no-print" />

        {/* Header */}
        <div className="px-6 py-4 bg-[#070b16] border-b border-slate-800 flex items-center justify-between gap-3 cert-no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`p-2 rounded-xl border shrink-0 ${
                unlocked
                  ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {unlocked ? <Award className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white truncate">
                {unlocked
                  ? `Certificate — ${certDoc.courseTitle || courseTitle}`
                  : `Course Certificate (${courseTitle || "Locked"})`}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {unlocked
                  ? `Issued to ${certDoc.recipientName} • ${certDoc.certificateCode}`
                  : `Requires 80% course completion (${payload?.currentPercent || 0}% done)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          {certState.loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
              <span>Preparing your official certificate...</span>
            </div>
          ) : certState.error ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs font-semibold text-rose-300">{certState.error}</p>
            </div>
          ) : unlocked ? (
            <CourseCertificateSheet certificate={certDoc} showActions={true} />
          ) : (
            <div className="py-12 px-6 max-w-lg mx-auto text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white">Certificate Currently Locked</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete at least <strong className="text-amber-300">80%</strong> of the lessons in this course to automatically issue your verified certificate under your name.
                </p>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Your Completion Progress</span>
                  <span className="text-amber-400 font-mono">
                    {payload?.currentPercent || 0}% / 80%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, payload?.currentPercent || 0)}%` }}
                  />
                </div>
                {payload?.videosNeeded > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Finish <strong className="text-white">{payload.videosNeeded}</strong> more video
                    {payload.videosNeeded > 1 ? "s" : ""} to unlock download.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CourseCertificateModal;

