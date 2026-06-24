const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Fuse = require("fuse.js");
const cookieParser = require("cookie-parser");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cloudinary = require("cloudinary").v2;
const { registerAiAdvisorRoutes } = require("./routes/aiAdvisor.routes");
const { registerAuthRoutes } = require("./routes/auth.routes");
const { registerCvParserRoutes } = require("./routes/cvParser.routes");
const { verifyJWT } = require("./middleware/verifyJWT");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

const corsConfig = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const io = new Server(httpServer, {
  cors: corsConfig,
});

const onlineUsers = new Map();
const getOnlineEmails = () => [...onlineUsers.keys()];
const emitOnlineUsers = () => {
  io.emit("presence:online-users", getOnlineEmails());
};

const normalize = (s = "") =>
  s
    .toLowerCase()
    .replace(/\.js/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "");

const createFuse = (skills) =>
  new Fuse(skills, {
    includeScore: true,
    threshold: 0.4,
  });

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Collaborative Skill Engine API" });
});

app.get("/server-time", (_req, res) => {
  res.json({ time: new Date().toISOString() });
});

app.post("/cloudinary/sign", (req, res) => {
  const { public_id, folder } = req.body || {};
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { timestamp, public_id, folder };
  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET,
  );
  res.json({
    timestamp,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

let client;

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI not set in .env file");
      process.exit(1);
    }

    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 50,
      minPoolSize: 5,
    });
    await client.connect();

    const db = client.db("skillEngineDB");
    const usersCollection = db.collection("user_list");
    const connectionRequestsCollection = db.collection("connection_requests");
    const conversationsCollection = db.collection("conversations");
    const messagesCollection = db.collection("messages");
    const ratingsCollection = db.collection("user_ratings");
    const aiAdvisorSessionsCollection = db.collection("ai_advisor_sessions");

    registerAuthRoutes(app, { usersCollection });
    registerAiAdvisorRoutes(app, {
      usersCollection,
      conversationsCollection,
      messagesCollection,
      aiAdvisorSessionsCollection,
    });
    registerCvParserRoutes(app);

    // ── Users ─────────────────────────────────────────────────────────────
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection
          .find({})
          .sort({ fullName: 1 })
          .limit(100)
          .toArray();
        res.json(users);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
      }
    });

    app.post("/users", async (req, res) => {
      try {
        const doc = { ...req.body, createdAt: new Date().toISOString() };
        const result = await usersCollection.insertOne(doc);
        res.status(201).json({ _id: result.insertedId, ...doc });
      } catch (error) {
        res.status(500).json({ message: "Failed to create user" });
      }
    });

    app.patch("/users/:id", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = ObjectId.isValid(id) && id.length === 24
          ? { _id: new ObjectId(id) }
          : { email: id.toLowerCase() };
        const targetUser = await usersCollection.findOne(filter);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }
        if (req.user.email.toLowerCase() !== targetUser.email.toLowerCase()) {
          return res.status(403).json({ message: "Access denied" });
        }
        await usersCollection.updateOne(filter, { $set: req.body });
        res.json({ message: "User updated" });
      } catch (error) {
        res.status(500).json({ message: "Failed to update user" });
      }
    });

    app.get("/experts/:identifier", async (req, res) => {
      try {
        const identifier = req.params.identifier;
        const filter = ObjectId.isValid(identifier) && identifier.length === 24
          ? { _id: new ObjectId(identifier) }
          : { email: identifier.toLowerCase() };
        const expert = await usersCollection.findOne(filter);
        if (!expert) {
          return res.status(404).json({ message: "Expert not found" });
        }
        res.json(expert);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch expert" });
      }
    });

    app.get("/find-mentors", async (req, res) => {
      const { learnSkills = "[]" } = req.query;
      let targetSkills = [];
      try {
        targetSkills = JSON.parse(learnSkills);
      } catch {
        targetSkills = [];
      }
      const normalized = targetSkills.map(normalize);
      try {
        const candidates = await usersCollection
          .find({ teachSkills: { $exists: true, $ne: [] } })
          .limit(80)
          .toArray();
        const results = candidates
          .map((user) => {
            const teach = (user.teachSkills || []).map(normalize);
            const matches = normalized.filter((s) => teach.includes(s));
            return {
              _id: user._id,
              fullName: user.fullName,
              email: user.email,
              teachSkills: user.teachSkills,
              matchCount: matches.length,
            };
          })
          .filter((u) => u.matchCount > 0)
          .sort((a, b) => b.matchCount - a.matchCount)
          .slice(0, 10);
        res.json(results);
      } catch (error) {
        res.status(500).json({ message: "Failed to find mentors" });
      }
    });

    // ── Connections ───────────────────────────────────────────────────────
    app.post("/connections/requests", verifyJWT, async (req, res) => {
      const { receiverEmail } = req.body;
      if (!receiverEmail) {
        return res.status(400).json({ message: "receiverEmail is required" });
      }
      try {
        const result = await connectionRequestsCollection.insertOne({
          senderEmail: req.user.email,
          receiverEmail,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        res.json({ acknowledged: result.acknowledged });
      } catch (error) {
        res.status(500).json({ message: "Failed to send request" });
      }
    });

    app.get("/connections/requests/incoming", verifyJWT, async (req, res) => {
      try {
        const requests = await connectionRequestsCollection
          .find({ receiverEmail: req.user.email, status: "pending" })
          .toArray();
        res.json(requests);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch requests" });
      }
    });

    app.get("/connections/requests/status", async (req, res) => {
      const { user1, user2 } = req.query;
      try {
        const request = await connectionRequestsCollection.findOne({
          $or: [
            { senderEmail: user1, receiverEmail: user2 },
            { senderEmail: user2, receiverEmail: user1 },
          ],
        });
        res.json({ status: request?.status || "none" });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch status" });
      }
    });

    app.patch("/connections/requests/respond", verifyJWT, async (req, res) => {
      const { senderEmail, action } = req.body;
      const status = action === "accept" ? "accepted" : "rejected";
      try {
        const result = await connectionRequestsCollection.updateOne(
          { senderEmail, receiverEmail: req.user.email, status: "pending" },
          { $set: { status, updatedAt: new Date().toISOString() } },
        );
        if (status === "accepted") {
          await usersCollection.updateOne(
            { email: senderEmail },
            { $push: { connections: { email: req.user.email, connectedAt: new Date().toISOString() } } },
          );
          await usersCollection.updateOne(
            { email: req.user.email },
            { $push: { connections: { email: senderEmail, connectedAt: new Date().toISOString() } } },
          );
        }
        res.json({ message: "Request updated", modified: result.modifiedCount });
      } catch (error) {
        res.status(500).json({ message: "Failed to respond to request" });
      }
    });

    app.delete("/connections/requests/cancel", verifyJWT, async (req, res) => {
      const { receiverEmail } = req.query;
      try {
        await connectionRequestsCollection.deleteOne({
          senderEmail: req.user.email,
          receiverEmail,
          status: "pending",
        });
        res.json({ message: "Request cancelled" });
      } catch (error) {
        res.status(500).json({ message: "Failed to cancel request" });
      }
    });

    // ── Conversations & messages ──────────────────────────────────────────
    app.get("/conversations", verifyJWT, async (req, res) => {
      try {
        const conversations = await conversationsCollection
          .find({ participants: req.user.email })
          .sort({ lastMessageAt: -1 })
          .toArray();
        res.json(conversations);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch conversations" });
      }
    });

    app.post("/conversations/open", verifyJWT, async (req, res) => {
      const { otherEmail } = req.body;
      const participants = [req.user.email, otherEmail].sort();
      try {
        let conversation = await conversationsCollection.findOne({ participants });
        if (!conversation) {
          conversation = {
            participants,
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
          };
          const result = await conversationsCollection.insertOne(conversation);
          conversation = { _id: result.insertedId, ...conversation };
        }
        res.json(conversation);
      } catch (error) {
        res.status(500).json({ message: "Failed to open conversation" });
      }
    });

    app.get("/conversations/:id/messages", verifyJWT, async (req, res) => {
      try {
        const messages = await messagesCollection
          .find({ conversationId: req.params.id })
          .sort({ createdAt: 1 })
          .toArray();
        res.json(messages);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    });

    app.post("/conversations/:id/messages", verifyJWT, async (req, res) => {
      try {
        const doc = {
          conversationId: req.params.id,
          senderEmail: req.user.email,
          text: req.body.text,
          createdAt: new Date().toISOString(),
        };
        const result = await messagesCollection.insertOne(doc);
        await conversationsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { lastMessageAt: doc.createdAt } },
        );
        io.to(`conversation:${req.params.id}`).emit("message:new", {
          _id: result.insertedId,
          ...doc,
        });
        res.status(201).json({ _id: result.insertedId, ...doc });
      } catch (error) {
        res.status(500).json({ message: "Failed to send message" });
      }
    });

    app.patch("/conversations/:id/seen", verifyJWT, async (req, res) => {
      try {
        await messagesCollection.updateMany(
          { conversationId: req.params.id, senderEmail: { $ne: req.user.email } },
          { $set: { seen: true } },
        );
        res.json({ message: "Marked as seen" });
      } catch (error) {
        res.status(500).json({ message: "Failed to mark seen" });
      }
    });

    // ── Ratings ───────────────────────────────────────────────────────────
    app.post("/ratings", verifyJWT, async (req, res) => {
      const { ratedUserEmail, score, comment } = req.body;
      try {
        const result = await ratingsCollection.insertOne({
          raterEmail: req.user.email,
          ratedUserEmail,
          score,
          comment,
          createdAt: new Date().toISOString(),
        });
        res.status(201).json({ _id: result.insertedId });
      } catch (error) {
        res.status(500).json({ message: "Failed to submit rating" });
      }
    });

    app.get("/ratings/summary", async (req, res) => {
      const { email } = req.query;
      try {
        const ratings = await ratingsCollection
          .find({ ratedUserEmail: email })
          .toArray();
        const total = ratings.length;
        const average = total
          ? ratings.reduce((sum, r) => sum + (r.score || 0), 0) / total
          : 0;
        res.json({ total, average: Math.round(average * 10) / 10 });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch ratings" });
      }
    });

    // ── Platform stats ────────────────────────────────────────────────────
    app.get("/platform-stats", async (_req, res) => {
      try {
        const [users, conversations, messages] = await Promise.all([
          usersCollection.countDocuments(),
          conversationsCollection.countDocuments(),
          messagesCollection.countDocuments(),
        ]);
        res.json({ users, conversations, messages });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch stats" });
      }
    });

    // ── Real-time presence, chat & RTC ────────────────────────────────────
    io.on("connection", (socket) => {
      socket.on("presence:join", ({ email }) => {
        if (!email) return;
        onlineUsers.set(email, socket.id);
        socket.data.email = email;
        socket.join(`user:${email}`);
        emitOnlineUsers();
      });

      socket.on("presence:leave", ({ email }) => {
        onlineUsers.delete(email);
        emitOnlineUsers();
      });

      socket.on("conversation:join", ({ conversationId }) => {
        socket.join(`conversation:${conversationId}`);
      });

      socket.on("message:send", async (payload, callback) => {
        try {
          const { conversationId, text } = payload || {};
          if (!conversationId || !text) return;
          const doc = {
            conversationId,
            senderEmail: socket.data.email,
            text,
            createdAt: new Date().toISOString(),
          };
          const result = await messagesCollection.insertOne(doc);
          await conversationsCollection.updateOne(
            { _id: new ObjectId(conversationId) },
            { $set: { lastMessageAt: doc.createdAt } },
          );
          const message = { _id: result.insertedId, ...doc };
          io.to(`conversation:${conversationId}`).emit("message:new", message);
          if (callback) callback({ ok: true, message });
        } catch (error) {
          if (callback) callback({ ok: false, error: error.message });
        }
      });

      socket.on("message:seen", async ({ conversationId, viewerEmail }) => {
        await messagesCollection.updateMany(
          { conversationId, senderEmail: { $ne: viewerEmail } },
          { $set: { seen: true } },
        );
      });

      socket.on("rtc:offer", ({ to, offer, scheduleId }) => {
        io.to(`user:${to}`).emit("rtc:offer", {
          from: socket.data.email,
          offer,
          scheduleId,
        });
      });

      socket.on("rtc:answer", ({ to, answer, scheduleId }) => {
        io.to(`user:${to}`).emit("rtc:answer", {
          from: socket.data.email,
          answer,
          scheduleId,
        });
      });

      socket.on("rtc:ice-candidate", ({ to, candidate, scheduleId }) => {
        io.to(`user:${to}`).emit("rtc:ice-candidate", {
          from: socket.data.email,
          candidate,
          scheduleId,
        });
      });

      socket.on("rtc:end", ({ to, scheduleId }) => {
        io.to(`user:${to}`).emit("rtc:end", {
          from: socket.data.email,
          scheduleId,
        });
      });

      socket.on("disconnect", () => {
        if (socket.data.email) onlineUsers.delete(socket.data.email);
        emitOnlineUsers();
      });
    });

    httpServer.listen(port, () => {
      console.log(`[Server] running on port ${port}`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error.message);
    process.exit(1);
  }
}

run();

module.exports = { app, httpServer };
