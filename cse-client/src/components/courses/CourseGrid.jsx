import React from "react";
import CourseMarketplaceCard from "./CourseMarketplaceCard";
import { BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const SkeletonCard = () => (
  <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-2xl animate-pulse flex flex-col justify-between">
    <div>
      <div className="aspect-video bg-slate-800/80" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-slate-800 rounded-md w-24" />
        <div className="h-4 bg-slate-800 rounded-md w-4/5" />
        <div className="h-3 bg-slate-800/60 rounded-md w-2/3" />
        <div className="pt-2 flex justify-between">
          <div className="h-3 bg-slate-800 rounded-md w-20" />
          <div className="h-3 bg-slate-800 rounded-md w-16" />
        </div>
      </div>
    </div>
    <div className="h-10 bg-slate-950/60 border-t border-slate-800/60" />
  </div>
);

const CourseGrid = ({ courses, enrolledIds, loading, error, onRetry, onResetFilters }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl">
        <div className="mb-4 inline-flex p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle size={36} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Unable to Load Courses</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 font-medium leading-relaxed">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="text-center py-28 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl">
        <div className="mb-4 inline-flex p-5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <BookOpen size={36} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Courses Found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 font-medium leading-relaxed">
          We couldn't find any courses matching your search criteria or filter selections.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            <span>Reset Search & Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <CourseMarketplaceCard
          key={course._id}
          course={course}
          isEnrolled={enrolledIds?.has?.(course._id)}
        />
      ))}
    </div>
  );
};

export default CourseGrid;
