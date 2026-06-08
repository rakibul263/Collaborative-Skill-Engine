import React from "react";
import { AlertCircle } from "lucide-react";

const ExpertEmptyState = ({
  icon: Icon = AlertCircle,
  title = "No information added yet",
  description = "This section does not have any recorded data.",
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
      <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3 shadow-inner">
        <Icon size={28} />
      </div>
      <h4 className="text-sm font-bold text-slate-200 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-md font-medium leading-relaxed mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default ExpertEmptyState;
