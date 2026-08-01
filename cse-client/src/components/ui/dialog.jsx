import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          {children}
        </div>
      )}
    </AnimatePresence>
  );
}

export function DialogContent({ className = "", children, onClose }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 20 }}
      className={`relative bg-[#0b101d] border border-slate-800/90 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col z-10 text-slate-100 ${className}`.trim()}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all z-20"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      )}
      {children}
    </motion.div>
  );
}

export function DialogHeader({ className = "", ...props }) {
  return <div className={`p-6 border-b border-slate-800/80 bg-slate-950/60 ${className}`.trim()} {...props} />;
}

export function DialogTitle({ className = "", ...props }) {
  return <h2 className={`text-xl font-extrabold text-white tracking-tight ${className}`.trim()} {...props} />;
}

export function DialogDescription({ className = "", ...props }) {
  return <p className={`text-xs text-slate-400 font-medium ${className}`.trim()} {...props} />;
}

export function DialogFooter({ className = "", ...props }) {
  return (
    <div
      className={`p-5 border-t border-slate-800/80 bg-slate-950/80 flex flex-wrap items-center justify-end gap-3 shrink-0 ${className}`.trim()}
      {...props}
    />
  );
}
