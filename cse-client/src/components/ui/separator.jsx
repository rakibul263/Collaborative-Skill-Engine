import React from "react";

export function Separator({ className = "", orientation = "horizontal", ...props }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`shrink-0 bg-slate-800 ${
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"
      } ${className}`.trim()}
      {...props}
    />
  );
}
