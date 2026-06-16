const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { verifyAdminJWT } = require("../middleware/verifyAdminJWT");

// In-memory rate limiter: 5 attempts per IP per 15 minutes
const loginAttempts = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const checkRateLimit = (ip) => {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return { limited: false };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return { limited: true };
  return { limited: false };
};

const resetRateLimit = (ip) => loginAttempts.delete(ip);

// Helper: insert a user notification
const insertUserNotification = async (userNotificationsCollection, io, { recipientEmail, type, title, message, extra = {} }) => {
  const doc = {
    recipientEmail,
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...extra,
  };
  const result = await userNotificationsCollection.insertOne(doc);
  if (io) {
    io.to(`user:${recipientEmail}`).emit("userNotification:new", { ...doc, _id: result.insertedId.toString() });
  }
};

const registerAdminRoutes = (app, {
  usersCollection,
  coursesCollection,
  courseEnrollmentsCollection,
  lessonsCollection,
  ratingsCollection,
  schedulesCollection,
  userNotificationsCollection,
  io,
}) => {

  // POST /admin-api/login
  app.post("/admin-api/login", async (req, res) => {
    const ip = req.ip || "unknown";
    const { email, password } = req.body;

    const { limited } = checkRateLimit(ip);
    if (limited) {
      return res.status(429).json({ message: "Too many failed attempts. Try again in 15 minutes." });
    }

    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    resetRateLimit(ip);

    const token = jwt.sign(
      { email, role: "admin" },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400000,
    });

    return res.json({ message: "Logged in successfully.", token });
  });

  // POST /admin-api/logout
  app.post("/admin-api/logout", verifyAdminJWT, (req, res) => {
    res.clearCookie("admin_token");
    return res.json({ message: "Logged out." });
  });

  // GET /admin-api/overview
  app.get("/admin-api/overview", verifyAdminJWT, async (req, res) => {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoISO = sixMonthsAgo.toISOString();

      const [
        totalUsers,
        totalApprovedCourses,
        totalEnrollments,
        revenueResult,
        userRegByMonth,
        courseSubByMonth,
        recentUsers,
        recentCourses,
      ] = await Promise.all([
        usersCollection.countDocuments(),
        coursesCollection.countDocuments({ status: "approved" }),
        courseEnrollmentsCollection.countDocuments(),
        courseEnrollmentsCollection.aggregate([
          { $group: { _id: null, total: { $sum: "$commission" } } },
        ]).toArray(),
        usersCollection.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgoISO } } },
          { $group: {
            _id: { $substr: ["$createdAt", 0, 7] },
            count: { $sum: 1 },
          }},
          { $sort: { _id: 1 } },
        ]).toArray(),
        coursesCollection.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgoISO } } },
          { $group: {
            _id: { month: { $substr: ["$createdAt", 0, 7] }, status: "$status" },
            count: { $sum: 1 },
          }},
          { $sort: { "_id.month": 1 } },
        ]).toArray(),
        usersCollection.find({}, { projection: { fullName: 1, email: 1, createdAt: 1 } })
          .sort({ createdAt: -1 }).limit(5).toArray(),
        coursesCollection.find({ status: "approved" }, { projection: { title: 1, instructorEmail: 1, approvedAt: 1 } })
          .sort({ approvedAt: -1 }).limit(5).toArray(),
      ]);

      // Reshape courseSubByMonth into { month, pending, approved, rejected }
      const courseSubMap = {};
      courseSubByMonth.forEach(({ _id, count }) => {
        const { month, status } = _id;
        if (!courseSubMap[month]) courseSubMap[month] = { month, pending: 0, approved: 0, rejected: 0 };
        if (status === "pending_review") courseSubMap[month].pending = count;
        else if (status === "approved") courseSubMap[month].approved = count;
        else if (status === "rejected") courseSubMap[month].rejected = count;
      });

      return res.json({
        totalUsers,
        totalApprovedCourses,
        totalEnrollments,
        totalRevenue: Number((revenueResult[0]?.total || 0).toFixed(2)),
        userRegistrationsByMonth: userRegByMonth.map((d) => ({ month: d._id, count: d.count })),
        courseSubmissionsByMonth: Object.values(courseSubMap),
        recentUsers: recentUsers.map((u) => ({ ...u, _id: u._id.toString() })),
        recentCourses: recentCourses.map((c) => ({ ...c, _id: c._id.toString() })),
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load overview data." });
    }
  });

  // GET /admin-api/users
  app.get("/admin-api/users", verifyAdminJWT, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const search = req.query.search?.trim() || "";
      const limit = 20;
      const skip = (page - 1) * limit;

      const filter = search
        ? { $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ]}
        : {};

      const [users, total] = await Promise.all([
        usersCollection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        usersCollection.countDocuments(filter),
      ]);

      const userEmails = users.map((u) => u.email).filter(Boolean);

      const [ratingSummary, sessionCounts] = await Promise.all([
        ratingsCollection.aggregate([
          { $match: { targetEmail: { $in: userEmails } } },
          { $group: { _id: "$targetEmail", avg: { $avg: "$rating" } } },
        ]).toArray(),
        schedulesCollection.aggregate([
          { $match: { schedulerEmail: { $in: userEmails }, status: "expired" } },
          { $group: { _id: "$schedulerEmail", count: { $sum: 1 } } },
        ]).toArray(),
      ]);

      const ratingMap = new Map(ratingSummary.map((r) => [r._id, Number(r.avg.toFixed(1))]));
      const sessionMap = new Map(sessionCounts.map((s) => [s._id, s.count]));

      const enrichedUsers = users.map((u) => ({
        _id: u._id.toString(),
        fullName: u.fullName || u.name || "Unknown",
        email: u.email,
        createdAt: u.createdAt,
        isDeactivated: u.isDeactivated || false,
        averageRating: ratingMap.get(u.email) || 0,
        sessionCount: sessionMap.get(u.email) || 0,
      }));

      return res.json({ users: enrichedUsers, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch users." });
    }
  });

  // PATCH /admin-api/users/:id/deactivate
  app.patch("/admin-api/users/:id/deactivate", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user id." });
    try {
      const now = new Date().toISOString();
      const result = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { isDeactivated: true, deactivatedAt: now } },
        { returnDocument: "after" }
      );
      if (!result) return res.status(404).json({ message: "User not found." });
      return res.json({ _id: result._id.toString(), isDeactivated: true, deactivatedAt: now });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // PATCH /admin-api/users/:id/reactivate
  app.patch("/admin-api/users/:id/reactivate", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user id." });
    try {
      const result = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { isDeactivated: false }, $unset: { deactivatedAt: "" } },
        { returnDocument: "after" }
      );
      if (!result) return res.status(404).json({ message: "User not found." });
      return res.json({ _id: result._id.toString(), isDeactivated: false });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // GET /admin-api/courses/pending
  app.get("/admin-api/courses/pending", verifyAdminJWT, async (req, res) => {
    try {
      const courses = await coursesCollection
        .find({ status: "pending_review" })
        .sort({ submittedAt: -1 })
        .toArray();

      const instructorEmails = [...new Set(courses.map((c) => c.instructorEmail))];
      const instructors = await usersCollection
        .find({ email: { $in: instructorEmails } }, { projection: { email: 1, fullName: 1, name: 1 } })
        .toArray();
      const instructorMap = new Map(instructors.map((u) => [u.email, u.fullName || u.name || "Unknown"]));

      return res.json(courses.map((c) => ({
        ...c,
        _id: c._id.toString(),
        instructorName: instructorMap.get(c.instructorEmail) || "Unknown",
      })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch pending courses." });
    }
  });

  // PATCH /admin-api/courses/:id/approve
  app.patch("/admin-api/courses/:id/approve", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });
      if (course.status !== "pending_review") {
        return res.status(409).json({ message: "This course is no longer in a reviewable state." });
      }

      const now = new Date().toISOString();
      await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "approved", approvedAt: now, approvedBy: req.adminUser.email, updatedAt: now } }
      );

      await insertUserNotification(userNotificationsCollection, io, {
        recipientEmail: course.instructorEmail,
        type: "course_approved",
        title: "Course Approved",
        message: `Your course "${course.title}" has been approved and is now live in the marketplace.`,
        extra: { courseId: id },
      });

      if (io) {
        io.to(`user:${course.instructorEmail}`).emit("course:status_updated", {
          courseId: id,
          status: "approved",
          rejectionReason: "",
        });
      }

      return res.json({ message: "Course approved.", courseId: id, status: "approved" });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // PATCH /admin-api/courses/:id/reject
  app.patch("/admin-api/courses/:id/reject", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });
      if (course.status !== "pending_review") {
        return res.status(409).json({ message: "This course is no longer in a reviewable state." });
      }

      const rejectionReason = (req.body.rejectionReason || "").trim();
      if (rejectionReason.length > 500) {
        return res.status(400).json({ message: "Rejection reason must be 0–500 characters." });
      }

      const now = new Date().toISOString();
      await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "rejected", rejectedAt: now, rejectedBy: req.adminUser.email, rejectionReason, updatedAt: now } }
      );

      const notifMessage = rejectionReason
        ? `Your course "${course.title}" was rejected. Reason: ${rejectionReason}`
        : `Your course "${course.title}" was rejected.`;

      await insertUserNotification(userNotificationsCollection, io, {
        recipientEmail: course.instructorEmail,
        type: "course_rejected",
        title: "Course Rejected",
        message: notifMessage,
        extra: { courseId: id },
      });

      if (io) {
        io.to(`user:${course.instructorEmail}`).emit("course:status_updated", {
          courseId: id,
          status: "rejected",
          rejectionReason,
        });
      }

      return res.json({ message: "Course rejected.", courseId: id, status: "rejected" });
    } catch (err) {
      return res.status(500).json({ message: "Action failed. Please try again." });
    }
  });

  // GET /admin-api/revenue
  app.get("/admin-api/revenue", verifyAdminJWT, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate).toISOString();
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end.toISOString();
      }
      const matchStage = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

      const [totalResult, perCourse] = await Promise.all([
        courseEnrollmentsCollection.aggregate([
          { $match: matchStage },
          { $group: { _id: null, totalRevenue: { $sum: "$commission" }, totalGross: { $sum: "$price" } } },
        ]).toArray(),
        courseEnrollmentsCollection.aggregate([
          { $match: matchStage },
          { $group: {
            _id: "$courseId",
            enrollments: { $sum: 1 },
            grossSales: { $sum: "$price" },
            commission: { $sum: "$commission" },
            instructorEmail: { $first: "$instructorEmail" },
            courseTitle: { $first: "$courseTitle" },
          }},
          { $sort: { commission: -1 } },
        ]).toArray(),
      ]);

      const instructorEmails = [...new Set(perCourse.map((c) => c.instructorEmail))];
      const instructors = await usersCollection
        .find({ email: { $in: instructorEmails } }, { projection: { email: 1, fullName: 1, name: 1 } })
        .toArray();
      const instrMap = new Map(instructors.map((u) => [u.email, u.fullName || u.name || "Unknown"]));

      return res.json({
        totalRevenue: Number((totalResult[0]?.totalRevenue || 0).toFixed(2)),
        courses: perCourse.map((c) => ({
          courseId: c._id.toString(),
          courseTitle: c.courseTitle,
          instructorName: instrMap.get(c.instructorEmail) || "Unknown",
          enrollments: c.enrollments,
          grossSales: Number(c.grossSales.toFixed(2)),
          commission: Number(c.commission.toFixed(2)),
        })),
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load revenue data. Please try again." });
    }
  });

  // GET /admin-api/revenue/chart
  app.get("/admin-api/revenue/chart", verifyAdminJWT, async (req, res) => {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const data = await courseEnrollmentsCollection.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo.toISOString() } } },
        { $group: {
          _id: { $substr: ["$createdAt", 0, 7] },
          revenue: { $sum: "$commission" },
        }},
        { $sort: { _id: 1 } },
      ]).toArray();

      return res.json(data.map((d) => ({ month: d._id, revenue: Number(d.revenue.toFixed(2)) })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to load chart data." });
    }
  });
  // DELETE /admin-api/courses/:id — permanently delete a course + all its lessons and enrollments
  app.delete("/admin-api/courses/:id", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      // Delete the course document first
      const courseResult = await coursesCollection.deleteOne({ _id: new ObjectId(id) });
      if (courseResult.deletedCount === 0) {
        return res.status(404).json({ message: "Course not found." });
      }

      // Cascade: delete all lessons and enrollments for this course
      try {
        await lessonsCollection.deleteMany({ courseId: new ObjectId(id) });
        await courseEnrollmentsCollection.deleteMany({ courseId: new ObjectId(id) });
      } catch (cascadeErr) {
        console.error(`[Admin Delete] Cascade delete failed for courseId ${id}:`, cascadeErr.message);
        return res.status(500).json({ message: "Course deleted but failed to remove associated records. Please contact support." });
      }

      return res.json({ message: "Course deleted.", courseId: id });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete course. Please try again." });
    }
  });
};

module.exports = { registerAdminRoutes };
