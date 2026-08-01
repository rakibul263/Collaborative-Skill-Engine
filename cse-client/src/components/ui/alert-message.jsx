import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

const VARIANT_STYLES = {
  info: {
    bg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-200",
    icon: Info,
    iconColor: "text-indigo-400",
  },
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/30 text-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
  },
  error: {
    bg: "bg-rose-500/10 border-rose-500/30 text-rose-200",
    icon: AlertCircle,
    iconColor: "text-rose-400",
  },
};

export function AlertMessage({
  variant = "info",
  title,
  children,
  onClose,
  action,
  className = "",
}) {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const IconComponent = style.icon;

  return (
    <div
      role="alert"
      className={`p-4 rounded-2xl border backdrop-blur-md flex items-start gap-3.5 transition-all text-xs font-medium ${style.bg} ${className}`.trim()}
    >
      <IconComponent size={18} className={`shrink-0 mt-0.5 ${style.iconColor}`} />
      <div className="flex-1 space-y-1">
        {title && <h4 className="font-extrabold text-white text-xs">{title}</h4>}
        <div className="leading-relaxed opacity-95">{children}</div>
        {action && <div className="pt-2">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0"
          aria-label="Dismiss alert"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
