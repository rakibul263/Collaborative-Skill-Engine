import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../shared/navbar/Navbar";
import Footer from "../shared/footer/Footer";
import { Outlet, useLocation } from "react-router";
import FloatingChatWidget from "../shared/chat/FloatingChatWidget";
import BottomNotificationPopup from "../shared/notifications/BottomNotificationPopup";
import { ToastProvider } from "@/components/ui/toast-system";
import { ShieldAlert, RefreshCw, Mail, Lock } from "lucide-react";

const RootLayout = () => {
  const location = useLocation();
  const [blockedData, setBlockedData] = useState(null);
  const [checking, setChecking] = useState(false);

  // Dedicated full-viewport workspaces where page-level scrolling, footer,
  // and floating chat widgets must be suppressed to maintain 100% viewport fit
  const isFullscreenWorkspace =
    location.pathname.startsWith("/ai-advisor") ||
    location.pathname.startsWith("/message");

  const checkIpStatus = async () => {
    setChecking(true);
    try {
      const api = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const res = await axios.get(`${api}/auth/ip-status`);
      if (res.data?.blocked) {
        setBlockedData(res.data);
      } else {
        setBlockedData(null);
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.blocked) {
        setBlockedData(err.response.data);
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkIpStatus();

    const handleBlocked = (e) => {
      setBlockedData(e.detail || { blocked: true, message: "IP Restricted" });
    };

    window.addEventListener("platform:ip_blocked", handleBlocked);
    return () => window.removeEventListener("platform:ip_blocked", handleBlocked);
  }, []);

  if (blockedData) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Glowing cyber background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-lg w-full bg-[#0b101f]/95 border border-rose-500/40 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(225,29,72,0.25)] text-center backdrop-blur-xl">
          {/* Beacon Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(225,29,72,0.3)]">
            <ShieldAlert size={40} className="text-rose-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#0b101f] animate-ping" />
          </div>

          {/* Heading */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-800/80 text-rose-300 font-mono text-xs font-bold uppercase tracking-wider mb-3">
            <Lock size={12} />
            HTTP 403 Forbidden &bull; Security Enforcement
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Platform Access Restricted
          </h1>

          <p className="mt-3 text-sm text-slate-300 leading-relaxed font-sans">
            Access to Collaborative Skill Engine has been restricted for your network client IP address. All authentication and data requests are rejected.
          </p>

          {/* IP Details Card */}
          <div className="my-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-left font-mono">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Restricted IP:</span>
              <span className="text-rose-400 font-bold tracking-wider">{blockedData.ip || "Client IP"}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-slate-400">Policy Reason:</span>
              <span className="text-slate-300 truncate max-w-[200px]" title={blockedData.message || "Administrative IP Restriction"}>
                {blockedData.message || "Administrative Security Restriction"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <button
              onClick={checkIpStatus}
              disabled={checking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold font-mono transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
              {checking ? "Checking Status..." : "Recheck Access"}
            </button>

            <a
              href="mailto:collaborativeskillengine@gmail.com?subject=Platform%20IP%20Restriction%20Appeal"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold font-mono transition-all"
            >
              <Mail size={14} />
              Appeal Restriction
            </a>
          </div>

          <p className="mt-6 text-[11px] font-mono text-slate-500">
            If you are an administrator, access your dedicated console directly at{" "}
            <a href="/admin/login" className="text-cyan-400 underline hover:text-cyan-300">
              /admin/login
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div
        className={`${
          isFullscreenWorkspace
            ? "h-screen max-h-screen overflow-hidden"
            : "min-h-screen overflow-x-clip"
        } flex flex-col relative bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200`}
      >
        {/* ── Fixed Global Cyber Pattern & Ambient Aurora Background ── */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Ambient Auroras */}
          <div className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] bg-gradient-to-br from-indigo-600/18 via-purple-600/12 to-transparent rounded-full blur-[140px]" />
          <div className="absolute top-[35%] -right-[15%] w-[45vw] h-[45vw] max-w-[650px] max-h-[650px] bg-gradient-to-bl from-purple-600/14 via-indigo-600/10 to-transparent rounded-full blur-[150px]" />
          <div className="absolute -bottom-[15%] left-[20%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] bg-gradient-to-tr from-cyan-600/10 via-indigo-600/08 to-transparent rounded-full blur-[140px]" />

          {/* High-Precision Pattern Mesh (Subtle Constellation Dots + Blueprint Grid) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(129, 140, 248, 0.16) 1.2px, transparent 0),
                linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px, 64px 64px, 64px 64px",
              maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, #000 70%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, #000 70%, transparent 100%)",
            }}
          />
        </div>

        <Navbar />

        <main
          className={`relative z-10 flex-1 flex flex-col min-h-0 ${
            isFullscreenWorkspace ? "overflow-hidden" : ""
          }`}
        >
          <Outlet />
        </main>

        {!isFullscreenWorkspace && <Footer />}
        {!isFullscreenWorkspace && <FloatingChatWidget />}
        <BottomNotificationPopup />
      </div>
    </ToastProvider>
  );
};

export default RootLayout;
