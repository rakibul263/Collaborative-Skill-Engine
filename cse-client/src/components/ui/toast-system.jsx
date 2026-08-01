import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

// Global listener bus for non-invasive toast triggers anywhere in app
let toastListener = null;

export const toast = {
  success: (message, options = {}) => toastListener?.({ type: "success", message, ...options }),
  error: (message, options = {}) => toastListener?.({ type: "error", message, ...options }),
  warning: (message, options = {}) => toastListener?.({ type: "warning", message, ...options }),
  info: (message, options = {}) => toastListener?.({ type: "info", message, ...options }),
};

const TOAST_ICONS = {
  success: { icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-[#0b101d]" },
  error: { icon: AlertCircle, color: "text-rose-400", border: "border-rose-500/30", bg: "bg-[#0b101d]" },
  warning: { icon: AlertTriangle, color: "text-amber-400", border: "border-amber-500/30", bg: "bg-[#0b101d]" },
  info: { icon: Info, color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-[#0b101d]" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastListener = (newToast) => {
      const id = Date.now().toString() + Math.random();
      const duration = newToast.duration || 4000;
      setToasts((prev) => [{ ...newToast, id, duration }, ...prev.slice(0, 4)]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    };

    return () => {
      toastListener = null;
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      {/* Toast Container Positioned Top-Right on Desktop, Bottom-Center on Mobile */}
      <div className="fixed z-[999999] top-5 right-5 sm:right-6 bottom-auto max-w-sm w-full pointer-events-none space-y-2.5">
        <AnimatePresence>
          {toasts.map((t) => {
            const meta = TOAST_ICONS[t.type] || TOAST_ICONS.info;
            const IconComp = meta.icon;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`pointer-events-auto border backdrop-blur-2xl rounded-2xl p-4 shadow-2xl ${meta.bg} ${meta.border} text-slate-100 relative overflow-hidden flex items-start gap-3`}
              >
                <IconComp size={18} className={`shrink-0 mt-0.5 ${meta.color}`} />
                <div className="flex-1 space-y-1 min-w-0">
                  {t.title && <h4 className="text-xs font-extrabold text-white">{t.title}</h4>}
                  <p className="text-xs font-medium text-slate-300 leading-relaxed truncate">{t.message}</p>
                  {t.action && (
                    <button
                      type="button"
                      onClick={() => {
                        t.action.onClick?.();
                        removeToast(t.id);
                      }}
                      className="text-[11px] font-bold text-indigo-400 hover:underline pt-1 block"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all shrink-0"
                  aria-label="Close toast"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
