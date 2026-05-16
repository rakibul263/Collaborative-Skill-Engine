import React, { useState, useEffect } from "react";
import { NavLink } from "react-router";
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
} from "lucide-react";
import logoImg from "../../../assets/images/logo.png";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";

import DesktopNav from "./DesktopNav";
import NotificationBell from "./NotificationBell";
import UserProfileDropdown from "./UserProfileDropdown";
import MobileNavDrawer from "./MobileNavDrawer";

const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDashboardEligible, setIsDashboardEligible] = useState(false);
  const { user, loading, LogOut: handleLogOut } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsDashboardEligible(false);
      return;
    }
    apiClient
      .get("/courses/eligibility")
      .then((res) => {
        const { averageRating, sessionCount } = res.data;
        setIsDashboardEligible(averageRating >= 4.0 && sessionCount >= 1);
      })
      .catch(() => setIsDashboardEligible(false));
  }, [user]);

  // Grouped Navigation Structure:
  // 1. Home
  // 2. Find Partners (Experts, Teams, Network)
  // 3. Workspace (Messages, Requests, Studio) - Requires Auth
  // 4. Courses
  // 5. AI Advisor (Vibrant AI feature badge)
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
          desc: "Join active skill squads & build",
          icon: <Target size={18} />,
          badge: "Hot",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          gradient: "from-emerald-500 to-teal-500",
        },
      ],
    },
    {
      name: "Workspace",
      path: "/studio",
      icon: <FolderGit2 size={16} />,
      hasChildren: true,
      requiresAuth: true,
      children: [
        {
          title: "Messages",
          path: "/message",
          desc: "Direct 1-on-1 chat & collaboration",
          icon: <MessageSquare size={18} />,
          badge: "Direct",
          badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          gradient: "from-indigo-500 to-violet-500",
        },
        {
          title: "Requests",
          path: "/requests",
          desc: "Connection & mentorship invites",
          icon: <UserCheck size={18} />,
          badge: "Invites",
          badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          gradient: "from-purple-500 to-pink-500",
        },
        {
          title: "Studio",
          path: "/studio",
          desc: "Creator workspace & dashboard",
          icon: <LayoutDashboard size={18} />,
          badge: "Pro",
          badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
          gradient: "from-cyan-500 to-blue-500",
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
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary/10 via-background to-background backdrop-blur-xl border-b border-slate-700/30 dark:border-slate-800/30 shadow-lg transition-colors duration-300">
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
              <NotificationBell />
              <UserProfileDropdown
                user={user}
                handleLogOut={handleLogOut}
                isDashboardEligible={isDashboardEligible}
              />
            </>
          ) : (
            <NavLink
              to="/login"
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
      {/* Mobile Drawer Overlay */}
      <MobileNavDrawer
        isOpen={isMobileOpen}
        setIsOpen={setIsMobileOpen}
        visibleNavItems={visibleNavItems}
        user={user}
        loading={loading}
        handleLogOut={handleLogOut}
        isDashboardEligible={isDashboardEligible}
      />
    </header>
  );
};

export default Navbar;
