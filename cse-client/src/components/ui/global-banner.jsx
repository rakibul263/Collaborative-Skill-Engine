import React, { useState } from "react";
import { Sparkles, AlertTriangle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalBanner({
  message = "Scheduled system maintenance will take place tonight at 12:00 AM UTC.",
  type = "info",
  dismissible = true,
  actionText,
  onActionClick,
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative z-[60] bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-500/30 px-4 py-2.5 text-xs text-slate-200 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                {type === "warning" ? <AlertTriangle size={14} /> : <Sparkles size={14} className="animate-pulse" />}
              </span>
              <p className="truncate font-medium">{message}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {actionText && (
                <button
                  type="button"
                  onClick={onActionClick}
                  className="text-xs font-bold text-indigo-400 hover:underline"
                >
                  {actionText} →
                </button>
              )}

              {dismissible && (
                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                  aria-label="Dismiss banner"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
