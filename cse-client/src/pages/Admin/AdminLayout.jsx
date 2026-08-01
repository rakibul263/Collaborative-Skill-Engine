import { NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  Bell,
  LogOut,
  Shield,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext/AdminContext";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const sidebarLinks = [
  { path: "/admin/overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { path: "/admin/users", label: "Users", icon: <Users size={18} /> },
  { path: "/admin/courses", label: "Course Approvals", icon: <BookOpen size={18} /> },
  { path: "/admin/revenue", label: "Revenue", icon: <DollarSign size={18} /> },
  { path: "/admin/notifications", label: "Notifications", icon: <Bell size={18} /> },
];

const AdminLayout = () => {
  const { logoutAdmin, isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/admin-api/logout`, {}, { withCredentials: true });
    } catch { /* silent */ }
    logoutAdmin();
    navigate("/admin/login");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1B1B4B] text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Admin</p>
            <p className="text-sm font-black text-white leading-tight">Control Panel</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                    : "text-indigo-200 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        {isAdminAuthenticated && (
          <div className="px-4 pb-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-indigo-300 hover:bg-red-500/20 hover:text-red-300 transition-all"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-black text-[#1B1B4B] uppercase tracking-wide">Admin Panel</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-400">System Online</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
