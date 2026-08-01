import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, ArrowRight, Users, Filter, CheckCircle2 } from "lucide-react";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import MentorCard from "./MentorCard";
import EngineLoadingComponent from "@/components/shared/loading/EngineLoadingComponent";
import { getSocket } from "@/lib/socket";

const FindMentors = () => {
  const { user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchMentors = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/find-mentors?email=${user.email}`
      );
      setMentors(res.data || []);
    } catch (error) {
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("presence:join", { email: user.email });

    const onConnectionsUpdated = () => fetchMentors();
    socket.on("connections:updated", onConnectionsUpdated);
    return () => {
      socket.off("connections:updated", onConnectionsUpdated);
    };
  }, [user?.email]);

  const filteredMentors = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return mentors.filter((m) => {
      const matchesSearch =
        m.fullName?.toLowerCase().includes(term) ||
        m.teachSkills?.some((s) => {
          const name = typeof s === "object" ? s.label || s.original || "" : s;
          return name.toLowerCase().includes(term);
        }) ||
        m.matchedSkills?.some((s) => s.learnSkill.toLowerCase().includes(term));

      const matchesLevel =
        selectedLevel === "all" ||
        m.teachLevel?.toLowerCase() === selectedLevel.toLowerCase();

      return matchesSearch && matchesLevel;
    });
  }, [searchTerm, selectedLevel, mentors]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Ambient Radial Spotlight Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Banner */}
        <header className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wider uppercase shadow-xs">
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span>Verified Mentor & Expert Network</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Explore Top{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Mentors & Experts
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
              Connect with verified practitioners matching your learning interests.
              Intelligent skill complementarity for high-impact growth.
            </p>
          </motion.div>

          {/* Search & Level Filter Control Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative w-full sm:w-80 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search skills, names, topics..."
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

            {/* Level Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full sm:w-auto bg-slate-900/90 border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500/60 transition-all cursor-pointer"
              >
                <option value="all">All Expertise Levels</option>
                <option value="expert">Expert Mentors</option>
                <option value="intermediate">Intermediate Mentors</option>
                <option value="beginner">Beginner Mentors</option>
              </select>
            </div>
          </motion.div>
        </header>

        {/* Dynamic Count Banner */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl mb-8 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Users size={14} className="text-indigo-400" />
            <span>Showing {filteredMentors.length} Verified Mentors</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Real-time MongoDB Data
          </span>
        </div>

        {/* Content Loading vs Grid */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-40 bg-slate-900/40 border border-slate-800/60 rounded-3xl backdrop-blur-xl">
            <EngineLoadingComponent />
            <p className="mt-6 text-slate-400 font-bold tracking-widest text-xs uppercase">
              Surfacing your best skill matches...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredMentors.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                layout
              >
                {filteredMentors.map((m, idx) => (
                  <MentorCard
                    key={m._id || m.email}
                    mentor={m}
                    index={idx}
                    refetch={fetchMentors}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-28 bg-slate-900/60 rounded-3xl border border-slate-800 backdrop-blur-xl"
              >
                <div className="mb-4 inline-flex p-5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Search size={36} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  No Matching Mentors Found
                </h3>
                <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto font-medium">
                  Try adjusting your search criteria or clearing your filters to discover more mentors.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedLevel("all");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20"
                >
                  <span>Reset Filters</span>
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default FindMentors;
