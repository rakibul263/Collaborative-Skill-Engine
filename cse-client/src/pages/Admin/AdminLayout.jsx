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
  ChevronRight,
  ChevronDown,
  Sparkles,
  Globe,
  Clock,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext/AdminContext";
import logoImg from "@/assets/images/logo.png";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";

// Categorized navigation groups
const navSections = [
  {
    category: "Operations Core",
    links: [
      { path: "/admin/overview", label: "Executive Overview", icon: LayoutDashboard },
      { path: "/admin/users", label: "User Directory & Roles", icon: Users },
      { path: "/admin/logins", label: "Login & IP Telemetry", icon: Globe },
    ],
  },
  {
    category: "Academic & Financial",
    links: [
      { path: "/admin/courses", label: "Course Approvals", icon: BookOpen },
      { path: "/admin/revenue", label: "Revenue & Earnings", icon: DollarSign },
    ],
  },
  {
    category: "Security & System",
    links: [
      { path: "/admin/broadcasts", label: "Global Broadcasts", icon: Radio },
      { path: "/admin/audit-logs", label: "Security Audit Logs", icon: ShieldAlert },
      { path: "/admin/system-health", label: "System Infrastructure", icon: Activity },
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

  // Live ticking clock
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

  // Dynamic document title & active nav calculation (declared before any early returns)
  const allLinks = navSections.flatMap((s) => s.links);
  const currentNav = allLinks.find((l) => location.pathname.startsWith(l.path));

  useEffect(() => {
    const pageName =
      location.pathname === "/admin/login"
        ? "Admin Security Gateway"
        : currentNav?.label || "Admin Console";
    document.title = `${pageName} | Collaborative Skill Engine`;
  }, [currentNav, location.pathname]);

  // If on login page, render full screen without admin shell
  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }

  const handleLogout = async () => {
    const result = await showConfirm({
      variant: "logout",
      badge: "ADMIN GATEWAY",
      title: "Terminate Administrative Session?",
      description:
        "You will be logged out of Mission Control and redirected to the authentication gateway.",
      confirmText: "Logout Now",
      cancelText: "Stay Logged In",
    });

    if (result.isConfirmed) {
      await logoutAdmin();
      toast.confirmed("Session Terminated", {
        description: "Administrative session securely closed.",
        badge: "LOGGED OUT",
      });
      navigate("/admin/login");
    }
  };

  return (
    <div className="flex h-screen bg-[#030712] text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Cybernetic Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-emerald-600/5 rounded-full blur-[130px]" />
      </div>

      {/* Cyber Grid & Dot Matrix Lines */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(6, 182, 212, 0.3) 1.2px, transparent 0),
            linear-gradient(to right, rgba(6, 182, 212, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px, 64px 64px, 64px 64px",
        }}
      />

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-[#090d1a]/95 lg:bg-[#070b16]/85 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col shrink-0 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header with CSE Logo */}
        <div className="px-4 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#060913]/95">
          <Link
            to="/admin/overview"
            className="flex items-center gap-3 group cursor-pointer focus-visible:outline-none"
            aria-label="Collaborative Skill Engine Admin"
          >
            {/* Logo Container with Neon Backlight */}
            <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-40 group-hover:opacity-75 blur-md rounded-xl transition-all duration-300 scale-95 group-hover:scale-110" />
              <div className="relative z-10 w-full h-full p-1 bg-slate-800/90 border border-slate-700/60 group-hover:border-indigo-400/80 rounded-xl shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:rotate-6">
                <img
                  src={logoImg}
                  alt="Collaborative Skill Engine Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#090d1a] rounded-full animate-pulse z-20" />
            </div>

            {/* Brand Title matching Main Site */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight leading-none text-white">
                  Skill<span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">Engine</span>
                </span>
                <span className="px-1.5 py-0.5 bg-gradient-to-r from-indigo-950 to-purple-950 border border-indigo-700/70 rounded text-[9px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[9px] font-extrabold text-slate-400 tracking-[0.2em] uppercase">
                  Collaborative
                </span>
              </div>
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dedicated Mission Control Badge */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-transparent border-b border-slate-800/60 flex items-center justify-between font-mono text-[11px]">
          <span className="text-cyan-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Shield size={12} className="text-cyan-400" />
            Mission Control
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE v2.5
          </span>
        </div>

        {/* Current Admin Identity Card */}
        {adminUser && (
          <div className="mx-4 mt-3.5 p-3 bg-gradient-to-br from-[#0c1224] to-[#070b16] border border-slate-800/80 rounded-2xl flex items-center gap-3 shadow-md">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xs text-white uppercase shadow-md shrink-0 border border-indigo-400/30">
              {adminUser.fullName ? adminUser.fullName.charAt(0) : adminUser.email.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-100 truncate leading-tight">
                {adminUser.fullName || "Administrator"}
              </p>
              <p className="text-[11px] text-slate-400 truncate font-mono">{adminUser.email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    adminUser.isMasterAdmin ? "bg-amber-400 animate-pulse" : "bg-cyan-400"
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono">
                  {adminUser.isMasterAdmin ? "Super Admin" : "Platform Admin"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Categorized Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto custom-scrollbar">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                {section.category}
              </p>

              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-500/20 via-indigo-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active vertical accent pill */}
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                        )}

                        <Icon
                          size={16}
                          className={`transition-colors shrink-0 ${
                            isActive
                              ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]"
                              : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        />
                        <span className="flex-1 truncate">{link.label}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer with Live Link & Logout */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2 bg-[#060913]/90">
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between w-full px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all border border-slate-800/60 group"
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={14} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
              Visit User Platform
            </span>
            <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-300">Live ↗</span>
          </Link>

          {isAdminAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-all shadow-sm"
            >
              <LogOut size={14} />
              Terminate Session
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#070b16]/85 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60"
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>

            {/* Mobile View Brand (visible when sidebar is closed on small screens) */}
            <Link
              to="/admin/overview"
              className="flex lg:hidden items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-700/60 p-1 shrink-0">
                <img src={logoImg} alt="CSE Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black leading-none text-white">
                  Skill<span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Engine</span>
                </span>
                <span className="text-[8px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                  Admin
                </span>
              </div>
            </Link>

            {/* Desktop Brand Pill & Breadcrumb */}
            <div className="hidden lg:flex items-center gap-3 text-xs font-medium">
              <Link
                to="/"
                target="_blank"
                rel="noreferrer"
                title="Launch Collaborative Skill Engine Main Site"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-slate-200 group transition-all shadow-sm"
              >
                <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-40 group-hover:opacity-80 blur-sm rounded-lg transition-all" />
                  <div className="relative z-10 w-full h-full p-0.5 bg-slate-800 border border-slate-700/60 rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform">
                    <img src={logoImg} alt="CSE Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black leading-none text-white group-hover:text-cyan-300 transition-colors">
                    Skill<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Engine</span>
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                      Collaborative Platform
                    </span>
                  </div>
                </div>
                <ExternalLink size={11} className="text-slate-500 group-hover:text-indigo-400 transition-colors ml-1" />
              </Link>

              <span className="text-slate-700">/</span>

              <span className="text-slate-200 font-bold flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/50 border border-slate-800/60">
                {currentNav ? (
                  <>
                    <currentNav.icon size={14} className="text-cyan-400" />
                    <span>{currentNav.label}</span>
                  </>
                ) : (
                  "Dashboard"
                )}
              </span>
            </div>
          </div>

          {/* Right Header Controls: Clock, Status, Profile Dropdown */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Real-time Clock */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 font-mono text-xs shadow-inner">
              <Clock size={13} className="text-cyan-400 animate-pulse" />
              <span className="font-bold text-cyan-300">{currentTime || "--:--:--"}</span>
            </div>

            {/* System Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/60 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-300 font-bold tracking-wider">
                ONLINE
              </span>
            </div>

            {/* Admin Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-black text-xs text-white uppercase shadow-sm shrink-0">
                  {adminUser?.fullName ? adminUser.fullName.charAt(0) : adminUser?.email?.charAt(0) || "A"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-white leading-none truncate max-w-[120px]">
                    {adminUser?.fullName || "Administrator"}
                  </p>
                  <p className="text-[9px] font-mono text-cyan-400 mt-0.5">
                    {adminUser?.isMasterAdmin ? "SUPER ADMIN" : "PLATFORM ADMIN"}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b101f] border border-slate-800 shadow-2xl p-2 z-50 animate-fade-in font-mono text-xs">
                  <div className="px-3 py-2 border-b border-slate-800 text-left">
                    <p className="text-white font-bold truncate">{adminUser?.fullName || "Administrator"}</p>
                    <p className="text-slate-400 text-[10px] truncate">{adminUser?.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/admin/overview"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <LayoutDashboard size={14} className="text-cyan-400" />
                      Executive Overview
                    </Link>
                    <Link
                      to="/admin/system-health"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <Activity size={14} className="text-emerald-400" />
                      System Health
                    </Link>
                    <Link
                      to="/"
                      target="_blank"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <ExternalLink size={14} className="text-indigo-400" />
                      Main Web App
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-left"
                    >
                      <LogOut size={14} />
                      Terminate Session
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
