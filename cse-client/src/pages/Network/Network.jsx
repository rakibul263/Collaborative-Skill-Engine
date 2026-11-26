import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Users,
  Search,
  Zap,
  ArrowRight,
  Star,
  Mail,
  MessageSquare,
  UserCheck,
  TrendingUp,
  Award,
  Filter,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { FiLoader } from "react-icons/fi";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import useAuth from "@/hooks/useAuth";
import EngineLoadingComponent from "@/components/shared/loading/EngineLoadingComponent";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

const SKILLS = [
  "React", "Node.js", "Python", "TypeScript", "MongoDB",
  "Docker", "Machine Learning", "GraphQL", "AWS", "Flutter",
  "Vue.js", "PostgreSQL", "Kubernetes", "Rust", "Swift",
];

const ROLES = ["All", "Developer", "Designer", "Data Scientist", "DevOps", "Mentor"];
const LEVELS = ["All", "Beginner", "Intermediate", "Expert"];

const Network = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initialUsers = user?.email
    ? getCachedData(`/find-mentors?email=${encodeURIComponent(user.email)}`) || []
    : [];
  const [users, setUsers] = useState(() => initialUsers);
  const [loading, setLoading] = useState(() => Boolean(user?.email && initialUsers.length === 0));
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [stats, setStats] = useState(() => ({
    total: initialUsers.length,
    online: initialUsers.filter((u) => u.connectionStatus === "connected").length,
    connected: initialUsers.filter((u) => u.connectionStatus === "connected").length,
  }));

  const fetchAllUsers = async (forceRefresh = false) => {
    if (!user?.email) return;
    const url = `/find-mentors?email=${encodeURIComponent(user.email)}`;
    const hasCache = Boolean(getCachedData(url));
    try {
      if (!hasCache && !forceRefresh) setLoading(true);
      // fetch find-mentors (which returns users with skill match info + connection status)
      const res = await apiClient.get(url, { forceRefresh });
      const data = res.data || [];
      setUsers(data);
      setStats({
        total: data.length,
        online: data.filter((u) => u.connectionStatus === "connected").length,
        connected: data.filter((u) => u.connectionStatus === "connected").length,
      });
    } catch {
      if (!hasCache) setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, [user?.email]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        u.fullName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.teachSkills?.some((s) => (s.label || s).toLowerCase().includes(term));

      const matchesSkill =
        selectedSkill === "All" ||
        u.teachSkills?.some(
          (s) => (s.label || s).toLowerCase() === selectedSkill.toLowerCase(),
        );

      const matchesLevel =
        selectedLevel === "All" || u.teachLevel === selectedLevel;

      return matchesSearch && matchesSkill && matchesLevel;
    });
  }, [users, searchTerm, selectedSkill, selectedLevel]);

  if (loading) return <EngineLoadingComponent />;

  return (
    <div className="min-h-screen pb-24 font-sans">
      {/* Background orbs */}
      <div className="fixed top-[5%] right-[-5%] w-[500px] h-[500px] bg-indigo-200/30 blur-[120px] rounded-full pointer-events-none -z-0" />
      <div className="fixed bottom-[5%] left-[-5%] w-[400px] h-[400px] bg-blue-100/20 blur-[100px] rounded-full pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-6 pt-6 relative z-10">

        {/* ── Hero Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14"
        >
          <div className="bg-[#1B1B4B] rounded-[3rem] p-10 md:p-16 relative overflow-hidden">
            {/* dot grid */}
            <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
            {/* glow */}
            <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/20 blur-[100px] rounded-full" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/5">
                  <Globe size={12} /> Global Skill Network
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none mb-5">
                  Connect the
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300">
                    World's Talent
                  </span>
                </h1>
                <p className="text-indigo-200/70 font-medium text-lg max-w-lg leading-relaxed">
                  Discover skilled professionals across every domain. Build
                  meaningful collaborations, share expertise, and accelerate
                  your growth.
                </p>
              </div>

              {/* Stat Cards */}
              <div className="flex flex-wrap lg:flex-col gap-4 shrink-0">
                {[
                  { label: "Network Members", value: users.length, icon: <Users size={16} />, color: "from-indigo-500 to-blue-500" },
                  { label: "Connections Made", value: stats.connected, icon: <UserCheck size={16} />, color: "from-emerald-500 to-teal-500" },
                  { label: "Skills Available", value: SKILLS.length + "+", icon: <Zap size={16} />, color: "from-amber-500 to-orange-500" },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl min-w-[200px]"
                  >
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${s.color} text-white shadow`}>
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white">{s.value}</p>
                      <p className="text-indigo-300/70 text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Search + Filter Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col md:flex-row gap-4 mb-10"
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white/80 backdrop-blur-md border border-white/80 rounded-2xl outline-none font-bold text-[#1B1B4B] placeholder:text-slate-400 shadow-sm focus:border-indigo-300 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-3 px-7 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest border transition-all ${
              filterOpen
                ? "bg-[#1B1B4B] text-white border-[#1B1B4B]"
                : "bg-white/80 text-slate-600 border-white/80 hover:border-indigo-300"
            }`}
          >
            <Filter size={16} /> Filters
            <ChevronDown size={14} className={`transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>
        </motion.div>

        {/* ── Filter Drawer ── */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-10"
            >
              <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2rem] p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Skill chips */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                      Filter by Skill
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["All", ...SKILLS].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSkill(s)}
                          className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                            selectedSkill === s
                              ? "bg-[#1B1B4B] text-white border-[#1B1B4B]"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Level */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                      Filter by Level
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {LEVELS.map((l) => (
                        <button
                          key={l}
                          onClick={() => setSelectedLevel(l)}
                          className={`px-6 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                            selectedLevel === l
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {(selectedSkill !== "All" || selectedLevel !== "All") && (
                  <button
                    onClick={() => { setSelectedSkill("All"); setSelectedLevel("All"); }}
                    className="mt-6 text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-2"
                  >
                    <X size={12} /> Clear Filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results Count ── */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Showing{" "}
            <span className="text-[#1B1B4B]">{filteredUsers.length}</span>{" "}
            members
          </p>
          {filteredUsers.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
              <Sparkles size={12} /> AI-Matched Results
            </div>
          )}
        </div>

        {/* ── Grid ── */}
        {filteredUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white/60 backdrop-blur-md rounded-[3rem] border border-white shadow-sm"
          >
            <Globe size={48} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-[#1B1B4B]">No members found</h3>
            <p className="text-slate-400 mt-2 font-medium">
              Try adjusting your filters or search term.
            </p>
            <button
              onClick={() => { setSearchTerm(""); setSelectedSkill("All"); setSelectedLevel("All"); }}
              className="mt-8 px-8 py-4 bg-[#1B1B4B] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all"
            >
              Reset All
            </button>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((member, idx) => (
                <NetworkCard
                  key={member._id || member.email}
                  member={member}
                  index={idx}
                  currentUser={user}
                  onRefetch={fetchAllUsers}
                  navigate={navigate}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

/* ─── Network Card ─── */
const NetworkCard = ({ member, index, currentUser, onRefetch, navigate }) => {
  const [status, setStatus] = useState(member.connectionStatus || "none");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(member.connectionStatus || "none");
  }, [member.connectionStatus]);

  const handleConnect = async () => {
    if (!currentUser) {
      toast.warning("Please sign in to connect.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/connections/requests", {
        senderUid: currentUser?.uid,
        senderEmail: currentUser?.email,
        senderName: currentUser?.displayName || "Anonymous",
        senderImage: currentUser?.photoURL || "https://i.ibb.co/4pDNDk1/avatar.png",
        receiverEmail: member.email,
      });
      setStatus("sent");
      toast.success("Connection request sent!");
      if (onRefetch) onRefetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await apiClient.delete("/connections/requests/cancel", {
        data: { senderEmail: currentUser?.email, receiverEmail: member.email },
      });
      setStatus("none");
      toast.success("Connection request cancelled.");
      if (onRefetch) onRefetch();
    } catch {
      toast.error("Could not cancel request.");
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = member.profileImage || member.image || "https://i.ibb.co/4pDNDk1/avatar.png";
  const skills = (member.teachSkills || []).slice(0, 3);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      whileHover={{ y: -6 }}
      className="group bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 transition-all flex flex-col"
    >
      {/* Top row: avatar + badge */}
      <div className="flex items-start justify-between mb-5">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-indigo-50 shadow">
            <img src={avatarSrc} alt={member.fullName} className="w-full h-full object-cover" />
          </div>
          {status === "connected" && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full">
          <TrendingUp size={10} className="text-indigo-500" />
          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
            {member.teachLevel || "Expert"}
          </span>
        </div>
      </div>

      {/* Name + email */}
      <div className="mb-4">
        <h4 className="text-[#1B1B4B] font-black text-lg leading-tight truncate group-hover:text-indigo-600 transition-colors">
          {member.fullName}
        </h4>
        <div className="flex items-center gap-1 mt-1 text-slate-400 text-[11px] font-bold">
          <Mail size={11} />
          <span className="truncate max-w-[160px]">{member.email}</span>
        </div>
        {member.averageRating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-black text-amber-500">
              {member.averageRating?.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              ({member.totalRatings})
            </span>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-5 flex-1">
        {skills.map((s, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100"
          >
            {s.label || s}
          </span>
        ))}
        {(member.teachSkills || []).length > 3 && (
          <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-bold rounded-lg border border-slate-100">
            +{(member.teachSkills || []).length - 3} more
          </span>
        )}
      </div>

      {/* Match percentage */}
      {member.matchPercentage > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Skill Match</span>
            <span className="text-[10px] font-black text-indigo-600">{member.matchPercentage}%</span>
          </div>
          <div className="h-1.5 bg-indigo-50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${member.matchPercentage}%` }}
              transition={{ delay: index * 0.04 + 0.3, duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-auto">
        {status === "connected" ? (
          <button
            onClick={() => navigate(`/message?peer=${encodeURIComponent(member.email)}`)}
            className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all"
          >
            <MessageSquare size={14} /> Message
          </button>
        ) : status === "sent" ? (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
          >
            {loading ? <ButtonSpinner size="xs" /> : <><X size={14} /> Cancel</>}
          </button>
        ) : status === "received" ? (
          <button
            disabled
            className="w-full py-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 font-black text-[11px] uppercase tracking-widest"
          >
            Request Received
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-[#1B1B4B] text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100/50 active:scale-95 disabled:opacity-50"
          >
            {loading ? <ButtonSpinner size="xs" /> : <><UserCheck size={14} /> Connect</>}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default Network;
