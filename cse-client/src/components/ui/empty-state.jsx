import React from "react";
import { FolderOpen } from "lucide-react";

export function EmptyState({
  icon: Icon = FolderOpen,
  title = "No data found",
  description = "There are no items to display at this time.",
  primaryAction,
  secondaryAction,
  className = "",
}) {
  return (
    <div
      className={`bg-[#0b101d] border border-slate-800/90 rounded-3xl p-10 sm:p-14 text-center shadow-xl max-w-xl mx-auto flex flex-col items-center justify-center space-y-4 ${className}`.trim()}
    >
      <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
        <Icon size={32} />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-extrabold text-white">{title}</h3>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">{description}</p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
