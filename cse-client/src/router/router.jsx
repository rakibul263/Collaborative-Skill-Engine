import { createBrowserRouter, Navigate } from "react-router";
import RootLayout from "../components/layout/RootLayout";
import AuthLayout from "../components/layout/AuthLayout";
import Login from "../components/Authentication/Login";
import Register from "../components/Authentication/Register";
import PrivateRoute from "@/components/shared/PrivateRoute";

import Home from "@/pages/Home/Home";
import MyProfile from "@/pages/MyProfile/MyProfile";
import FindMentors from "@/pages/FindPartners/Mentor/FindMentors";
import ExpertDetail from "@/pages/FindPartners/Mentor/ExpertDetail";
import FindPartnersHub from "@/pages/FindPartners/FindPartnersHub";
import Teams from "@/pages/Teams/Teams";
import Request from "@/pages/Request/Request";
import Message from "@/pages/Message/Message";
import AiAdvisor from "@/pages/AiAdvisor/AiAdvisor";
import NotFound from "@/pages/NotFound/NotFound";
import ComingSoon from "@/pages/ComingSoon/ComingSoon";

// Studio Pages & Layouts
import Studio from "@/pages/Studio/Studio";
import StudioDashboardPage from "@/pages/Studio/StudioDashboardPage";
import StudioAnalyticsPage from "@/pages/Studio/StudioAnalyticsPage";
import StudioCoursesPage from "@/pages/Studio/StudioCoursesPage";
import StudioLessonsPage from "@/pages/Studio/StudioLessonsPage";
import StudioStudentsPage from "@/pages/Studio/StudioStudentsPage";
import StudioReviewsPage from "@/pages/Studio/StudioReviewsPage";
import StudioCouponsPage from "@/pages/Studio/StudioCouponsPage";
import StudioAuditLogsPage from "@/pages/Studio/StudioAuditLogsPage";

import CoursesMarketplace from "@/pages/Courses/CoursesMarketplace";
import CourseDetail from "@/pages/Courses/CourseDetail";
import AdminLayout from "@/pages/Admin/AdminLayout";
import AdminLogin from "@/pages/Admin/AdminLogin";
import AdminOverview from "@/pages/Admin/AdminOverview";
import AdminUsers from "@/pages/Admin/AdminUsers";
import AdminCourses from "@/pages/Admin/AdminCourses";
import AdminRevenue from "@/pages/Admin/AdminRevenue";
import AdminNotifications from "@/pages/Admin/AdminNotifications";
import AdminRoute from "@/components/admin/AdminRoute";
import { AdminProvider } from "@/context/AdminContext/AdminContext";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [

      /* ── PUBLIC routes ── */
      { index: true, element: <Home /> },
      { path: "find-partners", element: <FindPartnersHub /> },
      {
        path: "experts",
        element: <PrivateRoute><FindMentors /></PrivateRoute>,
      },
      {
        path: "experts/:id",
        element: <PrivateRoute><ExpertDetail /></PrivateRoute>,
      },
      {
        path: "teams",
        element: <PrivateRoute><Teams /></PrivateRoute>,
      },

      /* ── PRIVATE routes ── */
      {
        path: "profile",
        element: <PrivateRoute><MyProfile /></PrivateRoute>,
      },
      {
        path: "requests",
        element: <PrivateRoute><Request /></PrivateRoute>,
      },
      {
        path: "message",
        element: <PrivateRoute><Message /></PrivateRoute>,
      },
      {
        path: "ai-advisor",
        element: <PrivateRoute><AiAdvisor /></PrivateRoute>,
      },

      /* ── PUBLIC courses routes ── */
      { path: "courses", element: <CoursesMarketplace /> },
      { path: "courses/:id", element: <CourseDetail /> },

      { path: "coming-soon", element: <ComingSoon /> },

      /* ── Legacy /dashboard redirect → /studio/dashboard ── */
      {
        path: "dashboard",
        element: <Navigate to="/studio/dashboard" replace />,
      },

      /* ── 404 catch-all ── */
      { path: "*", element: <NotFound /> },
    ],
  },

  /* ── STANDALONE STUDIO CREATOR WORKSPACE (NO PUBLIC NAVBAR / FOOTER) ── */
  {
    path: "/studio",
    element: (
      <PrivateRoute>
        <Studio />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/studio/dashboard" replace /> },
      { path: "dashboard", element: <StudioDashboardPage /> },
      { path: "analytics", element: <StudioAnalyticsPage /> },
      { path: "courses",   element: <StudioCoursesPage /> },
      { path: "lessons",   element: <StudioLessonsPage /> },
      { path: "students",  element: <StudioStudentsPage /> },
      { path: "reviews",   element: <StudioReviewsPage /> },
      { path: "coupons",   element: <StudioCouponsPage /> },
      { path: "audit-logs", element: <StudioAuditLogsPage /> },
    ],
  },

  /* ── Auth pages ── */
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "login",    element: <Login /> },
      { path: "register", element: <Register /> },
    ],
  },

  /* ── Admin Panel ── */
  {
    path: "/admin",
    element: (
      <AdminProvider>
        <AdminLayout />
      </AdminProvider>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      { path: "login",         element: <AdminLogin /> },
      { path: "overview",      element: <AdminRoute><AdminOverview /></AdminRoute> },
      { path: "users",         element: <AdminRoute><AdminUsers /></AdminRoute> },
      { path: "courses",       element: <AdminRoute><AdminCourses /></AdminRoute> },
      { path: "revenue",       element: <AdminRoute><AdminRevenue /></AdminRoute> },
      { path: "notifications", element: <AdminRoute><AdminNotifications /></AdminRoute> },
    ],
  },
]);
