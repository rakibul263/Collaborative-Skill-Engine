import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  Layers,
  Award,
  Zap,
  Target,
  BookOpen,
  Users,
  Star,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router";

// Hierarchical column rank for clean left-to-right progression across all CSE domains
const LAYER_MAPPING = {
  // Layer 0: Core Fundamentals & Hardware Basics
  "html-css": 0,
  "git": 0,
  "python": 0,
  "linux-bash": 0,
  "ui-ux-design": 0,
  "math-stats": 0,
  "c-programming": 0,
  "software-testing-fundamentals": 0,

  // Layer 1: Core Languages, Hardware Buses & Networking
  "javascript": 1,
  "tailwind": 1,
  "pandas-numpy": 1,
  "docker": 1,
  "user-research": 1,
  "data-structures": 1,
  "computer-networks": 1,
  "microcontrollers": 1,
  "mobile-fundamentals": 1,
  "api-testing": 1,
  "opencv": 1,
  "math-3d": 1,

  // Layer 2: Intermediate Platforms, Engines & Systems
  "typescript": 2,
  "nodejs": 2,
  "machine-learning": 2,
  "ci-cd": 2,
  "cpp-programming": 2,
  "embedded-c": 2,
  "cryptography": 2,
  "network-security": 2,
  "react-native": 2,
  "flutter-dart": 2,
  "sql-advanced": 2,
  "game-engine-unity": 2,
  "test-automation-selenium": 2,
  "blockchain-fundamentals": 2,
  "observability-monitoring": 2,

  // Layer 3: Frameworks, Storage, Kernels & Protocols
  "react": 3,
  "express": 3,
  "mongodb": 3,
  "sql-postgres": 3,
  "deep-learning": 3,
  "cloud-aws": 3,
  "os-internals": 3,
  "rtos-iot": 3,
  "web-security": 3,
  "data-pipelines": 3,
  "cnn-vision": 3,
  "solidity-smart-contracts": 3,
  "performance-testing": 3,
  "infrastructure-as-code": 3,
  "vector-search-embeddings": 3,

  // Layer 4: Advanced Systems, Compilers & Security Audits
  "nextjs": 4,
  "state-management": 4,
  "redis": 4,
  "pytorch": 4,
  "nlp": 4,
  "kubernetes": 4,
  "rust-lang": 4,
  "mobile-native-apis": 4,
  "soc-incident-response": 4,
  "big-data-spark": 4,
  "data-streaming": 4,
  "game-engine-unreal": 4,
  "shaders-graphics": 4,
  "web3-dapps": 4,
  "chaos-resilience": 4,

  // Layer 5: Frontier Architectures, Robotics & Autonomous Agents
  "microservices": 5,
  "transformers-llm": 5,
  "rag-vector-db": 5,
  "ai-agents": 5,
  "compilers-assembly": 5,
  "robotics-ros": 5,
  "defi-security-audit": 5,
};

const CATEGORY_COLORS = {
  Frontend: "from-sky-500/20 to-blue-600/20 text-sky-400 border-sky-500/40",
  Backend: "from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/40",
  "AI/ML": "from-purple-500/20 to-pink-600/20 text-purple-400 border-purple-500/40",
  DevOps: "from-amber-500/20 to-orange-600/20 text-amber-400 border-amber-500/40",
  Database: "from-cyan-500/20 to-indigo-600/20 text-cyan-400 border-cyan-500/40",
  Core: "from-indigo-500/20 to-violet-600/20 text-indigo-400 border-indigo-500/40",
  Design: "from-rose-500/20 to-red-600/20 text-rose-400 border-rose-500/40",
  Mobile: "from-blue-500/20 to-indigo-600/20 text-blue-400 border-blue-500/40",
  Cybersecurity: "from-red-500/20 to-rose-600/20 text-red-400 border-red-500/40",
  "Data Engineering": "from-teal-500/20 to-emerald-600/20 text-teal-400 border-teal-500/40",
  "Computer Vision": "from-fuchsia-500/20 to-purple-600/20 text-fuchsia-400 border-fuchsia-500/40",
  Systems: "from-slate-500/20 to-zinc-600/20 text-slate-300 border-slate-500/40",
  "Embedded/IoT": "from-lime-500/20 to-green-600/20 text-lime-400 border-lime-500/40",
  "Game Development": "from-violet-500/20 to-purple-600/20 text-violet-400 border-violet-500/40",
  "Blockchain/Web3": "from-yellow-500/20 to-amber-600/20 text-yellow-400 border-yellow-500/40",
  "QA & Testing": "from-teal-500/20 to-cyan-600/20 text-teal-300 border-teal-500/40",
};

const SkillGraphVisualizer = ({
  graphData,
  selectedCategory = "all",
  viewMode = "personalized", // "personalized" | "full"
  onToggleViewMode,
  onSelectSkill,
}) => {
  const navigate = useNavigate();
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [activeModalSkill, setActiveModalSkill] = useState(null);

  const containerRef = useRef(null);

  // Choose topology based on viewMode:
  // "personalized": ONLY user's known skills, desired skills, and target path (No confusion!)
  // "full": the complete 30+ skills universe
  const activeTopology =
    viewMode === "personalized" && graphData?.personalizedGraphTopology?.nodes?.length > 0
      ? graphData.personalizedGraphTopology
      : graphData?.fullGraphTopology || { nodes: [], edges: [] };

  const { nodes = [], edges = [] } = activeTopology;

  // Calculate Layout Positions for each node
  const { nodePositions, svgWidth, svgHeight } = useMemo(() => {
    const groups = {};
    for (let i = 0; i <= 5; i++) groups[i] = [];

    const filteredNodes = nodes.filter(
      (n) => selectedCategory === "all" || n.category === selectedCategory
    );

    filteredNodes.forEach((node) => {
      const layer = LAYER_MAPPING[node.id] ?? 2;
      groups[layer].push(node);
    });

    const positions = {};
    const colSpacing = 280;
    const startX = 100;
    const startY = 90;

    let maxRows = 1;
    Object.values(groups).forEach((layerNodes) => {
      maxRows = Math.max(maxRows, layerNodes.length);
    });

    const rowSpacing = maxRows > 8 ? 105 : 125;

    Object.entries(groups).forEach(([layerIdx, layerNodes]) => {
      const col = parseInt(layerIdx, 10);

      layerNodes.forEach((node, row) => {
        const x = startX + col * colSpacing;
        const yOffset = ((Math.max(4, maxRows) - layerNodes.length) * rowSpacing) / 2;
        const y = startY + yOffset + row * rowSpacing;
        positions[node.id] = { x, y, node };
      });
    });

    const calculatedWidth = Math.max(1200, startX + 6 * colSpacing + 140);
    const calculatedHeight = Math.max(680, startY + maxRows * rowSpacing + 120);

    return {
      nodePositions: positions,
      svgWidth: calculatedWidth,
      svgHeight: calculatedHeight,
    };
  }, [nodes, selectedCategory]);

  const activeEdges = useMemo(() => {
    if (!hoveredNodeId) return new Set();
    const set = new Set();
    edges.forEach((e) => {
      if (e.from === hoveredNodeId || e.to === hoveredNodeId) {
        set.add(`${e.from}->${e.to}`);
      }
    });
    return set;
  }, [hoveredNodeId, edges]);

  const handleZoom = (delta) => {
    setZoomLevel((prev) => Math.max(0.65, Math.min(1.4, prev + delta)));
  };

  const skillResources = graphData?.skillResources || {};
  const activeResources = activeModalSkill ? skillResources[activeModalSkill.id] : null;

  return (
    <div className="relative w-full rounded-3xl border border-slate-800 bg-[#070b16]/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Visualizer Top Bar Controls */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Toggle (Personalized vs Full) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => onToggleViewMode && onToggleViewMode("personalized")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "personalized"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Target size={13} className="text-amber-300" />
              <span>My Personalized Path</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-extrabold uppercase">
                Focused
              </span>
            </button>

            <button
              onClick={() => onToggleViewMode && onToggleViewMode("full")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "full"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers size={13} />
              <span>Full Skill Universe</span>
            </button>
          </div>

          {viewMode === "personalized" && (
            <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">
              ✓ Showing only competencies relevant to your goals
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Mastered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            Ready to Learn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500" />
            Locked (Prerequisite Needed)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            Target Milestone
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-xl p-1">
          <button
            onClick={() => handleZoom(0.15)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <span className="text-[10px] font-mono px-1.5 text-slate-400">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => handleZoom(-0.15)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area - Full Width */}
      <div
        ref={containerRef}
        className="w-full h-[640px] overflow-auto custom-scrollbar relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
      >
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            width: `${svgWidth}px`,
            height: `${svgHeight}px`,
          }}
          className="transition-transform duration-150 ease-out relative"
        >
          {/* SVG Dependency Connecting Curves */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={svgWidth}
            height={svgHeight}
          >
            <defs>
              <marker
                id="dag-arrow-default"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#475569" />
              </marker>
              <marker
                id="dag-arrow-active"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#818cf8" />
              </marker>
              <marker
                id="dag-arrow-mastered"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
              </marker>
            </defs>

            {edges.map((edge) => {
              const start = nodePositions[edge.from];
              const end = nodePositions[edge.to];
              if (!start || !end) return null;

              const edgeKey = `${edge.from}->${edge.to}`;
              const isActive = activeEdges.has(edgeKey);
              const isMasteredEdge =
                start.node.status === "mastered" &&
                end.node.status === "mastered";

              const dx = end.x - start.x;
              const cp1X = start.x + dx * 0.45;
              const cp1Y = start.y;
              const cp2X = end.x - dx * 0.45;
              const cp2Y = end.y;

              const pathD = `M ${start.x + 95} ${start.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${end.x - 95} ${end.y}`;

              return (
                <path
                  key={edgeKey}
                  d={pathD}
                  fill="none"
                  stroke={
                    isActive
                      ? "#818cf8"
                      : isMasteredEdge
                      ? "#10b981"
                      : edge.isCritical
                      ? "#f59e0b"
                      : "#334155"
                  }
                  strokeWidth={isActive ? 2.6 : edge.isCritical ? 2.2 : 1.2}
                  strokeDasharray={
                    isActive || isMasteredEdge ? "none" : edge.isCritical ? "4 3" : "none"
                  }
                  opacity={isActive ? 1 : edge.isCritical ? 0.95 : 0.4}
                  markerEnd={
                    isActive
                      ? "url(#dag-arrow-active)"
                      : isMasteredEdge
                      ? "url(#dag-arrow-mastered)"
                      : "url(#dag-arrow-default)"
                  }
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>

          {/* HTML Interactive Nodes */}
          {Object.entries(nodePositions).map(([id, { x, y, node }]) => {
            const isHovered = hoveredNodeId === id;
            const isMastered = node.status === "mastered";
            const isReady = node.status === "ready";
            const isLocked = node.status === "locked";
            const isTarget = node.status === "target";

            return (
              <div
                key={id}
                style={{
                  left: `${x - 95}px`,
                  top: `${y - 42}px`,
                  width: "190px",
                }}
                onMouseEnter={() => setHoveredNodeId(id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => {
                  setActiveModalSkill(node);
                  if (onSelectSkill) onSelectSkill(node);
                }}
                className={`absolute cursor-pointer select-none rounded-2xl p-3 transition-all duration-200 border text-left shadow-lg backdrop-blur-md ${
                  isHovered
                    ? "scale-105 z-30 ring-2 ring-indigo-400 shadow-indigo-500/25"
                    : "z-10"
                } ${
                  isMastered
                    ? "bg-emerald-950/70 border-emerald-500/60 text-white shadow-emerald-900/30"
                    : isReady
                    ? "bg-amber-950/60 border-amber-400/80 text-white shadow-amber-900/40 ring-1 ring-amber-400/30"
                    : isTarget
                    ? "bg-purple-950/70 border-purple-400/80 text-white shadow-purple-900/40"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Status Indicator Icon */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                      CATEGORY_COLORS[node.category] || "text-slate-400"
                    }`}
                  >
                    {node.category}
                  </span>

                  {isMastered && (
                    <span className="flex items-center gap-0.5 text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 size={12} />
                      Done
                    </span>
                  )}
                  {isReady && (
                    <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-bold animate-pulse">
                      <Zap size={11} className="fill-amber-400" />
                      Ready to Learn
                    </span>
                  )}
                  {isLocked && (
                    <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
                      <Lock size={11} /> Locked
                    </span>
                  )}
                  {isTarget && (
                    <span className="text-purple-400 text-[10px] font-bold flex items-center gap-0.5">
                      <Sparkles size={11} /> Goal
                    </span>
                  )}
                </div>

                {/* Skill Name */}
                <h4 className="text-xs font-bold truncate leading-tight">
                  {node.name}
                </h4>

                {/* Learning Hours & Difficulty */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {node.learningHours}h study
                  </span>
                  <span className="font-mono text-[9px] text-slate-500">
                    Lvl {node.difficulty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SKILL INSPECTOR MODAL WITH REAL WEBSITE COURSES & MENTORS ── */}
      <AnimatePresence>
        {activeModalSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActiveModalSkill(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    {activeModalSkill.category} Competency
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {activeModalSkill.name}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModalSkill(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeModalSkill.description}
              </p>

              {/* Study Stats */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Difficulty</span>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`w-3 h-1.5 rounded-full ${
                          i < activeModalSkill.difficulty
                            ? "bg-indigo-400"
                            : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Estimated Study</span>
                  <p className="font-bold text-white mt-0.5">
                    {activeModalSkill.learningHours} Hours
                  </p>
                </div>
              </div>

              {/* ── WEBSITE COURSES TO LEARN THIS SKILL ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={13} className="text-emerald-400" />
                    <span>Website Courses for this Skill</span>
                  </h5>
                  <button
                    onClick={() => {
                      setActiveModalSkill(null);
                      navigate("/courses");
                    }}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Browse All Courses →
                  </button>
                </div>

                {activeResources?.courses?.length > 0 ? (
                  <div className="space-y-2">
                    {activeResources.courses.map((course) => (
                      <div
                        key={course._id}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              className="w-12 h-10 rounded-xl object-cover border border-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                              <BookOpen size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h6 className="text-xs font-bold text-white truncate">
                              {course.title}
                            </h6>
                            <span className="text-[10px] text-slate-400">
                              By {course.instructorName} • ★ {course.rating}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveModalSkill(null);
                            navigate(`/courses/${course._id}`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 transition"
                        >
                          Enroll ৳{course.price}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>No specific video course yet. Connect with a mentor below!</span>
                    <button
                      onClick={() => {
                        setActiveModalSkill(null);
                        navigate("/courses");
                      }}
                      className="text-xs text-indigo-400 font-bold hover:underline"
                    >
                      All Courses
                    </button>
                  </div>
                )}
              </div>

              {/* ── WEBSITE MENTORS TEACHING THIS SKILL ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={13} className="text-purple-400" />
                    <span>Top Mentors Teaching this Skill</span>
                  </h5>
                  <button
                    onClick={() => {
                      setActiveModalSkill(null);
                      navigate("/experts");
                    }}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    View All Mentors →
                  </button>
                </div>

                {activeResources?.mentors?.length > 0 ? (
                  <div className="space-y-2">
                    {activeResources.mentors.map((mentor) => (
                      <div
                        key={mentor._id}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold shrink-0 overflow-hidden text-xs">
                            {mentor.profileImage ? (
                              <img
                                src={mentor.profileImage}
                                alt={mentor.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (mentor.fullName || "M")[0]
                            )}
                          </div>
                          <div className="min-w-0">
                            <h6 className="text-xs font-bold text-white truncate">
                              {mentor.fullName}
                            </h6>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {mentor.headline || "Specialist"} • ★ {mentor.averageRating}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveModalSkill(null);
                            navigate(`/experts/${mentor._id || encodeURIComponent(mentor.email)}`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 transition"
                        >
                          Book Session
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>Connect with our general experts for personalized coaching.</span>
                    <button
                      onClick={() => {
                        setActiveModalSkill(null);
                        navigate("/experts");
                      }}
                      className="text-xs text-indigo-400 font-bold hover:underline"
                    >
                      Find Mentors
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  onClick={() => setActiveModalSkill(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition border border-slate-700"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SkillGraphVisualizer;
