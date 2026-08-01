import React, { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import StudioHeader from "./StudioHeader";
import StudioSidebar from "./StudioSidebar";
import CommandPaletteModal from "../CommandPaletteModal";
import apiClient from "@/lib/apiClient";

const StudioLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global data for search & quick actions
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [eligibleTopics, setEligibleTopics] = useState([]);

  const fetchGlobalStudioData = useCallback(async () => {
    try {
      const [statusRes, coursesRes, studentsRes] = await Promise.all([
        apiClient.get("/studio/access-status").catch(() => ({ data: null })),
        apiClient.get("/courses/mine").catch(() => ({ data: [] })),
        apiClient.get("/studio/students").catch(() => ({ data: { students: [] } })),
      ]);

      if (statusRes.data) {
        setEligibleTopics(statusRes.data.allCompletedTopics || statusRes.data.eligibleTopics || []);
      }
      setCourses(coursesRes.data || []);
      setStudents(studentsRes.data?.students || []);
    } catch (err) {
      console.error("Studio layout fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchGlobalStudioData();
  }, [fetchGlobalStudioData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      
      {/* Top Header */}
      <StudioHeader
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        toggleSidebar={() => {
          if (window.innerWidth < 768) setMobileDrawerOpen(!mobileDrawerOpen);
          else setIsSidebarCollapsed(!isSidebarCollapsed);
        }}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main Body Area (Sidebar + Outlet Canvas) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <StudioSidebar
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          mobileOpen={mobileDrawerOpen}
          closeMobileDrawer={() => setMobileDrawerOpen(false)}
        />

        {/* Content Outlet Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet context={{ courses, students, eligibleTopics, refreshStudioData: fetchGlobalStudioData }} />
          </div>
        </main>

      </div>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        courses={courses}
        students={students}
      />

    </div>
  );
};

export default StudioLayout;
