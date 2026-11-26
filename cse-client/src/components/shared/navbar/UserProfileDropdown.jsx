import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LayoutDashboard, LogOut, ChevronDown, Sparkles, Shield, Compass, PlusCircle, Receipt } from "lucide-react";
import { NavLink } from "react-router";
import { withCacheBust } from "@/lib/profileApi";
import { prefetchRoute } from "@/lib/prefetchManager";

const UserProfileDropdown = ({ user, handleLogOut, isDashboardEligible }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => {
          prefetchRoute("/profile", user?.email);
          prefetchRoute("/my-purchases", user?.email);
          if (isDashboardEligible) prefetchRoute("/studio/dashboard", user?.email);
        }}
        className="flex items-center gap-2 p-1 rounded-full border border-slate-700 hover:border-indigo-500/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-slate-800/80 shadow-xs group"
        aria-label="User profile menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Vibrant Gradient Avatar Ring */}
        <div className="p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 group-hover:scale-105 transition-transform duration-200">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
            {user?.profileImage || user?.photoURL ? (
              <img
                src={withCacheBust(user?.profileImage || user?.photoURL, user?.dbUser?.updatedAt)}
                alt={user.fullName || user.displayName || "User avatar"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <User className="text-indigo-400" size={16} />
            )}
          </div>
        </div>
        <ChevronDown
          size={13}
          className={`text-slate-400 mr-1 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-400" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-700/60 shadow-xl shadow-black/30 rounded-2xl p-2.5 z-50 divide-y divide-slate-700/60"
          >
            {/* Header info */}
            <div className="p-3 bg-gradient-to-br from-indigo-950/60 to-purple-950/40 rounded-xl mb-1.5 border border-indigo-900/40">
              <div className="flex items-center gap-3">
                <div className="p-[2px] rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0">
                  <div className="w-10 h-10 rounded-[10px] overflow-hidden bg-slate-800 flex items-center justify-center">
                    {user?.profileImage || user?.photoURL ? (
                      <img
                        src={withCacheBust(user?.profileImage || user?.photoURL, user?.dbUser?.updatedAt)}
                        alt={user.fullName || user.displayName || "User"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <User className="text-indigo-400" size={20} />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate leading-tight">
                    {user?.displayName || "Skill Learner"}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Links */}
            <div className="py-1.5 space-y-1">
              <NavLink
                to="/profile"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                    isActive
                      ? "bg-indigo-950/60 text-indigo-400"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-indigo-400"
                  }`
                }
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <User size={15} />
                </div>
                <span>My Profile</span>
              </NavLink>

              <NavLink
                to="/my-purchases"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                    isActive
                      ? "bg-indigo-950/60 text-indigo-400"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-cyan-400"
                  }`
                }
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Receipt size={15} />
                </div>
                <span>My Purchases &amp; Invoices</span>
              </NavLink>

              {isDashboardEligible && (
                <>
                  <NavLink
                    to="/studio/dashboard"
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? "bg-indigo-950/60 text-indigo-400"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-indigo-400"
                      }`
                    }
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <LayoutDashboard size={15} />
                    </div>
                    <span className="flex-1">Instructor Studio</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </NavLink>

                  <NavLink
                    to="/studio/courses"
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? "bg-indigo-950/60 text-indigo-400"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-indigo-400"
                      }`
                    }
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <PlusCircle size={15} />
                    </div>
                    <span className="flex-1">Create Course</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Active
                    </span>
                  </NavLink>
                </>
              )}
            </div>

            {/* Logout section */}
            <div className="pt-1.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <LogOut size={15} />
                </div>
                <span>Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfileDropdown;
