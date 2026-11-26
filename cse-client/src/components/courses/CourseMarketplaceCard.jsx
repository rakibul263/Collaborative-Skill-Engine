import React from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  BookOpen,
  User,
  Tag,
  Clock,
  ChevronRight,
  Sparkles,
  Award,
} from "lucide-react";
import { formatBDT, resolveCoursePrice } from "@/lib/money";
import { prefetchRoute } from "@/lib/prefetchManager";
import useAuth from "@/hooks/useAuth";

const PLACEHOLDER = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop";

  const CourseMarketplaceCard = ({ course, isEnrolled = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const lessonsCount = Array.isArray(course.curriculum) ? course.curriculum.length : 0;
  const price = resolveCoursePrice(course);
  const targetRoute = isEnrolled ? `/learn/${course._id}` : `/courses/${course._id}`;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      onMouseEnter={() => prefetchRoute(targetRoute, user?.email)}
      onClick={() => navigate(targetRoute)}
      className="bg-slate-900/70 border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl overflow-hidden backdrop-blur-2xl cursor-pointer group transition-all duration-300 flex flex-col justify-between shadow-xl hover:shadow-indigo-500/10"
    >
      <div>
        {/* Thumbnail Container with Gradient Aura */}
        <div className="relative aspect-video overflow-hidden bg-slate-950">
          <img
            src={course.thumbnailUrl || PLACEHOLDER}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.src = PLACEHOLDER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

          {/* Topic Badge */}
          <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-bold text-indigo-300 flex items-center gap-1 shadow-md">
            <Tag size={11} className="text-indigo-400" />
            <span>{course.topic || "General"}</span>
          </div>

          {/* Price / Enrolled Badge */}
          <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-xs font-extrabold text-white flex items-center gap-1 shadow-md">
            {isEnrolled ? (
              <span className="text-emerald-400">Enrolled ✓</span>
            ) : price === 0 ? (
              <span className="text-emerald-400">Free</span>
            ) : (
              <span className="text-white">{formatBDT(price)}</span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {/* Title */}
          <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mb-2 group-hover:text-indigo-400 transition-colors">
            {course.title}
          </h3>

          {/* Short Description */}
          {course.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 font-medium">
              {course.description}
            </p>
          )}

          {/* Instructor Profile */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-[10px] font-bold shrink-0">
              {(course.instructorName || course.instructorEmail || "I")[0]}
            </div>
            <span className="text-xs font-semibold text-slate-300 truncate">
              {course.instructorName || course.instructorEmail || "Platform Instructor"}
            </span>
          </div>

          {/* Course Meta Badges */}
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <div className="flex items-center gap-1">
              <BookOpen size={12} className="text-indigo-400" />
              <span>{lessonsCount} lessons</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <div className="flex items-center gap-1">
              <Award size={12} className="text-purple-400" />
              <span>Verified Certificate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer CTA */}
      <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
        <span className="text-[11px] font-semibold text-slate-400">
          {isEnrolled ? "Classroom Unlocked" : "Explore Curriculum"}
        </span>
        <span
          className={`group-hover:translate-x-1 transition-transform flex items-center gap-1 ${
            isEnrolled ? "text-emerald-400" : "text-indigo-400"
          }`}
        >
          {isEnrolled ? "Enter Classroom" : "View Course"} <ChevronRight size={13} />
        </span>
      </div>
    </motion.div>
  );
};

export default CourseMarketplaceCard;
