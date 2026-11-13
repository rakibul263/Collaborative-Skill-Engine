import React from "react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";

/**
 * EngineLoadingComponent — Standardized platform loading screen.
 * Displays the signature unified LoadingSpinner with ambient dark styling.
 */
const EngineLoadingComponent = ({ message = "Loading experience..." }) => {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex-1 w-full min-h-[65vh] flex flex-col items-center justify-center py-16 px-4 select-none bg-transparent"
    >
      <LoadingSpinner size="xl" showGlow={true} label={message} />
    </motion.div>
  );
};

export default EngineLoadingComponent;
