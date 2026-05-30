import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Search, BookOpen, Sparkles, Filter, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import CourseGrid from "@/components/courses/CourseGrid";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const CATEGORIES = [
  "All Topics",
  "Web Development",
  "Artificial Intelligence",
  "UI/UX Design",
  "Cloud & DevOps",
  "Data Science",
  "Programming",
];

const CoursesMarketplace = () => {
  const [allCourses, setAllCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Topics");
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "price-low" | "price-high"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/courses/public`);
      setAllCourses(res.data || []);
    } catch {
      setError("Unable to load courses from marketplace. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Derived filtered & sorted courses
  const filteredCourses = useMemo(() => {
    let result = [...allCourses];

    // Filter by search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.topic?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.instructorName?.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (selectedCategory !== "All Topics") {
      result = result.filter(
        (c) => c.topic?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Sort
    if (sortBy === "price-low") {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else {
      // newest first
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [allCourses, searchTerm, selectedCategory, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All Topics");
    setSortBy("newest");
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Background Ambient Spotlight Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 pt-16">
        {/* Header Hero Section */}
        <header className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wider uppercase shadow-xs">
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span>Enterprise Learning Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Master High-Impact{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Skills & Tech
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
              Explore curated courses created by verified platform mentors.
              Learn real-world software development, AI, design, and cloud architecture.
            </p>
          </motion.div>

          {/* Search & Sort Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3"
          >
            {/* Search Input */}
            <div className="relative w-full sm:w-80 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search titles, topics, instructors..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Control */}
            <div className="relative w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto bg-slate-900/90 border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500/60 transition-all cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </motion.div>
        </header>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Available Metrics Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl mb-8 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <BookOpen size={15} className="text-indigo-400" />
            <span>
              Showing {filteredCourses.length} of {allCourses.length} Available Courses
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
            Verified Mentor Content
          </span>
        </div>

        {/* Grid Component */}
        <CourseGrid
          courses={filteredCourses}
          loading={loading}
          error={error}
          onRetry={fetchCourses}
          onResetFilters={handleResetFilters}
        />
      </div>
    </div>
  );
};

export default CoursesMarketplace;
