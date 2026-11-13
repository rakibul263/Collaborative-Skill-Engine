import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Video,
  Users,
  Mail,
  Star,
  Tag,
  History,
  ChevronLeft,
  ChevronRight,
  Home,
  PlusCircle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

const StudioSidebar = ({ isCollapsed, toggleCollapse, mobileOpen, closeMobileDrawer }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;

    const fetchPendingCount = async () => {
      try {
        const res = await apiClient.get("/studio/appeals/count");
        setPendingAppealsCount(res.data?.pendingCount || 0);
      } catch (err) {
        /* silent catch */
      }
    };
    fetchPendingCount();

    const socket = getSocket();
    const handleNewAppeal = () => {
      setPendingAppealsCount((prev) => prev + 1);
    };
    const handleAppealUpdated = (updated) => {
      if (updated?.status === "resolved") {
        setPendingAppealsCount((prev) => Math.max(0, prev - 1));
      } else {
        fetchPendingCount();
      }
    };
    const handleUserNotif = (notif) => {
      if (notif?.type === "course_appeal") {
        setPendingAppealsCount((prev) => prev + 1);
      }
    };

    socket.on("appeal:new", handleNewAppeal);
    socket.on("appeal:updated", handleAppealUpdated);
    socket.on("user-notification:new", handleUserNotif);

    return () => {
      socket.off("appeal:new", handleNewAppeal);
      socket.off("appeal:updated", handleAppealUpdated);
      socket.off("user-notification:new", handleUserNotif);
    };
  }, [user?.email]);

  const navGroups = [
    {
      group: "Workspace",
      items: [
        { label: "Dashboard", path: "/studio/dashboard", icon: LayoutDashboard },
        { label: "Courses", path: "/studio/courses", icon: BookOpen, badge: "Core" },
        { label: "Lesson Builder", path: "/studio/lessons", icon: Video },
      ],
    },
    {
      group: "Audience & Growth",
      items: [
        { label: "Students", path: "/studio/students", icon: Users },
        {
          label: "Appeals Mailbox",
          path: "/studio/appeals",
          icon: Mail,
          badge: pendingAppealsCount > 0 ? `${pendingAppealsCount} new` : null,
          badgeVariant: "amber",
        },
        { label: "Reviews", path: "/studio/reviews", icon: Star },
        { label: "Coupons", path: "/studio/coupons", icon: Tag },
        { label: "Analytics & Sales", path: "/studio/analytics", icon: BarChart3 },
      ],
    },
    {
      group: "System",
      items: [
        { label: "Activity Logs", path: "/studio/audit-logs", icon: History },
      ],
    },
  ];

  const renderNavItem = (item) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => closeMobileDrawer && closeMobileDrawer()}
        className={({ isActive }) =>
          `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
            isActive
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/40"
              : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
          } ${isCollapsed ? "justify-center relative" : ""}`
        }
        title={isCollapsed ? item.label : undefined}
      >
        <div className="flex items-center gap-3 relative">
          <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          {isCollapsed && item.badge && item.badgeVariant === "amber" && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
          )}
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </div>
        {!isCollapsed && item.badge && (
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
              item.badgeVariant === "amber"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
            }`}
          >
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900/95 text-slate-200 border-r border-slate-800/80 select-none">
      {/* Sidebar Header & Toggle */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Studio Navigator
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mx-auto cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">
                {group.group}
              </h4>
            )}
            {group.items.map(renderNavItem)}
          </div>
        ))}
      </div>

      {/* Creator Info & Return to Platform Footer */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {!isCollapsed && (
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user?.fullName || user?.displayName || user?.email || "I")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user?.fullName || user?.displayName || "Instructor"}
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified Creator
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 transition-all cursor-pointer ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Platform Home" : undefined}
        >
          <Home className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Main Platform</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 h-[calc(100vh-61px)] shrink-0 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeMobileDrawer}
        >
          <div
            className="w-72 h-full bg-slate-900 border-r border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default StudioSidebar;
