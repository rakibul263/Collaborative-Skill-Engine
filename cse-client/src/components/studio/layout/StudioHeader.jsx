import React, { useState } from "react";
import {
  Search,
  MessageSquare,
  ChevronDown,
  User,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Menu,
  Command,
  PlusCircle,
  ArrowLeft,
  Sparkles,
  PenTool,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import logoImg from "@/assets/images/logo.png";
import NotificationBell from "@/components/shared/navbar/NotificationBell";

const ROUTE_TITLES = {
  "/studio/dashboard": "Dashboard",
  "/studio/courses": "Course Management",
  "/studio/lessons": "Lesson Builder",
  "/studio/analytics": "Analytics & Earnings",
  "/studio/students": "Enrolled Students",
  "/studio/appeals": "Appeals Mailbox",
  "/studio/reviews": "Course Reviews",
  "/studio/coupons": "Discount Coupons",
  "/studio/audit-logs": "Activity History",
};

const StudioHeader = ({
  onOpenCommandPalette,
  toggleSidebar,
  onOpenSignatureModal,
  hasSignature,
}) => {
  const { user, LogOut: handleLogOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentTitle = ROUTE_TITLES[location.pathname] || "Creator Studio";

  const onLogout = async () => {
    try {
      if (handleLogOut) await handleLogOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const displayName =
    user?.fullName || user?.displayName || user?.email?.split("@")[0] || "Instructor";
  const displayImage =
    user?.profileImage ||
    user?.photoURL ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250";

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-2xl px-4 sm:px-6 py-3 shadow-xl transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* ─── LEFT: BRANDING & CURRENT SECTION BREADCRUMB ─── */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800 cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div
            onClick={() => navigate("/studio/dashboard")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 p-1.5 group-hover:scale-105 transition-transform shadow-md">
              <img src={logoImg} alt="CSE Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white tracking-tight">CSE Studio</span>
                <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Creator
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block -mt-0.5">
                {currentTitle}
              </p>
            </div>
          </div>
        </div>

        {/* ─── CENTER: SEARCH & COMMAND PALETTE SHORTCUT ─── */}
        <div className="flex-1 max-w-lg mx-2 hidden md:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 transition-all shadow-inner group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              <span>Search studio courses, lessons, students, analytics...</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              <Command className="w-3 h-3 inline" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* ─── RIGHT: ACTIONS & USER PROFILE ─── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Create Course Quick Action */}
          <button
            onClick={() => navigate("/studio/courses")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Course</span>
          </button>

          {/* Instructor Signature Quick Action */}
          <button
            onClick={onOpenSignatureModal}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              hasSignature
                ? "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800"
                : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300"
            }`}
            title="Upload or Update Official Certificate Signature"
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">
              {hasSignature ? "Signature" : "Add Signature"}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasSignature ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
              }`}
            />
          </button>

          {/* Return to Marketplace / Main Site */}
          <button
            onClick={() => navigate("/courses")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Browse Public Courses Marketplace"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span>Marketplace</span>
          </button>

          {/* Quick Messages Shortcut */}
          <button
            onClick={() => navigate("/message")}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer relative"
            title="Open Messages"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Real-time Notifications Bell */}
          <div className="flex items-center">
            <NotificationBell />
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5 hidden sm:block" />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 sm:px-2 py-1 rounded-xl hover:bg-slate-900 transition-all border border-transparent hover:border-slate-800 cursor-pointer"
            >
              <img
                src={displayImage}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{displayName}</div>
                <div className="text-[10px] text-indigo-400 font-semibold leading-tight">Instructor Pro</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 border-b border-slate-800/80 mb-1 bg-slate-950/40 rounded-xl">
                    <p className="font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                    <span className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Verified Course Creator
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenSignatureModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <PenTool className="w-4 h-4 text-indigo-400" />
                      <span>Official Signature</span>
                    </div>
                    {hasSignature ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        Active
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                        Pending
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>My Public Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-purple-400" />
                    <span>Back to Platform Home</span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors font-medium cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default StudioHeader;
