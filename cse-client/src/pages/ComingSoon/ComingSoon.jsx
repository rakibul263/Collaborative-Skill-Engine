import React from "react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router";
import { Rocket, Sparkles, Home, MessageSquare, ArrowRight } from "lucide-react";
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

const ComingSoon = ({ featureName = "Project Teams & Matchmaking Hub" }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-transparent text-slate-100 font-sans selection:bg-indigo-500/30 flex items-center justify-center p-6 relative overflow-hidden">
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

        {/* Custom Animated Rocket SVG Illustration */}
        <motion.div variants={itemVariants} className="relative h-44 sm:h-52 w-full max-w-sm mx-auto flex items-center justify-center">
          <svg viewBox="0 0 400 240" className="w-full h-full drop-shadow-2xl overflow-visible">
            <defs>
              <linearGradient id="rocketGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
              <filter id="glowRocketFull" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Orbital Grid Rings */}
            <motion.circle
              cx="200"
              cy="120"
              r="90"
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              animate={{ rotate: 360 }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "200px 120px" }}
            />

            {/* Floating Rocket Body */}
            <motion.g
              animate={{ y: [-8, 8, -8], rotate: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Rocket Thrust Flame */}
              <motion.path
                d="M190 155 L200 185 L210 155 Z"
                fill="url(#rocketGradFull)"
                filter="url(#glowRocketFull)"
                animate={{ scaleY: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "200px 155px" }}
              />

              {/* Rocket Capsule Body */}
              <path d="M200 65 C220 100 220 140 215 155 H185 C180 140 180 100 200 65 Z" fill="#090d16" stroke="#6366F1" strokeWidth="2.5" />
              <circle cx="200" cy="105" r="10" fill="#1e293b" stroke="#8B5CF6" strokeWidth="2" />
              <circle cx="200" cy="105" r="4" fill="#EC4899" />
              {/* Wings */}
              <path d="M185 135 L170 155 H185 Z" fill="#6366F1" />
              <path d="M215 135 L230 155 H215 Z" fill="#6366F1" />
            </motion.g>
          </svg>
        </motion.div>

        {/* Large Coming Soon Typography */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-extrabold text-xs tracking-wider uppercase mb-1">
            <Sparkles size={13} className="text-indigo-400 animate-pulse" /> Feature In Development
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
            Coming Soon
          </h1>

          <h2 className="text-xl sm:text-2xl font-bold text-indigo-300/90">
            We're building something amazing.
          </h2>

          <p className="text-sm sm:text-base text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            Our engineering team is working hard to launch <strong className="text-white">{featureName}</strong>. Stay tuned for launch updates.
          </p>
        </motion.div>

        {/* Essential Action Buttons ONLY */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <NavLink to="/">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-12 px-7 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02]">
              <Home size={15} className="mr-2" /> Go Home
            </Button>
          </NavLink>

          <Button
            variant="outline"
            onClick={() => navigate("/message")}
            className="bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold text-xs rounded-xl h-12 px-7 transition-all hover:scale-[1.02]"
          >
            <MessageSquare size={15} className="mr-2 text-indigo-400" /> Contact Us
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ComingSoon;
