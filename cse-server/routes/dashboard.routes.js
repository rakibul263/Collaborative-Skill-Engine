const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");

const registerDashboardRoutes = (app, {
  coursesCollection,
  courseEnrollmentsCollection,
  usersCollection,
  lessonsCollection,
  io,
}) => {

  // GET /dashboard/enrolled-students
  // Returns all enrollments for courses owned by the authenticated instructor, grouped by course.
  // Joins learner fullName from user_list.
  app.get("/dashboard/enrolled-students", verifyJWT, async (req, res) => {
    try {
      const instructorEmailRegex = new RegExp(`^${req.user.email}$`, "i");

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
      const instructorEmailRegex = new RegExp(`^${req.user.email}$`, "i");

      // Compute last 6 complete calendar months
      const now = new Date();
      const months = [];
      for (let i = 6; i >= 1; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push(monthStr);
      }

      const [totalResult, perCourseResult, monthlyResult] = await Promise.all([
        // Total earnings
        courseEnrollmentsCollection.aggregate([
          { $match: { instructorEmail: instructorEmailRegex } },
          { $group: { _id: null, total: { $sum: "$instructorEarnings" } } },
        ]).toArray(),

        // Per-course earnings
        courseEnrollmentsCollection.aggregate([
          { $match: { instructorEmail: instructorEmailRegex } },
          { $group: { _id: "$courseTitle", earnings: { $sum: "$instructorEarnings" } } },
          { $sort: { earnings: -1 } },
        ]).toArray(),

        // Monthly earnings for last 6 complete months
        courseEnrollmentsCollection.aggregate([
          {
            $match: {
              instructorEmail: instructorEmailRegex,
              createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString() },
            },
          },
          {
            $group: {
              _id: { $substr: ["$createdAt", 0, 7] },
              earnings: { $sum: "$instructorEarnings" },
            },
          },
          { $sort: { _id: 1 } },
        ]).toArray(),
      ]);

      const monthlyMap = new Map(monthlyResult.map((m) => [m._id, m.earnings]));

      // Build monthly array with zero-fill for missing months
      const monthly = months.map((month) => ({
        month,
        earnings: Number((monthlyMap.get(month) || 0).toFixed(2)),
      }));

      return res.json({
        totalEarnings: Number((totalResult[0]?.total || 0).toFixed(2)),
        perCourse: perCourseResult.map((c) => ({
          courseTitle: c._id || "Unknown Course",
          earnings: Number(c.earnings.toFixed(2)),
        })),
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
      const historyItem = {
        action: "banned",
        reason: reason ? reason.trim() : "Violation of terms",
        timestamp: now,
        by: req.user.email,
      };

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        {
          $set: { banned: true, bannedAt: now, bannedByEmail: req.user.email, status: "banned" },
          $push: { history: historyItem },
        }
      );

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
          $set: { banned: false, status: "active" },
          $unset: { bannedAt: "", bannedByEmail: "" },
          $push: { history: historyItem },
        }
      );

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

      const now = new Date().toISOString();
      const historyItem = {
        action: "suspended",
        reason: reason ? reason.trim() : "Temporary suspension",
        durationDays: days || 7,
        timestamp: now,
        by: req.user.email,
      };

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        {
          $set: { suspended: true, suspendedAt: now, status: "suspended" },
          $push: { history: historyItem },
        }
      );

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
          $set: { suspended: false, status: "active" },
          $unset: { suspendedAt: "" },
          $push: { history: historyItem },
        }
      );

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
