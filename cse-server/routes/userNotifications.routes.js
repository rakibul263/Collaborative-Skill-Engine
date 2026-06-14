const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");

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

  // GET /user-notifications?email=xxx  — fetch latest 50 for a user
  app.get("/user-notifications", verifyJWT, async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "email is required" });
    try {
      const notifs = await userNotificationsCollection
        .find({ recipientEmail: email })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return res.json(notifs.map(serializeNotif));
    } catch {
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // PATCH /user-notifications/read  — mark all as read for a user
  app.patch("/user-notifications/read", verifyJWT, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });
    try {
      await userNotificationsCollection.updateMany(
        { recipientEmail: email, isRead: false },
        { $set: { isRead: true } }
      );
      return res.json({ message: "All marked as read" });
    } catch {
      return res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // PATCH /user-notifications/:id/read  — mark single notification as read
  app.patch("/user-notifications/:id/read", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });
    try {
      await userNotificationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isRead: true } }
      );
      return res.json({ message: "Marked as read" });
    } catch {
      return res.status(500).json({ message: "Failed to mark as read" });
    }
  });

};

/**
 * Helper: create a user notification and emit it via socket.
 * Called internally from schedule route handlers.
 */
const createUserNotification = async (
  userNotificationsCollection,
  io,
  { recipientEmail, type, title, message, scheduleId }
) => {
  const now = new Date().toISOString();
  const doc = {
    recipientEmail,
    type,
    title,
    message,
    scheduleId: scheduleId ? String(scheduleId) : null,
    isRead: false,
    createdAt: now,
  };
  const result = await userNotificationsCollection.insertOne(doc);
  const created = serializeNotif({ ...doc, _id: result.insertedId });

  // Push in real-time to the recipient
  if (io) {
    io.to(`user:${recipientEmail}`).emit("user-notification:new", created);
  }
  return created;
};

const serializeNotif = (doc) => ({
  ...doc,
  _id: doc._id.toString(),
});

module.exports = { registerUserNotificationRoutes, createUserNotification };
