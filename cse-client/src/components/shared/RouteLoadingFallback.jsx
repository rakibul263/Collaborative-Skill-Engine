import React from "react";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";

export default function RouteLoadingFallback({ message = "Loading experience..." }) {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 gap-4 bg-transparent animate-in fade-in duration-200 select-none">
      <LoadingSpinner size="lg" showGlow={true} />
      <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
}
