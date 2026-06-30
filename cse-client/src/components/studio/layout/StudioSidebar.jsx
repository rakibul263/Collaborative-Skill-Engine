import React from "react";
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Video,
  Users,
  Star,
  Tag,
  History,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const StudioSidebar = ({ isCollapsed, toggleCollapse, mobileOpen, closeMobileDrawer, onCreateCourseClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const mainNavItems = [
    { label: "Dashboard", path: "/studio/dashboard", icon: LayoutDashboard },
    { label: "Analytics", path: "/studio/analytics", icon: BarChart3 },
    { label: "Courses", path: "/studio/courses", icon: BookOpen },
    { label: "Lessons", path: "/studio/lessons", icon: Video },
    { label: "Students", path: "/studio/students", icon: Users },
    { label: "Reviews", path: "/studio/reviews", icon: Star },
    { label: "Coupons", path: "/studio/coupons", icon: Tag },
    { label: "Activity Logs", path: "/studio/audit-logs", icon: History },
  ];

  const renderNavItem = (item) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => closeMobileDrawer && closeMobileDrawer()}
        className={({ isActive }) =>
          `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
            isActive
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
              : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
          } ${isCollapsed ? "justify-center" : ""}`
        }
        title={isCollapsed ? item.label : undefined}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110`} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </div>
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900/95 text-slate-200 border-r border-slate-800 select-none">
      
      {/* Sidebar Header Toggle */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2">
            Workspace Nav
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mx-auto"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* Main Section */}
        <div>
          {!isCollapsed && (
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2">
              Main Menu
            </h4>
          )}
          <div className="space-y-1">{mainNavItems.map(renderNavItem)}</div>
        </div>

      </div>

      {/* Home Button Footer */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 transition-all ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Back to Home" : undefined}
        >
          <Home className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Back to Home</span>}
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside
        className={`hidden md:block sticky top-[61px] h-[calc(100vh-61px)] transition-all duration-300 z-20 shrink-0 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={closeMobileDrawer} />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default StudioSidebar;
