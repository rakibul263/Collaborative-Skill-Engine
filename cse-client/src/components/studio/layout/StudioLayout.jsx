import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import StudioHeader from "./StudioHeader";
import StudioSidebar from "./StudioSidebar";
import CommandPaletteModal from "../CommandPaletteModal";
import InstructorSignatureModal from "../InstructorSignatureModal";
import BottomNotificationPopup from "@/components/shared/notifications/BottomNotificationPopup";
import apiClient from "@/lib/apiClient";

const StudioLayout = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isFullWidthRoute = location.pathname.startsWith("/studio/appeals");

  // Global data for search & quick actions
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [eligibleTopics, setEligibleTopics] = useState([]);
  const [instructorSignature, setInstructorSignature] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const fetchGlobalStudioData = useCallback(async () => {
    try {
      const [statusRes, sigRes, coursesRes, studentsRes] = await Promise.all([
        apiClient.get("/studio/access-status").catch(() => ({ data: null })),
        apiClient.get("/studio/signature").catch(() => ({ data: null })),
        apiClient.get("/courses/mine").catch(() => ({ data: [] })),
        apiClient.get("/studio/students").catch(() => ({ data: { students: [] } })),
      ]);

      if (statusRes.data) {
        setEligibleTopics(statusRes.data.allCompletedTopics || statusRes.data.eligibleTopics || []);
      }

      const sig = sigRes.data?.instructorSignature || statusRes.data?.instructorSignature || null;
      setInstructorSignature(sig);

      const hasSig = Boolean(sigRes.data?.hasSignature || statusRes.data?.hasSignature || sig);

      // If instructor has not uploaded an official signature yet, open the modal upon entering Studio!
      if (!hasSig) {
        setShowSignatureModal(true);
      }

      setCourses(coursesRes.data || []);
      setStudents(studentsRes.data?.students || []);
    } catch (err) {
      console.error("Studio layout fetch error:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (!active) return;
      fetchGlobalStudioData();
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchGlobalStudioData]);

  return (
    <div className="h-screen bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col relative overflow-hidden">
      {/* ── Fixed Cyber Pattern & Ambient Aurora Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] w-[45vw] h-[45vw] max-w-[650px] max-h-[650px] bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-[35%] -right-[15%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-gradient-to-bl from-purple-600/12 via-indigo-600/08 to-transparent rounded-full blur-[150px]" />

        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(129, 140, 248, 0.14) 1.2px, transparent 0),
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px, 64px 64px, 64px 64px",
            maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, #000 70%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, #000 70%, transparent 100%)",
          }}
        />
      </div>

      {/* Top Header */}
      <StudioHeader
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSignatureModal={() => setShowSignatureModal(true)}
        hasSignature={Boolean(instructorSignature)}
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
        <main className={`flex-1 overflow-y-auto min-w-0 bg-slate-950 ${isFullWidthRoute ? "p-0" : "p-4 sm:p-6 lg:p-8"}`}>
          <div className={`${isFullWidthRoute ? "w-full h-full" : "max-w-7xl mx-auto space-y-6"}`}>
            <Outlet
              context={{
                courses,
                students,
                eligibleTopics,
                instructorSignature,
                onOpenSignatureModal: () => setShowSignatureModal(true),
                refreshStudioData: fetchGlobalStudioData,
              }}
            />
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

      {/* Instructor Signature Upload & AI Enhancement Modal */}
      {showSignatureModal && (
        <InstructorSignatureModal
          isOpen={showSignatureModal}
          currentSignature={instructorSignature}
          instructorName={courses[0]?.instructorName || "Course Instructor"}
          onSuccess={(savedSig) => {
            setInstructorSignature(savedSig);
            setShowSignatureModal(false);
            fetchGlobalStudioData();
          }}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {/* Global Realtime Bottom SMS / Appeal Popup */}
      <BottomNotificationPopup />

    </div>
  );
};

export default StudioLayout;