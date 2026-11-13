import React, { useState } from "react";
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { AlertOctagon, RotateCw, Home, ShieldAlert, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

export const RouteErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  let title = "Application Error Encountered";
  let description = "An unexpected error occurred while rendering this interface. Our system prevented a full application crash.";
  let status = null;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "Resource Not Found (404)";
      description = "The requested page or route endpoint could not be located in this environment.";
    } else if (error.status === 401 || error.status === 403) {
      title = "Access Restricted";
      description = "You do not have the necessary security credentials to view this administrative resource.";
    } else {
      title = `Application Exception (${error.status})`;
      description = error.statusText || description;
    }
  } else if (error instanceof Error) {
    title = error.name || "Runtime Exception";
    description = error.message || description;
  }

  const rawErrorText = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ""}` : JSON.stringify(error, null, 2);

  const handleCopy = () => {
    navigator.clipboard?.writeText(rawErrorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-rose-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Cyber Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(244,63,94,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,63,94,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-xl w-full bg-[#0b101f]/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
          <AlertOctagon size={32} />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          {status && (
            <span className="px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase">
              HTTP Status {status}
            </span>
          )}
          <h2 className="text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20"
          >
            <RotateCw size={14} />
            <span>Reload Page</span>
          </button>

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all"
          >
            <Home size={14} />
            <span>Back to Home</span>
          </button>

          <button
            onClick={() => navigate("/admin/overview")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 font-bold text-xs transition-all"
          >
            <ShieldAlert size={14} />
            <span>Admin Mission Control</span>
          </button>
        </div>

        {/* Collapsible Diagnostics */}
        <div className="pt-2 text-left">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-400 hover:text-slate-200 text-xs font-mono font-semibold transition-all"
          >
            <span>Technical Diagnostics</span>
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDetails && (
            <div className="mt-2 p-3.5 rounded-xl bg-black/80 border border-slate-800/80 font-mono text-[11px] text-rose-300/90 overflow-x-auto relative group">
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition-all"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <pre className="whitespace-pre-wrap break-all pr-12 max-h-48 overflow-y-auto">
                {rawErrorText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;

