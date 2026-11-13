/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  LogOut,
  RotateCcw,
  X,
  ArrowRight,
  Lock,
} from "lucide-react";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

const VARIANT_THEMES = {
  delete: {
    defaultBadge: "PERMANENT DELETE",
    topLine: "from-transparent via-rose-500 to-transparent",
    orbGlow: "bg-rose-600/20",
    cardBorder: "border-rose-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_50px_-12px_rgba(244,63,94,0.28)]",
    badgeStyle: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    dotColor: "bg-rose-400",
    iconBox: "bg-rose-500/15 border-rose-500/35 text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.25)]",
    iconRing: "border-rose-400/30",
    targetBorder: "border-rose-500/25 bg-rose-950/20",
    targetText: "text-rose-300",
    noticeBox: "bg-rose-950/30 border-rose-500/25 text-rose-200/90",
    confirmBtn:
      "bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:from-rose-500 hover:via-red-500 hover:to-pink-500 text-white shadow-[0_10px_25px_-5px_rgba(244,63,94,0.45)] border-rose-400/30",
    Icon: Trash2,
    ConfirmIcon: Trash2,
  },
  danger: {
    defaultBadge: "SECURITY ACTION",
    topLine: "from-transparent via-rose-500 to-transparent",
    orbGlow: "bg-rose-600/20",
    cardBorder: "border-rose-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_50px_-12px_rgba(244,63,94,0.25)]",
    badgeStyle: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    dotColor: "bg-rose-400",
    iconBox: "bg-rose-500/15 border-rose-500/35 text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.25)]",
    iconRing: "border-rose-400/30",
    targetBorder: "border-rose-500/25 bg-rose-950/20",
    targetText: "text-rose-300",
    noticeBox: "bg-rose-950/30 border-rose-500/25 text-rose-200/90",
    confirmBtn:
      "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_10px_25px_-5px_rgba(244,63,94,0.45)] border-rose-400/30",
    Icon: ShieldAlert,
    ConfirmIcon: ArrowRight,
  },
  warning: {
    defaultBadge: "ATTENTION REQUIRED",
    topLine: "from-transparent via-amber-500 to-transparent",
    orbGlow: "bg-amber-500/15",
    cardBorder: "border-amber-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_45px_-12px_rgba(245,158,11,0.22)]",
    badgeStyle: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    dotColor: "bg-amber-400",
    iconBox: "bg-amber-500/15 border-amber-500/35 text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)]",
    iconRing: "border-amber-400/30",
    targetBorder: "border-amber-500/25 bg-amber-950/20",
    targetText: "text-amber-300",
    noticeBox: "bg-amber-950/30 border-amber-500/25 text-amber-200/90",
    confirmBtn:
      "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_10px_25px_-5px_rgba(245,158,11,0.4)] border-amber-400/30",
    Icon: AlertTriangle,
    ConfirmIcon: ArrowRight,
  },
  approve: {
    defaultBadge: "AUTHORIZATION",
    topLine: "from-transparent via-emerald-500 to-transparent",
    orbGlow: "bg-emerald-500/15",
    cardBorder: "border-emerald-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_45px_-12px_rgba(16,185,129,0.22)]",
    badgeStyle: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    dotColor: "bg-emerald-400",
    iconBox: "bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)]",
    iconRing: "border-emerald-400/30",
    targetBorder: "border-emerald-500/25 bg-emerald-950/20",
    targetText: "text-emerald-300",
    noticeBox: "bg-emerald-950/30 border-emerald-500/25 text-emerald-200/90",
    confirmBtn:
      "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] border-emerald-400/30",
    Icon: ShieldCheck,
    ConfirmIcon: ShieldCheck,
  },
  logout: {
    defaultBadge: "SESSION CONTROL",
    topLine: "from-transparent via-rose-500 to-transparent",
    orbGlow: "bg-rose-600/20",
    cardBorder: "border-rose-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_45px_-12px_rgba(244,63,94,0.25)]",
    badgeStyle: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    dotColor: "bg-rose-400",
    iconBox: "bg-rose-500/15 border-rose-500/35 text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.25)]",
    iconRing: "border-rose-400/30",
    targetBorder: "border-slate-700 bg-slate-900/60",
    targetText: "text-slate-200",
    noticeBox: "bg-slate-900/80 border-slate-700/80 text-slate-300",
    confirmBtn:
      "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-[0_10px_25px_-5px_rgba(244,63,94,0.4)] border-rose-400/30",
    Icon: LogOut,
    ConfirmIcon: LogOut,
  },
  reset: {
    defaultBadge: "SESSION RESET",
    topLine: "from-transparent via-indigo-400 via-purple-400 to-transparent",
    orbGlow: "bg-indigo-600/20",
    cardBorder: "border-indigo-500/35 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_50px_-12px_rgba(99,102,241,0.3)]",
    badgeStyle: "bg-indigo-500/15 border-indigo-500/35 text-indigo-300",
    dotColor: "bg-indigo-400",
    iconBox: "bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_24px_rgba(99,102,241,0.28)]",
    iconRing: "border-indigo-400/35",
    targetBorder: "border-indigo-500/25 bg-indigo-950/25",
    targetText: "text-indigo-200",
    noticeBox: "bg-indigo-950/35 border-indigo-500/25 text-indigo-200/90",
    confirmBtn:
      "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white shadow-[0_10px_25px_-5px_rgba(99,102,241,0.45)] border-indigo-400/30",
    Icon: RotateCcw,
    ConfirmIcon: RotateCcw,
  },
  confirm: {
    defaultBadge: "CONFIRM ACTION",
    topLine: "from-transparent via-indigo-500 to-transparent",
    orbGlow: "bg-indigo-600/20",
    cardBorder: "border-indigo-500/30 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_45px_-12px_rgba(99,102,241,0.25)]",
    badgeStyle: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
    dotColor: "bg-indigo-400",
    iconBox: "bg-indigo-500/15 border-indigo-500/35 text-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.25)]",
    iconRing: "border-indigo-400/30",
    targetBorder: "border-indigo-500/25 bg-indigo-950/20",
    targetText: "text-indigo-300",
    noticeBox: "bg-indigo-950/30 border-indigo-500/25 text-indigo-200/90",
    confirmBtn:
      "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white shadow-[0_10px_25px_-5px_rgba(99,102,241,0.45)] border-indigo-400/30",
    Icon: Sparkles,
    ConfirmIcon: ArrowRight,
  },
};

/**
 * High-craft Cyber-Glassmorphic Confirmation & Delete Dialog Component
 */
function ConfirmDialogContent({
  variant = "confirm",
  isDestructive = false,
  badge,
  title = "Confirm Action",
  description = "Are you sure you want to proceed with this action?",
  targetLabel,
  targetValue,
  notice,
  input = null,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  onOpenChange,
  onConfirm,
}) {
  const resolvedVariant = isDestructive ? "delete" : variant;
  const theme = VARIANT_THEMES[resolvedVariant] || VARIANT_THEMES.confirm;
  const BeaconIcon = theme.Icon;
  const ConfirmIcon = theme.ConfirmIcon;

  const [inputValue, setInputValue] = useState(input?.defaultValue ?? "");
  const [inputError, setInputError] = useState("");

  const handleClose = useCallback(() => {
    if (loading) return;
    onOpenChange?.(false);
  }, [loading, onOpenChange]);

  const handleConfirmClick = useCallback(() => {
    if (loading) return;
    if (input) {
      if (input.validator) {
        const validationMsg = input.validator(inputValue);
        if (validationMsg) {
          setInputError(validationMsg);
          return;
        }
      }
      if (input.required && !String(inputValue || "").trim()) {
        setInputError("This field is required.");
        return;
      }
    }
    onConfirm?.(input ? inputValue : undefined);
  }, [loading, input, inputValue, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Enter" && input?.type !== "textarea" && !e.shiftKey) {
        e.preventDefault();
        handleConfirmClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input?.type, handleClose, handleConfirmClick]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans"
      role="dialog"
      aria-modal="true"
    >
          {/* Blurred Cyber Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-[#02050e]/80 backdrop-blur-md"
          />

          {/* Modal Glass Shell */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className={`relative z-10 w-full max-w-[445px] overflow-hidden rounded-[26px] border bg-[#0b101f]/95 backdrop-blur-2xl ${theme.cardBorder}`}
          >
            {/* Top Glowing Edge Hairline */}
            <div className={`h-[2px] w-full bg-gradient-to-r ${theme.topLine}`} />

            {/* Subtle Ambient Radial Backlight */}
            <div
              className={`absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-36 rounded-full blur-3xl pointer-events-none ${theme.orbGlow}`}
            />

            {/* Top Telemetry Header Strip */}
            <div className="relative px-5 py-3 bg-[#070b16]/85 border-b border-slate-800/80 flex items-center justify-between gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9.5px] font-mono font-bold uppercase tracking-wider leading-none ${theme.badgeStyle}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme.dotColor}`} />
                {badge || theme.defaultBadge}
              </span>

              <button
                type="button"
                disabled={loading}
                onClick={handleClose}
                aria-label="Close confirmation dialog"
                className="w-7 h-7 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Main Body */}
            <div className="relative p-6 space-y-4">
              {/* Header Row: Dual-Ring Beacon + Title & Description */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0 mt-0.5">
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center relative z-10 ${theme.iconBox}`}
                  >
                    <BeaconIcon className="w-5 h-5" />
                  </div>
                  {(resolvedVariant === "delete" || resolvedVariant === "danger" || resolvedVariant === "reset") && (
                    <span
                      className={`absolute -inset-1 rounded-[18px] border animate-pulse pointer-events-none ${theme.iconRing}`}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="text-[17px] font-black text-white tracking-tight leading-snug">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-[12.5px] text-slate-300/95 leading-relaxed font-medium">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Target Entity Spotlight Pill */}
              {targetValue && (
                <div className={`p-3 rounded-xl border ${theme.targetBorder} space-y-1`}>
                  {targetLabel && (
                    <span className="block text-[9.5px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                      {targetLabel}
                    </span>
                  )}
                  <p className={`text-xs font-mono font-bold break-all ${theme.targetText}`}>
                    {targetValue}
                  </p>
                </div>
              )}

              {/* Optional Input Field (Text / Textarea) */}
              {input && (
                <div className="space-y-1.5">
                  {input.label && (
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      {input.label}
                    </label>
                  )}
                  {input.type === "textarea" ? (
                    <textarea
                      autoFocus
                      rows={3}
                      maxLength={input.maxLength || 500}
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        if (inputError) setInputError("");
                      }}
                      placeholder={input.placeholder || "Type here..."}
                      className="w-full rounded-xl bg-[#070b16] border border-slate-700/80 focus:border-indigo-500 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors resize-none font-medium"
                    />
                  ) : (
                    <input
                      autoFocus
                      type="text"
                      maxLength={input.maxLength || 300}
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        if (inputError) setInputError("");
                      }}
                      placeholder={input.placeholder || "Enter value..."}
                      className="w-full rounded-xl bg-[#070b16] border border-slate-700/80 focus:border-indigo-500 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors font-mono"
                    />
                  )}
                  {inputError && (
                    <p className="text-[11px] text-rose-400 font-semibold">{inputError}</p>
                  )}
                </div>
              )}

              {/* Optional Security / Irreversible Notice Banner */}
              {notice && (
                <div
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-[11.5px] leading-relaxed font-medium ${theme.noticeBox}`}
                >
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-85" />
                  <span>{notice}</span>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="px-6 py-4 bg-[#070b16]/90 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px]">
                  ESC
                </kbd>
                to cancel
              </span>

              <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold transition-all disabled:opacity-40"
                >
                  {cancelText}
                </button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmClick}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-extrabold transition-all disabled:opacity-50 cursor-pointer ${theme.confirmBtn}`}
                >
                  {loading ? (
                    <>
                      <ButtonSpinner size="xs" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ConfirmIcon className="w-3.5 h-3.5" />
                      <span>{confirmText}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
  );
}

/**
 * High-craft Cyber-Glassmorphic Confirmation & Delete Dialog Component
 */
export function ConfirmDialog({ open, ...props }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && <ConfirmDialogContent key={`${props.title || "confirm"}-${props.targetValue || ""}`} {...props} />}
    </AnimatePresence>,
    document.body
  );
}

// ─── IMPERATIVE GLOBAL CONFIRM ENGINE ─────────────────────────────────────────
let triggerGlobalConfirm = null;

/**
 * Show a global cyber-glassmorphic Confirmation / Delete Modal cleanly from anywhere.
 * Resolves with: { isConfirmed: boolean, value?: string }
 */
export function showConfirm(options = {}) {
  return new Promise((resolve) => {
    if (!triggerGlobalConfirm) {
      resolve({ isConfirmed: false, value: "" });
      return;
    }
    triggerGlobalConfirm(options, resolve);
  });
}

/**
 * Mount once at app root (main.jsx) to power imperative showConfirm(...) modals globally.
 */
export function GlobalConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    open: false,
    options: {},
    resolve: null,
  });

  useEffect(() => {
    triggerGlobalConfirm = (options, resolve) => {
      setModalState((prev) => {
        if (prev.open && prev.resolve) {
          prev.resolve({ isConfirmed: false, value: "" });
        }
        return { open: true, options, resolve };
      });
    };

    return () => {
      triggerGlobalConfirm = null;
    };
  }, []);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setModalState((prev) => {
        if (prev.resolve) prev.resolve({ isConfirmed: false, value: "" });
        return { open: false, options: {}, resolve: null };
      });
    }
  };

  const handleConfirm = (value) => {
    setModalState((prev) => {
      if (prev.resolve) prev.resolve({ isConfirmed: true, value });
      return { open: false, options: {}, resolve: null };
    });
  };

  return (
    <>
      {children}
      <ConfirmDialog
        open={modalState.open}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        {...modalState.options}
      />
    </>
  );
}

export default ConfirmDialog;
