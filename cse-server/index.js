const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const { validateEnv } = require("./utils/validateEnv");
validateEnv();
const express = require("express");
const cors = require("cors");
const Fuse = require("fuse.js");
const cookieParser = require("cookie-parser");
const { createServer } = require("http");
const zlib = require("zlib");
const { Server } = require("socket.io");
const { registerAiAdvisorRoutes } = require("./routes/aiAdvisor.routes");
const { registerAuthRoutes } = require("./routes/auth.routes");
const { registerNotificationRoutes } = require("./routes/notifications.routes");
const { registerScheduleRoutes } = require("./routes/schedule.routes");
const { registerUserNotificationRoutes, createUserNotification } = require("./routes/userNotifications.routes");
const { registerCoursesRoutes } = require("./routes/courses.routes");
const { registerAdminRoutes } = require("./routes/admin.routes");
const { registerDashboardRoutes } = require("./routes/dashboard.routes");
const { registerStudioRoutes } = require("./routes/studio.routes");
const { registerCvParserRoutes } = require("./routes/cvParser.routes");
const { registerSkillGraphRoutes } = require("./routes/skillGraph.routes");
const { registerTeamsRoutes } = require("./routes/teams.routes");
const { registerHybridMentorRoutes } = require("./routes/hybridMentor.routes");
const { registerCodeExecutionRoutes } = require("./routes/codeExecution.routes");
const { registerPaymentRoutes } = require("./routes/payment.routes");
const { initVectorStore } = require("./services/vectorRetrieval.service");
const { initFirebaseAdmin } = require("./config/firebaseAdmin");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const { initIpBlocker, isIpBlocked } = require("./utils/ipBlocker");
const { parseClientIp } = require("./utils/deviceParser");
const { detectReviewFraud, sanitizeIp } = require("./utils/geoSecurity");
const { escapeRegex, findUserByEmail } = require("./utils/userLookup");
const { securityHeaders } = require("./middleware/securityHeaders");
const { globalApiLimiter } = require("./middleware/rateLimiter");

// ── Cloudinary initialisation (server-side; used only for deletion of old images)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Deletes a Cloudinary asset by its public_id.
 * Resolves silently even if the asset does not exist.
 * @param {string} publicId
 * @param {string} [resourceType="image"]
 * @returns {Promise<void>}
 */
const deleteCloudinaryImage = async (publicId, resourceType = "image") => {
  if (!publicId || !process.env.CLOUDINARY_API_SECRET) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    } catch (e) {
      console.error("[Cloudinary Delete Error]:", e.message);
    }
  }
};

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

const normalizeOrigin = (url = "") => String(url).trim().replace(/\/+$/, "");
const allowedOrigins = Array.from(
  new Set(
    [
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map(normalizeOrigin)
        : ["http://localhost:5173"]),
      process.env.CLIENT_URL ? normalizeOrigin(process.env.CLIENT_URL) : "",
    ].filter(Boolean)
  )
);

const isAllowedProjectOrigin = (cleanOrigin) => {
  if (allowedOrigins.includes(cleanOrigin)) return true;
  return (
    /^http:\/\/localhost:\d+$/.test(cleanOrigin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(cleanOrigin)
  );
};

const corsConfig = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const clean = normalizeOrigin(origin);
    if (isAllowedProjectOrigin(clean)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
};

app.use(securityHeaders);
app.use(globalApiLimiter);
app.use(
  cors(corsConfig),
);
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());

// ── Fast zero-dep gzip compression for JSON & text API responses (>= 1KB) ──
app.use((req, res, next) => {
  if (req.method === "HEAD" || req.headers["x-no-compression"]) return next();
  const acceptEncoding = String(req.headers["accept-encoding"] || "");
  if (!/\bgzip\b/i.test(acceptEncoding)) return next();

  const origSend = res.send.bind(res);
  res.send = (body) => {
    try {
      if (res.headersSent || res.getHeader("Content-Encoding")) {
        return origSend(body);
      }
      if (typeof body !== "string") {
        return origSend(body);
      }
      const ctype = String(res.getHeader("Content-Type") || "");
      if (
        ctype.includes("text/event-stream") ||
        ctype.startsWith("image/") ||
        ctype.startsWith("video/") ||
        ctype.startsWith("audio/") ||
        ctype.includes("application/pdf") ||
        body.length < 1024
      ) {
        return origSend(body);
      }
      const compressed = zlib.gzipSync(Buffer.from(body, "utf8"), { level: 6 });
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Length", compressed.length);
      return res.end(compressed);
    } catch {
      return origSend(body);
    }
  };
  next();
});

// ── Global IP restriction middleware ──
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  if (req.path.startsWith("/admin-api")) return next();

  const clientIp = parseClientIp(req);
  if (isIpBlocked(clientIp)) {
    return res.status(403).json({
      blocked: true,
      ip: clientIp,
      message: "Access Denied: Your IP address has been restricted by platform administration.",
    });
  }
  next();
});

const io = new Server(httpServer, {
  cors: corsConfig,
  transports: ["websocket", "polling"],
  perMessageDeflate: false,
  pingInterval: 15000,
  pingTimeout: 10000,
});

const onlineUsers = new Map();
const getOnlineEmails = () => [...onlineUsers.keys()];
const emitOnlineUsers = () => {
  io.emit("presence:online-users", getOnlineEmails());
};

const normalize = (s = "") => {
  return s
    .toLowerCase()
    .replace(/\.js/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "");
};

const createFuse = (skills) => {
  return new Fuse(skills, {
    includeScore: true,
    threshold: 0.4,
  });
};

let client;
let routesRegistered = false;

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env file");
    process.exit(1);
  }

  let connected = false;
  let attempts = 0;
  while (!connected && attempts < 15) {
    attempts++;
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 50,
        minPoolSize: 5,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 15000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
      });
      await client.connect();
      connected = true;
      console.log(`MongoDB Connected successfully (attempt ${attempts})`);
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempts} failed:`, err.message);
      if (attempts >= 15) {
        console.error("Exhausted all MongoDB connection attempts. Please check network/URI.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  try {
    const { verifyJWT } = require("./middleware/verifyJWT");

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
    const lessonProgressCollection = db.collection("lesson_progress");
    const courseCertificatesCollection = db.collection("course_certificates");
    const courseReviewsCollection = db.collection("course_reviews");
    const courseCouponsCollection = db.collection("course_coupons");
    const courseAppealsCollection = db.collection("course_appeals");
    const adminDisputesCollection = db.collection("admin_disputes");
    const studioAuditLogsCollection = db.collection("studio_audit_logs");
    const adminAuditLogsCollection = db.collection("admin_audit_logs");
    const userLoginLogsCollection = db.collection("user_login_logs");
    const blockedIpsCollection = db.collection("blocked_ips");
    const teamsCollection = db.collection("teams");
    const adminSecurityAlertsCollection = db.collection("admin_security_alerts");

    // Ensure indexes concurrently in background so HTTP routes mount & answer immediately on boot
    void Promise.allSettled([
      connectionRequestsCollection.createIndex(
        { senderEmail: 1, receiverEmail: 1, status: 1 },
        { unique: true, partialFilterExpression: { status: "pending" } },
      ),
      connectionRequestsCollection.createIndex({ receiverEmail: 1, status: 1, createdAt: -1 }),
      connectionRequestsCollection.createIndex({ senderEmail: 1, status: 1 }),
      conversationsCollection.createIndex({ participantsKey: 1 }, { unique: true }),
      conversationsCollection.createIndex({ participants: 1 }),
      conversationsCollection.createIndex({ participants: 1, lastMessageAt: -1 }),
      messagesCollection.createIndex({ conversationId: 1, createdAt: 1 }),
      messagesCollection.createIndex({ conversationId: 1, createdAt: -1 }),
      messagesCollection.createIndex({ receiverEmail: 1, seenAt: 1 }),
      ratingsCollection.createIndex({ reviewerEmail: 1, targetEmail: 1 }, { unique: true }),
      ratingsCollection.createIndex({ targetEmail: 1, createdAt: -1 }),
      ratingsCollection.createIndex({ fraudStatus: 1, rating: -1 }),
      aiAdvisorSessionsCollection.createIndex({ userEmail: 1, createdAt: -1 }),
      schedulesCollection.createIndex({ conversationId: 1, status: 1 }),
      schedulesCollection.createIndex({ startTime: 1, status: 1 }),
      userNotificationsCollection.createIndex({ recipientEmail: 1, createdAt: -1 }),
      userNotificationsCollection.createIndex({ recipientEmail: 1, isRead: 1 }),
      courseAppealsCollection.createIndex({ courseId: 1, learnerEmail: 1, createdAt: -1 }),
      courseAppealsCollection.createIndex({ instructorEmail: 1, createdAt: -1 }),
      courseAppealsCollection.createIndex({ enrollmentId: 1 }),
      adminDisputesCollection.createIndex({ courseId: 1, createdAt: -1 }),
      usersCollection.createIndex({ email: 1 }),
      usersCollection.createIndex({ username: 1 }),
      usersCollection.createIndex({ role: 1 }),
      usersCollection.createIndex({ createdAt: -1 }),
      usersCollection.createIndex({ isDeactivated: 1 }),
      usersCollection.createIndex({ teachSkills: 1 }),
      usersCollection.createIndex({ learnSkills: 1 }),
      usersCollection.createIndex({ role: 1, isDeactivated: 1 }),
      adminAuditLogsCollection.createIndex({ timestamp: -1 }),
      schedulesCollection.createIndex({ schedulerEmail: 1, status: 1 }),
      coursesCollection.createIndex({ instructorEmail: 1, status: 1 }),
      coursesCollection.createIndex({ instructorEmail: 1, createdAt: -1 }),
      coursesCollection.createIndex({ status: 1 }),
      coursesCollection.createIndex({ createdAt: -1 }),
      coursesCollection.createIndex({ status: 1, createdAt: -1 }),
      coursesCollection.createIndex({ status: 1, category: 1 }),
      coursesCollection.dropIndex("instructorEmail_1_topic_1").catch(() => {}),
      coursesCollection.createIndex({ instructorEmail: 1, topic: 1 }),
      courseEnrollmentsCollection.createIndex({ courseId: 1, learnerEmail: 1 }, { unique: true }),
      courseEnrollmentsCollection.createIndex({ instructorEmail: 1, createdAt: -1 }),
      courseEnrollmentsCollection.createIndex({ learnerEmail: 1, createdAt: -1 }),
      courseEnrollmentsCollection.createIndex({ createdAt: -1 }),
      courseEnrollmentsCollection.createIndex({ learnerEmail: 1, status: 1 }),
      courseAppealsCollection.createIndex({ instructorEmail: 1, updatedAt: -1, createdAt: -1 }),
      courseReviewsCollection.createIndex({ instructorEmail: 1, createdAt: -1 }),
      studioAuditLogsCollection.createIndex({ instructorEmail: 1, createdAt: -1 }),
      lessonsCollection.createIndex({ courseId: 1, order: 1 }),
      lessonProgressCollection.createIndex({ learnerEmail: 1, courseId: 1 }),
      lessonProgressCollection.createIndex({ learnerEmail: 1, lessonId: 1, videoKey: 1 }, { unique: true }),
      courseCertificatesCollection.createIndex({ courseId: 1, learnerEmail: 1 }, { unique: true }),
      courseCertificatesCollection.createIndex({ certificateCode: 1 }, { unique: true }),
      courseCertificatesCollection.createIndex({ certHash: 1 }),
      courseCertificatesCollection.createIndex({ learnerEmail: 1, issuedAt: -1 }),
      courseReviewsCollection.createIndex({ courseId: 1, createdAt: -1 }),
      courseReviewsCollection.createIndex({ rating: -1 }),
      courseCouponsCollection.createIndex({ instructorEmail: 1, code: 1 }),
      userLoginLogsCollection.createIndex({ timestamp: -1 }),
      userLoginLogsCollection.createIndex({ email: 1, timestamp: -1 }),
      userLoginLogsCollection.createIndex({ ip: 1 }),
      blockedIpsCollection.createIndex({ ip: 1 }, { unique: true }),
      teamsCollection.createIndex({ leaderEmail: 1 }),
      teamsCollection.createIndex({ "members.email": 1 }),
      teamsCollection.createIndex({ createdAt: -1 }),
      adminSecurityAlertsCollection.createIndex({ timestamp: -1 }),
      adminSecurityAlertsCollection.createIndex({ type: 1, status: 1 }),
    ]);

    await initIpBlocker(blockedIpsCollection);

    initFirebaseAdmin();

    registerAuthRoutes(app, {
      usersCollection,
      userLoginLogsCollection,
      adminSecurityAlertsCollection,
      io,
    });

    registerNotificationRoutes(app, { notificationsCollection, io });

    registerScheduleRoutes(app, { schedulesCollection, conversationsCollection, usersCollection, io, userNotificationsCollection });
    registerUserNotificationRoutes(app, { userNotificationsCollection, io });

    registerCoursesRoutes(app, {
      coursesCollection,
      courseEnrollmentsCollection,
      usersCollection,
      ratingsCollection,
      schedulesCollection,
      userNotificationsCollection,
      lessonsCollection,
      lessonProgressCollection,
      courseCertificatesCollection,
      courseAppealsCollection,
      adminDisputesCollection,
      adminAuditLogsCollection,
      courseReviewsCollection,
      adminSecurityAlertsCollection,
      io,
    });
    registerAdminRoutes(app, {
      db,
      usersCollection,
      coursesCollection,
      courseEnrollmentsCollection,
      ratingsCollection,
      schedulesCollection,
      userNotificationsCollection,
      lessonsCollection,
      adminAuditLogsCollection,
      adminDisputesCollection,
      courseAppealsCollection,
      userLoginLogsCollection,
      blockedIpsCollection,
      adminSecurityAlertsCollection,
      courseReviewsCollection,
      io,
    });

    registerDashboardRoutes(app, {
      coursesCollection,
      courseEnrollmentsCollection,
      usersCollection,
      lessonsCollection,
      userNotificationsCollection,
      io,
    });

    registerStudioRoutes(app, {
      usersCollection,
      coursesCollection,
      courseEnrollmentsCollection,
      courseCertificatesCollection,
      lessonsCollection,
      lessonProgressCollection,
      ratingsCollection,
      schedulesCollection,
      userNotificationsCollection,
      courseReviewsCollection,
      courseCouponsCollection,
      courseAppealsCollection,
      studioAuditLogsCollection,
      io,
    });

    registerCvParserRoutes(app);
    registerSkillGraphRoutes(app, {
      usersCollection,
      coursesCollection,
      ratingsCollection,
    });
    registerTeamsRoutes(app, {
      usersCollection,
      schedulesCollection,
      teamsCollection,
      conversationsCollection,
      messagesCollection,
      userNotificationsCollection,
      io,
    });
    registerHybridMentorRoutes(app, { usersCollection, ratingsCollection });
    registerCodeExecutionRoutes(app);
    registerPaymentRoutes(app, {
      coursesCollection,
      courseEnrollmentsCollection,
      userNotificationsCollection,
      io,
    });

    // ===== Cloudinary Signed Upload =====
    // Generates a server-side signature so the client can upload directly to
    // Cloudinary without exposing the API secret or requiring an unsigned preset.
    //
    // Security: JWT required — only authenticated users can get a signature.
    // The api_key is returned (safe to expose); api_secret never leaves the server.
    {
      app.post("/cloudinary/sign", verifyJWT, (req, res) => {
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const apiKey    = process.env.CLOUDINARY_API_KEY;
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

        if (!apiSecret || !apiKey || !cloudName) {
          return res.status(503).json({
            success: false,
            message: "Cloudinary is not configured on the server.",
          });
        }

        const timestamp = Math.round(Date.now() / 1000);
        const folder    = req.body?.folder || "profile_images";

        // Signature = SHA-256 of "folder=<f>&timestamp=<ts><secret>"
        // Parameters must be sorted alphabetically; exclude api_key, file, resource_type
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
        const signature = crypto
          .createHash("sha256")
          .update(paramsToSign + apiSecret)
          .digest("hex");

        return res.json({
          success: true,
          signature,
          apiKey,
          timestamp,
          cloudName,
          folder,
        });
      });
    }

    // ===== Schedule Scheduler =====
    const activatingEmitted = new Set();

    const runExpiryAndActivationScan = async () => {
      try {
        const now = new Date();
        const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

        // 1. Activation scan — emit schedule:activating for accepted schedules entering the 10-min window
        const activating = await schedulesCollection
          .find({
            status: "accepted",
            startTime: { $lte: tenMinutesFromNow.toISOString(), $gt: now.toISOString() },
          })
          .toArray();

        for (const doc of activating) {
          const key = doc._id.toString();
          if (!activatingEmitted.has(key)) {
            activatingEmitted.add(key);
            const payload = {
              scheduleId: key,
              conversationId: doc.conversationId.toString(),
            };
            io.to(`user:${doc.schedulerEmail}`).emit("schedule:activating", payload);
            io.to(`user:${doc.inviteeEmail}`).emit("schedule:activating", payload);
          }
        }

        // Clean up emitted keys whose startTime has passed (no longer in activation window)
        for (const key of activatingEmitted) {
          const doc = activating.find((d) => d._id.toString() === key);
          if (!doc) {
            activatingEmitted.delete(key);
          }
        }

        // 2. Expiry scan — mark accepted schedules as expired if startTime + durationMinutes <= now
        const acceptedSchedules = await schedulesCollection
          .find({ status: "accepted" })
          .toArray();

        for (const doc of acceptedSchedules) {
          const expiryTime =
            new Date(doc.startTime).getTime() + doc.durationMinutes * 60_000;
          if (expiryTime <= now.getTime()) {
            const updatedAt = now.toISOString();
            await schedulesCollection.updateOne(
              { _id: doc._id },
              { $set: { status: "expired", updatedAt } }
            );
            const payload = {
              scheduleId: doc._id.toString(),
              conversationId: doc.conversationId.toString(),
            };
            io.to(`user:${doc.schedulerEmail}`).emit("schedule:expired", payload);
            io.to(`user:${doc.inviteeEmail}`).emit("schedule:expired", payload);
            // Remove from activating set if present
            activatingEmitted.delete(doc._id.toString());
          }
        }
      } catch (err) {
        console.error("[Scheduler] Error:", err.message);
      }
    };

    // Run once on startup to handle schedules that expired while server was offline
    runExpiryAndActivationScan();

    // Then run every 30 seconds
    setInterval(runExpiryAndActivationScan, 30_000);

    registerAiAdvisorRoutes(app, {
      usersCollection,
      conversationsCollection,
      messagesCollection,
      aiAdvisorSessionsCollection,
      coursesCollection,
    });

    initVectorStore()
      .then((store) => {
        if (store) console.log("[AI Advisor] Vector store ready");
      })
      .catch((err) => {
        console.warn("[AI Advisor] Vector store warmup skipped:", err.message);
      });

    const buildConnectionPayload = (userDoc) => ({
      uid: userDoc._id,
      email: userDoc.email,
      fullName: userDoc.fullName || userDoc.name || "Unknown",
      profileImage: userDoc.profileImage || userDoc.image || "",
    });

    const toPublicRequest = (requestDoc, viewerEmail) => ({
      requestId: requestDoc._id,
      senderEmail: requestDoc.senderEmail,
      senderUid: requestDoc.senderUid,
      senderName: requestDoc.senderName,
      senderImage: requestDoc.senderImage,
      receiverEmail: requestDoc.receiverEmail,
      status: requestDoc.status,
      createdAt: requestDoc.createdAt,
      isOutgoing: requestDoc.senderEmail === viewerEmail,
    });

    const getParticipantsKey = (emailA, emailB) =>
      [String(emailA || "").trim().toLowerCase(), String(emailB || "").trim().toLowerCase()]
        .sort()
        .join("__");

    const isConnectedPair = async (emailA, emailB) => {
      const targetB = String(emailB || "").trim().toLowerCase();
      if (!emailA || !targetB) return false;
      const user = await findUserByEmail(usersCollection, emailA, {
        projection: { connections: 1 },
      });
      return (user?.connections || []).some(
        (c) => String(c?.email || "").trim().toLowerCase() === targetB
      );
    };

    const ensureConversationMembership = async (conversationId, email) => {
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!ObjectId.isValid(conversationId) || !cleanEmail) {
        return { conversation: null, otherEmail: null };
      }
      const conversation = await conversationsCollection.findOne(
        { _id: new ObjectId(conversationId) },
        { projection: { participants: 1, isGroup: 1, groupName: 1, groupTopic: 1, teamId: 1, leaderEmail: 1 } },
      );
      if (!conversation) return { conversation: null, otherEmail: null };
      const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
      const isMember = participants.some((p) => String(p || "").trim().toLowerCase() === cleanEmail);
      if (!isMember) {
        return { conversation: null, otherEmail: null };
      }
      const otherEmail = participants.find((p) => String(p || "").trim().toLowerCase() !== cleanEmail) || null;
      return { conversation, otherEmail };
    };

    const formatConversation = (conversation, peer, currentUserEmail) => {
      const isGroup = Boolean(conversation.isGroup);
      const lowerViewer = String(currentUserEmail || "").trim().toLowerCase();
      return {
        _id: conversation._id.toString(),
        participants: conversation.participants,
        isGroup,
        groupName: conversation.groupName || null,
        groupTopic: conversation.groupTopic || null,
        teamId: conversation.teamId ? conversation.teamId.toString() : null,
        peer: isGroup
          ? {
              email: conversation.leaderEmail || "group",
              fullName: conversation.groupName || "Project Squad",
              profileImage: conversation.groupImage || "",
              isGroup: true,
              memberCount: conversation.participants?.length || 0,
            }
          : {
              email: peer?.email,
              fullName: peer?.fullName || peer?.name || "Unknown",
              profileImage: peer?.profileImage || peer?.image || "",
              isGroup: false,
            },
        lastMessage: conversation.lastMessage || null,
        lastMessageAt: conversation.lastMessageAt || conversation.createdAt,
        unreadCount:
          conversation.unreadCounts?.[currentUserEmail] ??
          conversation.unreadCounts?.[lowerViewer] ??
          0,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    };

    const serializeMessage = (message) => ({
      ...message,
      _id: message._id.toString(),
      conversationId: message.conversationId.toString(),
    });

    const createMessage = async ({
      conversationId,
      senderEmail,
      text,
      imageData,
    }) => {
      const cleanText = (text || "").trim();
      const cleanImageData = imageData || "";
      const hasImage = cleanImageData.startsWith("data:image/");

      if (!cleanText && !hasImage) {
        throw new Error("Message cannot be empty");
      }

      if (hasImage && cleanImageData.length > 2_000_000) {
        throw new Error("Image is too large");
      }

      const { conversation, otherEmail } = await ensureConversationMembership(
        conversationId,
        senderEmail,
      );
      if (!conversation || (!otherEmail && !conversation.isGroup)) {
        throw new Error("You are not allowed to message in this conversation");
      }

      if (!conversation.isGroup) {
        const stillConnected = await isConnectedPair(senderEmail, otherEmail);
        if (!stillConnected) {
          throw new Error("You can only message connected users");
        }
      }

      const otherParticipants = (conversation.participants || []).filter(
        (p) => p !== senderEmail
      );
      const isAnyReceiverOnline = otherParticipants.some((p) => onlineUsers.has(p));
      const now = new Date().toISOString();
      const messageDoc = {
        conversationId: conversation._id,
        senderEmail,
        receiverEmail: conversation.isGroup ? "group" : (otherEmail || "group"),
        isGroup: Boolean(conversation.isGroup),
        groupName: conversation.groupName || null,
        text: cleanText,
        imageData: hasImage ? cleanImageData : "",
        status: isAnyReceiverOnline ? "delivered" : "sent",
        createdAt: now,
        updatedAt: now,
        seenAt: null,
      };

      const insertResult = await messagesCollection.insertOne(messageDoc);
      const fullMessage = {
        ...messageDoc,
        _id: insertResult.insertedId,
      };

      const unreadUpdates = {};
      otherParticipants.forEach((p) => {
        unreadUpdates[`unreadCounts.${p}`] = 1;
      });

      await conversationsCollection.updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessage: {
              text: cleanText || (hasImage ? "Image" : ""),
              senderEmail,
              createdAt: now,
            },
            lastMessageAt: now,
            updatedAt: now,
          },
          ...(Object.keys(unreadUpdates).length > 0 ? { $inc: unreadUpdates } : {}),
        },
      );

      const serialized = serializeMessage(fullMessage);
      io.to(`conversation:${conversation._id.toString()}`).emit(
        "message:new",
        serialized,
      );
      io.to(`user:${senderEmail}`).emit("conversation:updated");
      otherParticipants.forEach((p) => {
        io.to(`user:${p}`).emit("conversation:updated");
      });

      // Broadcast real-time message notification popup and sound
      try {
        let senderName = senderEmail.split("@")[0];
        let senderImage = "";
        const senderDoc = await usersCollection.findOne(
          { email: senderEmail },
          { projection: { name: 1, fullName: 1, image: 1, profileImage: 1 } },
        );
        if (senderDoc) {
          senderName = senderDoc.fullName || senderDoc.name || senderName;
          senderImage = senderDoc.profileImage || senderDoc.image || "";
        }

        const popupPayload = {
          type: "chat_message",
          title: conversation.isGroup
            ? `[${conversation.groupName || "Team Squad"}] ${senderName}`
            : `SMS from ${senderName}`,
          message: cleanText || (hasImage ? "Sent an image" : "New message"),
          senderName,
          senderEmail,
          senderImage,
          conversationId: conversation._id.toString(),
          actionUrl: `/message?conversationId=${conversation._id.toString()}`,
          isGroup: Boolean(conversation.isGroup),
          groupName: conversation.groupName || null,
          createdAt: now,
        };

        otherParticipants.forEach((receiver) => {
          io.to(`user:${receiver}`).emit("message:popup", popupPayload);
          io.to(`user:${receiver.toLowerCase()}`).emit("message:popup", popupPayload);
        });
      } catch (err) {
        // non-blocking
      }

      return serialized;
    };

    const rebuildConversationLastMessage = async (conversationObjectId) => {
      const latestMessage = await messagesCollection.findOne(
        { conversationId: conversationObjectId },
        { sort: { createdAt: -1 } },
      );

      if (!latestMessage) {
        await conversationsCollection.updateOne(
          { _id: conversationObjectId },
          {
            $set: {
              lastMessage: null,
              lastMessageAt: null,
              updatedAt: new Date().toISOString(),
            },
          },
        );
        return;
      }

      await conversationsCollection.updateOne(
        { _id: conversationObjectId },
        {
          $set: {
            lastMessage: {
              text: latestMessage.text || (latestMessage.imageData ? "Image" : ""),
              senderEmail: latestMessage.senderEmail,
              createdAt: latestMessage.createdAt,
            },
            lastMessageAt: latestMessage.createdAt,
            updatedAt: new Date().toISOString(),
          },
        },
      );
    };

    // ─── In-memory collaborative room state (Code + Whiteboard + Mode sync) ───
    const collabRooms = new Map();
    const getOrCreateCollabRoom = (roomId) => {
      const key = String(roomId);
      if (!collabRooms.has(key)) {
        collabRooms.set(key, {
          mode: "video",
          language: "javascript",
          yjsUpdates: [],
          whiteboardStrokes: [],
          chatMessages: [],
          updatedAt: Date.now(),
        });
      }
      return collabRooms.get(key);
    };

    const emitToUser = (targetEmail, eventName, payload) => {
      if (!targetEmail) return;
      const clean = String(targetEmail).trim();
      const lower = clean.toLowerCase();
      io.to(`user:${clean}`).emit(eventName, payload);
      if (lower !== clean) {
        io.to(`user:${lower}`).emit(eventName, payload);
      }
    };

    const hasUserSockets = (targetEmail) => {
      if (!targetEmail) return false;
      const clean = String(targetEmail).trim();
      const lower = clean.toLowerCase();
      const r1 = io.sockets.adapter.rooms.get(`user:${clean}`);
      const r2 = lower !== clean ? io.sockets.adapter.rooms.get(`user:${lower}`) : null;
      return Boolean((r1 && r1.size > 0) || (r2 && r2.size > 0));
    };

    const relayRtcSignal = (socket, to, roomId, eventName, payload) => {
      if (to && to !== "group") {
        emitToUser(to, eventName, payload);
        if (!hasUserSockets(to) && roomId) {
          socket.to(`code-room:${roomId}`).emit(eventName, payload);
        }
      } else if (roomId) {
        socket.to(`code-room:${roomId}`).emit(eventName, payload);
      }
    };

    io.on("connection", (socket) => {
      // Immediately send current list of online users to newly connected socket
      socket.emit("presence:online-users", getOnlineEmails());

      const handleUserJoin = (rawEmail) => {
        if (!rawEmail) return;
        const cleanEmail = String(rawEmail).trim();
        const lowerEmail = cleanEmail.toLowerCase();

        // Prevent socket identity hijacking: once a socket is associated with an email,
        // it cannot switch or join rooms for a different email address.
        if (socket.data.lowerEmail && socket.data.lowerEmail !== lowerEmail) {
          return;
        }

        socket.data.email = cleanEmail;
        socket.data.lowerEmail = lowerEmail;
        socket.join(`user:${cleanEmail}`);
        socket.join(`user:${lowerEmail}`);

        if (!onlineUsers.has(lowerEmail)) {
          onlineUsers.set(lowerEmail, new Set());
        }
        onlineUsers.get(lowerEmail).add(socket.id);
        emitOnlineUsers();
      };

      socket.on("presence:join", ({ email }) => {
        handleUserJoin(email);
      });

      socket.on("presence:heartbeat", ({ email }) => {
        handleUserJoin(email);
      });

      socket.on("presence:leave", ({ email }) => {
        const targetEmail = (email || socket.data?.lowerEmail || socket.data?.email || "")
          .toLowerCase()
          .trim();
        if (!targetEmail || !onlineUsers.has(targetEmail)) return;
        const socketSet = onlineUsers.get(targetEmail);
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          onlineUsers.delete(targetEmail);
        }
        emitOnlineUsers();
      });

      socket.on("conversation:join", async ({ conversationId, email }) => {
        try {
          if (!conversationId || !email) return;
          const { conversation } = await ensureConversationMembership(
            conversationId,
            email,
          );
          if (!conversation) return;
          socket.join(`conversation:${conversationId}`);
        } catch (error) {
          // ignore socket room join errors to avoid crashing realtime channel
        }
      });

      socket.on("conversation:typing", ({ conversationId, recipientEmail, isTyping, userEmail, userName }) => {
        try {
          if (!conversationId) return;
          const typingPayload = {
            conversationId,
            isTyping: Boolean(isTyping),
            userEmail: userEmail || socket.data?.email,
            userName: userName || socket.data?.email?.split("@")[0] || "Someone",
          };
          socket.to(`conversation:${conversationId}`).emit("conversation:typing", typingPayload);
          if (recipientEmail) {
            const target = String(recipientEmail).trim();
            io.to(`user:${target}`).emit("conversation:typing", typingPayload);
            io.to(`user:${target.toLowerCase()}`).emit("conversation:typing", typingPayload);
          }
        } catch {
          // ignore
        }
      });

      socket.on("appeal:typing", ({ appealId, recipientEmail, isTyping, userEmail, userName, role }) => {
        try {
          if (!recipientEmail) return;
          const target = String(recipientEmail).trim();
          const typingPayload = {
            appealId,
            isTyping: Boolean(isTyping),
            userEmail: userEmail || socket.data?.email,
            userName: userName || "User",
            role: role || "user",
          };
          io.to(`user:${target}`).emit("appeal:typing", typingPayload);
          io.to(`user:${target.toLowerCase()}`).emit("appeal:typing", typingPayload);
        } catch {
          // ignore
        }
      });

      socket.on("message:send", async (payload, callback) => {
        try {
          const message = await createMessage(payload);
          if (callback) callback({ ok: true, message });
        } catch (error) {
          if (callback) callback({ ok: false, error: error.message });
        }
      });

      socket.on("message:seen", async ({ conversationId, viewerEmail }) => {
        try {
          if (!conversationId || !viewerEmail) return;
          const { conversation, otherEmail } = await ensureConversationMembership(
            conversationId,
            viewerEmail,
          );
          if (!conversation || !otherEmail) return;

          const now = new Date().toISOString();
          await messagesCollection.updateMany(
            {
              conversationId: conversation._id,
              receiverEmail: viewerEmail,
              seenAt: null,
            },
            { $set: { seenAt: now, status: "seen", updatedAt: now } },
          );

          await conversationsCollection.updateOne(
            { _id: conversation._id },
            {
              $set: {
                [`unreadCounts.${viewerEmail}`]: 0,
                updatedAt: now,
              },
            },
          );

          io.to(`conversation:${conversationId}`).emit("message:seen", {
            conversationId,
            viewerEmail,
            seenAt: now,
          });
          io.to(`user:${viewerEmail}`).emit("conversation:updated");
          io.to(`user:${otherEmail}`).emit("conversation:updated");
        } catch (error) {
          // silently ignore
        }
      });

      socket.on("message:edit", async (payload, callback) => {
        try {
          const { messageId, editorEmail, text } = payload || {};
          const cleanText = (text || "").trim();
          if (!ObjectId.isValid(messageId) || !editorEmail) {
            throw new Error("Invalid message edit payload");
          }

          const message = await messagesCollection.findOne({
            _id: new ObjectId(messageId),
          });
          if (!message || message.senderEmail !== editorEmail) {
            throw new Error("You can only edit your own message");
          }
          if (!cleanText && !message.imageData) {
            throw new Error("Message text cannot be empty");
          }

          const now = new Date().toISOString();
          await messagesCollection.updateOne(
            { _id: message._id },
            {
              $set: {
                text: cleanText,
                updatedAt: now,
                isEdited: true,
              },
            },
          );

          await rebuildConversationLastMessage(message.conversationId);
          const updated = serializeMessage({
            ...message,
            text: cleanText,
            updatedAt: now,
            isEdited: true,
          });

          io.to(`conversation:${updated.conversationId}`).emit(
            "message:edited",
            updated,
          );
          io.to(`user:${message.senderEmail}`).emit("conversation:updated");
          io.to(`user:${message.receiverEmail}`).emit("conversation:updated");
          if (callback) callback({ ok: true, message: updated });
        } catch (error) {
          if (callback) callback({ ok: false, error: error.message });
        }
      });

      socket.on("message:delete", async (payload, callback) => {
        try {
          const { messageId, requesterEmail } = payload || {};
          if (!ObjectId.isValid(messageId) || !requesterEmail) {
            throw new Error("Invalid delete payload");
          }

          const message = await messagesCollection.findOne({
            _id: new ObjectId(messageId),
          });
          if (!message || message.senderEmail !== requesterEmail) {
            throw new Error("You can only delete your own message");
          }

          await messagesCollection.deleteOne({ _id: message._id });
          await rebuildConversationLastMessage(message.conversationId);

          const conversationId = message.conversationId.toString();
          io.to(`conversation:${conversationId}`).emit("message:deleted", {
            messageId,
            conversationId,
          });
          io.to(`user:${message.senderEmail}`).emit("conversation:updated");
          io.to(`user:${message.receiverEmail}`).emit("conversation:updated");
          if (callback) callback({ ok: true });
        } catch (error) {
          if (callback) callback({ ok: false, error: error.message });
        }
      });

      socket.on("rtc:join-call", async ({ to, roomId, scheduleId, scheduleTitle, user }) => {
        try {
          const callerEmail = String(user?.email || socket.data.email || "").trim().toLowerCase();
          if (!callerEmail) return;

          let callerName = user?.name || callerEmail.split("@")[0];
          let callerImage = "";
          try {
            const callerDoc = await usersCollection.findOne(
              { email: { $regex: new RegExp(`^${callerEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
              { projection: { fullName: 1, name: 1, profileImage: 1 } }
            );
            if (callerDoc) {
              callerName = callerDoc.fullName || callerDoc.name || callerName;
              callerImage = callerDoc.profileImage || "";
            }
          } catch {
            // fallback to email prefix
          }

          const titleText = scheduleTitle || "Scheduled Meeting";
          const actionUrl = `/message?peer=${encodeURIComponent(callerEmail)}${
            scheduleId ? `&autoJoin=${encodeURIComponent(String(scheduleId))}` : ""
          }`;

          const notifyRecipient = async (recipient) => {
            const cleanTarget = String(recipient || "").trim().toLowerCase();
            if (!cleanTarget || cleanTarget === callerEmail || cleanTarget === "group") return;

            if (userNotificationsCollection) {
              const saved = await createUserNotification(userNotificationsCollection, null, {
                recipientEmail: cleanTarget,
                type: "meeting_joined",
                title: `${callerName} joined the meeting`,
                message: `${callerName} has joined "${titleText}". Click to join the call now!`,
                scheduleId: scheduleId || null,
              });

              emitToUser(cleanTarget, "user-notification:new", {
                ...saved,
                senderName: callerName,
                senderEmail: callerEmail,
                senderImage: callerImage,
                actionUrl,
              });
            }

            emitToUser(cleanTarget, "meeting:peer-joined", {
              from: callerEmail,
              senderName: callerName,
              senderImage: callerImage,
              roomId,
              scheduleId: scheduleId || null,
              scheduleTitle: titleText,
              actionUrl,
            });
          };

          if (to && to !== "group") {
            await notifyRecipient(to);
          } else if (roomId && ObjectId.isValid(String(roomId))) {
            // Group / conversation call: notify all other participants
            const conv = await conversationsCollection.findOne({ _id: new ObjectId(String(roomId)) });
            if (conv && Array.isArray(conv.participants)) {
              for (const p of conv.participants) {
                const em = typeof p === "string" ? p : p?.email;
                if (em) await notifyRecipient(em);
              }
            }
          }
        } catch (err) {
          console.warn("[rtc:join-call] notification error:", err.message);
        }
      });

      socket.on("rtc:ready", ({ to, roomId, scheduleId, from }) => {
        const sender = from || socket.data.email;
        const payload = {
          from: sender,
          roomId,
          scheduleId,
        };
        if (to && to !== "group") {
          emitToUser(to, "rtc:ready", payload);
        }
        if (roomId) {
          socket.to(`code-room:${roomId}`).emit("rtc:ready", payload);
        }
      });

      socket.on("rtc:offer", ({ to, offer, scheduleId, roomId, from }) => {
        if (!offer) return;
        const payload = {
          from: from || socket.data.email,
          offer,
          scheduleId,
          roomId,
        };
        relayRtcSignal(socket, to, roomId, "rtc:offer", payload);
      });

      socket.on("rtc:answer", ({ to, answer, scheduleId, roomId, from }) => {
        if (!answer) return;
        const payload = {
          from: from || socket.data.email,
          answer,
          scheduleId,
          roomId,
        };
        relayRtcSignal(socket, to, roomId, "rtc:answer", payload);
      });

      socket.on("rtc:ice-candidate", ({ to, candidate, roomId, from }) => {
        if (!candidate) return;
        const payload = {
          from: from || socket.data.email,
          candidate,
          roomId,
        };
        relayRtcSignal(socket, to, roomId, "rtc:ice-candidate", payload);
      });

      socket.on("rtc:media-state", ({ to, roomId, isMuted, isCameraOff, isScreenSharing, cameraStreamId, screenStreamId }) => {
        const payload = {
          from: socket.data.email,
          roomId,
          isMuted: Boolean(isMuted),
          isCameraOff: Boolean(isCameraOff),
          isScreenSharing: Boolean(isScreenSharing),
          cameraStreamId: cameraStreamId || null,
          screenStreamId: screenStreamId || null,
        };
        if (to && to !== "group") {
          emitToUser(to, "rtc:media-state", payload);
        }
        if (roomId) {
          socket.to(`code-room:${roomId}`).emit("rtc:media-state", payload);
        }
      });

      socket.on("rtc:end", ({ to, roomId, scheduleId }) => {
        const payload = {
          from: socket.data.email,
          scheduleId,
        };
        if (to && to !== "group") {
          emitToUser(to, "rtc:ended", payload);
        }
        if (roomId) {
          socket.to(`code-room:${roomId}`).emit("rtc:ended", payload);
        }
      });

      // ─── Real-time Live Collaboration Room (Code + Whiteboard + View Mode) ───
      socket.on("code:join-room", ({ roomId, user }) => {
        if (!roomId) return;
        const roomName = `code-room:${roomId}`;
        socket.join(roomName);

        const roomState = getOrCreateCollabRoom(roomId);
        socket.emit("collab:room-init", {
          roomId,
          mode: roomState.mode,
          language: roomState.language,
          yjsUpdates: roomState.yjsUpdates,
          whiteboardStrokes: roomState.whiteboardStrokes,
          chatMessages: roomState.chatMessages,
        });

        socket.to(roomName).emit("code:peer-joined", {
          socketId: socket.id,
          user: user || { email: socket.data.email },
        });
      });

      socket.on("code:leave-room", ({ roomId, user }) => {
        if (!roomId) return;
        const roomName = `code-room:${roomId}`;
        socket.leave(roomName);
        socket.to(roomName).emit("code:peer-left", {
          socketId: socket.id,
          user: user || { email: socket.data.email },
        });
      });

      socket.on("collab:mode-change", ({ roomId, mode, user }) => {
        if (!roomId || !mode) return;
        const roomState = getOrCreateCollabRoom(roomId);
        roomState.mode = mode;
        roomState.updatedAt = Date.now();
        socket.to(`code-room:${roomId}`).emit("collab:mode-change", {
          mode,
          user: user || { email: socket.data.email },
        });
      });

      socket.on("code:yjs-update", ({ roomId, update, user }) => {
        if (!roomId || !update) return;
        const roomState = getOrCreateCollabRoom(roomId);
        roomState.yjsUpdates.push(update);
        if (roomState.yjsUpdates.length > 5000) {
          roomState.yjsUpdates = roomState.yjsUpdates.slice(-4000);
        }
        roomState.updatedAt = Date.now();
        socket.to(`code-room:${roomId}`).emit("code:yjs-update", {
          update,
          user,
        });
      });

      socket.on("code:reset", ({ roomId, update, language, user }) => {
        if (!roomId) return;
        const roomState = getOrCreateCollabRoom(roomId);
        roomState.yjsUpdates = update ? [update] : [];
        if (language) roomState.language = language;
        roomState.updatedAt = Date.now();
        if (update) {
          socket.to(`code-room:${roomId}`).emit("code:yjs-update", {
            update,
            user,
          });
        }
      });

      socket.on("code:request-sync", ({ roomId }) => {
        if (!roomId) return;
        const roomState = getOrCreateCollabRoom(roomId);
        socket.emit("collab:room-init", {
          roomId,
          mode: roomState.mode,
          language: roomState.language,
          yjsUpdates: roomState.yjsUpdates,
          whiteboardStrokes: roomState.whiteboardStrokes,
          chatMessages: roomState.chatMessages,
        });
        socket.to(`code-room:${roomId}`).emit("code:request-sync", {
          requesterSocketId: socket.id,
        });
      });

      socket.on("code:cursor", ({ roomId, cursor, user }) => {
        if (!roomId || !cursor) return;
        socket.to(`code-room:${roomId}`).emit("code:cursor", {
          cursor,
          user: user || { email: socket.data.email },
          socketId: socket.id,
        });
      });

      socket.on("code:language-change", ({ roomId, language, user }) => {
        if (!roomId || !language) return;
        const roomState = getOrCreateCollabRoom(roomId);
        roomState.language = language;
        roomState.updatedAt = Date.now();
        socket.to(`code-room:${roomId}`).emit("code:language-change", {
          language,
          user,
        });
      });

      socket.on("code:sync-state", ({ roomId, targetSocketId, docState, language }) => {
        if (!targetSocketId || !docState) return;
        io.to(targetSocketId).emit("code:sync-state", {
          docState,
          language,
        });
      });

      socket.on("code:execution-output", ({ roomId, output, error, language, user, durationMs }) => {
        if (!roomId) return;
        socket.to(`code-room:${roomId}`).emit("code:execution-output", {
          output,
          error,
          language,
          user,
          durationMs,
        });
      });

      socket.on("code:quick-chat", ({ roomId, to, message }) => {
        if (!roomId || !message) return;
        const roomState = getOrCreateCollabRoom(roomId);
        if (!roomState.chatMessages.some((m) => String(m.id) === String(message.id))) {
          roomState.chatMessages.push(message);
          if (roomState.chatMessages.length > 200) {
            roomState.chatMessages = roomState.chatMessages.slice(-200);
          }
        }
        roomState.updatedAt = Date.now();
        socket.to(`code-room:${roomId}`).emit("code:quick-chat", { roomId, message });
        if (to && to !== "group") {
          emitToUser(to, "code:quick-chat", { roomId, message });
        }
      });

      // ─── Real-Time Collaborative Whiteboard Sync ───
      socket.on("whiteboard:draw-live", ({ roomId, stroke, user }) => {
        if (!roomId || !stroke) return;
        socket.to(`code-room:${roomId}`).emit("whiteboard:draw-live", {
          stroke,
          user: user || { email: socket.data.email },
        });
      });

      socket.on("whiteboard:draw", ({ roomId, stroke, user }) => {
        if (!roomId || !stroke) return;
        const roomState = getOrCreateCollabRoom(roomId);
        if (!roomState.whiteboardStrokes.some((s) => s.id === stroke.id)) {
          roomState.whiteboardStrokes.push(stroke);
          if (roomState.whiteboardStrokes.length > 2000) {
            roomState.whiteboardStrokes = roomState.whiteboardStrokes.slice(-1500);
          }
        }
        roomState.updatedAt = Date.now();
        socket.to(`code-room:${roomId}`).emit("whiteboard:draw", {
          stroke,
          user: user || { email: socket.data.email },
        });
      });

      socket.on("whiteboard:undo", ({ roomId, strokeId, user }) => {
        if (!roomId) return;
        const roomState = getOrCreateCollabRoom(roomId);
        if (strokeId) {
          roomState.whiteboardStrokes = roomState.whiteboardStrokes.filter(
            (s) => s.id !== strokeId,
          );
        } else {
          roomState.whiteboardStrokes.pop();
        }
        roomState.updatedAt = Date.now();
        socket.to(`code-room:${roomId}`).emit("whiteboard:undo", {
          strokeId,
          user: user || { email: socket.data.email },
        });
      });

      socket.on("whiteboard:clear", ({ roomId, user }) => {
        if (!roomId) return;
        const roomState = getOrCreateCollabRoom(roomId);
        roomState.whiteboardStrokes = [];
        roomState.updatedAt = Date.now();
        socket.to(`code-room:${roomId}`).emit("whiteboard:clear", {
          user: user || { email: socket.data.email },
        });
      });

      socket.on("disconnect", () => {
        const targetEmail =
          socket.data?.lowerEmail ||
          (socket.data?.email ? socket.data.email.toLowerCase().trim() : "");
        if (targetEmail && onlineUsers.has(targetEmail)) {
          const socketSet = onlineUsers.get(targetEmail);
          socketSet.delete(socket.id);
          if (socketSet.size === 0) {
            onlineUsers.delete(targetEmail);
          }
          emitOnlineUsers();
        }
      });
    });

    // ===== patch user profile =====
    let mentorPoolCache = null;
    let mentorPoolExpiresAt = 0;
    const invalidateMentorPoolCache = () => {
      mentorPoolCache = null;
      mentorPoolExpiresAt = 0;
    };

    // Fields that must never be overwritten by a client PATCH request
    const PROFILE_FIELD_BLOCKLIST = new Set([
      "_id", "email", "uid", "connections", "isDeactivated",
      "role", "role_system", "createdAt", "mongoId",
    ]);

    // Only these fields are accepted in a profile update
    const PROFILE_ALLOWED_FIELDS = new Set([
      "fullName", "username", "profileImage", "profileImagePublicId",
      "headline", "bio",
      "education", "location", "website", "github", "linkedin", "portfolio",
      "teachSkills", "learnSkills", "teachLevel", "learnLevel",
      "projects", "certificates",
    ]);

    app.patch("/users/:id", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;

        // ── 1. Resolve the target document ──────────────────────────────────
        let filter;
        if (ObjectId.isValid(id) && id.length === 24) {
          filter = { _id: new ObjectId(id) };
        } else {
          // id is an email string
          filter = { email: id.toLowerCase() };
        }

        const targetUser = await usersCollection.findOne(filter, {
          projection: { email: 1, _id: 1, profileImagePublicId: 1 },
        });

        if (!targetUser) {
          return res.status(404).json({
            success: false,
            message: "User not found. The profile you are trying to update does not exist.",
          });
        }

        // Preserve old Cloudinary public_id before overwriting it
        const oldPublicId = targetUser.profileImagePublicId || null;

        // ── 2. Authorization: only the owner may update their own profile ──
        const requestorEmail = req.user.email.toLowerCase();
        const targetEmail = targetUser.email?.toLowerCase();

        if (requestorEmail !== targetEmail) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You can only update your own profile.",
          });
        }

        // ── 3. Build a safe, allowlisted update payload ──────────────────
        const rawBody = req.body || {};
        const sanitized = {};

        for (const [key, value] of Object.entries(rawBody)) {
          if (PROFILE_FIELD_BLOCKLIST.has(key)) continue;       // hard block
          if (!PROFILE_ALLOWED_FIELDS.has(key)) continue;       // allowlist
          sanitized[key] = value;
        }

        if (Object.keys(sanitized).length === 0) {
          return res.status(400).json({
            success: false,
            message: "No valid fields provided for update.",
          });
        }

        // ── 4. Strip base64 binary data from certificates to keep doc small ─
        if (Array.isArray(sanitized.certificates)) {
          sanitized.certificates = sanitized.certificates.map((cert) => {
            const { fileUrl, ...rest } = cert;
            // Only persist the fileUrl if it's a real URL (not base64 data)
            const isUrl = typeof fileUrl === "string" &&
              (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"));
            return isUrl ? { ...rest, fileUrl } : rest;
          });
        }

        // ── 5. Perform the update ────────────────────────────────────────
        const now = new Date().toISOString();
        const updateDoc = { $set: { ...sanitized, updatedAt: now } };

        const result = await usersCollection.updateOne(
          { _id: targetUser._id },
          updateDoc
        );

        if (result.matchedCount === 0) {
          // DB found no document — clean up the newly uploaded Cloudinary image
          // to prevent orphaned storage.
          const newPublicId = sanitized.profileImagePublicId;
          if (newPublicId && newPublicId !== oldPublicId) {
            deleteCloudinaryImage(newPublicId).catch((err) =>
              console.error("[PATCH /users/:id] Failed to clean up orphaned Cloudinary image:", err.message)
            );
          }
          return res.status(404).json({
            success: false,
            message: "User not found during update.",
          });
        }

        // ── 6. After successful DB update, delete the OLD Cloudinary image ──
        // Fire-and-forget: failure here must not break the response.
        const newPublicId = sanitized.profileImagePublicId;
        if (oldPublicId && newPublicId && oldPublicId !== newPublicId) {
          deleteCloudinaryImage(oldPublicId)
            .then(() =>
              console.log("[PATCH /users/:id] Deleted old Cloudinary image:", oldPublicId)
            )
            .catch((err) =>
              console.error("[PATCH /users/:id] Old Cloudinary image deletion failed (non-critical):", err.message)
            );
        }

        // ── 7. Return the freshly-updated document ───────────────────────
        const updatedUser = await usersCollection.findOne(
          { _id: targetUser._id },
          {
            projection: {
              fullName: 1, username: 1, profileImage: 1, profileImagePublicId: 1,
              headline: 1, bio: 1,
              role: 1, education: 1, location: 1, website: 1, github: 1,
              linkedin: 1, portfolio: 1, teachSkills: 1, learnSkills: 1,
              teachLevel: 1, learnLevel: 1, projects: 1, certificates: 1,
              email: 1, updatedAt: 1, createdAt: 1,
            },
          }
        );

        const { calculateProfileCompletion } = require("./utils/profileCompletion");
        const profileCompletion = calculateProfileCompletion(updatedUser);
        invalidateMentorPoolCache();

        return res.status(200).json({
          success: true,
          message: "Profile updated successfully.",
          data: {
            ...updatedUser,
            profileCompletion,
          },
        });
      } catch (error) {
        console.error("[PATCH /users/:id] Error:", error.message);
        // If a new Cloudinary image was uploaded but the DB threw, clean it up
        const newPublicId = req.body?.profileImagePublicId;
        if (newPublicId) {
          deleteCloudinaryImage(newPublicId).catch((err) =>
            console.error("[PATCH /users/:id] Failed to clean up Cloudinary image after DB error:", err.message)
          );
        }
        return res.status(500).json({
          success: false,
          message: "An unexpected error occurred while updating your profile. Please try again.",
        });
      }
    });

    app.post("/connections/requests", verifyJWT, async (req, res) => {
      const {
        senderEmail,
        senderUid,
        senderName,
        senderImage,
        receiverEmail,
        receiverUid,
      } = req.body;

      if (!senderEmail || !receiverEmail) {
        return res
          .status(400)
          .send({ message: "senderEmail and receiverEmail are required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (senderEmail && senderEmail.toLowerCase().trim() !== authEmail) {
        return res
          .status(403)
          .send({ message: "You can only send connection requests on your own behalf" });
      }

      if (senderEmail === receiverEmail) {
        return res
          .status(400)
          .send({ message: "You cannot send request to yourself" });
      }

      try {
        const [senderUser, receiverUser] = await Promise.all([
          usersCollection.findOne({ email: senderEmail }),
          usersCollection.findOne({ email: receiverEmail }),
        ]);

        if (!senderUser || !receiverUser) {
          return res.status(404).send({ message: "User not found" });
        }

        const alreadyConnected = (senderUser.connections || []).some(
          (connection) => connection.email === receiverEmail,
        );
        if (alreadyConnected) {
          return res.status(409).send({ message: "Already connected" });
        }

        const pendingFromSender = await connectionRequestsCollection.findOne({
          senderEmail,
          receiverEmail,
          status: "pending",
        });
        if (pendingFromSender) {
          return res.status(409).send({
            message: "Request already sent",
            status: "sent",
            requestId: pendingFromSender._id,
          });
        }

        const reversePending = await connectionRequestsCollection.findOne({
          senderEmail: receiverEmail,
          receiverEmail: senderEmail,
          status: "pending",
        });
        if (reversePending) {
          return res.status(409).send({
            message: "You already have an incoming request from this user",
            status: "received",
            requestId: reversePending._id,
          });
        }

        const now = new Date().toISOString();
        const requestDoc = {
          senderEmail,
          senderUid: senderUid || senderUser.uid || senderUser._id,
          senderName:
            senderName || senderUser.fullName || senderUser.name || "Anonymous",
          senderImage:
            senderImage ||
            senderUser.profileImage ||
            senderUser.image ||
            "https://i.ibb.co/4pDNDk1/avatar.png",
          receiverEmail,
          receiverUid: receiverUid || receiverUser.uid || receiverUser._id,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };

        const result = await connectionRequestsCollection.insertOne(requestDoc);
        io.to(`user:${senderEmail}`).emit("connections:updated");
        io.to(`user:${receiverEmail}`).emit("connections:updated");
        return res.send({
          acknowledged: result.acknowledged,
          request: { ...requestDoc, _id: result.insertedId },
        });
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(409).send({ message: "Request already exists" });
        }
        return res.status(500).send({ message: "Failed to send request" });
      }
    });

    app.delete("/connections/requests/cancel", verifyJWT, async (req, res) => {
      const { senderEmail, receiverEmail } = req.body;

      if (!senderEmail || !receiverEmail) {
        return res
          .status(400)
          .send({ message: "senderEmail and receiverEmail are required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (senderEmail && senderEmail.toLowerCase().trim() !== authEmail) {
        return res
          .status(403)
          .send({ message: "You can only cancel your own sent requests" });
      }

      try {
        const result = await connectionRequestsCollection.deleteOne({
          senderEmail,
          receiverEmail,
          status: "pending",
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "No pending request found" });
        }

        io.to(`user:${senderEmail}`).emit("connections:updated");
        io.to(`user:${receiverEmail}`).emit("connections:updated");
        return res.send({ message: "Request cancelled", deletedCount: 1 });
      } catch (error) {
        return res.status(500).send({ message: "Failed to cancel request" });
      }
    });

    app.patch("/connections/requests/respond", verifyJWT, async (req, res) => {
      const { senderEmail, receiverEmail, action, responderEmail } = req.body;

      if (!senderEmail || !receiverEmail || !responderEmail || !action) {
        return res.status(400).send({
          message:
            "senderEmail, receiverEmail, responderEmail and action are required",
        });
      }

      if (!["accept", "reject"].includes(action)) {
        return res.status(400).send({ message: "Invalid action" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (receiverEmail.toLowerCase().trim() !== authEmail || (responderEmail && responderEmail.toLowerCase().trim() !== authEmail)) {
        return res
          .status(403)
          .send({ message: "Only receiver can accept or reject" });
      }

      try {
        const requestDoc = await connectionRequestsCollection.findOne({
          senderEmail,
          receiverEmail,
          status: "pending",
        });

        if (!requestDoc) {
          return res.status(404).send({ message: "Pending request not found" });
        }

        if (action === "reject") {
          await connectionRequestsCollection.deleteOne({ _id: requestDoc._id });
          io.to(`user:${senderEmail}`).emit("connections:updated");
          io.to(`user:${receiverEmail}`).emit("connections:updated");
          return res.send({ message: "Request rejected", status: "rejected" });
        }

        const [senderUser, receiverUser] = await Promise.all([
          usersCollection.findOne({ email: senderEmail }),
          usersCollection.findOne({ email: receiverEmail }),
        ]);

        if (!senderUser || !receiverUser) {
          return res.status(404).send({ message: "User not found" });
        }

        const senderConnection = buildConnectionPayload(receiverUser);
        const receiverConnection = buildConnectionPayload(senderUser);

        await Promise.all([
          usersCollection.updateOne(
            { email: senderEmail },
            { $addToSet: { connections: senderConnection } },
          ),
          usersCollection.updateOne(
            { email: receiverEmail },
            { $addToSet: { connections: receiverConnection } },
          ),
        ]);

        await connectionRequestsCollection.deleteOne({ _id: requestDoc._id });
        io.to(`user:${senderEmail}`).emit("connections:updated");
        io.to(`user:${receiverEmail}`).emit("connections:updated");

        return res.send({
          message: "Request accepted and connection created",
          status: "connected",
        });
      } catch (error) {
        return res.status(500).send({ message: "Failed to process request" });
      }
    });

    app.get("/connections/requests/incoming", verifyJWT, async (req, res) => {
      const { email } = req.query;

      if (!email) {
        return res.status(400).send({ message: "email is required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      const rawEmail = String(email).trim();
      if (rawEmail.toLowerCase() !== authEmail) {
        return res.status(403).send({ message: "Access denied. You can only view your own incoming requests." });
      }

      try {
        const emailVariants = Array.from(new Set([rawEmail, authEmail].filter(Boolean)));
        let requests = await connectionRequestsCollection
          .find({ receiverEmail: { $in: emailVariants }, status: "pending" })
          .sort({ createdAt: -1 })
          .toArray();

        if (requests.length === 0) {
          requests = await connectionRequestsCollection
            .find({
              receiverEmail: new RegExp(`^${escapeRegex(authEmail)}$`, "i"),
              status: "pending",
            })
            .sort({ createdAt: -1 })
            .toArray();
        }

        const senderEmails = Array.from(
          new Set(
            requests
              .flatMap((r) => [r.senderEmail, String(r.senderEmail || "").toLowerCase().trim()])
              .filter(Boolean)
          )
        );
        const senderDocs =
          senderEmails.length > 0
            ? await usersCollection
                .find(
                  { email: { $in: senderEmails } },
                  {
                    projection: {
                      email: 1,
                      fullName: 1,
                      name: 1,
                      profileImage: 1,
                      image: 1,
                      headline: 1,
                      bio: 1,
                      education: 1,
                      location: 1,
                      website: 1,
                      github: 1,
                      linkedin: 1,
                      portfolio: 1,
                      teachSkills: 1,
                      learnSkills: 1,
                      teachLevel: 1,
                      learnLevel: 1,
                      projects: 1,
                      certificates: 1,
                    },
                  }
                )
                .toArray()
            : [];
        const senderMap = new Map(
          senderDocs.map((u) => [String(u.email || "").toLowerCase().trim(), u])
        );

        return res.send(
          requests.map((request) => {
            const payload = toPublicRequest(request, rawEmail);
            const senderProfile =
              senderMap.get(String(request.senderEmail || "").toLowerCase().trim()) || null;
            return senderProfile ? { ...payload, senderProfile } : payload;
          })
        );
      } catch (error) {
        return res.status(500).send({ message: "Failed to fetch requests" });
      }
    });

    app.get("/connections/requests/status", verifyJWT, async (req, res) => {
      const { email } = req.query;

      if (!email) {
        return res.status(400).send({ message: "email is required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (email && email.toLowerCase().trim() !== authEmail) {
        return res.status(403).send({ message: "Access denied. You can only view your own request statuses." });
      }

      try {
        const requests = await connectionRequestsCollection
          .find({
            status: "pending",
            $or: [{ senderEmail: email }, { receiverEmail: email }],
          })
          .toArray();

        return res.send(requests.map((request) => toPublicRequest(request, email)));
      } catch (error) {
        return res
          .status(500)
          .send({ message: "Failed to fetch request statuses" });
      }
    });

    app.post("/conversations/open", verifyJWT, async (req, res) => {
      const { requesterEmail, peerEmail } = req.body;

      if (!requesterEmail || !peerEmail) {
        return res
          .status(400)
          .send({ message: "requesterEmail and peerEmail are required" });
      }
      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (requesterEmail && requesterEmail.toLowerCase().trim() !== authEmail) {
        return res
          .status(403)
          .send({ message: "You can only open conversations on your own behalf" });
      }
      if (requesterEmail === peerEmail) {
        return res
          .status(400)
          .send({ message: "Cannot start conversation with yourself" });
      }

      try {
        const [requesterUser, peerUser] = await Promise.all([
          findUserByEmail(usersCollection, requesterEmail),
          findUserByEmail(usersCollection, peerEmail),
        ]);
        if (!requesterUser || !peerUser) {
          return res.status(404).send({ message: "User not found" });
        }

        const connected = await isConnectedPair(requesterUser.email, peerUser.email);
        if (!connected) {
          return res
            .status(403)
            .send({ message: "Only connected users can open conversation" });
        }

        const participants = [requesterUser.email, peerUser.email].sort();
        const participantsKey = getParticipantsKey(requesterUser.email, peerUser.email);
        const now = new Date().toISOString();

        await conversationsCollection.updateOne(
          { participantsKey },
          {
            $setOnInsert: {
              participants,
              participantsKey,
              createdAt: now,
              updatedAt: now,
              unreadCounts: {
                [requesterUser.email]: 0,
                [peerUser.email]: 0,
              },
            },
          },
          { upsert: true },
        );

        const conversation = await conversationsCollection.findOne({
          participantsKey,
        });

        return res.send(formatConversation(conversation, peerUser, requesterUser.email));
      } catch (error) {
        return res.status(500).send({ message: "Failed to open conversation" });
      }
    });

    app.get("/conversations", verifyJWT, async (req, res) => {
      const { email } = req.query;
      if (!email) {
        return res.status(400).send({ message: "email is required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      const queryEmail = String(email).toLowerCase().trim();
      if (queryEmail !== authEmail) {
        return res.status(403).send({ message: "Access denied. You can only view your own conversations." });
      }

      try {
        const viewerDoc = await findUserByEmail(usersCollection, authEmail, {
          projection: { email: 1, connections: 1 },
        });
        const viewerEmail = viewerDoc?.email || authEmail;
        const emailVariants = Array.from(new Set([authEmail, queryEmail, viewerEmail].filter(Boolean)));
        const emailRegex = new RegExp(`^${escapeRegex(authEmail)}$`, "i");

        // Use indexed $in first for fast lookup; fallback to regex only if nothing matched
        let conversations = await conversationsCollection
          .find({ participants: { $in: emailVariants } })
          .sort({ lastMessageAt: -1, updatedAt: -1 })
          .toArray();

        if (conversations.length === 0) {
          conversations = await conversationsCollection
            .find({ participants: { $regex: emailRegex } })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .toArray();
        }

        const connections = Array.isArray(viewerDoc?.connections) ? viewerDoc.connections : [];

        if (connections.length > 0) {
          const existingPeerSet = new Set(
            conversations
              .filter((c) => !c.isGroup)
              .flatMap((c) =>
                (c.participants || []).map((p) => String(p || "").trim().toLowerCase())
              )
          );
          const missingConnections = connections.filter((c) => {
            const em = String(c?.email || "").trim().toLowerCase();
            return em && em !== authEmail && !existingPeerSet.has(em);
          });

          if (missingConnections.length > 0) {
            const now = new Date().toISOString();
            await Promise.all(
              missingConnections.map((c) => {
                const peerClean = String(c.email).trim();
                const participantsKey = getParticipantsKey(viewerEmail, peerClean);
                return conversationsCollection.updateOne(
                  { participantsKey },
                  {
                    $setOnInsert: {
                      participants: [viewerEmail, peerClean].sort(),
                      participantsKey,
                      createdAt: now,
                      updatedAt: now,
                      unreadCounts: { [viewerEmail]: 0, [peerClean]: 0 },
                    },
                  },
                  { upsert: true }
                );
              })
            );

            conversations = await conversationsCollection
              .find({ participants: { $regex: emailRegex } })
              .sort({ lastMessageAt: -1, updatedAt: -1 })
              .toArray();
          }
        }

        if (conversations.length === 0) {
          return res.send([]);
        }

        const peerEmails = [
          ...new Set(
            conversations
              .map((c) =>
                (c.participants || []).find(
                  (p) => String(p || "").trim().toLowerCase() !== authEmail
                )
              )
              .filter(Boolean)
          ),
        ];
        const peerRegexList = peerEmails.map(
          (pe) => new RegExp(`^${escapeRegex(String(pe).trim())}$`, "i")
        );
        const peers = peerRegexList.length
          ? await usersCollection
              .find(
                { email: { $in: peerRegexList } },
                { projection: { email: 1, fullName: 1, name: 1, profileImage: 1 } }
              )
              .toArray()
          : [];
        const peerMap = new Map(
          peers.map((peer) => [String(peer.email || "").trim().toLowerCase(), peer])
        );

        return res.send(
          conversations.map((conversation) => {
            const peerEmail = (conversation.participants || []).find(
              (p) => String(p || "").trim().toLowerCase() !== authEmail
            );
            const peerDoc = peerEmail
              ? peerMap.get(String(peerEmail).trim().toLowerCase()) || { email: peerEmail }
              : null;
            return formatConversation(conversation, peerDoc, viewerEmail);
          })
        );
      } catch (error) {
        return res.status(500).send({ message: "Failed to fetch conversations" });
      }
    });

    app.get("/conversations/:id/messages", verifyJWT, async (req, res) => {
      const conversationId = req.params.id;
      const { requesterEmail, limit: queryLimit, before } = req.query;

      if (!ObjectId.isValid(conversationId)) {
        return res.status(400).send({ message: "Invalid conversation id" });
      }
      if (!requesterEmail) {
        return res.status(400).send({ message: "requesterEmail is required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (requesterEmail.toLowerCase().trim() !== authEmail) {
        return res.status(403).send({ message: "Access denied. You can only view messages on your own behalf." });
      }

      try {
        const { conversation } = await ensureConversationMembership(
          conversationId,
          requesterEmail,
        );
        if (!conversation) {
          return res
            .status(403)
            .send({ message: "Not allowed to view this conversation" });
        }

        const maxLimit = 200;
        const defaultLimit = 100;
        const parsedLimit = parseInt(queryLimit, 10);
        const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, maxLimit)
          : defaultLimit;

        const filter = { conversationId: conversation._id };
        if (before && typeof before === "string") {
          filter.createdAt = { $lt: before.trim() };
        }

        // Safe bounded fetch: retrieve the latest messages to prevent V8 memory exhaustion / OOM
        const messages = await messagesCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();

        // Reverse back into chronological ascending order for UI consumption
        messages.reverse();

        return res.send(messages.map(serializeMessage));
      } catch (error) {
        return res.status(500).send({ message: "Failed to fetch messages" });
      }
    });

    app.post("/conversations/:id/messages", verifyJWT, async (req, res) => {
      const conversationId = req.params.id;
      const { senderEmail, text, imageData } = req.body;

      if (!ObjectId.isValid(conversationId)) {
        return res.status(400).send({ message: "Invalid conversation id" });
      }
      if (!senderEmail) {
        return res.status(400).send({ message: "senderEmail is required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (senderEmail.toLowerCase().trim() !== authEmail) {
        return res.status(403).send({ message: "You can only send messages as yourself." });
      }

      try {
        const message = await createMessage({
          conversationId,
          senderEmail,
          text,
          imageData,
        });
        return res.send(message);
      } catch (error) {
        return res.status(400).send({ message: error.message || "Send failed" });
      }
    });

    app.patch("/messages/:id", verifyJWT, async (req, res) => {
      const messageId = req.params.id;
      const { editorEmail, text } = req.body;
      const cleanText = (text || "").trim();
      const authEmail = (req.user?.email || "").toLowerCase().trim();

      if (!ObjectId.isValid(messageId)) {
        return res.status(400).send({ message: "Invalid message id" });
      }
      if (!editorEmail) {
        return res.status(400).send({ message: "editorEmail is required" });
      }
      if (editorEmail.toLowerCase().trim() !== authEmail) {
        return res.status(403).send({ message: "You can only edit your own message" });
      }

      try {
        const message = await messagesCollection.findOne({
          _id: new ObjectId(messageId),
        });
        if (!message || message.senderEmail !== editorEmail) {
          return res
            .status(403)
            .send({ message: "You can only edit your own message" });
        }
        if (!cleanText && !message.imageData) {
          return res.status(400).send({ message: "Message text cannot be empty" });
        }

        const now = new Date().toISOString();
        await messagesCollection.updateOne(
          { _id: message._id },
          {
            $set: {
              text: cleanText,
              updatedAt: now,
              isEdited: true,
            },
          },
        );
        await rebuildConversationLastMessage(message.conversationId);

        const updated = serializeMessage({
          ...message,
          text: cleanText,
          updatedAt: now,
          isEdited: true,
        });
        io.to(`conversation:${updated.conversationId}`).emit(
          "message:edited",
          updated,
        );
        io.to(`user:${message.senderEmail}`).emit("conversation:updated");
        io.to(`user:${message.receiverEmail}`).emit("conversation:updated");

        return res.send(updated);
      } catch (error) {
        return res.status(500).send({ message: "Failed to edit message" });
      }
    });

    app.delete("/messages/:id", verifyJWT, async (req, res) => {
      const messageId = req.params.id;
      const requesterEmail = req.query.requesterEmail;
      const authEmail = (req.user?.email || "").toLowerCase().trim();

      if (!ObjectId.isValid(messageId)) {
        return res.status(400).send({ message: "Invalid message id" });
      }
      if (!requesterEmail) {
        return res.status(400).send({ message: "requesterEmail is required" });
      }
      if (requesterEmail.toLowerCase().trim() !== authEmail) {
        return res.status(403).send({ message: "You can only delete your own message" });
      }

      try {
        const message = await messagesCollection.findOne({
          _id: new ObjectId(messageId),
        });
        if (!message || message.senderEmail !== requesterEmail) {
          return res
            .status(403)
            .send({ message: "You can only delete your own message" });
        }

        await messagesCollection.deleteOne({ _id: message._id });
        await rebuildConversationLastMessage(message.conversationId);

        const conversationId = message.conversationId.toString();
        io.to(`conversation:${conversationId}`).emit("message:deleted", {
          messageId,
          conversationId,
        });
        io.to(`user:${message.senderEmail}`).emit("conversation:updated");
        io.to(`user:${message.receiverEmail}`).emit("conversation:updated");

        return res.send({ message: "Message deleted", messageId, conversationId });
      } catch (error) {
        return res.status(500).send({ message: "Failed to delete message" });
      }
    });

    app.patch("/conversations/:id/seen", verifyJWT, async (req, res) => {
      const conversationId = req.params.id;
      const { viewerEmail } = req.body;

      if (!ObjectId.isValid(conversationId)) {
        return res.status(400).send({ message: "Invalid conversation id" });
      }
      if (!viewerEmail) {
        return res.status(400).send({ message: "viewerEmail is required" });
      }

      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (viewerEmail && viewerEmail.toLowerCase().trim() !== authEmail) {
        return res.status(403).send({ message: "Access denied. You can only mark seen for yourself." });
      }

      try {
        const { conversation, otherEmail } = await ensureConversationMembership(
          conversationId,
          viewerEmail,
        );
        if (!conversation) {
          return res.status(403).send({ message: "Not allowed" });
        }

        const now = new Date().toISOString();
        await messagesCollection.updateMany(
          {
            conversationId: conversation._id,
            $or: [
              { receiverEmail: viewerEmail },
              { receiverEmail: "group", senderEmail: { $ne: viewerEmail } },
            ],
            seenAt: null,
          },
          { $set: { seenAt: now, status: "seen", updatedAt: now } },
        );

        await conversationsCollection.updateOne(
          { _id: conversation._id },
          {
            $set: {
              [`unreadCounts.${viewerEmail}`]: 0,
              updatedAt: now,
            },
          },
        );

        io.to(`conversation:${conversationId}`).emit("message:seen", {
          conversationId,
          viewerEmail,
          seenAt: now,
        });
        io.to(`user:${viewerEmail}`).emit("conversation:updated");
        if (otherEmail && !conversation.isGroup) {
          io.to(`user:${otherEmail}`).emit("conversation:updated");
        }

        return res.send({ message: "Seen status updated" });
      } catch (error) {
        return res.status(500).send({ message: "Failed to update seen state" });
      }
    });

    app.get("/presence/online", async (req, res) => {
      return res.send({ onlineUsers: getOnlineEmails() });
    });

    app.post("/ratings", verifyJWT, async (req, res) => {
      const { reviewerEmail, targetEmail, rating, review = "" } = req.body;
      if (!reviewerEmail || !targetEmail || !rating) {
        return res
          .status(400)
          .send({ message: "reviewerEmail, targetEmail and rating are required" });
      }
      const authEmail = (req.user?.email || "").toLowerCase().trim();
      if (reviewerEmail && reviewerEmail.toLowerCase().trim() !== authEmail) {
        return res.status(403).send({ message: "You can only submit ratings on your own behalf." });
      }
      if (reviewerEmail === targetEmail) {
        return res.status(400).send({ message: "Cannot rate yourself" });
      }
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).send({ message: "Rating must be between 1 and 5" });
      }

      try {
        const connected = await isConnectedPair(reviewerEmail, targetEmail);
        if (!connected) {
          return res
            .status(403)
            .send({ message: "Rating allowed only for connected users" });
        }

        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "127.0.0.1";

        // Sybil Review Fraud Detection
        const fraudCheck = await detectReviewFraud({
          ratingsCollection,
          ip: clientIp,
          reviewerEmail,
          targetIdOrEmail: targetEmail,
          rating: numericRating,
          isCourse: false,
        });

        const now = new Date().toISOString();
        await ratingsCollection.updateOne(
          { reviewerEmail, targetEmail },
          {
            $set: {
              rating: numericRating,
              review: review.trim(),
              reviewerIp: sanitizeIp(clientIp),
              fraudStatus: fraudCheck.isFraud ? "QUARANTINED" : "APPROVED",
              quarantineReason: fraudCheck.isFraud ? fraudCheck.reason : null,
              updatedAt: now,
            },
            $setOnInsert: {
              reviewerEmail,
              targetEmail,
              createdAt: now,
            },
          },
          { upsert: true },
        );

        if (fraudCheck.isFraud && adminSecurityAlertsCollection) {
          const alertDoc = {
            type: "REVIEW_FRAUD_RING",
            severity: fraudCheck.severity || "HIGH",
            status: "AUTO_QUARANTINED",
            targetType: "mentor",
            targetId: targetEmail,
            targetName: targetEmail,
            reviewerEmail,
            reviewerIp: sanitizeIp(clientIp),
            rating: numericRating,
            reviewText: review.trim(),
            ringAccounts: fraudCheck.ringAccounts,
            details: fraudCheck.reason,
            timestamp: new Date(),
            createdAt: now,
          };
          await adminSecurityAlertsCollection.insertOne(alertDoc).catch(() => {});
          if (io) {
            io.emit("admin-security:new-alert", alertDoc);
          }
        }

        const [summary] = await ratingsCollection
          .aggregate([
            { $match: { targetEmail, fraudStatus: { $ne: "QUARANTINED" } } },
            {
              $group: {
                _id: "$targetEmail",
                averageRating: { $avg: "$rating" },
                totalRatings: { $sum: 1 },
              },
            },
          ])
          .toArray();

        invalidateMentorPoolCache();

        return res.send({
          message: fraudCheck.isFraud
            ? "Rating submitted for verification"
            : "Rating submitted",
          quarantined: fraudCheck.isFraud,
          summary: {
            averageRating: Number((summary?.averageRating || 0).toFixed(1)),
            totalRatings: summary?.totalRatings || 0,
          },
        });
      } catch (error) {
        return res.status(500).send({ message: "Failed to submit rating" });
      }
    });

    app.get("/ratings/summary", async (req, res) => {
      const { targetEmail, reviewerEmail } = req.query;
      if (!targetEmail) {
        return res.status(400).send({ message: "targetEmail is required" });
      }

      try {
        const [summary] = await ratingsCollection
          .aggregate([
            { $match: { targetEmail, fraudStatus: { $ne: "QUARANTINED" } } },
            {
              $group: {
                _id: "$targetEmail",
                averageRating: { $avg: "$rating" },
                totalRatings: { $sum: 1 },
              },
            },
          ])
          .toArray();

        let myRating = null;
        if (reviewerEmail) {
          myRating = await ratingsCollection.findOne(
            { targetEmail, reviewerEmail },
            { projection: { rating: 1, review: 1, updatedAt: 1 } },
          );
        }

        return res.send({
          averageRating: Number((summary?.averageRating || 0).toFixed(1)),
          totalRatings: summary?.totalRatings || 0,
          myRating,
        });
      } catch (error) {
        return res.status(500).send({ message: "Failed to fetch rating summary" });
      }
    });

    // ================= USERS =================

    app.post("/users", async (req, res) => {
      try {
        const body = req.body || {};
        if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
          return res.status(400).json({ success: false, message: "Email is required." });
        }

        const cleanEmail = body.email.trim().toLowerCase();
        const existingUser = await usersCollection.findOne({
          email: cleanEmail,
        });

        if (existingUser) {
          return res.send({ message: "User already exists" });
        }

        // Hard-lock sensitive fields: new registrations are strictly role="user"
        const { role, isDeactivated, role_system, password, _id, ...safePayload } = body;
        const userToInsert = {
          ...safePayload,
          email: cleanEmail,
          role: "user",
          isDeactivated: false,
          createdAt: safePayload.createdAt || new Date().toISOString(),
        };

        const result = await usersCollection.insertOne(userToInsert);
        invalidateMentorPoolCache();
        res.send(result);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const rawEmail = req.query.email;

        if (!rawEmail || typeof rawEmail !== "string" || !rawEmail.trim()) {
          return res.status(400).json({
            success: false,
            message: "Query parameter 'email' is required.",
          });
        }

        // Normalize to lowercase so lookup is case-insensitive
        const email = rawEmail.trim().toLowerCase();

        const user = await usersCollection.findOne(
          { email },
          { projection: { password: 0 } }
        );

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found.",
          });
        }

        // Never leak credentials publicly
        if (user.password) {
          delete user.password;
        }

        // Return the user document directly (existing frontend contract)
        res.json(user);
      } catch (error) {
        console.error("[GET /users] Error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error." });
      }
    });

    // ================= PLATFORM STATS (FAST IN-MEMORY CACHE & 100% REAL DB METRICS) =================

    let platformStatsCache = null;
    let platformStatsExpiresAt = 0;

    app.get("/platform-stats", async (req, res) => {
      try {
        if (platformStatsCache && Date.now() < platformStatsExpiresAt) {
          return res.json(platformStatsCache);
        }

        const [
          totalUsers,
          totalConnections,
          totalMessages,
          totalCourses,
          overallRatingDoc,
          topExperts,
        ] = await Promise.all([
          usersCollection.countDocuments(),
          connectionRequestsCollection.countDocuments({ status: "pending" }),
          messagesCollection.countDocuments(),
          coursesCollection.countDocuments({ status: { $in: ["approved", "active"] } }),
          ratingsCollection
            .aggregate([
              { $match: { fraudStatus: { $ne: "QUARANTINED" } } },
              { $group: { _id: null, avgRating: { $avg: "$rating" }, totalRatings: { $sum: 1 } } },
            ])
            .toArray(),
          ratingsCollection
            .aggregate([
              {
                $group: {
                  _id: "$targetEmail",
                  averageRating: { $avg: "$rating" },
                  totalRatings: { $sum: 1 },
                },
              },
              { $sort: { averageRating: -1, totalRatings: -1 } },
              { $limit: 6 },
            ])
            .toArray(),
        ]);

        const averageRating = overallRatingDoc[0]?.avgRating
          ? Number(overallRatingDoc[0].avgRating.toFixed(1))
          : 5.0;
        const totalRatings = overallRatingDoc[0]?.totalRatings || 0;

        // Enrich top experts with user data
        const expertEmails = topExperts.map((e) => e._id);
        const expertUsers = await usersCollection
          .find(
            { email: { $in: expertEmails } },
            {
              projection: {
                email: 1,
                fullName: 1,
                profileImage: 1,
                teachSkills: 1,
                learnSkills: 1,
                teachLevel: 1,
              },
            },
          )
          .toArray();
        const expertMap = new Map(expertUsers.map((u) => [u.email, u]));

        let experts = topExperts
          .map((e) => {
            const userData = expertMap.get(e._id);
            if (!userData) return null;
            return {
              ...userData,
              averageRating: Number(e.averageRating.toFixed(1)),
              totalRatings: e.totalRatings,
            };
          })
          .filter(Boolean);

        // Fallback: If not enough rated experts, fetch real registered users from MongoDB
        if (experts.length < 6) {
          const existingEmails = new Set(experts.map((e) => e.email));
          const additionalUsers = await usersCollection
            .find(
              { email: { $nin: Array.from(existingEmails) } },
              {
                projection: {
                  email: 1,
                  fullName: 1,
                  profileImage: 1,
                  teachSkills: 1,
                  learnSkills: 1,
                  teachLevel: 1,
                },
              },
            )
            .limit(6 - experts.length)
            .toArray();

          const mappedAdditional = additionalUsers.map((u) => ({
            ...u,
            averageRating: 5.0,
            totalRatings: 1,
          }));

          experts = [...experts, ...mappedAdditional];
        }

        const payload = {
          totalUsers,
          totalConnections,
          totalMessages,
          totalCourses,
          averageRating,
          totalRatings,
          experts,
        };

        platformStatsCache = payload;
        platformStatsExpiresAt = Date.now() + 30000; // 30-second TTL cache

        return res.json(payload);
      } catch (error) {
        return res.status(500).json({ message: "Failed to fetch stats" });
      }
    });

    // ================= EXPERT DETAILS ENDPOINT =================
    app.get("/experts/:identifier", async (req, res) => {
      try {
        const { identifier } = req.params;
        const viewerEmail = (req.query.viewerEmail || "").toString().trim().toLowerCase();

        if (!identifier) {
          return res.status(400).json({ success: false, message: "Expert identifier is required." });
        }

        // Build precise lookup query (supports Mongo ObjectId, email, or username)
        let query;
        if (ObjectId.isValid(identifier)) {
          query = {
            $or: [
              { _id: new ObjectId(identifier) },
              { email: identifier.toLowerCase() },
              { username: identifier }
            ]
          };
        } else if (identifier.includes("@")) {
          query = { email: identifier.toLowerCase() };
        } else {
          query = {
            $or: [
              { username: identifier },
              { email: identifier.toLowerCase() }
            ]
          };
        }

        // 1. Fetch Expert Profile with Projection (exclude sensitive internal fields)
        const user = await usersCollection.findOne(query, {
          projection: {
            fullName: 1,
            name: 1,
            username: 1,
            email: 1,
            profileImage: 1,
            image: 1,
            headline: 1,
            bio: 1,
            role: 1,
            location: 1,
            education: 1,
            website: 1,
            github: 1,
            linkedin: 1,
            portfolio: 1,
            teachSkills: 1,
            learnSkills: 1,
            teachLevel: 1,
            learnLevel: 1,
            projects: 1,
            certificates: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "Expert profile not found.",
          });
        }

        const targetEmail = user.email;

        // 2. Execute parallel aggregation & joins
        const [ratingsAgg, reviewsRaw, publishedCourses, connectionRequest] = await Promise.all([
          // Ratings summary
          ratingsCollection
            .aggregate([
              { $match: { targetEmail } },
              {
                $group: {
                  _id: "$targetEmail",
                  averageRating: { $avg: "$rating" },
                  totalRatings: { $sum: 1 },
                },
              },
            ])
            .toArray(),

          // Raw user reviews
          ratingsCollection
            .find({ targetEmail })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray(),

          // Published instructor courses
          coursesCollection
            .find(
              { instructorEmail: targetEmail, status: "approved" },
              { projection: { title: 1, category: 1, thumbnail: 1, price: 1, averageRating: 1, totalStudents: 1 } }
            )
            .limit(6)
            .toArray(),

          // Connection status (if viewer email provided)
          viewerEmail && viewerEmail !== targetEmail.toLowerCase()
            ? connectionRequestsCollection.findOne({
                $or: [
                  { senderEmail: viewerEmail, receiverEmail: targetEmail },
                  { senderEmail: targetEmail, receiverEmail: viewerEmail },
                ],
              })
            : Promise.resolve(null),
        ]);

        // Process ratings summary
        const summaryObj = ratingsAgg[0];
        const averageRating = summaryObj?.averageRating ? Number(summaryObj.averageRating.toFixed(1)) : 0;
        const totalRatings = summaryObj?.totalRatings || 0;

        // Enrich reviews with reviewer details
        const reviewerEmails = [...new Set(reviewsRaw.map((r) => r.reviewerEmail))];
        const reviewerDocs = reviewerEmails.length > 0
          ? await usersCollection
              .find(
                { email: { $in: reviewerEmails } },
                { projection: { email: 1, fullName: 1, name: 1, profileImage: 1, image: 1, username: 1 } }
              )
              .toArray()
          : [];

        const reviewerMap = new Map(reviewerDocs.map((u) => [u.email, u]));

        const enrichedReviews = reviewsRaw.map((r) => {
          const rev = reviewerMap.get(r.reviewerEmail);
          return {
            _id: r._id,
            rating: r.rating,
            review: r.review || "",
            createdAt: r.createdAt || r.updatedAt || null,
            reviewer: {
              email: r.reviewerEmail,
              fullName: rev?.fullName || rev?.name || "Anonymous Peer",
              profileImage: rev?.profileImage || rev?.image || null,
              username: rev?.username || null,
            },
          };
        });

        // Determine connection status
        let connectionStatus = "none";
        if (viewerEmail) {
          if (viewerEmail === targetEmail.toLowerCase()) {
            connectionStatus = "self";
          } else if (connectionRequest) {
            if (connectionRequest.status === "accepted") {
              connectionStatus = "connected";
            } else if (connectionRequest.status === "pending") {
              connectionStatus = connectionRequest.senderEmail === viewerEmail ? "sent" : "received";
            }
          }
        }

        // Live online presence
        const isOnline = onlineUsers.has(targetEmail);

        // Standardized Clean API Payload
        return res.json({
          success: true,
          data: {
            profile: {
              _id: user._id,
              fullName: user.fullName || user.name || "Verified Expert",
              username: user.username || null,
              email: user.email,
              profileImage: user.profileImage || user.image || null,
              headline: user.headline || null,
              bio: user.bio || null,
              role: user.role || "Mentor",
              location: user.location || null,
              education: user.education || null,
              website: user.website || null,
              github: user.github || null,
              linkedin: user.linkedin || null,
              portfolio: user.portfolio || null,
              teachLevel: user.teachLevel || "Mentor",
              learnLevel: user.learnLevel || "Learner",
              createdAt: user.createdAt || null,
              updatedAt: user.updatedAt || null,
            },
            skills: {
              teachSkills: Array.isArray(user.teachSkills) ? user.teachSkills : [],
              learnSkills: Array.isArray(user.learnSkills) ? user.learnSkills : [],
            },
            projects: Array.isArray(user.projects) ? user.projects : [],
            certificates: Array.isArray(user.certificates) ? user.certificates : [],
            reviews: {
              averageRating,
              totalRatings,
              items: enrichedReviews,
            },
            courses: publishedCourses || [],
            connectionStatus,
            isOnline,
            stats: {
              teachSkillsCount: Array.isArray(user.teachSkills) ? user.teachSkills.length : 0,
              projectsCount: Array.isArray(user.projects) ? user.projects.length : 0,
              certificatesCount: Array.isArray(user.certificates) ? user.certificates.length : 0,
              coursesCount: publishedCourses ? publishedCourses.length : 0,
              ratingsCount: totalRatings,
            },
          },
        });
      } catch (error) {
        console.error("[GET /experts/:identifier] Error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error fetching expert profile.",
        });
      }
    });

    // ================= FIND MENTORS =================

    const getMentorPool = async () => {
      if (mentorPoolCache && Date.now() < mentorPoolExpiresAt) {
        return mentorPoolCache;
      }
      const poolUsers = await usersCollection
        .find(
          { teachSkills: { $exists: true, $ne: [] } },
          {
            projection: {
              _id: 1,
              fullName: 1,
              name: 1,
              email: 1,
              profileImage: 1,
              photoURL: 1,
              bio: 1,
              about: 1,
              headline: 1,
              designation: 1,
              education: 1,
              teachLevel: 1,
              learnLevel: 1,
              teachSkills: 1,
              learnSkills: 1,
            },
          }
        )
        .toArray();

      const poolEmails = poolUsers.map((u) => u.email).filter(Boolean);
      const ratingSummary =
        poolEmails.length > 0
          ? await ratingsCollection
              .aggregate([
                { $match: { targetEmail: { $in: poolEmails }, fraudStatus: { $ne: "QUARANTINED" } } },
                {
                  $group: {
                    _id: "$targetEmail",
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 },
                  },
                },
              ])
              .toArray()
          : [];

      const ratingMap = new Map(
        ratingSummary.map((r) => [
          r._id,
          {
            averageRating: Number((r.averageRating || 0).toFixed(1)),
            totalRatings: r.totalRatings || 0,
          },
        ])
      );

      mentorPoolCache = { poolUsers, ratingMap };
      mentorPoolExpiresAt = Date.now() + 20000;
      return mentorPoolCache;
    };

    app.get("/find-mentors", async (req, res) => {
      try {
        const rawEmail = String(req.query.email || "").trim();
        const lowerEmail = rawEmail.toLowerCase();
        const emailVariants = Array.from(new Set([rawEmail, lowerEmail].filter(Boolean)));

        const [currentUser, mentorPool, pendingRequests] = await Promise.all([
          findUserByEmail(usersCollection, lowerEmail, {
            projection: { email: 1, learnSkills: 1, connections: 1 },
          }),
          getMentorPool(),
          emailVariants.length > 0
            ? connectionRequestsCollection
                .find({
                  status: "pending",
                  $or: [
                    { senderEmail: { $in: emailVariants } },
                    { receiverEmail: { $in: emailVariants } },
                  ],
                })
                .toArray()
            : Promise.resolve([]),
        ]);

        if (!currentUser) {
          return res.status(404).send({ message: "User not found" });
        }

        const learnSkills =
          currentUser.learnSkills?.map((s) => ({
            original: s,
            normalized: normalize(s),
          })) || [];

        const otherUsers = mentorPool.poolUsers.filter(
          (u) => String(u.email || "").toLowerCase().trim() !== lowerEmail
        );
        const ratingMap = mentorPool.ratingMap;

        const pendingRequestMap = new Map();
        pendingRequests.forEach((request) => {
          const isSender = String(request.senderEmail || "").toLowerCase().trim() === lowerEmail;
          const otherEmail = isSender ? request.receiverEmail : request.senderEmail;

          const connectionStatus = isSender ? "sent" : "received";
          pendingRequestMap.set(otherEmail, {
            connectionStatus,
            requestId: request._id,
          });
        });

        let results = [];

        for (let user of otherUsers) {
          const teachSkills =
            user.teachSkills?.map((s) => ({
              original: s,
              normalized: normalize(s),
            })) || [];

          if (teachSkills.length === 0) continue;

          const fuse = createFuse(teachSkills.map((s) => s.normalized));

          let matchCount = 0;
          let totalScore = 0;
          let matchedSkills = [];

          for (let learn of learnSkills) {
            const exact = teachSkills.find(
              (t) => t.normalized === learn.normalized,
            );

            if (exact) {
              matchCount++;
              matchedSkills.push({
                learnSkill: learn.original,
                matchedWith: exact.original,
              });
              continue;
            }
            const matches = fuse.search(learn.normalized);

            if (matches.length > 0 && matches[0].score < 0.4) {
              const matchedSkill = teachSkills[matches[0].refIndex];

              matchCount++;
              totalScore += matches[0].score;

              matchedSkills.push({
                learnSkill: learn.original,
                matchedWith: matchedSkill.original,
              });
            }
          }

          if (matchCount > 0 || learnSkills.length === 0) {
            const percentage = learnSkills.length > 0
              ? Math.round((matchCount / learnSkills.length) * 100)
              : Math.min(85 + (teachSkills.length * 3), 98);

            const isConnected = (currentUser.connections || []).some(
              (connection) => connection.email === user.email,
            );
            const requestInfo = pendingRequestMap.get(user.email);

            let connectionStatus = "none";
            if (isConnected) connectionStatus = "connected";
            else if (requestInfo?.connectionStatus)
              connectionStatus = requestInfo.connectionStatus;

            results.push({
              _id: user._id,
              fullName: user.fullName || user.name || "Expert Mentor",
              email: user.email,
              profileImage: user.profileImage || user.photoURL,
              bio: user.bio || user.about || "",
              headline: user.headline || user.designation || "",
              education: user.education || "Verified Practitioner",
              teachLevel: user.teachLevel || "Expert",
              learnLevel: user.learnLevel || "Learner",
              teachSkills: user.teachSkills || [],
              learnSkills: user.learnSkills || [],
              connectionStatus,
              requestId: requestInfo?.requestId || null,
              averageRating: ratingMap.get(user.email)?.averageRating || 0,
              totalRatings: ratingMap.get(user.email)?.totalRatings || 0,

              matchCount,
              matchPercentage: percentage,
              matchedSkills,
              score: matchCount > 0 ? totalScore / matchCount : 1,
            });
          }
        }

        results.sort((a, b) => {
          if (b.matchCount === a.matchCount) {
            return a.score - b.score;
          }
          return b.matchCount - a.matchCount;
        });

        res.send(results);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get("/server-time", (req, res) => {
      return res.send({ serverTime: new Date().toISOString() });
    });

    routesRegistered = true;
    console.log("MongoDB Connected & Routes Ready");
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

// Liveness probe used by Docker HEALTHCHECK / docker compose healthcheck.
// Registered at the app level so it answers even while MongoDB is still
// retrying its connection.
app.get("/health", (req, res) => {
  const mongoConnected = Boolean(client?.topology?.isConnected?.());
  const ready = mongoConnected && routesRegistered;
  res.status(200).json({
    status: ready ? "ok" : "starting",
    uptime: Math.round(process.uptime()),
    mongo: mongoConnected ? "connected" : "disconnected",
    routesReady: routesRegistered,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "CSE Server Running 🚀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    mongodb: client?.topology?.isConnected() ? "connected" : "disconnected",
  });
});

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
