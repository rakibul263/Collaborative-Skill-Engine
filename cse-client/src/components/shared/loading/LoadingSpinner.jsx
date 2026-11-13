import React from "react";

/**
 * LoadingSpinner — Universal Unified Signature Loading Spinner
 * Standardized across the entire Collaborative Skill Engine application.
 *
 * Features:
 * - Signature Indigo-Purple-Cyan gradient rotation
 * - Ambient radial glow with subtle pulse
 * - Consistent size presets (xs, sm, md, lg, xl)
 * - Optional label with high-contrast, modern typography
 */
export const LoadingSpinner = ({
  size = "md",
  variant = "gradient", // "gradient" | "white" | "subtle"
  className = "",
  label = null,
  showGlow = true,
}) => {
  // Size presets
  const sizeMap = {
    xs: { outer: "w-3.5 h-3.5", border: "border-[1.5px]", glow: "blur-[3px]" },
    sm: { outer: "w-4 h-4", border: "border-2", glow: "blur-[4px]" },
    md: { outer: "w-6 h-6", border: "border-2", glow: "blur-[6px]" },
    lg: { outer: "w-10 h-10", border: "border-[2.5px]", glow: "blur-[8px]" },
    xl: { outer: "w-14 h-14", border: "border-3", glow: "blur-[10px]" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Variant styles
  const getSpinnerStyles = () => {
    switch (variant) {
      case "white":
        return {
          glowBg: "bg-white/30",
          track: "border-white/20",
          head: "border-t-white border-r-white/80",
        };
      case "subtle":
        return {
          glowBg: "bg-indigo-400/20",
          track: "border-slate-800",
          head: "border-t-indigo-400 border-r-indigo-500",
        };
      case "gradient":
      default:
        return {
          glowBg: "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400",
          track: "border-indigo-500/20",
          head: "border-t-indigo-400 border-r-purple-400 border-b-cyan-400/40",
        };
    }
  };

  const { glowBg, track, head } = getSpinnerStyles();

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`relative flex items-center justify-center ${currentSize.outer} shrink-0`}>
        {/* Ambient background glow */}
        {showGlow && (
          <span
            className={`absolute inset-0 rounded-full ${glowBg} ${currentSize.glow} opacity-60 animate-pulse pointer-events-none`}
          />
        )}

        {/* Outer rotating gradient ring */}
        <span
          className={`relative w-full h-full rounded-full ${currentSize.border} ${track} ${head} animate-spin`}
        />
      </div>

      {/* Optional descriptive label */}
      {label && (
        <p className="text-xs font-semibold text-slate-300 tracking-wide text-center animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

/**
 * FullScreenLoader — Standardized full page loading view
 * Used for route guards (EligibleRoute, PrivateRoute), initial app boot, and full-screen state transitions.
 */
export const FullScreenLoader = ({
  message = "Loading experience...",
  subtext = "Please hold on while we prepare your workspace",
  minHeight = "min-h-screen",
}) => {
  return (
    <div
      className={`${minHeight} w-full bg-transparent flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden`}
    >
      {/* Background ambient light matching the cyber theme */}
      <div className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[35%] -right-[15%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] bg-gradient-to-bl from-purple-600/12 via-indigo-600/08 to-transparent rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm space-y-4">
        <LoadingSpinner size="xl" showGlow={true} />

        <div className="space-y-1 pt-2">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {message}
          </h3>
          {subtext && (
            <p className="text-xs text-slate-400 font-medium">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ButtonSpinner — Compact spinner designed to sit inside interactive buttons
 */
export const ButtonSpinner = ({ size = "sm", className = "" }) => {
  return (
    <LoadingSpinner
      size={size}
      variant="white"
      showGlow={false}
      className={`shrink-0 ${className}`}
    />
  );
};

/**
 * AdminPageLoader — Centered, branded loader designed specifically for Admin views
 * Vertically and horizontally centered within the admin content area.
 */
export const AdminPageLoader = ({
  label = "Loading Administrative Data...",
  subtext = "Loading real-time administrative metrics",
  minHeight = "min-h-[calc(100vh-12rem)]",
}) => {
  return (
    <div
      className={`w-full ${minHeight} flex flex-col items-center justify-center p-6 text-center select-none relative bg-transparent`}
    >
      <div className="relative z-10 flex flex-col items-center max-w-sm space-y-4">
        <LoadingSpinner size="lg" showGlow={true} />

        <div className="space-y-1.5 pt-1">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {label}
          </h3>
          {subtext && (
            <p className="text-xs text-slate-400 font-mono">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;

