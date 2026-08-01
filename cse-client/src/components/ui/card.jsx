import React from "react";

export const Card = ({ className = "", ...props }) => (
  <div
    className={`rounded-2xl border border-slate-800/90 bg-slate-900/95 text-slate-100 shadow-xl backdrop-blur-xl ${className}`.trim()}
    {...props}
  />
);

export const CardHeader = ({ className = "", ...props }) => (
  <div
    className={`flex flex-col space-y-1.5 p-6 border-b border-slate-800/80 bg-slate-950/40 rounded-t-2xl ${className}`.trim()}
    {...props}
  />
);

export const CardTitle = ({ className = "", ...props }) => (
  <h3
    className={`text-base font-bold leading-snug tracking-tight text-white ${className}`.trim()}
    {...props}
  />
);

export const CardDescription = ({ className = "", ...props }) => (
  <p className={`text-xs font-medium text-slate-400 leading-relaxed ${className}`.trim()} {...props} />
);

export const CardContent = ({ className = "", ...props }) => (
  <div className={`p-6 ${className}`.trim()} {...props} />
);

export const CardFooter = ({ className = "", ...props }) => (
  <div
    className={`flex items-center p-6 pt-0 border-t border-slate-800/80 bg-slate-950/20 rounded-b-2xl ${className}`.trim()}
    {...props}
  />
);
