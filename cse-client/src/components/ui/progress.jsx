import React from "react";

export function Progress({ className = "", value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`.trim()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className="h-full bg-[#112D32] transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
