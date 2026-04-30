import React from "react";

const variants = {
  default: "bg-indigo-100 text-indigo-700 border-indigo-200",
  secondary: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
};

export const Badge = ({
  className = "",
  variant = "default",
  children,
  ...props
}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variants[variant] || variants.default} ${className}`.trim()}
    {...props}
  >
    {children}
  </span>
);
