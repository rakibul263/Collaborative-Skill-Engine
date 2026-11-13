/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { toast as sonnerToast, Toaster } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  ShieldCheck,
  RotateCcw,
  X,
} from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";

/**
 * Custom Squircle Icon Badge for standard Sonner toast variants
 */
const ToastIconBadge = ({ variant, children }) => {
  const styles = {
    success:
      "bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.28)]",
    error:
      "bg-rose-500/15 border-rose-500/35 text-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.28)]",
    warning:
      "bg-amber-500/15 border-amber-500/35 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.28)]",
    info:
      "bg-cyan-500/15 border-cyan-500/35 text-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.28)]",
    loading:
      "bg-indigo-500/15 border-indigo-500/35 text-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.28)]",
  };

  return (
    <div
      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
        styles[variant] || styles.info
      }`}
    >
      {children}
    </div>
  );
};

/**
 * Bespoke Delete / Purge Toast Card rendered via sonnerToast.custom
 */
const DeletedToastCard = ({
  toastId,
  title,
  description,
  target,
  badge = "DELETED",
  duration = 4200,
}) => (
  <div className="relative w-[356px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-rose-500/35 bg-[#090d18]/95 backdrop-blur-2xl shadow-[0_20px_45px_-12px_rgba(0,0,0,0.9),0_0_28px_rgba(244,63,94,0.22)] p-3.5 pr-9 font-sans select-none">
    {/* Subtle crimson radial backlight */}
    <div className="absolute -top-6 -right-6 w-28 h-28 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

    {/* Left vertical neon bar */}
    <span className="absolute left-0 top-2.5 bottom-3 w-[3.5px] rounded-r-full bg-gradient-to-b from-rose-400 via-rose-500 to-pink-600 shadow-[0_0_12px_rgba(244,63,94,0.85)]" />

    <div className="relative flex items-start gap-3 pl-1.5">
      {/* Animated Trash Beacon */}
      <div className="relative w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-400 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.25)] mt-0.5">
        <span className="absolute inset-0 rounded-xl border border-rose-400/40 animate-ping opacity-25 pointer-events-none" />
        <Trash2 className="w-4 h-4 relative z-10" />
      </div>

      {/* Text Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[9px] font-mono font-bold uppercase tracking-wider text-rose-300 leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            {badge}
          </span>
        </div>

        <p className="text-[13px] font-extrabold text-white leading-snug tracking-tight">
          {title}
        </p>

        {description && (
          <p className="text-[11.5px] text-slate-300/90 leading-relaxed font-medium">
            {description}
          </p>
        )}

        {target && (
          <div className="pt-0.5">
            <span className="inline-block max-w-full truncate px-2 py-0.5 rounded-md bg-slate-950/90 border border-rose-500/25 text-[10px] font-mono text-rose-300">
              {target}
            </span>
          </div>
        )}
      </div>
    </div>

    {/* Dismiss Button */}
    <button
      type="button"
      onClick={() => sonnerToast.dismiss(toastId)}
      aria-label="Dismiss notification"
      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-800/70 hover:bg-rose-500/25 border border-slate-700/60 hover:border-rose-500/40 text-slate-400 hover:text-white flex items-center justify-center transition-all"
    >
      <X className="w-3.5 h-3.5" />
    </button>

    {/* Bottom Countdown Shimmer Bar */}
    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-800/70 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 toast-progress-bar"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  </div>
);

/**
 * Bespoke Confirmed / Verified Toast Card rendered via sonnerToast.custom
 */
const ConfirmedToastCard = ({
  toastId,
  title,
  description,
  target,
  badge = "CONFIRMED",
  duration = 4000,
}) => (
  <div className="relative w-[356px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-emerald-500/35 bg-[#090d18]/95 backdrop-blur-2xl shadow-[0_20px_45px_-12px_rgba(0,0,0,0.9),0_0_28px_rgba(16,185,129,0.2)] p-3.5 pr-9 font-sans select-none">
    {/* Subtle emerald-cyan radial backlight */}
    <div className="absolute -top-6 -right-6 w-28 h-28 bg-emerald-500/18 rounded-full blur-2xl pointer-events-none" />

    {/* Left vertical neon bar */}
    <span className="absolute left-0 top-2.5 bottom-3 w-[3.5px] rounded-r-full bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-500 shadow-[0_0_12px_rgba(16,185,129,0.85)]" />

    <div className="relative flex items-start gap-3 pl-1.5">
      {/* Glowing ShieldCheck Beacon */}
      <div className="relative w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(16,185,129,0.25)] mt-0.5">
        <ShieldCheck className="w-4 h-4 relative z-10" />
      </div>

      {/* Text Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-300 leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {badge}
          </span>
        </div>

        <p className="text-[13px] font-extrabold text-white leading-snug tracking-tight">
          {title}
        </p>

        {description && (
          <p className="text-[11.5px] text-slate-300/90 leading-relaxed font-medium">
            {description}
          </p>
        )}

        {target && (
          <div className="pt-0.5">
            <span className="inline-block max-w-full truncate px-2 py-0.5 rounded-md bg-slate-950/90 border border-emerald-500/25 text-[10px] font-mono text-emerald-300">
              {target}
            </span>
          </div>
        )}
      </div>
    </div>

    {/* Dismiss Button */}
    <button
      type="button"
      onClick={() => sonnerToast.dismiss(toastId)}
      aria-label="Dismiss notification"
      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-800/70 hover:bg-emerald-500/20 border border-slate-700/60 hover:border-emerald-500/40 text-slate-400 hover:text-white flex items-center justify-center transition-all"
    >
      <X className="w-3.5 h-3.5" />
    </button>

    {/* Bottom Countdown Shimmer Bar */}
    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-800/70 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 toast-progress-bar"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  </div>
);

/**
 * Bespoke Reset / New Session Toast Card rendered via sonnerToast.custom
 */
const ResetToastCard = ({
  toastId,
  title,
  description,
  target,
  badge = "NEW SESSION",
  duration = 3800,
}) => (
  <div className="relative w-[356px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-indigo-500/40 bg-[#090d18]/95 backdrop-blur-2xl shadow-[0_20px_45px_-12px_rgba(0,0,0,0.9),0_0_28px_rgba(99,102,241,0.24)] p-3.5 pr-9 font-sans select-none">
    <div className="absolute -top-6 -right-6 w-28 h-28 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
    <span className="absolute left-0 top-2.5 bottom-3 w-[3.5px] rounded-r-full bg-gradient-to-b from-indigo-400 via-violet-500 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.85)]" />

    <div className="relative flex items-start gap-3 pl-1.5">
      <div className="relative w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-indigo-400 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(99,102,241,0.25)] mt-0.5">
        <RotateCcw className="w-4 h-4 relative z-10" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-300 leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {badge}
          </span>
        </div>

        <p className="text-[13px] font-extrabold text-white leading-snug tracking-tight">
          {title}
        </p>

        {description && (
          <p className="text-[11.5px] text-slate-300/90 leading-relaxed font-medium">
            {description}
          </p>
        )}

        {target && (
          <div className="pt-0.5">
            <span className="inline-block max-w-full truncate px-2 py-0.5 rounded-md bg-slate-950/90 border border-indigo-500/25 text-[10px] font-mono text-indigo-300">
              {target}
            </span>
          </div>
        )}
      </div>
    </div>

    <button
      type="button"
      onClick={() => sonnerToast.dismiss(toastId)}
      aria-label="Dismiss notification"
      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-800/70 hover:bg-indigo-500/20 border border-slate-700/60 hover:border-indigo-500/40 text-slate-400 hover:text-white flex items-center justify-center transition-all"
    >
      <X className="w-3.5 h-3.5" />
    </button>

    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-800/70 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 toast-progress-bar"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  </div>
);

/**
 * Show a dedicated bespoke Delete / Purge toast notification
 */
export function showDeletedToast(title, options = {}) {
  const { description, target, badge = "DELETED", duration = 4200, id } = options;
  return sonnerToast.custom(
    (toastId) => (
      <DeletedToastCard
        toastId={toastId}
        title={title}
        description={description}
        target={target}
        badge={badge}
        duration={duration}
      />
    ),
    { duration, id }
  );
}

/**
 * Show a dedicated bespoke Confirmation / Verified toast notification
 */
export function showConfirmedToast(title, options = {}) {
  const { description, target, badge = "CONFIRMED", duration = 4000, id } = options;
  return sonnerToast.custom(
    (toastId) => (
      <ConfirmedToastCard
        toastId={toastId}
        title={title}
        description={description}
        target={target}
        badge={badge}
        duration={duration}
      />
    ),
    { duration, id }
  );
}

/**
 * Show a dedicated bespoke Reset / New Session toast notification
 */
export function showResetToast(title, options = {}) {
  const { description, target, badge = "NEW SESSION", duration = 3800, id } = options;
  return sonnerToast.custom(
    (toastId) => (
      <ResetToastCard
        toastId={toastId}
        title={title}
        description={description}
        target={target}
        badge={badge}
        duration={duration}
      />
    ),
    { duration, id }
  );
}

/**
 * Enhanced Universal Toast API:
 * Supports all standard Sonner methods PLUS:
 *   toast.deleted("Record Removed", { description: "...", target: "email/title" })
 *   toast.confirmed("Action Confirmed", { description: "...", badge: "AUTHORIZED" })
 *   toast.reset("New Session Started", { description: "..." })
 */
export const toast = Object.assign((...args) => sonnerToast(...args), sonnerToast, {
  deleted: showDeletedToast,
  confirmed: showConfirmedToast,
  reset: showResetToast,
});

/**
 * Single Global Toaster Component — Mount once at app root (main.jsx)
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      offset={{ top: 76, right: 20 }}
      mobileOffset={{ top: 72, right: 12 }}
      closeButton
      gap={10}
      visibleToasts={4}
      theme="dark"
      icons={{
        loading: (
          <ToastIconBadge variant="loading">
            <LoadingSpinner size="xs" showGlow={true} />
          </ToastIconBadge>
        ),
        success: (
          <ToastIconBadge variant="success">
            <CheckCircle2 className="w-4 h-4" />
          </ToastIconBadge>
        ),
        error: (
          <ToastIconBadge variant="error">
            <AlertCircle className="w-4 h-4" />
          </ToastIconBadge>
        ),
        warning: (
          <ToastIconBadge variant="warning">
            <AlertTriangle className="w-4 h-4" />
          </ToastIconBadge>
        ),
        info: (
          <ToastIconBadge variant="info">
            <Info className="w-4 h-4" />
          </ToastIconBadge>
        ),
      }}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "sonner-custom-toast",
          loading: "sonner-loading-toast",
          title: "font-extrabold text-[13px] text-white tracking-tight leading-snug",
          description: "text-slate-300/90 text-[11.5px] font-medium mt-0.5 leading-relaxed",
        },
      }}
    />
  );
}

/**
 * Kept as a lightweight passthrough so existing layouts importing ToastProvider
 * will never mount duplicate <Toaster /> instances.
 */
export function ToastProvider({ children }) {
  return <>{children}</>;
}

export default toast;
