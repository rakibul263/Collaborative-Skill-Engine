import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";

const DesktopNav = ({ items }) => {
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const timeoutRef = useRef(null);
  const navRef = useRef(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMouseEnter = (itemName) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(itemName);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const isChildActive = (children) => {
    if (!children) return false;
    return children.some((c) => location.pathname === c.path);
  };

  return (
    <nav ref={navRef} className="hidden lg:flex items-center gap-1.5">
      {items.map((item) => {
        const isParentActive =
          location.pathname === item.path || isChildActive(item.children);

        if (item.isSpecial) {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`relative flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-gradient-to-r from-indigo-950/40 to-purple-950/40 text-indigo-300 border border-indigo-800/60 hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-500/10"
              }`}
            >
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span>{item.name}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full uppercase tracking-wider shadow-xs">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        }

        return (
          <div
            key={item.name}
            className="relative"
            onMouseEnter={() => item.hasChildren && handleMouseEnter(item.name)}
            onMouseLeave={() => item.hasChildren && handleMouseLeave()}
          >
            <NavLink
              to={item.path}
              onClick={(e) => {
                if (item.hasChildren) {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveDropdown((prev) => (prev === item.name ? null : item.name));
                }
              }}
              className={({ isActive }) =>
                `relative flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive || isParentActive
                    ? "text-indigo-400 font-extrabold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active sliding background indicator with soft gradient glow */}
                  {(isActive || isParentActive) && (
                    <motion.div
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-violet-500/10 border border-indigo-200/80 dark:border-indigo-800/70 rounded-xl shadow-xs -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-1.5">
                    <span
                      className={`transition-colors ${
                        isActive || isParentActive
                          ? "text-indigo-400"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                    {item.hasChildren && (
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 opacity-60 ${
                          activeDropdown === item.name
                            ? "rotate-180 text-indigo-600 dark:text-indigo-400 opacity-100"
                            : ""
                        }`}
                      />
                    )}
                  </span>
                </>
              )}
            </NavLink>

            {/* Vibrant Dropdown Menu */}
            <AnimatePresence>
              {item.hasChildren && activeDropdown === item.name && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full left-0 mt-2 w-80 bg-slate-900/98 backdrop-blur-xl border border-slate-700/60 shadow-xl shadow-black/30 rounded-2xl p-2 z-50"
                >
                  <div className="flex items-center justify-between px-3 py-1.5 mb-1 border-b border-slate-700/60">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {item.name} Hub
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  </div>

                  <div className="space-y-1">
                    {item.children.map((child) => {
                      const isSubActive = location.pathname === child.path;
                      return (
                        <NavLink
                          key={child.title}
                          to={child.path}
                          onClick={() => setActiveDropdown(null)}
                          className={`flex items-start gap-3 p-3 rounded-xl transition-all group ${
                            isSubActive
                              ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/40"
                              : "hover:bg-slate-800/60 text-slate-200"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${child.gradient} text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200 mt-0.5`}
                          >
                            {child.icon}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold leading-tight text-white group-hover:text-indigo-400 transition-colors">
                                {child.title}
                              </span>
                              {child.badge && (
                                <span
                                  className={`px-1.5 py-0.2 text-[9px] font-black rounded-md border ${child.badgeColor}`}
                                >
                                  {child.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-1">
                              {child.desc}
                            </span>
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
};

export default DesktopNav;
