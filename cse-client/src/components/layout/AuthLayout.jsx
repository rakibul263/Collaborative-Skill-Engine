import React from "react";
import { Outlet } from "react-router";
import { motion } from "framer-motion";
import AuthNavbar from "../shared/navbar/AuthNavbar";

const AuthLayout = () => {
  return (
    <div className="relative min-h-screen bg-[#080914] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Background Ambient Mesh Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep ambient radial glow top left */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-500/10 rounded-full blur-[140px]"
        />

        {/* Deep ambient radial glow bottom right */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-tl from-purple-600/25 via-indigo-600/20 to-blue-600/10 rounded-full blur-[140px]"
        />

        {/* Modern Precision Matrix Pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(129, 140, 248, 0.16) 1.2px, transparent 0),
              linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px, 64px 64px, 64px 64px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, #000 70%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, #000 70%, transparent 100%)",
          }}
        />
      </div>

      {/* Sticky Auth Navbar */}
      <AuthNavbar />

      {/* Main Content Area */}
      <main className="relative z-10 pt-20 lg:pt-24 min-h-[calc(100vh-5rem)] flex flex-col justify-center">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;
