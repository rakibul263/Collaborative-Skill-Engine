import React from "react";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-800/60 ${className}`.trim()}
      {...props}
    />
  );
}
