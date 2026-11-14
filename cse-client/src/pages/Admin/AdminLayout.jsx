import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  Radio,
  ShieldAlert,
  Activity,
  LogOut,
  Shield,
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  Globe,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext/AdminContext";
import logoImg from "@/assets/images/logo.png";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";

// Streamlined, non-redundant navigation sections
const navSections = [
  {
    category: "Operations",
    links: [
      { path: "/admin/overview", label: "Executive Overview", icon: LayoutDashboard },
      { path: "/admin/users", label: "Users & Roles", icon: Users },
      { path: "/admin/courses", label: "Course Approvals", icon: BookOpen },
    ],
  },
  {
    category: "Financials",
    links: [
      { path: "/admin/revenue", label: "Revenue & Ledger", icon: DollarSign },
    ],
  },
  {
    category: "Governance & System",
    links: [
      { path: "/admin/broadcasts", label: "Broadcasts", icon: Radio },
      { path: "/admin/logins", label: "Access & IP Telemetry", icon: Globe },
      { path: "/admin/audit-logs", label: "Audit Logs", icon: ShieldAlert },
      { path: "/admin/system-health", label: "System Health", icon: Activity },
    ],
  },
];

const AdminLayout = () => {
  const { adminUser, logoutAdmin, isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const dropdownRef = useRef(null);

  // Discreet live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const allLinks = navSections.flatMap((s) => s.links);
  const currentNav = allLinks.find((l) => location.pathname.startsWith(l.path));

  useEffect(() => {
    const pageName =
      location.pathname === "/admin/login"
        ? "Admin Gateway"
        : currentNav?.label || "Admin Console";
    document.title = `${pageName} | Skill Engine`;
  }, [currentNav, location.pathname]);

  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }

  const handleLogout = async () => {
    const result = await showConfirm({
      variant: "logout",
      badge: "SECURITY",
      title: "Sign Out of Admin Console?",
      description: "Your administrative session token will be invalidated.",
      confirmText: "Sign Out",
      cancelText: "Stay Signed In",
    });

    if (result.isConfirmed) {
      await logoutAdmin();
      toast.confirmed("Session Terminated", {
        description: "You have been safely signed out.",
        badge: "SIGNED OUT",
      });
      navigate("/admin/login");
    }
  };

  return (
    <div className="flex h-screen bg-[#080B11] text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Refined, subtle ambient background lighting (clean SaaS aesthetic, no neon circus) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[300px] bg-indigo-950/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[250px] bg-cyan-950/15 rounded-full blur-[140px]" />
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0B0F19]/95 lg:bg-[#0A0E17]/90 backdrop-blur-xl border-r border-slate-800/70 flex flex-col shrink-0 transition-transform duration-200 ease-in-out shadow-2xl lg:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/70 flex items-center justify-between">
          <Link
            to="/admin/overview"
            className="flex items-center gap-3 group focus-visible:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 group-hover:border-slate-500 transition-colors shadow-sm">
              <img
                src={logoImg}
                alt="Skill Engine Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">
                  Skill<span className="text-cyan-400">Engine</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/60 uppercase">
                  Admin
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Control Console
              </span>
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
            aria-label="Close Sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Clean Admin Identity Summary */}
        {adminUser && (
          <div className="mx-3.5 my-3 p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">
              {adminUser.fullName ? adminUser.fullName.charAt(0) : adminUser.email.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {adminUser.fullName || "Administrator"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] font-mono text-slate-400 truncate uppercase">
                  {adminUser.isMasterAdmin ? "Super Admin" : "Platform Admin"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto custom-scrollbar">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                {section.category}
              </p>

              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-slate-800/90 text-white font-semibold border border-slate-700 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={15}
                          className={isActive ? "text-cyan-400" : "text-slate-400"}
                        />
                        <span className="flex-1 truncate">{link.label}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/70 space-y-1.5 bg-[#090D15]/80">
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={13} className="text-slate-400" />
              Visit User Platform
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live ↗</span>
          </Link>

          {isAdminAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-950/40 transition-colors"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header Bar */}
        <header className="h-14 bg-[#0A0E17]/85 backdrop-blur-md border-b border-slate-800/70 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Console</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                {currentNav && <currentNav.icon size={13} className="text-cyan-400" />}
                {currentNav?.label || "Overview"}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded-md">
              <Clock size={12} className="text-slate-400" />
              <span>{currentTime || "--:--:--"}</span>
            </div>

            {/* Live Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>System Online</span>
            </div>

            {/* Admin User Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                  {adminUser?.fullName ? adminUser.fullName.charAt(0) : adminUser?.email?.charAt(0) || "A"}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-200 max-w-[120px] truncate">
                  {adminUser?.fullName || "Admin"}
                </span>
                <ChevronDown size={12} className="text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0D121F] border border-slate-800 shadow-xl p-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-800/80 text-left">
                    <p className="text-white font-semibold truncate">
                      {adminUser?.fullName || "Administrator"}
                    </p>
                    <p className="text-slate-400 text-[11px] truncate font-mono mt-0.5">
                      {adminUser?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/admin/overview"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <LayoutDashboard size={13} className="text-slate-400" />
                      Executive Overview
                    </Link>
                    <Link
                      to="/admin/system-health"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <Activity size={13} className="text-slate-400" />
                      System Health
                    </Link>
                    <Link
                      to="/"
                      target="_blank"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <ExternalLink size={13} className="text-slate-400" />
                      Main Web App
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors text-left"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
