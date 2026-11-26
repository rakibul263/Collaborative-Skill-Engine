import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  ArrowRight,
  Home,
  Users,
  MessageSquare,
  Sparkles,
  BookOpen,
  LayoutDashboard,
  Star,
  Target,
  Globe,
  UserCheck,
  FolderGit2,
  PlusCircle,
  GitBranch,
} from "lucide-react";
import logoImg from "../../../assets/images/logo.png";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";

import DesktopNav from "./DesktopNav";
import NotificationBell from "./NotificationBell";
import UserProfileDropdown from "./UserProfileDropdown";
import MobileNavDrawer from "./MobileNavDrawer";

const Navbar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [eligRecord, setEligRecord] = useState({ email: "", value: null });
  const [scrolled, setScrolled] = useState(false);
  const { user, loading, LogOut: handleLogOut } = useAuth();

  const userEmailKey = user?.email ? user.email.toLowerCase().trim() : "";
  const isDashboardEligible = useMemo(() => {
    if (!userEmailKey) return false;
    if (eligRecord.email === userEmailKey && eligRecord.value !== null) {
      return eligRecord.value;
    }
    if (user?.canCreateCourse) return true;
    try {
      return localStorage.getItem(`cse_course_elig_${userEmailKey}`) === "true";
    } catch {
      return false;
    }
  }, [userEmailKey, eligRecord, user?.canCreateCourse]);

  const currentPath = `${location.pathname}${location.search}`;
  const loginUrl =
    location.pathname === "/login" || location.pathname === "/register"
      ? "/login"
      : `/login?returnUrl=${encodeURIComponent(currentPath)}`;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userEmailKey) return;
    let cancelled = false;
    apiClient
      .get("/courses/eligibility", { timeout: 45000 })
      .then((res) => {
        if (cancelled) return;
        const eligible = Boolean(res.data?.canCreateCourse);
        setEligRecord({ email: userEmailKey, value: eligible });
        try {
          localStorage.setItem(`cse_course_elig_${userEmailKey}`, String(eligible));
        } catch {
          // ignore storage quota errors
        }
      })
      .catch(() => {
        // Keep cached eligibility on transient network failure
      });
    return () => {
      cancelled = true;
    };
  }, [userEmailKey]);

  // Grouped Navigation Structure:
  // 1. Home (Landing Page)
  // 2. Find Partners (Mentors, Teams, Skill Knowledge Graph)
  // 3. Courses (Public Catalog & Tracks)
  // 4. Collaboration (Direct Messages, Connection Requests) - Requires Auth (Studio cleanly removed)
  // 5. AI Advisor (Flagship AI 2.0 Assistant & Mock Interviewer) - Requires Auth
  const navItems = [
    {
      name: "Home",
      path: "/",
      icon: <Home size={16} />,
      hasChildren: false,
      requiresAuth: false,
    },
    {
      name: "Find Partners",
      path: "/find-partners",
      icon: <Users size={16} />,
      hasChildren: true,
      requiresAuth: false,
      children: [
        {
          title: "Mentors & Experts",
          path: "/experts",
          desc: "Get guidance from industry leaders",
          icon: <Star size={18} />,
          badge: "Featured",
          badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          gradient: "from-amber-500 to-orange-500",
        },
        {
          title: "Project Teams",
          path: "/teams",
          desc: "Pareto-optimized squads & build",
          icon: <Target size={18} />,
          badge: "Pareto AI",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          gradient: "from-emerald-500 to-teal-500",
        },
        {
          title: "Skill Knowledge Graph",
          path: "/skill-graph",
          desc: "DAG graph gap analysis & career roadmap",
          icon: <GitBranch size={18} />,
          badge: "DAG AI",
          badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          gradient: "from-indigo-500 to-purple-500",
        },
      ],
    },
    {
      name: "Courses",
      path: "/courses",
      icon: <BookOpen size={16} />,
      hasChildren: false,
      requiresAuth: false,
    },
    {
      name: "Collaboration",
      path: "/message",
      icon: <MessageSquare size={16} />,
      hasChildren: true,
      requiresAuth: true,
      children: [
        {
          title: "Direct Messages",
          path: "/message",
          desc: "Direct 1-on-1 chat & code collaboration",
          icon: <MessageSquare size={18} />,
          badge: "Direct",
          badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          gradient: "from-indigo-500 to-violet-500",
        },
        {
          title: "Connection Requests",
          path: "/requests",
          desc: "Mentorship & peer connection invites",
          icon: <UserCheck size={18} />,
          badge: "Invites",
          badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          gradient: "from-purple-500 to-pink-500",
        },
      ],
    },
    {
      name: "AI Advisor",
      path: "/ai-advisor",
      icon: <Sparkles size={16} />,
      hasChildren: false,
      requiresAuth: true,
      isSpecial: true,
      badge: "AI 2.0",
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.requiresAuth || !!user
  );

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 w-full h-16 transition-all duration-300 backdrop-blur-2xl ${
          scrolled
            ? "bg-[#050914]/90 border-b border-indigo-500/20 shadow-[0_12px_35px_rgba(0,0,0,0.65)]"
            : "bg-[#060a17]/75 border-b border-slate-800/60 shadow-lg"
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 px-4 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo with refined glass effect */}
        <NavLink
          to="/"
          className="flex items-center gap-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl p-1"
          aria-label="Collaborative Skill Engine Home"
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-30 group-hover:opacity-60 blur-lg rounded-xl transition-all duration-500 scale-95 group-hover:scale-110" />
            <div className="relative z-10 w-full h-full p-1 bg-slate-800/80 border border-slate-700/50 rounded-xl shadow-sm group-hover:rotate-6 transition-transform duration-300">
              <img src={logoImg} alt="CSE Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base lg:text-lg font-black tracking-tight leading-none text-white">
              Skill<span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Engine</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-extrabold text-slate-400 tracking-[0.2em] uppercase">Collaborative</span>
            </div>
          </div>
        </NavLink>

        {/* Desktop Navigation with subtle animation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <DesktopNav items={visibleNavItems} />
        </motion.div>

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 animate-pulse border border-slate-200/40 dark:border-slate-800/60" />
              <div className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse border border-indigo-100/50 dark:border-slate-800/80" />
            </div>
          ) : user ? (
            <>
              {isDashboardEligible && (
                <NavLink
                  to="/studio/courses"
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Create Course & Studio"
                >
                  <PlusCircle size={14} />
                  <span>Create Course</span>
                </NavLink>
              )}
              <NotificationBell />
              <UserProfileDropdown
                user={user}
                handleLogOut={handleLogOut}
                isDashboardEligible={isDashboardEligible}
              />
            </>
          ) : (
            <NavLink
              to={loginUrl}
              state={{ from: location }}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span>Get Started</span>
              <ArrowRight size={14} className="transform transition-transform group-hover:translate-x-1" />
            </NavLink>
          )}
          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="lg:hidden p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        </div>
      </header>
      {/* Spacer matching fixed header height so content never slides underneath */}
      <div className="h-16 w-full shrink-0" aria-hidden="true" />
      {/* Mobile Drawer Overlay rendered outside header to avoid backdrop-filter fixed trap */}
      <MobileNavDrawer
        isOpen={isMobileOpen}
        setIsOpen={setIsMobileOpen}
        visibleNavItems={visibleNavItems}
        user={user}
        loading={loading}
        handleLogOut={handleLogOut}
        isDashboardEligible={isDashboardEligible}
      />
    </>
  );
};

export default Navbar;
