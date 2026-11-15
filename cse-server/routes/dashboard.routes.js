const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");
const { escapeRegex } = require("../utils/userLookup");
const { CURRENCY_CODE, fromPoisha, resolveEnrollmentPoisha } = require("../utils/money");

const registerDashboardRoutes = (app, {
  coursesCollection,
  courseEnrollmentsCollection,
  usersCollection,
  lessonsCollection,
  userNotificationsCollection = null,
  io,
}) => {

  // GET /dashboard/enrolled-students
  // Returns all enrollments for courses owned by the authenticated instructor, grouped by course.
  // Joins learner fullName from user_list.
  app.get("/dashboard/enrolled-students", verifyJWT, async (req, res) => {
    try {
      const instructorEmailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, "i");

      // Find all courses owned by this instructor
      const instructorCourses = await coursesCollection
        .find({ instructorEmail: instructorEmailRegex }, { projection: { _id: 1, title: 1 } })
        .toArray();

      if (instructorCourses.length === 0) {
        return res.json({ courses: [] });
      }

      const courseIds = instructorCourses.map((c) => c._id);
      const courseMap = new Map(instructorCourses.map((c) => [c._id.toString(), c.title]));

      // Get all enrollments for those courses
      const enrollments = await courseEnrollmentsCollection
        .find({ courseId: { $in: courseIds } })
        .sort({ createdAt: -1 })
        .toArray();

      if (enrollments.length === 0) {
        return res.json({ courses: [] });
      }

      // Join learner names from user_list
      const learnerEmails = [...new Set(enrollments.map((e) => e.learnerEmail))];
      const learners = await usersCollection
        .find({ email: { $in: learnerEmails } }, { projection: { email: 1, fullName: 1, name: 1 } })
        .toArray();
      const learnerMap = new Map(learners.map((u) => [u.email.toLowerCase(), u.fullName || u.name || "Unknown"]));

      // Group enrollments by courseId
      const courseGroups = new Map();
      for (const enrollment of enrollments) {
        const courseId = enrollment.courseId.toString();
        if (!courseGroups.has(courseId)) {
          courseGroups.set(courseId, {
            courseId,
            courseTitle: courseMap.get(courseId) || enrollment.courseTitle || "Unknown Course",
            enrollmentCount: 0,
            enrollments: [],
          });
        }
        const group = courseGroups.get(courseId);
        group.enrollmentCount += 1;
        group.enrollments.push({
          _id: enrollment._id.toString(),
          learnerEmail: enrollment.learnerEmail,
          learnerName: learnerMap.get((enrollment.learnerEmail || "").toLowerCase()) || "Unknown",
          createdAt: enrollment.createdAt,
          banned: enrollment.banned || false,
          bannedAt: enrollment.bannedAt || null,
          bannedByEmail: enrollment.bannedByEmail || null,
        });
      }

      return res.json({ courses: Array.from(courseGroups.values()) });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load enrolled students." });
    }
  });

  // GET /dashboard/earnings
  // Returns totalEarnings, perCourse breakdown, and monthly breakdown for last 6 complete calendar months.
  app.get("/dashboard/earnings", verifyJWT, async (req, res) => {
    try {
      const instructorEmailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, "i");

      // Compute last 6 complete calendar months
      const now = new Date();
      const months = [];
      for (let i = 6; i >= 1; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push(monthStr);
      }

      const enrollments = await courseEnrollmentsCollection
        .find(
          { instructorEmail: instructorEmailRegex },
          {
            projection: {
              price: 1,
              pricePoisha: 1,
              commission: 1,
              commissionPoisha: 1,
              instructorEarnings: 1,
              instructorEarningsPoisha: 1,
              courseTitle: 1,
              createdAt: 1,
            },
          }
        )
        .toArray();

      let totalEarningsPoisha = 0;
      const perCoursePoishaMap = new Map();
      const monthlyPoishaMap = new Map();

      for (const e of enrollments) {
        const split = resolveEnrollmentPoisha(e);
        totalEarningsPoisha += split.instructorEarningsPoisha;

        const title = e.courseTitle || "Unknown Course";
        perCoursePoishaMap.set(title, (perCoursePoishaMap.get(title) || 0) + split.instructorEarningsPoisha);

        if (e.createdAt) {
          const monthKey = e.createdAt.substring(0, 7);
          if (months.includes(monthKey)) {
            monthlyPoishaMap.set(monthKey, (monthlyPoishaMap.get(monthKey) || 0) + split.instructorEarningsPoisha);
          }
        }
      }

      const perCourse = Array.from(perCoursePoishaMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([courseTitle, poisha]) => ({
          courseTitle,
          earnings: fromPoisha(poisha),
        }));

      // Build monthly array with zero-fill for missing months
      const monthly = months.map((month) => ({
        month,
        earnings: fromPoisha(monthlyPoishaMap.get(month) || 0),
      }));

      return res.json({
        currency: CURRENCY_CODE,
        totalEarningsPoisha,
        totalEarnings: fromPoisha(totalEarningsPoisha),
        perCourse,
        monthly,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load earnings data." });
    }
  });

  // PATCH /dashboard/enrollments/:enrollmentId/ban
  // Bans a learner from a course. Verifies instructor ownership before mutating.
  app.patch("/dashboard/enrollments/:enrollmentId/ban", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    const { reason } = req.body || {};
    if (!ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({ message: "Invalid enrollment id." });
    }
    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found." });

      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      if (enrollment.banned === true) {
        return res.status(409).json({ message: "Student is already banned." });
      }

      const now = new Date().toISOString();
      const banReason = reason && reason.trim() ? reason.trim() : "Violation of terms";
      const historyItem = {
        action: "banned",
        reason: banReason,
        timestamp: now,
        by: req.user.email,
      };

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        {
          $set: { banned: true, bannedAt: now, bannedByEmail: req.user.email, banReason, status: "banned" },
          $push: { history: historyItem },
        }
      );

      // Real-time notification to learner
      if (userNotificationsCollection && enrollment.learnerEmail) {
        const notif = {
          recipientEmail: enrollment.learnerEmail.toLowerCase(),
          type: "course_banned",
          title: `Access Restricted: ${enrollment.courseTitle || "Course"}`,
          message: `Your enrollment has been banned by instructor. Reason: ${banReason}. You may submit an appeal from your Classroom Dashboard.`,
          courseId: enrollment.courseId.toString(),
          enrollmentId,
          isRead: false,
          createdAt: now,
        };
        await userNotificationsCollection.insertOne(notif);
        if (io) {
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("user-notification:new", notif);
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("enrollment:updated", {
            courseId: enrollment.courseId.toString(),
            status: "banned",
            active: false,
          });
        }
      }

      return res.json({ message: "Student banned.", enrollmentId });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // PATCH /dashboard/enrollments/:enrollmentId/unban
  app.patch("/dashboard/enrollments/:enrollmentId/unban", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    if (!ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({ message: "Invalid enrollment id." });
    }
    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found." });

      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const now = new Date().toISOString();
      const historyItem = {
        action: "unbanned",
        reason: "Instructor unbanned student",
        timestamp: now,
        by: req.user.email,
      };

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        {
          $set: { banned: false, status: enrollment.suspended ? "suspended" : "active" },
          $unset: { bannedAt: "", bannedByEmail: "", banReason: "" },
          $push: { history: historyItem },
        }
      );

      // Real-time notification to learner
      if (userNotificationsCollection && enrollment.learnerEmail) {
        const notif = {
          recipientEmail: enrollment.learnerEmail.toLowerCase(),
          type: "course_access_restored",
          title: `Access Restored: ${enrollment.courseTitle || "Course"}`,
          message: `Your ban on ${enrollment.courseTitle || "the course"} has been lifted. You can access the classroom now.`,
          courseId: enrollment.courseId.toString(),
          enrollmentId,
          isRead: false,
          createdAt: now,
        };
        await userNotificationsCollection.insertOne(notif);
        if (io) {
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("user-notification:new", notif);
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("enrollment:updated", {
            courseId: enrollment.courseId.toString(),
            status: enrollment.suspended ? "suspended" : "active",
            active: !enrollment.suspended,
          });
        }
      }

      return res.json({ message: "Student unbanned.", enrollmentId });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // PATCH /dashboard/enrollments/:enrollmentId/suspend
  app.patch("/dashboard/enrollments/:enrollmentId/suspend", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    const { reason, days } = req.body || {};
    if (!ObjectId.isValid(enrollmentId)) return res.status(400).json({ message: "Invalid enrollment id." });

    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found." });
      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const durationDays = Number(days) || 7;
      const untilIso = new Date(now.getTime() + durationDays * 86400000).toISOString();
      const suspendReason = reason && reason.trim() ? reason.trim() : "Temporary suspension";

      const historyItem = {
        action: "suspended",
        reason: suspendReason,
        durationDays,
        timestamp: nowIso,
        by: req.user.email,
      };

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        {
          $set: {
            suspended: true,
            suspendedAt: nowIso,
            suspendedDays: durationDays,
            suspendedUntil: untilIso,
            suspendReason,
            status: "suspended",
          },
          $push: { history: historyItem },
        }
      );

      // Real-time notification to learner
      if (userNotificationsCollection && enrollment.learnerEmail) {
        const notif = {
          recipientEmail: enrollment.learnerEmail.toLowerCase(),
          type: "course_suspended",
          title: `Temporary Suspension: ${enrollment.courseTitle || "Course"}`,
          message: `Your access has been suspended for ${durationDays} days. Reason: ${suspendReason}. You may message the instructor to appeal.`,
          courseId: enrollment.courseId.toString(),
          enrollmentId,
          isRead: false,
          createdAt: nowIso,
        };
        await userNotificationsCollection.insertOne(notif);
        if (io) {
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("user-notification:new", notif);
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("enrollment:updated", {
            courseId: enrollment.courseId.toString(),
            status: "suspended",
            active: false,
          });
        }
      }

      return res.json({ message: "Student access suspended.", enrollmentId });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // PATCH /dashboard/enrollments/:enrollmentId/unsuspend
  app.patch("/dashboard/enrollments/:enrollmentId/unsuspend", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    if (!ObjectId.isValid(enrollmentId)) return res.status(400).json({ message: "Invalid enrollment id." });

    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found." });
      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const now = new Date().toISOString();
      const historyItem = {
        action: "unsuspended",
        reason: "Suspension lifted",
        timestamp: now,
        by: req.user.email,
      };

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        {
          $set: { suspended: false, status: enrollment.banned ? "banned" : "active" },
          $unset: { suspendedAt: "", suspendReason: "", suspendedUntil: "", suspendedDays: "" },
          $push: { history: historyItem },
        }
      );

      // Real-time notification to learner
      if (userNotificationsCollection && enrollment.learnerEmail) {
        const notif = {
          recipientEmail: enrollment.learnerEmail.toLowerCase(),
          type: "course_access_restored",
          title: `Access Restored: ${enrollment.courseTitle || "Course"}`,
          message: `Your suspension on ${enrollment.courseTitle || "the course"} has been lifted! You can resume watching lessons.`,
          courseId: enrollment.courseId.toString(),
          enrollmentId,
          isRead: false,
          createdAt: now,
        };
        await userNotificationsCollection.insertOne(notif);
        if (io) {
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("user-notification:new", notif);
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("enrollment:updated", {
            courseId: enrollment.courseId.toString(),
            status: enrollment.banned ? "banned" : "active",
            active: !enrollment.banned,
          });
        }
      }

      return res.json({ message: "Student suspension lifted.", enrollmentId });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // PATCH /dashboard/enrollments/:enrollmentId/refund
  app.patch("/dashboard/enrollments/:enrollmentId/refund", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    const { reason } = req.body || {};
    if (!ObjectId.isValid(enrollmentId)) return res.status(400).json({ message: "Invalid enrollment id." });

    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found." });
      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const now = new Date().toISOString();
      const historyItem = {
        action: "refunded_and_revoked",
        reason: reason ? reason.trim() : "Requested refund",
        timestamp: now,
        by: req.user.email,
      };

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        {
          $set: { refunded: true, refundedAt: now, status: "refunded", revoked: true },
          $push: { history: historyItem },
        }
      );

      return res.json({ message: "Course access refunded and revoked.", enrollmentId });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });
};

module.exports = { registerDashboardRoutes };
