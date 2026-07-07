/**
 * Bug Condition Exploration Tests — Task 9.1 (Re-run against FIXED code)
 *
 * Property 1: Expected Behavior — Unauthenticated Requests Rejected With HTTP 401
 *
 * After the fix (Tasks 3–8), these tests now assert the CORRECT post-fix behavior:
 *   - Tests 1–15: Unauthenticated requests MUST get HTTP 401 (verifyJWT/verifyAdminJWT now wired)
 *   - Tests 16–17: Requests with a valid custom JWT to /ai-advisor MUST NOT get HTTP 401
 *                  (verifyJWT now accepts custom JWTs — correct middleware confirmed)
 *
 * Validates: Requirements 2.1–2.19
 */

"use strict";

// ── Set env vars BEFORE any require() calls so middleware reads correct values ─
const JWT_SECRET = "cse_jwt_secret_key_2024_collaboration_skill_engine";
const ADMIN_JWT_SECRET = "cse_admin_super_secret_jwt_key_2024_change_in_prod";

process.env.JWT_SECRET = JWT_SECRET;
process.env.ADMIN_JWT_SECRET = ADMIN_JWT_SECRET;
process.env.ADMIN_SECRET = ADMIN_JWT_SECRET; // for legacy isAdminAuthed used by DELETE /notifications/:id

const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

// ── Generate a valid custom JWT (same format as verifyJWT expects) ──────────
function makeValidCustomJWT() {
  return jwt.sign(
    { uid: "test-uid-123", email: "testuser@example.com", mongoId: null },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// ── Mock MongoDB collection that never throws (returns empty/null results) ──
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
    insertOne: () => Promise.resolve({ insertedId: "mock-id", acknowledged: true }),
    updateOne: () => Promise.resolve({ matchedCount: 1, modifiedCount: 1 }),
    updateMany: () => Promise.resolve({ modifiedCount: 0 }),
    deleteOne: () => Promise.resolve({ deletedCount: 0 }),
    countDocuments: () => Promise.resolve(0),
    aggregate: () => ({ toArray: arr }),
    createIndex: () => Promise.resolve(),
  };
}

// ── Mock socket.io instance ──────────────────────────────────────────────────
const mockIo = {
  emit: () => {},
  to: () => ({ emit: () => {} }),
};

// ── Build the test Express app ───────────────────────────────────────────────
// We register routes using the REAL route modules (which now have verifyJWT wired in
// after the fix). For inline routes (connections, conversations, ratings — defined
// inside run() in index.js), we re-register them here with verifyJWT applied,
// mirroring the fixed production code.
function buildTestApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // ── Import verifyJWT after env vars are set ──────────────────────────────
  const { verifyJWT } = require("../middleware/verifyJWT");

  // Register notification routes (POST /notifications now uses verifyAdminJWT — fixed)
  const { registerNotificationRoutes } = require("../routes/notifications.routes");
  registerNotificationRoutes(app, {
    notificationsCollection: makeMockCollection(),
    io: mockIo,
  });

  // Register user-notification routes (GET/PATCH /user-notifications now have verifyJWT — fixed)
  const { registerUserNotificationRoutes } = require("../routes/userNotifications.routes");
  registerUserNotificationRoutes(app, {
    userNotificationsCollection: makeMockCollection(),
    io: mockIo,
  });

  // Register CV parser routes (POST /parse-cv routes now have verifyJWT — fixed)
  const { registerCvParserRoutes } = require("../routes/cvParser.routes");
  registerCvParserRoutes(app);

  // Register AI Advisor routes (now use verifyJWT instead of verifyFirebaseToken — fixed)
  const { registerAiAdvisorRoutes } = require("../routes/aiAdvisor.routes");
  registerAiAdvisorRoutes(app, {
    usersCollection: makeMockCollection(),
    conversationsCollection: makeMockCollection(),
    messagesCollection: makeMockCollection(),
    aiAdvisorSessionsCollection: makeMockCollection(),
  });

  // ── Inline routes from index.js (connections, conversations, ratings) ────
  // These mirror the FIXED state in index.js — verifyJWT is now the second argument.
  // Unauthenticated requests MUST return 401; authenticated requests reach the handler.

  // POST /connections/requests — FIXED: verifyJWT added
  app.post("/connections/requests", verifyJWT, async (req, res) => {
    const { senderEmail, receiverEmail } = req.body;
    if (!senderEmail || !receiverEmail) {
      return res.status(400).send({ message: "senderEmail and receiverEmail are required" });
    }
    return res.status(200).send({ message: "mock: handler reached" });
  });

  // DELETE /connections/requests/cancel — FIXED: verifyJWT added
  app.delete("/connections/requests/cancel", verifyJWT, async (req, res) => {
    return res.status(200).send({ message: "mock: handler reached" });
  });

  // PATCH /connections/requests/respond — FIXED: verifyJWT added
  app.patch("/connections/requests/respond", verifyJWT, async (req, res) => {
    return res.status(200).send({ message: "mock: handler reached" });
  });

  // GET /connections/requests/incoming — FIXED: verifyJWT added
  app.get("/connections/requests/incoming", verifyJWT, async (req, res) => {
    return res.status(200).send([]);
  });

  // POST /conversations/open — FIXED: verifyJWT added
  app.post("/conversations/open", verifyJWT, async (req, res) => {
    return res.status(200).send({ message: "mock: handler reached" });
  });

  // GET /conversations — FIXED: verifyJWT added
  app.get("/conversations", verifyJWT, async (req, res) => {
    return res.status(200).send([]);
  });

  // GET /conversations/:id/messages — FIXED: verifyJWT added
  app.get("/conversations/:id/messages", verifyJWT, async (req, res) => {
    return res.status(200).send([]);
  });

  // PATCH /conversations/:id/seen — FIXED: verifyJWT added
  app.patch("/conversations/:id/seen", verifyJWT, async (req, res) => {
    return res.status(200).send({ message: "mock: handler reached" });
  });

  // POST /ratings — FIXED: verifyJWT added
  app.post("/ratings", verifyJWT, async (req, res) => {
    return res.status(200).send({ message: "mock: handler reached" });
  });

  return app;
}

// ── Build the app once for all tests ────────────────────────────────────────
let app;

beforeAll(() => {
  app = buildTestApp();
});

// ── TESTS 1–14: Unauthenticated requests to now-protected routes ─────────────
// EXPECTED (post-fix): server returns 401 (verifyJWT rejects unauthenticated requests)

describe("Fix Verified: Unauthenticated requests are rejected with HTTP 401", () => {

  // Test 1: POST /connections/requests
  test("1. POST /connections/requests with no token → status IS 401 (fix verified)", async () => {
    const res = await request(app)
      .post("/connections/requests")
      .send({ senderEmail: "a@x.com", receiverEmail: "b@x.com" });
    // After fix: verifyJWT rejects unauthenticated request with 401
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 2: DELETE /connections/requests/cancel
  test("2. DELETE /connections/requests/cancel with no token → status IS 401", async () => {
    const res = await request(app)
      .delete("/connections/requests/cancel")
      .send({ senderEmail: "a@x.com", receiverEmail: "b@x.com" });
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 3: PATCH /connections/requests/respond
  test("3. PATCH /connections/requests/respond with no token → status IS 401", async () => {
    const res = await request(app)
      .patch("/connections/requests/respond")
      .send({ senderEmail: "a@x.com", receiverEmail: "b@x.com", action: "accept", responderEmail: "b@x.com" });
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 4: GET /connections/requests/incoming
  test("4. GET /connections/requests/incoming?email=x with no token → status IS 401", async () => {
    const res = await request(app)
      .get("/connections/requests/incoming?email=victim@x.com");
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 5: POST /conversations/open
  test("5. POST /conversations/open with no token → status IS 401", async () => {
    const res = await request(app)
      .post("/conversations/open")
      .send({ requesterEmail: "a@x.com", peerEmail: "b@x.com" });
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 6: GET /conversations
  test("6. GET /conversations?email=x with no token → status IS 401", async () => {
    const res = await request(app)
      .get("/conversations?email=victim@x.com");
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 7: GET /conversations/:id/messages
  test("7. GET /conversations/fake-id/messages with no token → status IS 401", async () => {
    const res = await request(app)
      .get("/conversations/fake-id/messages?requesterEmail=a@x.com");
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 8: PATCH /conversations/:id/seen
  test("8. PATCH /conversations/fake-id/seen with no token → status IS 401", async () => {
    const res = await request(app)
      .patch("/conversations/fake-id/seen")
      .send({ viewerEmail: "a@x.com" });
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 9: POST /ratings
  test("9. POST /ratings with no token → status IS 401", async () => {
    const res = await request(app)
      .post("/ratings")
      .send({ reviewerEmail: "a@x.com", targetEmail: "b@x.com", rating: 5 });
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 10: GET /user-notifications
  test("10. GET /user-notifications?email=x with no token → status IS 401", async () => {
    const res = await request(app)
      .get("/user-notifications?email=victim@x.com");
    console.log(`  Actual status: ${res.status}, body: ${JSON.stringify(res.body)}`);
    // After fix: verifyJWT rejects unauthenticated request with 401
    expect(res.status).toBe(401);
  });

  // Test 11: PATCH /user-notifications/read
  test("11. PATCH /user-notifications/read with no token → status IS 401", async () => {
    const res = await request(app)
      .patch("/user-notifications/read")
      .send({ email: "victim@x.com" });
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 12: PATCH /user-notifications/:id/read
  test("12. PATCH /user-notifications/fake-id/read with no token → status IS 401", async () => {
    const res = await request(app)
      .patch("/user-notifications/507f1f77bcf86cd799439011/read");
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 13: POST /parse-cv
  test("13. POST /parse-cv with no token → status IS 401 (verifyJWT rejects before multer runs)", async () => {
    const res = await request(app)
      .post("/parse-cv")
      .attach("cv", Buffer.from("fake cv content"), { filename: "resume.txt", contentType: "text/plain" });
    // After fix: verifyJWT intercepts before multer processes the file
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });

  // Test 14: POST /parse-cv/suggest-learn
  test("14. POST /parse-cv/suggest-learn with no token → status IS 401", async () => {
    const res = await request(app)
      .post("/parse-cv/suggest-learn")
      .send({ cvText: "Software engineer with 5 years experience in React and Node.js" });
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });
});

// ── TEST 15: POST /notifications now uses verifyAdminJWT ────────────────────
// x-admin-secret header alone MUST be rejected with 401 (not 403) after fix
describe("Fix Verified: POST /notifications uses verifyAdminJWT (rejects x-admin-secret header with 401)", () => {

  test("15. POST /notifications with x-admin-secret header (NOT admin_token cookie) → status IS 401 (verifyAdminJWT enforced, legacy bypass removed)", async () => {
    const res = await request(app)
      .post("/notifications")
      .set("x-admin-secret", "cse_admin_super_secret_jwt_key_2024_change_in_prod")
      .send({ title: "Test Alert", message: "This is a test notification" });
    // After fix: verifyAdminJWT requires admin_token cookie — x-admin-secret header alone returns 401
    // (Previously isAdminAuthed accepted x-admin-secret and returned 200 or 403, never 401)
    console.log(`  Actual status: ${res.status}`);
    expect(res.status).toBe(401);
  });
});

// ── TESTS 16–17: AI Advisor with valid custom JWT ────────────────────────────
// After fix: verifyJWT accepts custom JWTs — requests MUST NOT return 401
describe("Fix Verified: AI Advisor uses verifyJWT (accepts custom JWT)", () => {
  let validCustomJWT;

  beforeAll(() => {
    validCustomJWT = makeValidCustomJWT();
  });

  test("16. POST /ai-advisor with valid custom JWT in Authorization header → status is NOT 401 (verifyJWT accepts custom JWT)", async () => {
    const res = await request(app)
      .post("/ai-advisor")
      .set("Authorization", `Bearer ${validCustomJWT}`)
      .send({ message: "How can I improve my skills?" });
    // After fix: verifyJWT accepts the custom JWT.
    // Status will be 200/400/500 depending on AI service availability — but NOT 401.
    console.log(`  Actual status: ${res.status}, body: ${JSON.stringify(res.body)}`);
    expect(res.status).not.toBe(401);
  });

  test("17. GET /ai-advisor/history with valid custom JWT → status is NOT 401 (verifyJWT accepts custom JWT)", async () => {
    const res = await request(app)
      .get("/ai-advisor/history")
      .set("Authorization", `Bearer ${validCustomJWT}`);
    // After fix: verifyJWT accepts the custom JWT.
    // Status will be 200/400/500 depending on DB/service availability — but NOT 401.
    console.log(`  Actual status: ${res.status}, body: ${JSON.stringify(res.body)}`);
    expect(res.status).not.toBe(401);
  });
});
