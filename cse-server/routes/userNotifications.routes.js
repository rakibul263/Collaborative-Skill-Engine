const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");
const { escapeRegex } = require("../utils/userLookup");

/**
 * User-specific persistent notifications.
 *
 * Document shape:
 * {
 *   _id: ObjectId,
 *   recipientEmail: String,   // the user who receives this notification
 *   type: String,             // "schedule_invite" | "schedule_accepted" | "schedule_rejected" | "schedule_expired"
 *   title: String,
 *   message: String,
 *   scheduleId: String,       // the related schedule's _id (string)
 *   isRead: Boolean,
 *   createdAt: String,        // ISO 8601
 * }
 */

const registerUserNotificationRoutes = (app, { userNotificationsCollection, io }) => {

  // GET /user-notifications?email=xxx  — fetch latest 50 for authenticated user (IDOR safe)
  app.get("/user-notifications", verifyJWT, async (req, res) => {
    const authEmail = (req.user?.email || "").toLowerCase().trim();
    if (!authEmail) return res.status(401).json({ message: "Unauthorized" });

    // Prevent IDOR: If email is provided in query, verify it matches the authenticated user
    if (req.query.email && String(req.query.email).trim().toLowerCase() !== authEmail) {
      return res.status(403).json({ message: "Access denied. You can only view your own notifications." });
    }

    try {
      const emailRegex = new RegExp(`^${escapeRegex(authEmail)}$`, "i");
      const notifs = await userNotificationsCollection
        .find({ recipientEmail: emailRegex })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return res.json(notifs.map(serializeNotif));
    } catch {
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // PATCH /user-notifications/read  — mark all as read for authenticated user (IDOR safe)
  app.patch("/user-notifications/read", verifyJWT, async (req, res) => {
    const authEmail = (req.user?.email || "").toLowerCase().trim();
    if (!authEmail) return res.status(401).json({ message: "Unauthorized" });

    if (req.body?.email && String(req.body.email).trim().toLowerCase() !== authEmail) {
      return res.status(403).json({ message: "Access denied. You can only update your own notifications." });
    }

    try {
      const emailRegex = new RegExp(`^${escapeRegex(authEmail)}$`, "i");
      await userNotificationsCollection.updateMany(
        { recipientEmail: emailRegex, isRead: false },
        { $set: { isRead: true } }
      );
      return res.json({ message: "All marked as read" });
    } catch {
      return res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // PATCH /user-notifications/:id/read  — mark single notification as read (IDOR safe)
  app.patch("/user-notifications/:id/read", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const authEmail = (req.user?.email || "").toLowerCase().trim();

    try {
      const emailRegex = new RegExp(`^${escapeRegex(authEmail)}$`, "i");
      const result = await userNotificationsCollection.updateOne(
        { _id: new ObjectId(id), recipientEmail: emailRegex },
        { $set: { isRead: true } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Notification not found or access denied." });
      }

      return res.json({ message: "Marked as read" });
    } catch {
      return res.status(500).json({ message: "Failed to mark as read" });
    }
  });

};

/**
 * Helper: create a user notification and emit it via socket.
 * Called internally from route handlers.
 */
const createUserNotification = async (
  userNotificationsCollection,
  io,
  { recipientEmail, type, title, message, scheduleId, courseId, lessonId }
) => {
  const cleanEmail = String(recipientEmail).trim().toLowerCase();
  const now = new Date().toISOString();
  const doc = {
    recipientEmail: cleanEmail,
    type,
    title,
    message,
    scheduleId: scheduleId ? String(scheduleId) : null,
    courseId: courseId ? String(courseId) : null,
    lessonId: lessonId ? String(lessonId) : null,
    isRead: false,
    createdAt: now,
  };
  const result = await userNotificationsCollection.insertOne(doc);
  const created = serializeNotif({ ...doc, _id: result.insertedId });

  // Push in real-time to the recipient (both lowercase and original room)
  if (io) {
    io.to(`user:${cleanEmail}`).emit("user-notification:new", created);
    if (recipientEmail !== cleanEmail) {
      io.to(`user:${recipientEmail}`).emit("user-notification:new", created);
    }
  }
  return created;
};

const serializeNotif = (doc) => ({
  ...doc,
  _id: doc._id.toString(),
});

module.exports = { registerUserNotificationRoutes, createUserNotification };
