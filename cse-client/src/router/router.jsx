import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import RootLayout from "../components/layout/RootLayout";
import AuthLayout from "../components/layout/AuthLayout";
import Login from "../components/Authentication/Login";
import Register from "../components/Authentication/Register";
import PrivateRoute from "@/components/shared/PrivateRoute";
import RouteErrorBoundary from "@/components/shared/RouteErrorBoundary";
import RouteLoadingFallback from "@/components/shared/RouteLoadingFallback";
import AdminRoute from "@/components/admin/AdminRoute";
import { AdminProvider } from "@/context/AdminContext/AdminContext";

// Immediate load for fast critical landing
import Home from "@/pages/Home/Home";
import NotFound from "@/pages/NotFound/NotFound";
import ComingSoon from "@/pages/ComingSoon/ComingSoon";

// Lazy loading helper
const lazyWithFallback = (importFn) => {
  const LazyComponent = lazy(importFn);
  return function LazyWrapper(props) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

// ── Lazy loaded core features ──
const MyProfile = lazyWithFallback(() => import("@/pages/MyProfile/MyProfile"));
const FindMentors = lazyWithFallback(() => import("@/pages/FindPartners/Mentor/FindMentors"));
const ExpertDetail = lazyWithFallback(() => import("@/pages/FindPartners/Mentor/ExpertDetail"));
const FindPartnersHub = lazyWithFallback(() => import("@/pages/FindPartners/FindPartnersHub"));
const Teams = lazyWithFallback(() => import("@/pages/Teams/Teams"));
const Request = lazyWithFallback(() => import("@/pages/Request/Request"));
const Message = lazyWithFallback(() => import("@/pages/Message/Message"));
const AiAdvisor = lazyWithFallback(() => import("@/pages/AiAdvisor/AiAdvisor"));
const SkillGraphPage = lazyWithFallback(() => import("@/pages/SkillGraph/SkillGraphPage"));

// ── Lazy loaded courses marketplace & certificates ──
const CoursesMarketplace = lazyWithFallback(() => import("@/pages/Courses/CoursesMarketplace"));
const CourseDetail = lazyWithFallback(() => import("@/pages/Courses/CourseDetail"));
const CourseLearningDashboard = lazyWithFallback(() => import("@/pages/Courses/CourseLearningDashboard"));
const MyPurchasesPage = lazyWithFallback(() => import("@/pages/Courses/MyPurchasesPage"));
const VerifyCertificatePage = lazyWithFallback(() => import("@/pages/Certificates/VerifyCertificatePage"));

// ── Lazy loaded Studio workspace ──
const Studio = lazyWithFallback(() => import("@/pages/Studio/Studio"));
const StudioDashboardPage = lazyWithFallback(() => import("@/pages/Studio/StudioDashboardPage"));
const StudioAnalyticsPage = lazyWithFallback(() => import("@/pages/Studio/StudioAnalyticsPage"));
const StudioCoursesPage = lazyWithFallback(() => import("@/pages/Studio/StudioCoursesPage"));
const StudioLessonsPage = lazyWithFallback(() => import("@/pages/Studio/StudioLessonsPage"));
const StudioStudentsPage = lazyWithFallback(() => import("@/pages/Studio/StudioStudentsPage"));
const StudioReviewsPage = lazyWithFallback(() => import("@/pages/Studio/StudioReviewsPage"));
const StudioCouponsPage = lazyWithFallback(() => import("@/pages/Studio/StudioCouponsPage"));
const StudioAuditLogsPage = lazyWithFallback(() => import("@/pages/Studio/StudioAuditLogsPage"));
const StudioAppealsPage = lazyWithFallback(() => import("@/pages/Studio/StudioAppealsPage"));

// ── Lazy loaded Admin control panel ──
const AdminLayout = lazyWithFallback(() => import("@/pages/Admin/AdminLayout"));
const AdminLogin = lazyWithFallback(() => import("@/pages/Admin/AdminLogin"));
const AdminOverview = lazyWithFallback(() => import("@/pages/Admin/AdminOverview"));
const AdminUsers = lazyWithFallback(() => import("@/pages/Admin/AdminUsers"));
const AdminLogins = lazyWithFallback(() => import("@/pages/Admin/AdminLogins"));
const AdminCourses = lazyWithFallback(() => import("@/pages/Admin/AdminCourses"));
const AdminRevenue = lazyWithFallback(() => import("@/pages/Admin/AdminRevenue"));
const AdminBroadcasts = lazyWithFallback(() => import("@/pages/Admin/AdminBroadcasts"));
const AdminAuditLogs = lazyWithFallback(() => import("@/pages/Admin/AdminAuditLogs"));
const AdminSystemHealth = lazyWithFallback(() => import("@/pages/Admin/AdminSystemHealth"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
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
      {
        path: "skill-graph",
        element: <PrivateRoute><SkillGraphPage /></PrivateRoute>,
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
      {
        path: "my-purchases",
        element: <PrivateRoute><MyPurchasesPage /></PrivateRoute>,
      },

      /* ── PUBLIC verifiable certificate authentication routes ── */
      { path: "verify", element: <VerifyCertificatePage /> },
      { path: "verify/:certHash", element: <VerifyCertificatePage /> },

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
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/studio/dashboard" replace /> },
      { path: "dashboard", element: <StudioDashboardPage /> },
      { path: "analytics", element: <StudioAnalyticsPage /> },
      { path: "courses",   element: <StudioCoursesPage /> },
      { path: "lessons",   element: <StudioLessonsPage /> },
      { path: "students",  element: <StudioStudentsPage /> },
      { path: "appeals",   element: <StudioAppealsPage /> },
      { path: "reviews",   element: <StudioReviewsPage /> },
      { path: "coupons",   element: <StudioCouponsPage /> },
      { path: "audit-logs", element: <StudioAuditLogsPage /> },
    ],
  },

  /* ── STANDALONE POST-PURCHASE COURSE CLASSROOM DASHBOARD ── */
  {
    path: "/learn/:id",
    element: (
      <PrivateRoute>
        <CourseLearningDashboard />
      </PrivateRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },

  /* ── Auth pages ── */
  {
    path: "/",
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      { path: "login",         element: <AdminLogin /> },
      { path: "overview",      element: <AdminRoute><AdminOverview /></AdminRoute> },
      { path: "users",         element: <AdminRoute><AdminUsers /></AdminRoute> },
      { path: "logins",        element: <AdminRoute><AdminLogins /></AdminRoute> },
      { path: "courses",       element: <AdminRoute><AdminCourses /></AdminRoute> },
      { path: "revenue",       element: <AdminRoute><AdminRevenue /></AdminRoute> },
      { path: "broadcasts",    element: <AdminRoute><AdminBroadcasts /></AdminRoute> },
      { path: "notifications", element: <Navigate to="/admin/broadcasts" replace /> },
      { path: "audit-logs",    element: <AdminRoute><AdminAuditLogs /></AdminRoute> },
      { path: "system-health", element: <AdminRoute><AdminSystemHealth /></AdminRoute> },
    ],
  },
]);
