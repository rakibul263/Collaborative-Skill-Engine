import React from "react";

/**
 * StatCard — Clean, enterprise metric card
 * Designed with a refined, modern SaaS aesthetic without exaggerated neon or AI clichés.
 */
const StatCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  badge,
  badgeColor = "neutral", // "neutral" | "emerald" | "amber" | "rose" | "cyan"
  trend,
  trendLabel,
}) => {
  const badgeStyles = {
    neutral: "bg-slate-800/80 text-slate-300 border-slate-700/60",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  };

  return (
    <div className="bg-[#0e1322] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all duration-200 relative overflow-hidden group shadow-sm flex flex-col justify-between">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-400 tracking-wide truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span
              className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border ${
                badgeStyles[badgeColor] || badgeStyles.neutral
              }`}
            >
              {badge}
            </span>
          )}
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-300 group-hover:text-cyan-400 group-hover:border-slate-600 transition-colors">
              {React.isValidElement(Icon) ? Icon : <Icon size={16} />}
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="space-y-1 my-1">
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {value ?? "—"}
        </div>
        {subtext && (
          <p className="text-xs text-slate-400 font-medium truncate">
            {subtext}
          </p>
        )}
      </div>

      {/* Optional Trend Row */}
      {trend !== undefined && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`font-semibold ${
              trend >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {trend >= 0 ? `+${trend}` : trend}
          </span>
          <span className="text-slate-400 text-[11px]">
            {trendLabel || "vs last period"}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
