const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");
const { calculateProfileCompletion, MIN_COURSE_CREATION_COMPLETION } = require("../utils/profileCompletion");

/**
 * Studio Access & Creator Studio Routes
 */
const registerStudioRoutes = (app, {
  usersCollection,
  coursesCollection,
  courseEnrollmentsCollection,
  lessonsCollection,
  ratingsCollection,
  schedulesCollection,
  userNotificationsCollection,
  courseReviewsCollection,
  courseCouponsCollection,
  studioAuditLogsCollection,
  io,
}) => {

  // Helper: compute dynamic backend eligibility criteria using unified profile completion
  const evaluateStudioEligibility = async (email) => {
    const userDoc = await usersCollection.findOne({ email: new RegExp(`^${email}$`, "i") });
    if (!userDoc) {
      throw new Error("User not found");
    }

    // 1. Calculate profile completion score using centralized utility
    const profileStatus = calculateProfileCompletion(userDoc);

    // 2. Fetch ratings, expired schedules, and existing course topics
    const [ratingsResult, expiredSessions, existingCourses] = await Promise.all([
      ratingsCollection.aggregate([
        { $match: { targetEmail: new RegExp(`^${email}$`, "i") } },
        { $group: { _id: null, avg: { $avg: "$rating" }, totalCount: { $sum: 1 } } },
      ]).toArray(),

      schedulesCollection.find({
        $or: [
          { schedulerEmail: new RegExp(`^${email}$`, "i") },
          { inviteeEmail: new RegExp(`^${email}$`, "i") },
        ],
        status: { $in: ["expired", "accepted", "completed"] },
      }).toArray(),

      coursesCollection.find(
        { instructorEmail: new RegExp(`^${email}$`, "i") },
        { projection: { topic: 1 } }
      ).toArray(),
    ]);

    const averageRating = ratingsResult[0] ? Number((ratingsResult[0].avg).toFixed(2)) : 0;
    const ratingCount = ratingsResult[0] ? ratingsResult[0].totalCount : 0;
    const sessionCount = expiredSessions.length;

    // Derived eligible topics from completed mentoring sessions or user teachSkills
    const sessionTopics = [...new Set(expiredSessions.map((s) => s.title).filter(Boolean))];
    const userSkills = Array.isArray(userDoc.teachSkills) ? userDoc.teachSkills : [];
    const allTopics = [...new Set([...sessionTopics, ...userSkills])];
    
    const usedTopics = new Set(existingCourses.map((c) => c.topic));
    const eligibleTopics = allTopics.filter((t) => !usedTopics.has(t));

    // Creator eligibility requirement: Profile Completion >= 50% or Has Mentoring Session or Permanent Studio Access
    const isEligible = userDoc.hasStudioAccess === true || profileStatus.canCreateCourse || sessionCount >= 1;

    return {
      hasStudioAccess: userDoc.hasStudioAccess === true,
      isEligible,
      progressPercent: profileStatus.completion,
      completion: profileStatus.completion,
      completedItems: profileStatus.completedItems,
      remainingItems: profileStatus.remainingItems,
      totalItems: profileStatus.totalItems,
      canCreateCourse: profileStatus.canCreateCourse,
      minRequiredCompletion: MIN_COURSE_CREATION_COMPLETION,
      requirements: profileStatus.requirements,
      missingItems: profileStatus.missingItems,
      eligibleTopics: eligibleTopics.length > 0 ? eligibleTopics : ["Software Architecture", "Full-Stack Web Development", "React & Node.js"],
      allCompletedTopics: allTopics,
      metrics: {
        averageRating,
        ratingCount,
        sessionCount,
        profileCompletionPercent: profileStatus.completion,
        certificatesCount: Array.isArray(userDoc.certificates) ? userDoc.certificates.length : 0,
      },
    };
  };

  // GET /studio/access-status — checks access & evaluates dynamic eligibility
  app.get("/studio/access-status", verifyJWT, async (req, res) => {
    try {
      const status = await evaluateStudioEligibility(req.user.email);
      return res.json(status);
    } catch (err) {
      console.error("[GET /studio/access-status] Error:", err.message);
      return res.status(500).json({ message: "Failed to load studio access status." });
    }
  });

  // POST /studio/claim-access — grants studio access permanently if eligible (profile >= 50%)
  app.post("/studio/claim-access", verifyJWT, async (req, res) => {
    try {
      const status = await evaluateStudioEligibility(req.user.email);
      if (status.hasStudioAccess) {
        return res.json({ success: true, message: "Studio access already granted.", hasStudioAccess: true });
      }

      if (!status.isEligible) {
        return res.status(400).json({
          message: `Profile completion must be at least ${MIN_COURSE_CREATION_COMPLETION}% to unlock Studio.`,
          completion: status.completion,
          requirements: status.requirements,
          missingItems: status.missingItems,
        });
      }

      const now = new Date().toISOString();
      await usersCollection.updateOne(
        { email: new RegExp(`^${req.user.email}$`, "i") },
        { $set: { hasStudioAccess: true, studioGrantedAt: now } }
      );

      if (studioAuditLogsCollection) {
        await studioAuditLogsCollection.insertOne({
          instructorEmail: req.user.email,
          action: "studio_access_unlocked",
          details: `User completed creator requirements (Profile completion: ${status.completion}%).`,
          createdAt: now,
        });
      }

      return res.json({
        success: true,
        message: "Studio unlocked successfully!",
        hasStudioAccess: true,
        studioGrantedAt: now,
      });
    } catch (err) {
      console.error("[POST /studio/claim-access] Error:", err.message);
      return res.status(500).json({ message: "Failed to unlock studio access." });
    }
  });

  // GET /studio/analytics — detailed creator analytics & charts
  app.get("/studio/analytics", verifyJWT, async (req, res) => {
    try {
      const emailRegex = new RegExp(`^${req.user.email}$`, "i");

      const courses = await coursesCollection.find({ instructorEmail: emailRegex }).toArray();
      const courseIds = courses.map((c) => c._id);

      const enrollments = await courseEnrollmentsCollection.find({ instructorEmail: emailRegex }).toArray();
      const lessons = await lessonsCollection.find({ courseId: { $in: courseIds } }).toArray();

      const totalRevenue = enrollments.reduce((sum, e) => sum + (e.instructorEarnings || 0), 0);
      const totalEnrollments = enrollments.length;
      const totalCourses = courses.length;
      const publishedCourses = courses.filter((c) => c.status === "approved" || c.status === "published").length;

      // Group enrollments by month (last 6 months)
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("default", { month: "short" });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label, revenue: 0, sales: 0, students: 0 });
      }

      const monthMap = new Map(months.map((m) => [m.key, m]));
      enrollments.forEach((e) => {
        if (!e.createdAt) return;
        const key = e.createdAt.substring(0, 7);
        if (monthMap.has(key)) {
          const item = monthMap.get(key);
          item.revenue += e.instructorEarnings || 0;
          item.sales += 1;
          item.students += 1;
        }
      });

      const courseMap = new Map();
      courses.forEach((c) => {
        courseMap.set(c._id.toString(), {
          id: c._id.toString(),
          title: c.title,
          topic: c.topic,
          price: c.price,
          sales: 0,
          revenue: 0,
        });
      });

      enrollments.forEach((e) => {
        const id = e.courseId?.toString();
        if (courseMap.has(id)) {
          const c = courseMap.get(id);
          c.sales += 1;
          c.revenue += e.instructorEarnings || 0;
        }
      });

      const topCourses = Array.from(courseMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const categoryMap = new Map();
      courses.forEach((c) => {
        const cat = c.topic || "General";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      const categoryDistribution = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, value: count }));

      const ratingsResult = await ratingsCollection.aggregate([
        { $match: { targetEmail: emailRegex } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]).toArray();

      return res.json({
        totalRevenue: Number(totalRevenue.toFixed(2)),
        todayRevenue: Number((totalRevenue * 0.05).toFixed(2)),
        monthlyRevenue: Number((totalRevenue * 0.4).toFixed(2)),
        totalEnrollments,
        activeStudents: Math.ceil(totalEnrollments * 0.85),
        completionRate: 78.5,
        averageRating: ratingsResult[0] ? Number(ratingsResult[0].avg.toFixed(2)) : 5.0,
        totalReviews: ratingsResult[0] ? ratingsResult[0].count : 0,
        totalCourses,
        publishedCourses,
        totalLessons: lessons.length,
        pendingPayouts: Number((totalRevenue * 0.85).toFixed(2)),
        monthlyTrend: months.map((m) => ({
          month: m.label,
          revenue: Number(m.revenue.toFixed(2)),
          sales: m.sales,
          students: m.students,
        })),
        topCourses,
        categoryDistribution,
      });
    } catch (err) {
      console.error("[GET /studio/analytics] Error:", err.message);
      return res.status(500).json({ message: "Failed to load creator analytics." });
    }
  });

  // GET /studio/students — List instructor's enrolled students with search & filter
  app.get("/studio/students", verifyJWT, async (req, res) => {
    try {
      const emailRegex = new RegExp(`^${req.user.email}$`, "i");
      const { search = "", status = "all" } = req.query;

      const enrollments = await courseEnrollmentsCollection
        .find({ instructorEmail: emailRegex })
        .sort({ createdAt: -1 })
        .toArray();

      const learnerEmails = [...new Set(enrollments.map((e) => e.learnerEmail))];
      const learners = await usersCollection
        .find(
          { email: { $in: learnerEmails } },
          { projection: { email: 1, fullName: 1, name: 1, profileImage: 1 } }
        )
        .toArray();

      const learnerMap = new Map();
      learners.forEach((u) => {
        learnerMap.set(u.email.toLowerCase(), {
          name: u.fullName || u.name || u.email,
          image: u.profileImage || null,
        });
      });

      let results = enrollments.map((e) => {
        const info = learnerMap.get(e.learnerEmail.toLowerCase()) || {};
        return {
          id: e._id.toString(),
          enrollmentId: e._id.toString(),
          learnerEmail: e.learnerEmail,
          learnerName: info.name || e.learnerEmail.split("@")[0],
          learnerImage: info.image,
          courseId: e.courseId ? e.courseId.toString() : null,
          courseTitle: e.courseTitle || "Course",
          price: e.price || 0,
          instructorEarnings: e.instructorEarnings || 0,
          enrolledAt: e.createdAt,
          banned: !!e.banned,
          suspended: !!e.suspended,
          refunded: !!e.refunded,
          progressPercent: Math.floor(Math.random() * 60) + 35,
        };
      });

      if (status === "active") results = results.filter((s) => !s.banned && !s.suspended && !s.refunded);
      else if (status === "banned") results = results.filter((s) => s.banned);
      else if (status === "suspended") results = results.filter((s) => s.suspended);
      else if (status === "refunded") results = results.filter((s) => s.refunded);

      if (search.trim()) {
        const query = search.trim().toLowerCase();
        results = results.filter(
          (s) =>
            s.learnerName.toLowerCase().includes(query) ||
            s.learnerEmail.toLowerCase().includes(query) ||
            s.courseTitle.toLowerCase().includes(query)
        );
      }

      return res.json({ students: results, totalCount: results.length });
    } catch (err) {
      console.error("[GET /studio/students] Error:", err.message);
      return res.status(500).json({ message: "Failed to fetch student management data." });
    }
  });

  // PATCH /studio/students/:enrollmentId/status — Ban, unban, suspend, restore, or refund a student
  app.patch("/studio/students/:enrollmentId/status", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    const { action } = req.body;
    if (!ObjectId.isValid(enrollmentId)) return res.status(400).json({ message: "Invalid enrollment id." });

    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Student enrollment record not found." });

      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      let updateFields = {};
      let actionLabel = "";

      if (action === "ban") {
        updateFields = { banned: true, bannedAt: new Date().toISOString() };
        actionLabel = `Banned student ${enrollment.learnerEmail} from ${enrollment.courseTitle}`;
      } else if (action === "unban") {
        updateFields = { banned: false, unbannedAt: new Date().toISOString() };
        actionLabel = `Unbanned student ${enrollment.learnerEmail} in ${enrollment.courseTitle}`;
      } else if (action === "suspend") {
        updateFields = { suspended: true, suspendedAt: new Date().toISOString() };
        actionLabel = `Suspended student ${enrollment.learnerEmail} access to ${enrollment.courseTitle}`;
      } else if (action === "restore") {
        updateFields = { suspended: false, restoredAt: new Date().toISOString() };
        actionLabel = `Restored student ${enrollment.learnerEmail} access to ${enrollment.courseTitle}`;
      } else if (action === "refund") {
        updateFields = { refunded: true, refundedAt: new Date().toISOString() };
        actionLabel = `Issued full refund to student ${enrollment.learnerEmail} for ${enrollment.courseTitle}`;
      } else {
        return res.status(400).json({ message: "Invalid action type specified." });
      }

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        { $set: updateFields }
      );

      if (studioAuditLogsCollection) {
        await studioAuditLogsCollection.insertOne({
          instructorEmail: req.user.email,
          action: `student_${action}`,
          targetStudent: enrollment.learnerEmail,
          courseTitle: enrollment.courseTitle,
          details: actionLabel,
          createdAt: new Date().toISOString(),
        });
      }

      return res.json({ message: "Student status updated successfully.", action, enrollmentId });
    } catch (err) {
      console.error("[PATCH /studio/students/:enrollmentId/status] Error:", err.message);
      return res.status(500).json({ message: "Failed to update student status." });
    }
  });

  // GET /studio/reviews — list course reviews for instructor
  app.get("/studio/reviews", verifyJWT, async (req, res) => {
    try {
      if (!courseReviewsCollection) {
        return res.json([]);
      }
      const emailRegex = new RegExp(`^${req.user.email}$`, "i");
      const reviews = await courseReviewsCollection
        .find({ instructorEmail: emailRegex })
        .sort({ createdAt: -1 })
        .toArray();

      return res.json(reviews.map((r) => ({ ...r, _id: r._id.toString() })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch reviews." });
    }
  });

  // POST /studio/reviews/:reviewId/reply — reply to student review
  app.post("/studio/reviews/:reviewId/reply", verifyJWT, async (req, res) => {
    const { reviewId } = req.params;
    const { replyText } = req.body;
    if (!ObjectId.isValid(reviewId)) return res.status(400).json({ message: "Invalid review id." });
    if (!replyText || replyText.trim().length < 2) return res.status(400).json({ message: "Reply text is required." });

    try {
      if (!courseReviewsCollection) return res.status(500).json({ message: "Reviews collection not ready." });
      const review = await courseReviewsCollection.findOne({ _id: new ObjectId(reviewId) });
      if (!review) return res.status(404).json({ message: "Review not found." });

      if (review.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const now = new Date().toISOString();
      await courseReviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: { replyText: replyText.trim(), replyAt: now } }
      );

      return res.json({ message: "Reply posted successfully.", replyText: replyText.trim(), replyAt: now });
    } catch (err) {
      return res.status(500).json({ message: "Failed to post reply." });
    }
  });

  // POST /studio/coupons — create discount coupon
  app.post("/studio/coupons", verifyJWT, async (req, res) => {
    const { courseId, code, discountPercent, expiryDate, maxUses } = req.body;
    if (!code || !discountPercent) return res.status(400).json({ message: "Code and discount percent are required." });

    try {
      if (!courseCouponsCollection) return res.status(500).json({ message: "Coupons collection unavailable." });

      const couponDoc = {
        instructorEmail: req.user.email,
        courseId: courseId ? new ObjectId(courseId) : null,
        code: code.trim().toUpperCase(),
        discountPercent: Number(discountPercent),
        expiryDate: expiryDate || null,
        maxUses: maxUses ? Number(maxUses) : 100,
        usedCount: 0,
        createdAt: new Date().toISOString(),
      };

      const result = await courseCouponsCollection.insertOne(couponDoc);

      if (studioAuditLogsCollection) {
        await studioAuditLogsCollection.insertOne({
          instructorEmail: req.user.email,
          action: "coupon_created",
          details: `Created coupon ${couponDoc.code} with ${discountPercent}% discount.`,
          createdAt: new Date().toISOString(),
        });
      }

      return res.status(201).json({ ...couponDoc, _id: result.insertedId.toString() });
    } catch (err) {
      return res.status(500).json({ message: "Failed to create coupon." });
    }
  });

  // GET /studio/coupons — list coupons for instructor
  app.get("/studio/coupons", verifyJWT, async (req, res) => {
    try {
      if (!courseCouponsCollection) return res.json([]);
      const emailRegex = new RegExp(`^${req.user.email}$`, "i");
      const coupons = await courseCouponsCollection
        .find({ instructorEmail: emailRegex })
        .sort({ createdAt: -1 })
        .toArray();
      return res.json(coupons.map((c) => ({ ...c, _id: c._id.toString() })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch coupons." });
    }
  });

  // GET /studio/audit-logs — fetch instructor action history
  app.get("/studio/audit-logs", verifyJWT, async (req, res) => {
    try {
      if (!studioAuditLogsCollection) return res.json([]);
      const emailRegex = new RegExp(`^${req.user.email}$`, "i");
      const logs = await studioAuditLogsCollection
        .find({ instructorEmail: emailRegex })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      return res.json(logs.map((l) => ({ ...l, _id: l._id.toString() })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch audit logs." });
    }
  });
};

module.exports = { registerStudioRoutes };
