import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const NavbarSkeleton = () => (
  <div className="w-full h-16 bg-[#0b101d]/90 border-b border-slate-800/90 px-6 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9 rounded-xl" />
      <Skeleton className="h-5 w-32 rounded-lg" />
    </div>
    <div className="hidden sm:flex items-center gap-4">
      <Skeleton className="h-4 w-20 rounded-lg" />
      <Skeleton className="h-4 w-20 rounded-lg" />
      <Skeleton className="h-4 w-20 rounded-lg" />
    </div>
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-9 w-24 rounded-xl" />
    </div>
  </div>
);

export const HeroSkeleton = () => (
  <div className="w-full bg-[#0b101d]/90 border border-slate-800/90 rounded-3xl p-8 space-y-6 shadow-2xl">
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-2xl" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
    </div>
    <Skeleton className="h-4 w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4 rounded-lg" />
    <div className="flex gap-3 pt-2">
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
  </div>
);

export const CardGridSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-[#0b101d]/90 border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-3 w-full rounded-lg" />
        <Skeleton className="h-3 w-4/5 rounded-lg" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-3 w-16 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

export const PageLayoutSkeleton = () => (
  <div className="min-h-screen bg-[#030712] p-6 max-w-7xl mx-auto space-y-8">
    <NavbarSkeleton />
    <HeroSkeleton />
    <CardGridSkeleton count={6} />
  </div>
);
