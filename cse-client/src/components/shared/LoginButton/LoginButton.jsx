import React from "react";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";

const LoginButton = ({ onClick }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative w-full flex items-center justify-center gap-3.5 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 py-3.5 px-6 rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer shadow-lg shadow-black/20"
    >
      {/* Background Subtle Gradient Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />

      {/* Google Icon Container */}
      <div className="relative z-10 bg-white/10 p-2 rounded-xl border border-white/10 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
        <FcGoogle size={20} />
      </div>

      {/* Button Text */}
      <span className="relative z-10 text-slate-200 font-bold text-sm tracking-tight group-hover:text-white transition-colors">
        Continue with Google
      </span>

      {/* Ambient Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500 pointer-events-none" />
    </motion.button>
  );
};

export default LoginButton;
