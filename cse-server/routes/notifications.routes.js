const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { verifyAdminJWT } = require("../middleware/verifyAdminJWT");

// Accepts either the legacy x-admin-secret header or a valid admin_token cookie
const isAdminAuthed = (req) => {
  // Accept x-admin-secret header (legacy)
  const secret = req.headers["x-admin-secret"];
  if (process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET) return true;
  // Accept admin_token cookie (new)
  const token = req.cookies?.admin_token;
  if (!token) return false;
  try {
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

const registerNotificationRoutes = (app, { notificationsCollection, io }) => {
  // GET all notifications (latest 50, newest first)
  app.get("/notifications", async (req, res) => {
    try {
      const notifications = await notificationsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return res.json(notifications);
    } catch {
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // POST — admin creates a notification (requires valid admin_token cookie via verifyAdminJWT)
  app.post("/notifications", verifyAdminJWT, async (req, res) => {
    // isAdminAuthed guard removed — verifyAdminJWT handles rejection
    const { title, message, type = "info", link = "" } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }
    const doc = {
      title: title.trim(),
      message: message.trim(),
      type,   // "info" | "warning" | "success" | "update"
      link: link.trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      const result = await notificationsCollection.insertOne(doc);
      const created = { ...doc, _id: result.insertedId };
      // Broadcast to all connected clients in real-time
      if (io) io.emit("notification:new", created);
      return res.json(created);
    } catch {
      return res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // DELETE — admin removes a notification (protected by verifyAdminJWT)
  app.delete("/notifications/:id", verifyAdminJWT, async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    try {
      await notificationsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      if (io) io.emit("notification:deleted", { id: req.params.id });
      return res.json({ message: "Deleted" });
    } catch {
      return res.status(500).json({ message: "Failed to delete" });
    }
  });
};

module.exports = { registerNotificationRoutes };
