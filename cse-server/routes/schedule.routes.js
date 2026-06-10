const { ObjectId } = require("mongodb");
const { createUserNotification } = require("./userNotifications.routes");
const { verifyJWT } = require("../middleware/verifyJWT");

const VALID_DURATIONS = [15, 30, 45, 60, 90, 120, 240];

const serializeSchedule = (doc) => ({
  ...doc,
  _id: doc._id.toString(),
  conversationId: doc.conversationId.toString(),
});

const registerScheduleRoutes = (
  app,
  { schedulesCollection, conversationsCollection, usersCollection, io, userNotificationsCollection }
) => {
  // POST /conversations/:id/schedules — create a new schedule
  app.post("/conversations/:id/schedules", verifyJWT, async (req, res) => {
    const conversationId = req.params.id;

    if (!ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const { schedulerEmail, title, startTime, durationMinutes } = req.body;

    if (!schedulerEmail) {
      return res.status(400).json({ message: "schedulerEmail is required" });
    }

    // Validate title
    if (!title || title.trim().length < 1 || title.trim().length > 100) {
      return res.status(422).json({ message: "Title must be 1–100 characters" });
    }

    // Validate startTime
    const startDate = new Date(startTime);
    if (!startTime || isNaN(startDate.getTime())) {
      return res.status(422).json({ message: "Start time must be at least 5 minutes in the future" });
    }
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    if (startDate.getTime() < fiveMinutesFromNow) {
      return res.status(422).json({ message: "Start time must be at least 5 minutes in the future" });
    }

    // Validate durationMinutes — coerce first so "30" (string) or 30.0 (float) are both accepted
    const parsedDuration = typeof durationMinutes === "number"
      ? Math.round(durationMinutes)
      : parseInt(durationMinutes, 10);

    if (
      isNaN(parsedDuration) ||
      !VALID_DURATIONS.includes(parsedDuration)
    ) {
      return res.status(422).json({ message: `Duration must be one of: ${VALID_DURATIONS.join(", ")} minutes` });
    }

    try {
      // Verify schedulerEmail is a participant
      const conversation = await conversationsCollection.findOne({
        _id: new ObjectId(conversationId),
      });

      if (!conversation) {
        return res.status(403).json({ message: "Not allowed to schedule in this conversation" });
      }

      if (!conversation.participants.includes(schedulerEmail)) {
        return res.status(403).json({ message: "Not allowed to schedule in this conversation" });
      }

      const inviteeEmail = conversation.participants.find((p) => p !== schedulerEmail);

      // Reject if a pending or accepted schedule already exists
      const existingSchedule = await schedulesCollection.findOne({
        conversationId: new ObjectId(conversationId),
        status: { $in: ["pending", "accepted"] },
      });

      if (existingSchedule) {
        return res.status(409).json({ message: "An active schedule already exists for this conversation" });
      }

      const now = new Date().toISOString();
      const scheduleDoc = {
        conversationId: new ObjectId(conversationId),
        schedulerEmail,
        inviteeEmail,
        title: title.trim(),
        startTime: startDate.toISOString(),
        durationMinutes: parsedDuration,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };

      const result = await schedulesCollection.insertOne(scheduleDoc);
      const inserted = { ...scheduleDoc, _id: result.insertedId };
      const serialized = serializeSchedule(inserted);

      // Emit to both participants
      if (io) {
        io.to(`user:${schedulerEmail}`).emit("schedule:new", serialized);
        io.to(`user:${inviteeEmail}`).emit("schedule:new", serialized);
      }

      // Persist notification for the invitee
      if (userNotificationsCollection) {
        await createUserNotification(userNotificationsCollection, io, {
          recipientEmail: inviteeEmail,
          type: "schedule_invite",
          title: "Meeting Invitation",
          message: `You have a new meeting request: "${title.trim()}"`,
          scheduleId: result.insertedId,
        });
      }

      return res.status(201).json(serialized);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // GET /conversations/:id/schedules — list all schedules for a conversation
  app.get("/conversations/:id/schedules", verifyJWT, async (req, res) => {
    const conversationId = req.params.id;

    if (!ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const { requesterEmail } = req.query;

    if (!requesterEmail) {
      return res.status(400).json({ message: "requesterEmail is required" });
    }

    try {
      // Verify requester is a participant
      const conversation = await conversationsCollection.findOne({
        _id: new ObjectId(conversationId),
      });

      if (!conversation || !conversation.participants.includes(requesterEmail)) {
        return res.status(403).json({ message: "Not allowed to view schedules for this conversation" });
      }

      const schedules = await schedulesCollection
        .find({ conversationId: new ObjectId(conversationId) })
        .sort({ createdAt: -1 })
        .toArray();

      return res.json(schedules.map(serializeSchedule));
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  // PATCH /schedules/:id — accept or reject a schedule
  app.patch("/schedules/:id", verifyJWT, async (req, res) => {
    const scheduleId = req.params.id;

    if (!ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule id" });
    }

    const { responderEmail, action } = req.body;

    if (!responderEmail || !action) {
      return res.status(400).json({ message: "responderEmail and action are required" });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be 'accept' or 'reject'" });
    }

    try {
      const schedule = await schedulesCollection.findOne({
        _id: new ObjectId(scheduleId),
      });

      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      if (responderEmail !== schedule.inviteeEmail) {
        return res.status(403).json({ message: "Only the invitee can respond to this schedule" });
      }

      if (schedule.status !== "pending") {
        return res.status(409).json({ message: "Schedule is no longer pending" });
      }

      const newStatus = action === "accept" ? "accepted" : "rejected";
      const now = new Date().toISOString();

      await schedulesCollection.updateOne(
        { _id: new ObjectId(scheduleId) },
        { $set: { status: newStatus, updatedAt: now } }
      );

      const updatedSchedule = {
        ...schedule,
        status: newStatus,
        updatedAt: now,
      };
      const serialized = serializeSchedule(updatedSchedule);

      // Emit to both participants
      if (io) {
        io.to(`user:${schedule.schedulerEmail}`).emit("schedule:updated", serialized);
        io.to(`user:${schedule.inviteeEmail}`).emit("schedule:updated", serialized);
      }

      // Persist notification for the scheduler (they get notified of accept/reject)
      if (userNotificationsCollection) {
        const isAccepted = newStatus === "accepted";
        await createUserNotification(userNotificationsCollection, io, {
          recipientEmail: schedule.schedulerEmail,
          type: isAccepted ? "schedule_accepted" : "schedule_rejected",
          title: isAccepted ? "Meeting Accepted" : "Meeting Rejected",
          message: isAccepted
            ? `Your meeting "${schedule.title}" was accepted.`
            : `Your meeting "${schedule.title}" was rejected.`,
          scheduleId: schedule._id,
        });
      }

      return res.json(serialized);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update schedule" });
    }
  });
};

module.exports = { registerScheduleRoutes };
