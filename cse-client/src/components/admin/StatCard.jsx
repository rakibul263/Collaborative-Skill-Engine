const StatCard = ({
  icon,
  label,
  value,
  trend,
  trendLabel,
  color = "text-cyan-400",
  bg = "bg-cyan-500/10 border-cyan-500/20",
  badge,
}) => (
  <div className="bg-[#0b101f]/90 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700/80 transition-all duration-200">
    <div className="flex items-start justify-between mb-3">
      <div
        className={`w-11 h-11 ${bg} border rounded-xl flex items-center justify-center ${color} shadow-inner transition-transform group-hover:scale-105 duration-200`}
      >
        {icon}
      </div>
      {badge && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
          {badge}
        </span>
      )}
    </div>

    <div>
      <p className="text-2xl font-black text-white tracking-tight">{value ?? "—"}</p>
      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mt-1">
        {label}
      </p>
    </div>

    {trend !== undefined && (
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px]">
        <span
          className={`font-mono font-bold ${
            trend >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {trend >= 0 ? `+${trend}` : trend}
        </span>
        <span className="text-slate-400 text-[10px]">{trendLabel || "vs last period"}</span>
      </div>
    )}
  </div>
);

export default StatCard;
