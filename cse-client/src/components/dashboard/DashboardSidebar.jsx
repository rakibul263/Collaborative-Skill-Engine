import { useNavigate } from "react-router";
import { Users, BookOpen, ArrowLeft } from "lucide-react";
import logoImg from "@/assets/images/logo.png";

const navItems = [
  { id: "enrolled", label: "Enrolled Students", icon: Users },
  { id: "courses", label: "Course Management", icon: BookOpen },
];

/**
 * DashboardSidebar — sidebar nav for the Instructor Dashboard.
 * Props:
 *   activeSection: "enrolled" | "earnings" | "courses"
 *   onSectionChange(section): called when a nav link is clicked
 *   onClose(): called after nav link click on mobile (closes sidebar overlay)
 */
const DashboardSidebar = ({ activeSection, onSectionChange, onClose }) => {
  const navigate = useNavigate();

  const handleNav = (sectionId) => {
    onSectionChange(sectionId);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col w-64 min-h-screen bg-[#1B1B4B] text-white">
      {/* Branding */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <img src={logoImg} alt="CSE Logo" className="w-10 h-10 object-contain" />
        <div>
          <p className="text-xs font-black text-white uppercase tracking-wider leading-none">
            Collaborative
          </p>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">
            Skill Engine
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                border-l-4
                ${
                  isActive
                    ? "bg-indigo-600 text-white border-white font-black shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent font-bold"
                }`}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Back to Studio */}
      <div className="px-3 pb-6 border-t border-white/10 pt-4">
        <button
          onClick={() => navigate("/studio")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold"
        >
          <ArrowLeft size={18} />
          Back to Studio
        </button>
      </div>
    </div>
  );
};

export default DashboardSidebar;
