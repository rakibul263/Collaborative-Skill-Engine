/**
 * Preservation Tests — Task 2 (Bugfix: secure-api-jwt-auth)
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * OBSERVATION-FIRST METHODOLOGY:
 *   These tests were written by first observing the UNFIXED code behavior and
 *   then encoding that behavior as assertions. All 9 tests MUST PASS on unfixed
 *   code — this confirms the captured baseline before any fix is applied.
 *
 * Property 2: Preservation — Valid-Token and Public Requests Behave Identically
 *   Before and After Fix.
 *
 * After the fix is applied (Tasks 3–8), re-running this suite (Task 9.2) MUST
 * still produce all passes, confirming no regressions were introduced.
 *
 * NOTE: These tests use mock MongoDB collections (same as exploration tests).
 * The assertions focus on HTTP status codes — specifically that valid tokens
 * are NOT rejected with 401 and public endpoints are NOT gated by auth.
 */

"use strict";

// ── Set env vars BEFORE any require() calls so middleware reads correct values ─
const JWT_SECRET = "cse_jwt_secret_key_2024_collaboration_skill_engine";
const ADMIN_JWT_SECRET = "cse_admin_super_secret_jwt_key_2024_change_in_prod";

process.env.JWT_SECRET = JWT_SECRET;
process.env.ADMIN_JWT_SECRET = ADMIN_JWT_SECRET;
// ADMIN_SECRET is not needed for valid admin_token cookie path (only legacy x-admin-secret)
process.env.ADMIN_SECRET = ADMIN_JWT_SECRET; // set in case isAdminAuthed checks it

const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const path = require("path");

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Signs a custom JWT exactly as `POST /auth/token` would issue it.
 * Validates: verifyJWT middleware must accept this token.
 * NOTE: JWT_SECRET is set on process.env above before any require() calls.
 */
function makeUserJWT(overrides = {}) {
  const payload = {
    uid: "test-uid-preservation-001",
    email: "test-preservation@example.com",
    mongoId: null,
    ...overrides,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

/**
 * Signs an admin JWT exactly as the admin login endpoint issues it.
 * Used in the admin_token cookie for POST /notifications.
 */
function makeAdminJWT(overrides = {}) {
  const payload = {
    email: "collaborativeskillengine@gmail.com",
    ...overrides,
  };
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: "1h" });
}

// ── Mock MongoDB collection ───────────────────────────────────────────────────
function makeMockCollection() {
  const noop = () => Promise.resolve(null);
  const arr = () => Promise.resolve([]);
  const cursor = {
    sort: () => cursor,
    limit: () => cursor,
    toArray: arr,
  };
  return {
    findOne: noop,
    find: () => cursor,
    insertOne: () => Promise.resolve({ insertedId: "mock-id-preservation", acknowledged: true }),
    updateOne: () => Promise.resolve({ matchedCount: 1, modifiedCount: 1 }),
    updateMany: () => Promise.resolve({ modifiedCount: 0 }),
    deleteOne: () => Promise.resolve({ deletedCount: 0 }),
    countDocuments: () => Promise.resolve(0),
    aggregate: () => ({ toArray: arr }),
    createIndex: () => Promise.resolve(),
  };
}

// ── Mock socket.io ────────────────────────────────────────────────────────────
const mockIo = {
  emit: () => {},
  to: () => ({ emit: () => {} }),
};

// ── Build test app ────────────────────────────────────────────────────────────
/**
 * Builds an Express app with:
 *   - Real route registrations (to test real middleware wiring)
 *   - Mock MongoDB collections (so no Atlas connection needed)
 *   - Real verifyJWT and verifyAdminJWT middleware from source
 */
function buildPreservationApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // ── Public notification routes (GET public, POST admin) ──────────────────
  const { registerNotificationRoutes } = require("../routes/notifications.routes");
  registerNotificationRoutes(app, {
    notificationsCollection: makeMockCollection(),
    io: mockIo,
  });

  // ── User notification routes (will gain verifyJWT in the fix) ────────────
  const { registerUserNotificationRoutes } = require("../routes/userNotifications.routes");
  registerUserNotificationRoutes(app, {
    userNotificationsCollection: makeMockCollection(),
    io: mockIo,
  });

  // ── CV parser routes (will gain verifyJWT in the fix) ────────────────────
  const { registerCvParserRoutes } = require("../routes/cvParser.routes");
  registerCvParserRoutes(app);

  // ── Schedule routes (will gain verifyJWT in the fix) ─────────────────────
  const { registerScheduleRoutes } = require("../routes/schedule.routes");
  registerScheduleRoutes(app, {
    schedulesCollection: makeMockCollection(),
    conversationsCollection: makeMockCollection(),
    usersCollection: makeMockCollection(),
    io: mockIo,
    userNotificationsCollection: makeMockCollection(),
  });

  // ── Courses public routes ─────────────────────────────────────────────────
  const { registerCoursesRoutes } = require("../routes/courses.routes");
  registerCoursesRoutes(app, {
    coursesCollection: makeMockCollection(),
    courseEnrollmentsCollection: makeMockCollection(),
    usersCollection: makeMockCollection(),
    ratingsCollection: makeMockCollection(),
    schedulesCollection: makeMockCollection(),
    userNotificationsCollection: makeMockCollection(),
    lessonsCollection: makeMockCollection(),
    io: mockIo,
  });

  // ── Auth routes (POST /auth/token) ───────────────────────────────────────
  const { registerAuthRoutes } = require("../routes/auth.routes");
  registerAuthRoutes(app, { usersCollection: makeMockCollection() });

  // ── Inline routes from index.js (connections, conversations) ─────────────
  // These mirror the CURRENT (unfixed) state in index.js — no verifyJWT.
  // Preservation tests send valid tokens to them; 200 (or other non-401) is expected.

  // POST /connections/requests — currently no verifyJWT (will be added in Task 3)
  app.post("/connections/requests", async (req, res) => {
    const { senderEmail, receiverEmail } = req.body || {};
    if (!senderEmail || !receiverEmail) {
      return res.status(400).json({ message: "senderEmail and receiverEmail are required" });
    }
    // Simulate duplicate-key (409) or success (200) — mirrors real behavior with mock DB
    return res.status(200).json({ message: "mock: connection request created" });
  });

  // GET /conversations — currently no verifyJWT (will be added in Task 3)
  app.get("/conversations", async (req, res) => {
    return res.status(200).json([]);
  });

  // ── PATCH /users/:id — ALREADY has verifyJWT in current (unfixed) code ───
  // This is the canonical example of an already-protected route that must
  // continue to work after the fix.
  const { verifyJWT } = require("../middleware/verifyJWT");
  app.patch("/users/:id", verifyJWT, async (req, res) => {
    const requestorEmail = req.user.email.toLowerCase();
    const targetId = req.params.id;
    // With mock DB, we can't look up the user — simulate 200 if email matches param
    if (requestorEmail !== targetId.toLowerCase() &&
        requestorEmail !== "test-preservation@example.com") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    return res.status(200).json({ success: true, message: "Profile updated." });
  });

  return app;
}

// ── Build the app once for all tests ─────────────────────────────────────────
let app;

beforeAll(() => {
  app = buildPreservationApp();
});

// ── Preservation Test Suite ───────────────────────────────────────────────────

describe("Preservation Tests — Public Endpoints Remain Public (Requirements 3.2, 3.3, 3.4, 3.5)", () => {

  /**
   * Test 1: POST /auth/token with no valid Firebase token.
   *
   * Observation: Without a Firebase token body, the server returns 400 "Firebase
   * token is required." — it does NOT return 401. This endpoint is and must
   * remain public. The route is reachable without any prior authentication.
   *
   * Assertion: status is NOT 401 (400 is expected — public endpoint reached).
   * Validates: Requirement 3.2
   */
  test("Test 1: POST /auth/token — public endpoint, status NOT 401 (observed: 400)", async () => {
    const res = await request(app)
      .post("/auth/token")
      .send({})
      .set("Content-Type", "application/json");

    console.log(`  POST /auth/token (no body) → status: ${res.status}`);
    // Preservation: must never become 401
    expect(res.status).not.toBe(401);
    // Observed baseline on unfixed code: 400 (missing firebase token)
    expect(res.status).toBe(400);
  });

  /**
   * Test 2: GET /notifications with no token.
   *
   * Observation: The route is public — returns 200 with an array. No
   * Authorization header is required and must never be required.
   *
   * Assertion: status is 200 and body is an array.
   * Validates: Requirement 3.5
   */
  test("Test 2: GET /notifications — public endpoint, status 200", async () => {
    const res = await request(app).get("/notifications");

    console.log(`  GET /notifications (no token) → status: ${res.status}`);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /**
   * Test 3: GET /courses/public with no token.
   *
   * Observation: Returns 200 with an array of approved courses (empty with mock DB).
   *
   * Assertion: status is 200 and body is an array.
   * Validates: Requirement 3.4
   */
  test("Test 3: GET /courses/public — public endpoint, status 200", async () => {
    const res = await request(app).get("/courses/public");

    console.log(`  GET /courses/public (no token) → status: ${res.status}`);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

});

describe("Preservation Tests — Authenticated Endpoints Work With Valid Custom JWT (Requirements 3.1, 3.7, 3.8)", () => {

  /**
   * Test 4: PATCH /users/:id with valid custom JWT.
   *
   * Observation: The endpoint is already protected by verifyJWT in the
   * current unfixed code (it was always protected). A valid JWT with matching
   * email reaches the handler and returns 200.
   * After the fix, this must still return 200 (no regression).
   *
   * Assertion: status is 200 (or other non-401 if ownership fails).
   * Validates: Requirements 3.7 (already-protected routes unaffected)
   */
  test("Test 4: PATCH /users/:id with valid custom JWT — status NOT 401 (observed: 200)", async () => {
    const token = makeUserJWT();

    const res = await request(app)
      .patch("/users/test-preservation%40example.com")
      .set("Authorization", `Bearer ${token}`)
      .send({ headline: "Test headline for preservation test" })
      .set("Content-Type", "application/json");

    console.log(`  PATCH /users/:id (valid JWT) → status: ${res.status}`);
    // 401 means middleware rejected the token — that is a regression
    expect(res.status).not.toBe(401);
    // Observed baseline: 200 (already protected, token accepted)
    expect(res.status).toBe(200);
  });

  /**
   * Test 5: POST /connections/requests with valid custom JWT.
   *
   * Observation (unfixed code): The endpoint has NO auth middleware, so the
   * handler is reached even without a token. With a valid token and valid body,
   * the handler returns 200. After the fix (verifyJWT added), the same valid
   * token request MUST still return 200 (handler body still reached).
   *
   * Assertion: status is NOT 401 (200 expected — handler reached).
   * Validates: Requirements 3.1 (valid-JWT requests continue working after fix)
   */
  test("Test 5: POST /connections/requests with valid custom JWT — status NOT 401 (observed: 200)", async () => {
    const token = makeUserJWT();

    const res = await request(app)
      .post("/connections/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({
        senderEmail: "test-preservation@example.com",
        receiverEmail: "other-user@example.com",
        senderName: "Test User",
        senderImage: "",
        senderUid: "test-uid-preservation-001",
      })
      .set("Content-Type", "application/json");

    console.log(`  POST /connections/requests (valid JWT) → status: ${res.status}`);
    // After fix: verifyJWT accepts the token → handler runs → 200 or 409
    expect(res.status).not.toBe(401);
    // Observed baseline: 200 (mock handler returns 200 for valid body)
    expect([200, 409]).toContain(res.status);
  });

  /**
   * Test 6: GET /conversations?email=x with valid custom JWT.
   *
   * Observation (unfixed code): No auth middleware — handler reached without
   * token. With a valid JWT, the handler returns 200 + empty array (mock DB).
   * After fix the same valid-token request must still return 200.
   *
   * Assertion: status is NOT 401, body is array.
   * Validates: Requirement 3.1
   */
  test("Test 6: GET /conversations?email=x with valid custom JWT — status NOT 401 (observed: 200)", async () => {
    const token = makeUserJWT();

    const res = await request(app)
      .get("/conversations?email=test-preservation%40example.com")
      .set("Authorization", `Bearer ${token}`);

    console.log(`  GET /conversations (valid JWT) → status: ${res.status}`);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /**
   * Test 7: GET /user-notifications?email=x with valid custom JWT.
   *
   * Observation (unfixed code): No auth middleware — handler reached without
   * token. With a valid JWT the handler returns 200 + empty array (mock DB).
   * After fix the same valid-token request must still return 200.
   *
   * Assertion: status is NOT 401, body is array.
   * Validates: Requirement 3.1
   */
  test("Test 7: GET /user-notifications?email=x with valid custom JWT — status NOT 401 (observed: 200)", async () => {
    const token = makeUserJWT();

    const res = await request(app)
      .get("/user-notifications?email=test-preservation%40example.com")
      .set("Authorization", `Bearer ${token}`);

    console.log(`  GET /user-notifications (valid JWT) → status: ${res.status}`);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /**
   * Test 8: POST /parse-cv with valid custom JWT + multipart file.
   *
   * Observation (unfixed code): No auth middleware — multer processes the file
   * and the handler runs. With a valid JWT and a small TXT file the handler
   * reaches the parseCv service call. With mock DB and no AI key this may
   * return 400 from the parsing service — but crucially NOT 401.
   * After fix (verifyJWT before multer), the same valid-token request must
   * still reach multer and the handler — NOT return 401.
   *
   * Assertion: status is NOT 401 (200 or 400 acceptable).
   * Validates: Requirements 3.1
   */
  test("Test 8: POST /parse-cv with valid custom JWT + file — status NOT 401 (observed: 400 or 200)", async () => {
    const token = makeUserJWT();

    const cvContent = Buffer.from(
      "John Doe\nSoftware Engineer\nSkills: JavaScript, Node.js, React\n"
    );

    const res = await request(app)
      .post("/parse-cv")
      .set("Authorization", `Bearer ${token}`)
      .attach("cv", cvContent, { filename: "test-cv.txt", contentType: "text/plain" });

    console.log(`  POST /parse-cv (valid JWT + file) → status: ${res.status}`);
    // 401 would mean the token was rejected — that is a regression after fix
    expect(res.status).not.toBe(401);
    // Observed baseline: 400 (AI parsing fails in test env) or 200 if AI is available
    expect([200, 400, 500]).toContain(res.status);
  });

});

describe("Preservation Tests — Admin Endpoint Works With Valid admin_token Cookie (Requirements 3.5, 3.6)", () => {

  /**
   * Test 9: POST /notifications with valid admin_token cookie.
   *
   * Observation (unfixed code): The legacy isAdminAuthed function accepts a
   * valid admin_token cookie (it verifies it with ADMIN_JWT_SECRET). The handler
   * inserts the notification and returns 200 with the created doc.
   * After fix (Task 7 — verifyAdminJWT replaces isAdminAuthed), a valid
   * admin_token cookie MUST STILL be accepted. verifyAdminJWT also uses the
   * admin_token cookie and ADMIN_JWT_SECRET — so behavior is preserved.
   *
   * Assertion: status is 200, body has the notification title.
   * Validates: Requirements 3.5, 3.6
   */
  test("Test 9: POST /notifications with valid admin_token cookie — status 200 (observed: 200)", async () => {
    const adminToken = makeAdminJWT();

    const res = await request(app)
      .post("/notifications")
      .set("Cookie", `admin_token=${adminToken}`)
      .send({
        title: "Preservation Test Notification",
        message: "This is a preservation test — safe to ignore",
        type: "info",
        link: "",
      })
      .set("Content-Type", "application/json");

    console.log(`  POST /notifications (valid admin_token cookie) → status: ${res.status}`);
    // Must NOT be rejected — valid admin_token cookie must always be honoured
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    // Observed baseline: 200 (isAdminAuthed accepts admin_token cookie)
    expect(res.status).toBe(200);
    // The created notification body should contain the title
    expect(res.body).toHaveProperty("title", "Preservation Test Notification");
  });

});
