import React from "react";
import { motion } from "framer-motion";
import { useNavigate, NavLink } from "react-router";
import { Home, ArrowLeft, AlertCircle, Sparkles } from "lucide-react";
import logoImg from "@/assets/images/logo.png";
import { Button } from "@/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 15 },
  },
};

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Full Viewport Background Mesh Spotlights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/15 blur-[180px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[700px] h-[700px] bg-indigo-950/30 blur-[220px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: "radial-gradient(#6366f1 0.75px, transparent 0.75px)",
          backgroundSize: "36px 36px",
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl w-full text-center relative z-10 my-auto py-12 flex flex-col items-center justify-center space-y-8"
      >
        {/* Animated Brand Logo Badge */}
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-2xl backdrop-blur-xl">
          <img src={logoImg} alt="Skill Engine Logo" className="h-7 w-auto object-contain" />
          <span className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent border-l border-slate-800/90 pl-2.5">
            Skill Engine
          </span>
        </motion.div>

        {/* Custom Animated SVG Illustration (Floating Satellite Orbit & Browser Frame) */}
        <motion.div variants={itemVariants} className="relative h-44 sm:h-52 w-full max-w-sm mx-auto flex items-center justify-center">
          <svg viewBox="0 0 400 240" className="w-full h-full drop-shadow-2xl overflow-visible">
            <defs>
              <linearGradient id="grad404Full" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
              <filter id="glow404Full" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Orbiting Satellite Path Ring */}
            <motion.circle
              cx="200"
              cy="120"
              r="88"
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              animate={{ rotate: 360 }}
              transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "200px 120px" }}
            />

            {/* Orbiting Satellite Node 1 */}
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "200px 120px" }}
            >
              <circle cx="288" cy="120" r="7" fill="#6366F1" filter="url(#glow404Full)" />
            </motion.g>

            {/* Orbiting Satellite Node 2 */}
            <motion.g
              animate={{ rotate: -360 }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "200px 120px" }}
            >
              <circle cx="112" cy="120" r="5" fill="#EC4899" filter="url(#glow404Full)" />
            </motion.g>

            {/* Floating Browser Window Frame */}
            <motion.g
              animate={{ y: [-6, 6, -6], rotate: [-1, 1, -1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <rect x="110" y="55" width="180" height="130" rx="18" fill="#090d16" stroke="#334155" strokeWidth="2" />
              <rect x="110" y="55" width="180" height="26" rx="18" fill="#1e293b" />
              <circle cx="126" cy="68" r="4" fill="#F43F5E" />
              <circle cx="138" cy="68" r="4" fill="#F59E0B" />
              <circle cx="150" cy="68" r="4" fill="#10B981" />

              {/* 404 Text inside SVG */}
              <text x="200" y="132" textAnchor="middle" fill="url(#grad404Full)" fontSize="48" fontWeight="900" letterSpacing="-2">
                404
              </text>
              <text x="200" y="160" textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="700">
                ROUTE NOT FOUND
              </text>
            </motion.g>
          </svg>
        </motion.div>

        {/* Big 404 & Typography */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-indigo-400 tracking-tighter leading-none">
            404
          </h1>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Oops! We couldn't find that page.
          </h2>

          <p className="text-sm sm:text-base text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            The page may have been moved, deleted, or never existed.
          </p>
        </motion.div>

        {/* Essential Action Buttons ONLY */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <NavLink to="/">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-12 px-7 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02]">
              <Home size={15} className="mr-2" /> Back Home
            </Button>
          </NavLink>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold text-xs rounded-xl h-12 px-7 transition-all hover:scale-[1.02]"
          >
            <ArrowLeft size={15} className="mr-2" /> Go Back
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
