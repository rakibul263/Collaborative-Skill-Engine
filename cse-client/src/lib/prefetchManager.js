import apiClient from "./apiClient";
import { getCachedData } from "./fastCache";

const prefetchedChunks = new Set();
let publicBaselineDone = false;
let lastAuthPrefetchEmail = "";

const chunkImporters = {
  "/courses": () => import("@/pages/Courses/CoursesMarketplace"),
  "/find-partners": () => import("@/pages/FindPartners/FindPartnersHub"),
  "/experts": () => import("@/pages/FindPartners/Mentor/FindMentors"),
  "/teams": () => import("@/pages/Teams/Teams"),
  "/skill-graph": () => import("@/pages/SkillGraph/SkillGraphPage"),
  "/message": () => import("@/pages/Message/Message"),
  "/requests": () => import("@/pages/Request/Request"),
  "/profile": () => import("@/pages/MyProfile/MyProfile"),
  "/my-purchases": () => import("@/pages/Courses/MyPurchasesPage"),
  "/ai-advisor": () => import("@/pages/AiAdvisor/AiAdvisor"),
  "/studio": () => import("@/pages/Studio/Studio"),
  "/studio/dashboard": () => import("@/pages/Studio/StudioDashboardPage"),
  "/studio/analytics": () => import("@/pages/Studio/StudioAnalyticsPage"),
  "/studio/courses": () => import("@/pages/Studio/StudioCoursesPage"),
  "/studio/lessons": () => import("@/pages/Studio/StudioLessonsPage"),
  "/studio/students": () => import("@/pages/Studio/StudioStudentsPage"),
  "/studio/appeals": () => import("@/pages/Studio/StudioAppealsPage"),
  "/studio/reviews": () => import("@/pages/Studio/StudioReviewsPage"),
  "/studio/coupons": () => import("@/pages/Studio/StudioCouponsPage"),
  "/studio/audit-logs": () => import("@/pages/Studio/StudioAuditLogsPage"),
};

const preloadChunk = (key) => {
  if (!key || prefetchedChunks.has(key)) return;
  const loader = chunkImporters[key];
  if (!loader) return;
  prefetchedChunks.add(key);
  loader().catch(() => {
    prefetchedChunks.delete(key);
  });
};

const quietGet = (url, freshMs = 45_000) => {
  if (getCachedData(url, freshMs)) return Promise.resolve();
  return apiClient.get(url, { timeout: 30000, freshMs }).catch(() => {});
};

/**
 * Prefetches both the lazy JS route chunk AND key API endpoints on hover/focus.
 */
export const prefetchRoute = (rawPath, userEmail = "") => {
  if (typeof window === "undefined" || !rawPath) return;
  const path = String(rawPath).split("?")[0];
  const email = userEmail ? String(userEmail).trim() : "";

  if (path.startsWith("/courses/") && path !== "/courses/my-purchases") {
    const id = path.split("/")[2];
    if (id && !prefetchedChunks.has("/courses/:id")) {
      prefetchedChunks.add("/courses/:id");
      import("@/pages/Courses/CourseDetail").catch(() => prefetchedChunks.delete("/courses/:id"));
    }
    if (id) {
      void quietGet(`/courses/public/${id}`, 45_000);
      void quietGet(`/courses/public/${id}/lessons`, 45_000);
      if (email) void quietGet(`/courses/${id}/enrollment`, 30_000);
    }
    return;
  }

  if (path.startsWith("/learn/")) {
    const id = path.split("/")[2];
    if (!prefetchedChunks.has("/learn/:id")) {
      prefetchedChunks.add("/learn/:id");
      import("@/pages/Courses/CourseLearningDashboard").catch(() =>
        prefetchedChunks.delete("/learn/:id")
      );
    }
    if (id) {
      void quietGet(`/courses/public/${id}`, 45_000);
      void quietGet(`/courses/public/${id}/lessons`, 45_000);
      if (email) void quietGet(`/courses/${id}/enrollment`, 30_000);
    }
    return;
  }

  if (path.startsWith("/experts/") && path.length > "/experts/".length) {
    const id = path.split("/")[2];
    if (!prefetchedChunks.has("/experts/:id")) {
      prefetchedChunks.add("/experts/:id");
      import("@/pages/FindPartners/Mentor/ExpertDetail").catch(() =>
        prefetchedChunks.delete("/experts/:id")
      );
    }
    if (id) {
      const q = email ? `?viewerEmail=${encodeURIComponent(email)}` : "";
      void quietGet(`/experts/${id}${q}`, 45_000);
    }
    return;
  }

  if (path.startsWith("/studio")) {
    preloadChunk("/studio");
    preloadChunk(path === "/studio" ? "/studio/dashboard" : path);
    if (email) {
      void quietGet("/studio/access-status", 30_000);
      if (path === "/studio" || path === "/studio/dashboard") {
        void quietGet("/studio/analytics", 30_000);
        void quietGet("/courses/mine", 30_000);
      } else if (path === "/studio/analytics") {
        void quietGet("/studio/analytics", 30_000);
      } else if (path === "/studio/courses" || path === "/studio/lessons") {
        void quietGet("/courses/mine", 30_000);
      } else if (path === "/studio/students") {
        void quietGet("/studio/students?search=&status=all", 30_000);
      } else if (path === "/studio/appeals") {
        void quietGet("/studio/appeals", 30_000);
      } else if (path === "/studio/reviews") {
        void quietGet("/studio/reviews", 30_000);
      } else if (path === "/studio/coupons") {
        void quietGet("/studio/coupons", 30_000);
      } else if (path === "/studio/audit-logs") {
        void quietGet("/studio/audit-logs", 30_000);
      }
    }
    return;
  }

  preloadChunk(path);

  if (path === "/") {
    void quietGet("/platform-stats", 60_000);
  } else if (path === "/courses") {
    void quietGet("/courses/public", 60_000);
    if (email) {
      void quietGet("/courses/eligibility", 30_000);
      void quietGet("/courses/my-enrollments", 30_000);
    }
  } else if (path === "/find-partners") {
    void quietGet("/platform-stats", 60_000);
    if (email) void quietGet(`/find-mentors?email=${encodeURIComponent(email)}`, 60_000);
  } else if (path === "/experts" && email) {
    void quietGet(`/find-mentors?email=${encodeURIComponent(email)}`, 60_000);
  } else if (path === "/teams" && email) {
    void quietGet(`/api/teams/my-squads?email=${encodeURIComponent(email)}`, 30_000);
  } else if (path === "/message" && email) {
    void quietGet(`/conversations?email=${encodeURIComponent(email)}`, 15_000);
  } else if (path === "/requests" && email) {
    void quietGet(`/connections/requests/incoming?email=${encodeURIComponent(email)}`, 15_000);
  } else if (path === "/profile" && email) {
    void quietGet(`/users?email=${encodeURIComponent(email)}`, 30_000);
    void quietGet(`/ratings/summary?targetEmail=${encodeURIComponent(email)}`, 45_000);
    void quietGet("/courses/public", 60_000);
    void quietGet("/courses/my-enrollments", 30_000);
  } else if (path === "/my-purchases" && email) {
    void quietGet("/courses/my-purchases", 30_000);
  }
};

/**
 * Quietly warms critical public chunks and catalog APIs after initial paint.
 */
export const prefetchPublicBaseline = () => {
  if (typeof window === "undefined" || publicBaselineDone) return;
  publicBaselineDone = true;

  const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 250));
  schedule(() => {
    void quietGet("/platform-stats", 60_000);
    void quietGet("/courses/public", 60_000);
    void quietGet("/notifications", 60_000);
    preloadChunk("/courses");
    preloadChunk("/find-partners");
  });
};

/**
 * Quietly warms authenticated routes once Firebase user settles.
 */
export const prefetchAuthenticatedBaseline = (email, canCreateCourse = false) => {
  if (typeof window === "undefined" || !email) return;
  const cleanEmail = String(email).trim();
  const lower = cleanEmail.toLowerCase();
  if (lastAuthPrefetchEmail === lower) return;
  lastAuthPrefetchEmail = lower;

  const run = () => {
    void Promise.allSettled([
      quietGet("/courses/eligibility", 45_000),
      quietGet("/courses/my-enrollments", 45_000),
      quietGet(`/find-mentors?email=${encodeURIComponent(cleanEmail)}`, 60_000),
      quietGet(`/conversations?email=${encodeURIComponent(cleanEmail)}`, 20_000),
      quietGet(`/connections/requests/incoming?email=${encodeURIComponent(cleanEmail)}`, 20_000),
      quietGet(`/api/teams/my-squads?email=${encodeURIComponent(cleanEmail)}`, 30_000),
      canCreateCourse ? quietGet("/studio/access-status", 45_000) : Promise.resolve(),
      canCreateCourse ? quietGet("/studio/analytics", 30_000) : Promise.resolve(),
      canCreateCourse ? quietGet("/courses/mine", 30_000) : Promise.resolve(),
    ]);

    preloadChunk("/experts");
    preloadChunk("/message");
    preloadChunk("/requests");
    preloadChunk("/profile");
    preloadChunk("/teams");
    if (canCreateCourse) {
      preloadChunk("/studio");
      preloadChunk("/studio/dashboard");
      preloadChunk("/studio/courses");
    }
  };

  const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 350));
  schedule(run);
};
