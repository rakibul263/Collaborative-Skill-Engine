import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ExpertLoadingSkeleton = () => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-pulse p-4 sm:p-6 lg:p-8">
      {/* Header Banner Skeleton */}
      <div className="relative rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-800 shrink-0" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-48 bg-slate-800 rounded-lg" />
              <Skeleton className="h-4 w-32 bg-slate-800 rounded-md" />
              <Skeleton className="h-4 w-64 bg-slate-800 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Skeleton className="h-10 w-32 bg-slate-800 rounded-xl" />
            <Skeleton className="h-10 w-32 bg-slate-800 rounded-xl" />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap gap-4">
          <Skeleton className="h-6 w-24 bg-slate-800 rounded-md" />
          <Skeleton className="h-6 w-32 bg-slate-800 rounded-md" />
          <Skeleton className="h-6 w-28 bg-slate-800 rounded-md" />
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (About & Skills) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <Skeleton className="h-6 w-36 bg-slate-800 rounded-md" />
            <Skeleton className="h-4 w-full bg-slate-800 rounded-md" />
            <Skeleton className="h-4 w-4/5 bg-slate-800 rounded-md" />
            <Skeleton className="h-4 w-2/3 bg-slate-800 rounded-md" />
          </div>

          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <Skeleton className="h-6 w-40 bg-slate-800 rounded-md" />
            <div className="flex flex-wrap gap-2 pt-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <Skeleton className="h-6 w-44 bg-slate-800 rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-full bg-slate-800 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <Skeleton className="h-6 w-32 bg-slate-800 rounded-md" />
            <Skeleton className="h-16 w-full bg-slate-800 rounded-2xl" />
            <Skeleton className="h-16 w-full bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertLoadingSkeleton;
