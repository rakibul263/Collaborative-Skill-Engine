import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import logoImg from "@/assets/images/logo.png";

/**
 * EngineLoadingComponent — Minimal, brand-focused loading screen.
 * Displays the official logo with a subtle, 60fps GPU-accelerated float/pulse animation
 * centered in the content area between Navbar and Footer.
 */
const EngineLoadingComponent = () => {
  const shouldReduceMotion = useReducedMotion();

  const pulseAnimation = shouldReduceMotion
    ? {}
    : {
        scale: [0.95, 1, 0.95],
        opacity: [0.8, 1, 0.8],
        y: [-3, 3, -3],
      };

  const pulseTransition = shouldReduceMotion
    ? {}
    : {
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
      };

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex-1 w-full min-h-[60vh] flex items-center justify-center py-12 px-4 select-none"
    >
      <motion.img
        src={logoImg}
        alt="Collaborative Skill Engine Logo"
        animate={pulseAnimation}
        transition={pulseTransition}
        className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0 transform-gpu"
      />
    </motion.div>
  );
};

export default EngineLoadingComponent;
