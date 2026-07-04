/**
 * Shared test application factory.
 *
 * Builds a real Express app connected to the real MongoDB instance (using the
 * MONGODB_URI from the .env file). Used by preservation tests (Task 2) that
 * need an actual database to observe real handler behavior.
 *
 * Usage:
 *   const { buildTestApp } = require("./testApp");
 *   const { app, closeDB } = await buildTestApp();
 *
 * Note: Bug condition exploration tests (Task 1) do NOT use this module —
 * they build an inline mock app to avoid the MongoDB dependency.
 */

"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const express = require("express");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

const { registerNotificationRoutes } = require("../routes/notifications.routes");
const { registerUserNotificationRoutes } = require("../routes/userNotifications.routes");
const { registerCvParserRoutes } = require("../routes/cvParser.routes");
const { registerAiAdvisorRoutes } = require("../routes/aiAdvisor.routes");
const { registerAuthRoutes } = require("../routes/auth.routes");
const { registerCoursesRoutes } = require("../routes/courses.routes");
const { registerScheduleRoutes } = require("../routes/schedule.routes");
const { verifyJWT } = require("../middleware/verifyJWT");
const { ObjectId } = require("mongodb");

/**
 * Creates a real Express app backed by a real MongoDB connection.
 * Returns { app, closeDB } where closeDB() closes the Mongo client.
 */
async function buildTestApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set in .env file");

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
  });
  await client.connect();

  const db = client.db("skillEngineDB");
  const usersCollection = db.collection("user_list");
  const connectionRequestsCollection = db.collection("connection_requests");
  const conversationsCollection = db.collection("conversations");
  const messagesCollection = db.collection("messages");
  const ratingsCollection = db.collection("user_ratings");
  const aiAdvisorSessionsCollection = db.collection("ai_advisor_sessions");
  const notificationsCollection = db.collection("notifications");
  const schedulesCollection = db.collection("schedules");
  const userNotificationsCollection = db.collection("user_notifications");
  const coursesCollection = db.collection("courses");
  const courseEnrollmentsCollection = db.collection("course_enrollments");
  const lessonsCollection = db.collection("lessons");

  const mockIo = {
    emit: () => {},
    to: () => ({ emit: () => {} }),
  };

  // Register all the routes that preservation tests need
  registerAuthRoutes(app, { usersCollection });
  registerNotificationRoutes(app, { notificationsCollection, io: mockIo });
  registerUserNotificationRoutes(app, { userNotificationsCollection, io: mockIo });
  registerCvParserRoutes(app);
  registerScheduleRoutes(app, {
    schedulesCollection,
    conversationsCollection,
    usersCollection,
    io: mockIo,
    userNotificationsCollection,
  });
  registerCoursesRoutes(app, {
    coursesCollection,
    courseEnrollmentsCollection,
    usersCollection,
    ratingsCollection,
    schedulesCollection,
    userNotificationsCollection,
    lessonsCollection,
    io: mockIo,
  });

  // Register inline connection/conversation/ratings routes (from index.js)
  // These are registered WITHOUT verifyJWT (mirrors the unfixed code state)
  const getParticipantsKey = (a, b) => [a, b].sort().join("__");

  const isConnectedPair = async (emailA, emailB) => {
    const user = await usersCollection.findOne(
      { email: emailA },
      { projection: { connections: 1 } },
    );
    return (user?.connections || []).some((c) => c.email === emailB);
  };

  const ensureConversationMembership = async (conversationId, email) => {
    if (!ObjectId.isValid(conversationId)) return { conversation: null, otherEmail: null };
    const conversation = await conversationsCollection.findOne(
      { _id: new ObjectId(conversationId) },
      { projection: { participants: 1 } },
    );
    if (!conversation) return { conversation: null, otherEmail: null };
    if (!conversation.participants.includes(email)) {
      return { conversation: null, otherEmail: null };
    }
    const otherEmail = conversation.participants.find((p) => p !== email);
    return { conversation, otherEmail };
  };

  app.post("/connections/requests", async (req, res) => {
    const { senderEmail, receiverEmail } = req.body;
    if (!senderEmail || !receiverEmail) {
      return res.status(400).send({ message: "senderEmail and receiverEmail are required" });
    }
    try {
      const [sender, receiver] = await Promise.all([
        usersCollection.findOne({ email: senderEmail }),
        usersCollection.findOne({ email: receiverEmail }),
      ]);
      if (!sender || !receiver) return res.status(404).send({ message: "User not found" });
      const result = await connectionRequestsCollection.insertOne({
        senderEmail,
        receiverEmail,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).send({ acknowledged: result.acknowledged });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).send({ message: "Request already exists" });
      return res.status(500).send({ message: "Failed to send request" });
    }
  });

  app.get("/conversations", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).send({ message: "email is required" });
    try {
      const conversations = await conversationsCollection
        .find({ participants: email })
        .sort({ lastMessageAt: -1 })
        .toArray();
      return res.send(conversations);
    } catch {
      return res.status(500).send({ message: "Failed to fetch conversations" });
    }
  });

  // POST /ratings
  app.post("/ratings", async (req, res) => {
    return res.status(200).send({ message: "mock rating" });
  });

  registerAiAdvisorRoutes(app, {
    usersCollection,
    conversationsCollection,
    messagesCollection,
    aiAdvisorSessionsCollection,
  });

  // PATCH /users/:id (already protected with verifyJWT in the real app)
  app.patch("/users/:id", verifyJWT, async (req, res) => {
    try {
      const id = req.params.id;
      let filter;
      if (ObjectId.isValid(id) && id.length === 24) {
        filter = { _id: new ObjectId(id) };
      } else {
        filter = { email: id.toLowerCase() };
      }
      const targetUser = await usersCollection.findOne(filter, {
        projection: { email: 1, _id: 1 },
      });
      if (!targetUser) return res.status(404).json({ success: false, message: "User not found." });

      const requestorEmail = req.user.email.toLowerCase();
      const targetEmail = targetUser.email?.toLowerCase();
      if (requestorEmail !== targetEmail) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      return res.status(200).json({ success: true, message: "Updated." });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Server error." });
    }
  });

  const closeDB = () => client.close();
  return { app, closeDB };
}

module.exports = { buildTestApp };
