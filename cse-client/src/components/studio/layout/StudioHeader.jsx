import React, { useState, useContext } from "react";
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
} from "lucide-react";
import { AuthContext } from "@/context/AuthContext/AuthContext";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/images/logo.png";

const StudioHeader = ({ onOpenCommandPalette, toggleSidebar, isSidebarCollapsed }) => {
  const { user, signOutUser } = useContext(AuthContext) || {};
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (signOutUser) await signOutUser();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const displayName = user?.fullName || user?.displayName || user?.email?.split("@")[0] || "Instructor";
  const displayImage = user?.profileImage || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250";

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-xl transition-all">
      <div className="flex items-center justify-between gap-4">
        
        {/* LEFT BRANDING AREA */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700/50"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div
            onClick={() => navigate("/studio/dashboard")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 p-1 group-hover:scale-105 transition-transform shadow-md">
              <img src={logoImg} alt="CSE Logo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white tracking-tight">CSE</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  Studio
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Creator Workspace</p>
            </div>
          </div>
        </div>

        {/* CENTER GLOBAL SEARCH & COMMAND PALETTE */}
        <div className="flex-1 max-w-xl mx-2">
          <button
            onClick={onOpenCommandPalette}
            className="w-full bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 transition-all shadow-inner group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span className="hidden sm:inline">Search courses, lessons, students, analytics...</span>
              <span className="sm:hidden">Search studio...</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              <Command className="w-3 h-3 inline" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* RIGHT CONTROLS & PROFILE DROPDOWN */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Messages */}
          <button
            onClick={() => navigate("/message")}
            className="hidden md:flex p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
            title="Messages"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2 py-1 rounded-xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700"
            >
              <img
                src={displayImage}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{displayName}</div>
                <div className="text-[10px] text-indigo-400 font-semibold leading-tight">Instructor Studio</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 border-b border-slate-800 mb-1">
                    <p className="font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                    <span className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Verified Instructor
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/studio/profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 text-indigo-400" />
                    Instructor Profile
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-purple-400" />
                    Back to Public Site
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
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
