import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, User, LayoutDashboard, ArrowRight, LogOut, Sparkles, PlusCircle, Receipt } from "lucide-react";

const MobileNavDrawer = ({
  isOpen,
  setIsOpen,
  visibleNavItems,
  user,
  loading,
  handleLogOut,
  isDashboardEligible,
}) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  const currentPath = `${location.pathname}${location.search}`;
  const loginUrl =
    location.pathname === "/login" || location.pathname === "/register"
      ? "/login"
      : `/login?returnUrl=${encodeURIComponent(currentPath)}`;

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  const toggleExpand = (name) => {
    setExpandedItems((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -20, scaleY: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute top-0 left-0 right-0 max-h-[88vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-indigo-100 dark:border-slate-800 shadow-2xl rounded-b-[2rem] overflow-hidden flex flex-col pt-4 pb-6 px-4"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  SkillEngine Navigation
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto py-3 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
              <div className="space-y-1.5">
                {visibleNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const isExpanded = !!expandedItems[item.name];

                  if (item.isSpecial) {
                    return (
                      <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 dark:border-indigo-800/60 ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "text-indigo-700 dark:text-indigo-300"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Sparkles size={16} className="text-amber-400 animate-pulse" />
                          <span>{item.name}</span>
                        </span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-[9px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full uppercase">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  }

                  if (item.hasChildren) {
                    return (
                      <div key={item.name} className="space-y-1">
                        <button
                          onClick={() => toggleExpand(item.name)}
                          className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {item.icon}
                            </span>
                            <span>{item.name}</span>
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-indigo-600" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="ml-4 pl-3 border-l-2 border-indigo-100 dark:border-indigo-900/60 space-y-1.5"
                            >
                              {item.children.map((child) => (
                                <NavLink
                                  key={child.title}
                                  to={child.path}
                                  onClick={() => setIsOpen(false)}
                                  className={({ isActive: childActive }) =>
                                    `flex items-start gap-3 p-2.5 rounded-xl text-xs transition-colors ${
                                      childActive
                                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`
                                  }
                                >
                                  <div
                                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${child.gradient} text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}
                                  >
                                    {React.cloneElement(child.icon, { size: 14 })}
                                  </div>
                                  <div>
                                    <div className="font-bold">{child.title}</div>
                                    <div className="text-[10px] text-slate-400">
                                      {child.desc}
                                    </div>
                                  </div>
                                </NavLink>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-colors ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-md shadow-indigo-500/20"
                            : "text-slate-800 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                        }`
                      }
                    >
                      <span className={isActive ? "text-white" : "text-indigo-600 dark:text-indigo-400"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>

              {/* User Profile & Auth CTA */}
              <div className="pt-3 space-y-2">
                {loading ? (
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-indigo-100/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
                      <div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded-md" />
                    </div>
                  </div>
                ) : user ? (
                  <div className="space-y-2 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-slate-800/60 dark:to-slate-800/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
                          {user?.profileImage || user?.photoURL ? (
                            <img
                              src={user?.profileImage || user?.photoURL}
                              alt={user.fullName || user.displayName || "Avatar"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <User className="text-indigo-600" size={18} />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user?.displayName || "Skill Learner"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                      <NavLink
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                      >
                        <User size={15} className="text-indigo-600" />
                        <span>My Profile</span>
                      </NavLink>

                      <NavLink
                        to="/my-purchases"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                      >
                        <Receipt size={15} className="text-cyan-500" />
                        <span>My Purchases &amp; Invoices</span>
                      </NavLink>

                      {isDashboardEligible && (
                        <>
                          <NavLink
                            to="/studio/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                          >
                            <LayoutDashboard size={15} className="text-emerald-500" />
                            <span>Instructor Studio</span>
                          </NavLink>

                          <NavLink
                            to="/studio/courses"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                          >
                            <PlusCircle size={15} className="text-purple-500" />
                            <span>Create Course</span>
                          </NavLink>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setIsOpen(false);
                          handleLogOut();
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-600 dark:hover:bg-rose-950/40 hover:bg-rose-50"
                      >
                        <LogOut size={15} />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <NavLink
                    to={loginUrl}
                    state={{ from: location }}
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-2 p-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={15} />
                  </NavLink>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileNavDrawer;
