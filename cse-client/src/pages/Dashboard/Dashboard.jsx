import { useState } from "react";
import { Menu } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import EnrolledStudents from "@/components/dashboard/EnrolledStudents";
import CourseManagement from "@/components/dashboard/CourseManagement";

/**
 * Dashboard — main instructor dashboard page.
 * Manages active section state and mobile sidebar toggle.
 * Desktop: sidebar always visible.
 * Mobile: sidebar shown as overlay when hamburger button is pressed.
 */
const Dashboard = () => {
  const [activeSection, setActiveSection] = useState("enrolled");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "courses":
        return <CourseManagement />;
      case "enrolled":
      default:
        return <EnrolledStudents />;
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:flex">
        <DashboardSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onClose={() => {}}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="relative z-10">
            <DashboardSidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header with hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-black text-[#1B1B4B] uppercase tracking-tight">
            Dashboard
          </h1>
        </div>

        {/* Section content */}
        <div className="p-6 lg:p-8">
          {renderSection()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
