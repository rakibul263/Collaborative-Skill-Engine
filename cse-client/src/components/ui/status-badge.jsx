import React from "react";
import { CheckCircle2, Clock, ShieldCheck, AlertCircle, Zap, Info } from "lucide-react";

const STATUS_MAP = {
  verified: {
    label: "Verified",
    icon: ShieldCheck,
    style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  active: {
    label: "Active",
    icon: Zap,
    style: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    style: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  warning: {
    label: "Attention Required",
    icon: AlertCircle,
    style: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  rejected: {
    label: "Declined",
    icon: AlertCircle,
    style: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  info: {
    label: "Info",
    icon: Info,
    style: "bg-slate-950 text-slate-400 border-slate-800",
  },
};

export function StatusBadge({ status = "info", label, icon = true, className = "" }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.info;
  const IconComp = meta.icon;
  const displayLabel = label || meta.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold tracking-wide uppercase shadow-xs ${meta.style} ${className}`.trim()}
    >
      {icon && <IconComp size={12} />}
      <span>{displayLabel}</span>
    </span>
  );
}
