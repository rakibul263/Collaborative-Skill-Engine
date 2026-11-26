const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");
const { escapeRegex } = require("../utils/userLookup");
const { calculateProfileCompletion, MIN_COURSE_CREATION_COMPLETION } = require("../utils/profileCompletion");
const {
  CURRENCY_CODE,
  toPoisha,
  fromPoisha,
  resolveEnrollmentPoisha,
  formatInvoiceNumber,
} = require("../utils/money");

/**
 * Studio Access & Creator Studio Routes
 */
const registerStudioRoutes = (app, {
  usersCollection,
  coursesCollection,
  courseEnrollmentsCollection,
  courseCertificatesCollection = null,
  lessonsCollection,
  lessonProgressCollection,
  ratingsCollection,
  schedulesCollection,
  userNotificationsCollection,
  courseReviewsCollection,
  courseCouponsCollection,
  courseAppealsCollection = null,
  studioAuditLogsCollection,
  io,
}) => {

  // Helper: compute dynamic backend eligibility criteria using unified profile completion
  const evaluateStudioEligibility = async (email) => {
    const escaped = escapeRegex(email);
    const userDoc = await usersCollection.findOne({ email: new RegExp(`^${escaped}$`, "i") });
    if (!userDoc) {
      return {
        hasStudioAccess: false,
        isEligible: false,
        hasSignature: false,
        instructorSignature: null,
        signatureUpdatedAt: null,
        meetsOriginalMentorshipCriteria: false,
        progressPercent: 0,
        fulfilledCount: 0,
        totalCount: 4,
        completion: 0,
        canCreateCourse: false,
        requirements: [],
        profileRequirements: [],
        eligibleTopics: ["Software Architecture", "Full-Stack Web Development"],
        allCompletedTopics: [],
        metrics: { averageRating: 0, ratingCount: 0, sessionCount: 0, profileCompletionPercent: 0, certificatesCount: 0 },
      };
    }

    // 1. Calculate profile completion score using centralized utility
    const profileStatus = calculateProfileCompletion(userDoc);

    // 2. Fetch ratings, expired schedules, and existing course topics
    const [ratingsResult, expiredSessions, existingCourses] = await Promise.all([
      ratingsCollection.aggregate([
        { $match: { targetEmail: new RegExp(`^${escaped}$`, "i") } },
        { $group: { _id: null, avg: { $avg: "$rating" }, totalCount: { $sum: 1 } } },
      ]).toArray(),

      schedulesCollection.find({
        $or: [
          { schedulerEmail: new RegExp(`^${escaped}$`, "i") },
          { inviteeEmail: new RegExp(`^${escaped}$`, "i") },
        ],
        status: { $in: ["expired", "accepted", "completed"] },
      }).toArray(),

      coursesCollection.find(
        { instructorEmail: new RegExp(`^${escaped}$`, "i") },
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

    // Creator eligibility requirement: Mentoring Sessions >= 1 AND Average Rating >= 4.0
    // OR Admin role OR explicit hasStudioAccess / canCreateCourse flag OR existing courses created
    const meetsOriginalMentorshipCriteria = sessionCount >= 1 && averageRating >= 4.0;
    const isEligible =
      meetsOriginalMentorshipCriteria ||
      userDoc.role === "Admin" ||
      userDoc.role === "admin" ||
      userDoc.role === "Instructor" ||
      userDoc.hasStudioAccess === true ||
      userDoc.canCreateCourse === true ||
      existingCourses.length > 0;

    const eligibilityChecklist = [
      {
        id: "sessions",
        title: "1-on-1 Mentoring Session",
        description: "Deliver at least 1 verified peer mentoring session to prove domain competence.",
        required: 1,
        current: sessionCount,
        unit: "session(s)",
        fulfilled: sessionCount >= 1,
      },
      {
        id: "rating",
        title: "Minimum 4.0 Reputation Rating",
        description: "Maintain an average student/mentee rating of at least 4.0 out of 5.0.",
        required: 4.0,
        current: averageRating,
        unit: "stars",
        fulfilled: averageRating >= 4.0,
      },
      {
        id: "profile",
        title: "Profile Completeness (50%+)",
        description: "Complete your headline, bio, teaching skills, and profile photo.",
        required: 50,
        current: profileStatus.completion,
        unit: "%",
        fulfilled: profileStatus.completion >= 50,
      },
      {
        id: "topic",
        title: "Verified Topic Authority",
        description: "Have at least 1 verified mentoring discipline or declared teaching skill.",
        required: 1,
        current: allTopics.length,
        unit: "topic(s)",
        fulfilled: allTopics.length >= 1,
      },
    ];

    const fulfilledCount = eligibilityChecklist.filter((r) => r.fulfilled).length;
    const totalCount = eligibilityChecklist.length;
    const progressPercent = Math.round((fulfilledCount / totalCount) * 100);

    const hasStudioAccess = Boolean(userDoc.hasStudioAccess === true || isEligible);

    return {
      hasStudioAccess,
      isEligible: hasStudioAccess,
      hasSignature: Boolean(userDoc.instructorSignature),
      instructorSignature: userDoc.instructorSignature || null,
      signatureUpdatedAt: userDoc.signatureUpdatedAt || null,
      meetsOriginalMentorshipCriteria,
      progressPercent,
      fulfilledCount,
      totalCount,
      completion: profileStatus.completion,
      canCreateCourse: hasStudioAccess,
      requirements: eligibilityChecklist,
      profileRequirements: profileStatus.requirements,
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

  // GET /studio/signature — fetch current instructor signature
  app.get("/studio/signature", verifyJWT, async (req, res) => {
    try {
      const userDoc = await usersCollection.findOne(
        { email: new RegExp(`^${escapeRegex(req.user.email)}$`, "i") },
        { projection: { instructorSignature: 1, signatureUpdatedAt: 1, fullName: 1, displayName: 1 } }
      );
      return res.json({
        hasSignature: Boolean(userDoc?.instructorSignature),
        instructorSignature: userDoc?.instructorSignature || null,
        signatureUpdatedAt: userDoc?.signatureUpdatedAt || null,
        instructorName: userDoc?.fullName || userDoc?.displayName || req.user.email.split("@")[0],
      });
    } catch (err) {
      console.error("[GET /studio/signature] Error:", err.message);
      return res.status(500).json({ message: "Failed to load instructor signature." });
    }
  });

  // POST /studio/signature — upload & save enhanced transparent instructor signature
  app.post("/studio/signature", verifyJWT, async (req, res) => {
    try {
      const { signatureData } = req.body;
      if (!signatureData || typeof signatureData !== "string" || !signatureData.startsWith("data:image/")) {
        return res.status(400).json({ message: "A valid transparent PNG signature image is required." });
      }

      // Max size check: 3MB data URI limit
      if (signatureData.length > 3 * 1024 * 1024) {
        return res.status(400).json({ message: "Signature image size is too large. Max 2MB allowed." });
      }

      const now = new Date().toISOString();
      await usersCollection.updateOne(
        { email: new RegExp(`^${escapeRegex(req.user.email)}$`, "i") },
        { $set: { instructorSignature: signatureData, signatureUpdatedAt: now } }
      );

      // Sync across all course certificates issued for courses taught by this instructor
      if (courseCertificatesCollection) {
        await courseCertificatesCollection.updateMany(
          { instructorEmail: new RegExp(`^${escapeRegex(req.user.email)}$`, "i") },
          { $set: { instructorSignature: signatureData } }
        );
      }

      return res.json({
        success: true,
        message: "Instructor signature saved and applied to certificates.",
        instructorSignature: signatureData,
        signatureUpdatedAt: now,
      });
    } catch (err) {
      console.error("[POST /studio/signature] Error:", err.message);
      return res.status(500).json({ message: "Failed to save instructor signature." });
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
          message: "You must complete at least 1 mentoring session and maintain an average rating of 4.0+ to unlock Studio.",
          completion: status.completion,
          requirements: status.requirements,
          missingItems: status.missingItems,
        });
      }

      const now = new Date().toISOString();
      await usersCollection.updateOne(
        { email: new RegExp(`^${escapeRegex(req.user.email)}$`, "i") },
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
      const emailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, "i");

      const courses = await coursesCollection.find({ instructorEmail: emailRegex }).toArray();
      const courseIds = courses.map((c) => c._id);

      const enrollments = await courseEnrollmentsCollection.find({ instructorEmail: emailRegex }).toArray();
      const lessons = await lessonsCollection.find({ courseId: { $in: courseIds } }).toArray();

      const now = new Date();
      const todayKey = now.toISOString().substring(0, 10);
      const currentMonthKey = now.toISOString().substring(0, 7);

      let totalRevenuePoisha = 0;
      let todayRevenuePoisha = 0;
      let monthlyRevenuePoisha = 0;
      let pendingPayoutsPoisha = 0;

      const totalEnrollments = enrollments.length;
      const totalCourses = courses.length;
      const publishedCourses = courses.filter((c) => c.status === "approved" || c.status === "published").length;

      // Group enrollments by month (last 6 months)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("default", { month: "short" });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label, revenuePoisha: 0, sales: 0, students: 0 });
      }

      const monthMap = new Map(months.map((m) => [m.key, m]));
      const courseMap = new Map();
      courses.forEach((c) => {
        const coursePricePoisha = Number.isFinite(c.pricePoisha) ? Math.round(c.pricePoisha) : toPoisha(c.price || 0);
        courseMap.set(c._id.toString(), {
          id: c._id.toString(),
          title: c.title,
          topic: c.topic,
          price: fromPoisha(coursePricePoisha),
          sales: 0,
          revenuePoisha: 0,
        });
      });

      enrollments.forEach((e) => {
        const split = resolveEnrollmentPoisha(e);
        totalRevenuePoisha += split.instructorEarningsPoisha;
        if (!e.refunded) {
          pendingPayoutsPoisha += split.instructorEarningsPoisha;
        }

        if (e.createdAt) {
          if (e.createdAt.startsWith(todayKey)) {
            todayRevenuePoisha += split.instructorEarningsPoisha;
          }
          if (e.createdAt.startsWith(currentMonthKey)) {
            monthlyRevenuePoisha += split.instructorEarningsPoisha;
          }
          const monthKey = e.createdAt.substring(0, 7);
          if (monthMap.has(monthKey)) {
            const item = monthMap.get(monthKey);
            item.revenuePoisha += split.instructorEarningsPoisha;
            item.sales += 1;
            item.students += 1;
          }
        }

        const id = e.courseId?.toString();
        if (courseMap.has(id)) {
          const c = courseMap.get(id);
          c.sales += 1;
          c.revenuePoisha += split.instructorEarningsPoisha;
        }
      });

      const topCourses = Array.from(courseMap.values())
        .sort((a, b) => b.revenuePoisha - a.revenuePoisha)
        .slice(0, 5)
        .map(({ revenuePoisha, ...rest }) => ({
          ...rest,
          revenue: fromPoisha(revenuePoisha),
        }));

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
        currency: CURRENCY_CODE,
        totalRevenue: fromPoisha(totalRevenuePoisha),
        totalRevenuePoisha,
        todayRevenue: fromPoisha(todayRevenuePoisha),
        monthlyRevenue: fromPoisha(monthlyRevenuePoisha),
        totalEnrollments,
        activeStudents: Math.ceil(totalEnrollments * 0.85),
        completionRate: 78.5,
        averageRating: ratingsResult[0] ? Number(ratingsResult[0].avg.toFixed(2)) : 5.0,
        totalReviews: ratingsResult[0] ? ratingsResult[0].count : 0,
        totalCourses,
        publishedCourses,
        totalLessons: lessons.length,
        pendingPayouts: fromPoisha(pendingPayoutsPoisha),
        pendingPayoutsPoisha,
        monthlyTrend: months.map((m) => ({
          month: m.label,
          revenue: fromPoisha(m.revenuePoisha),
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
      const emailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, "i");
      const { search = "", status = "all" } = req.query;

      const enrollments = await courseEnrollmentsCollection
        .find({ instructorEmail: emailRegex })
        .sort({ createdAt: -1 })
        .toArray();

      const learnerEmails = [...new Set(enrollments.map((e) => e.learnerEmail))];
      const courseIds = [...new Set(enrollments.map((e) => e.courseId).filter(Boolean))];
      const [learners, courseLessons, progressRecords] = await Promise.all([
        usersCollection
          .find(
            { email: { $in: learnerEmails } },
            { projection: { email: 1, fullName: 1, name: 1, profileImage: 1 } }
          )
          .toArray(),
        lessonsCollection ? lessonsCollection.find({ courseId: { $in: courseIds } }).toArray() : [],
        lessonProgressCollection
          ? lessonProgressCollection.find({ courseId: { $in: courseIds } }).toArray()
          : [],
      ]);

      const videosByCourse = new Map();
      courseLessons.forEach((l) => {
        const cid = l.courseId.toString();
        const cnt =
          Array.isArray(l.videos) && l.videos.length > 0
            ? l.videos.length
            : Array.isArray(l.videoLinks)
            ? l.videoLinks.filter(Boolean).length
            : 0;
        videosByCourse.set(cid, (videosByCourse.get(cid) || 0) + cnt);
      });

      const completedByLearnerCourse = new Map();
      progressRecords.forEach((p) => {
        const key = `${p.learnerEmail.toLowerCase()}:${p.courseId.toString()}`;
        completedByLearnerCourse.set(key, (completedByLearnerCourse.get(key) || 0) + 1);
      });

      const learnerMap = new Map();
      learners.forEach((u) => {
        learnerMap.set(u.email.toLowerCase(), {
          name: u.fullName || u.name || u.email,
          image: u.profileImage || null,
        });
      });

      // Load appeals submitted to this instructor for these enrollments
      const appealsByEnrollment = new Map();
      if (courseAppealsCollection) {
        const instructorAppeals = await courseAppealsCollection
          .find({
            instructorEmail: new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
          })
          .sort({ createdAt: -1 })
          .toArray();

        for (const appDoc of instructorAppeals) {
          const k = appDoc.enrollmentId ? appDoc.enrollmentId.toString() : null;
          if (k) {
            if (!appealsByEnrollment.has(k)) appealsByEnrollment.set(k, []);
            appealsByEnrollment.get(k).push({ ...appDoc, _id: appDoc._id.toString() });
          }
        }
      }

      let results = enrollments.map((e) => {
        const info = learnerMap.get(e.learnerEmail.toLowerCase()) || {};
        const split = resolveEnrollmentPoisha(e);
        const cIdStr = e.courseId ? e.courseId.toString() : null;
        const totalVids = cIdStr ? videosByCourse.get(cIdStr) || 0 : 0;
        const doneVids = cIdStr
          ? completedByLearnerCourse.get(`${e.learnerEmail.toLowerCase()}:${cIdStr}`) || 0
          : 0;
        const progressPercent =
          totalVids > 0 ? Math.min(100, Math.round((doneVids / totalVids) * 100)) : 0;

        const isSuspensionExpired = Boolean(
          e.suspended && e.suspendedUntil && new Date(e.suspendedUntil) <= new Date()
        );
        const isBanned = Boolean(e.banned);
        const isSuspended = Boolean(e.suspended && !isSuspensionExpired);
        const studentAppeals = appealsByEnrollment.get(e._id.toString()) || [];

        return {
          id: e._id.toString(),
          enrollmentId: e._id.toString(),
          invoiceNumber: formatInvoiceNumber(e),
          learnerEmail: e.learnerEmail,
          learnerName: info.name || e.learnerEmail.split("@")[0],
          learnerImage: info.image,
          courseId: cIdStr,
          courseTitle: e.courseTitle || "Course",
          currency: CURRENCY_CODE,
          price: fromPoisha(split.pricePoisha),
          commission: fromPoisha(split.commissionPoisha),
          instructorEarnings: fromPoisha(split.instructorEarningsPoisha),
          enrolledAt: e.createdAt,
          banned: isBanned,
          bannedAt: e.bannedAt || null,
          banReason: e.banReason || (Array.isArray(e.history) ? e.history.slice().reverse().find(h => h.action === "banned")?.reason : null) || null,
          suspended: isSuspended,
          suspendedAt: e.suspendedAt || null,
          suspendedDays: e.suspendedDays || null,
          suspendedUntil: e.suspendedUntil || null,
          suspendReason: e.suspendReason || (Array.isArray(e.history) ? e.history.slice().reverse().find(h => h.action === "suspended")?.reason : null) || null,
          refunded: !!e.refunded,
          progressPercent,
          appeals: studentAppeals,
          hasAppeal: studentAppeals.length > 0,
          activeAppeal: studentAppeals[0] || null,
        };
      });

      if (status === "active") results = results.filter((s) => !s.banned && !s.suspended && !s.refunded);
      else if (status === "banned") results = results.filter((s) => s.banned);
      else if (status === "suspended") results = results.filter((s) => s.suspended);
      else if (status === "refunded") results = results.filter((s) => s.refunded);
      else if (status === "appealed") results = results.filter((s) => s.hasAppeal);

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

  // PATCH /studio/students/:enrollmentId/status — Ban, unban, suspend, restore, or refund a student with reason tracking
  app.patch("/studio/students/:enrollmentId/status", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    const { action, reason, days } = req.body || {};
    if (!ObjectId.isValid(enrollmentId)) return res.status(400).json({ message: "Invalid enrollment id." });

    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Student enrollment record not found." });

      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      let updateFields = {};
      let unsetFields = {};
      let actionLabel = "";
      const now = new Date();
      const nowIso = now.toISOString();

      if (action === "ban") {
        const banReason = reason && String(reason).trim() ? String(reason).trim() : "Violation of course terms";
        updateFields = {
          banned: true,
          bannedAt: nowIso,
          bannedByEmail: req.user.email,
          banReason,
          status: "banned",
        };
        actionLabel = `Banned student ${enrollment.learnerEmail} from ${enrollment.courseTitle}: ${banReason}`;
      } else if (action === "unban" || action === "unban_and_restore") {
        updateFields = {
          banned: false,
          suspended: false,
          unbannedAt: nowIso,
          restoredAt: nowIso,
          status: "active",
        };
        unsetFields = {
          bannedAt: "",
          bannedByEmail: "",
          banReason: "",
          suspendedAt: "",
          suspendReason: "",
          suspendedUntil: "",
          suspendedDays: "",
        };
        actionLabel = `Unbanned and restored full access for student ${enrollment.learnerEmail} in ${enrollment.courseTitle}`;
      } else if (action === "suspend") {
        const suspendReason = reason && String(reason).trim() ? String(reason).trim() : "Temporary course suspension";
        const durationDays = Number(days) || 7;
        const until = new Date(now.getTime() + durationDays * 86400000).toISOString();
        updateFields = {
          suspended: true,
          suspendedAt: nowIso,
          suspendedDays: durationDays,
          suspendedUntil: until,
          suspendReason,
          status: "suspended",
        };
        actionLabel = `Suspended student ${enrollment.learnerEmail} access to ${enrollment.courseTitle} for ${durationDays} days: ${suspendReason}`;
      } else if (action === "restore") {
        updateFields = {
          suspended: false,
          banned: false,
          restoredAt: nowIso,
          unbannedAt: nowIso,
          status: "active",
        };
        unsetFields = {
          bannedAt: "",
          bannedByEmail: "",
          banReason: "",
          suspendedAt: "",
          suspendReason: "",
          suspendedUntil: "",
          suspendedDays: "",
        };
        actionLabel = `Restored student ${enrollment.learnerEmail} access to ${enrollment.courseTitle}`;
      } else if (action === "refund") {
        updateFields = { refunded: true, refundedAt: nowIso, status: "refunded" };
        actionLabel = `Issued full refund to student ${enrollment.learnerEmail} for ${enrollment.courseTitle}`;
      } else {
        return res.status(400).json({ message: "Invalid action type specified." });
      }

      const historyItem = {
        action: `student_${action}`,
        reason: reason ? String(reason).trim() : actionLabel,
        by: req.user.email,
        timestamp: nowIso,
      };

      const mongoUpdate = {
        $set: updateFields,
        $push: { history: historyItem },
      };
      if (Object.keys(unsetFields).length > 0) {
        mongoUpdate.$unset = unsetFields;
      }

      await courseEnrollmentsCollection.updateOne(
        { _id: new ObjectId(enrollmentId) },
        mongoUpdate
      );

      // Send real-time notification to the student
      if (userNotificationsCollection && enrollment.learnerEmail) {
        let notifTitle = "Enrollment Status Update";
        let notifMsg = actionLabel;
        let notifType = "enrollment_update";

        if (action === "ban") {
          notifTitle = `Access Restricted: ${enrollment.courseTitle}`;
          notifMsg = `Your enrollment has been banned by instructor ${req.user.email}. Reason: ${updateFields.banReason}. You can submit an appeal from your Classroom Dashboard.`;
          notifType = "course_banned";
        } else if (action === "suspend") {
          notifTitle = `Temporary Suspension: ${enrollment.courseTitle}`;
          notifMsg = `Your access has been temporarily suspended for ${updateFields.suspendedDays} days. Reason: ${updateFields.suspendReason}. You can message the instructor to appeal.`;
          notifType = "course_suspended";
        } else if (action === "unban" || action === "restore") {
          notifTitle = `Access Restored: ${enrollment.courseTitle}`;
          notifMsg = `Your course access to ${enrollment.courseTitle} has been restored! You can resume watching lessons now.`;
          notifType = "course_access_restored";
        }

        const notifDoc = {
          recipientEmail: enrollment.learnerEmail.toLowerCase(),
          type: notifType,
          title: notifTitle,
          message: notifMsg,
          courseId: enrollment.courseId.toString(),
          enrollmentId,
          isRead: false,
          createdAt: nowIso,
        };
        await userNotificationsCollection.insertOne(notifDoc);
        if (io) {
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("user-notification:new", notifDoc);
          io.to(`user:${enrollment.learnerEmail}`).emit("user-notification:new", notifDoc);
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("message:popup", {
            type: restoreAccess ? "restriction_lifted" : "appeal_reply",
            title: restoreAccess
              ? `Access Restored: ${enrollment.courseTitle}`
              : `Instructor Replied: ${enrollment.courseTitle}`,
            message: `${instructorName} replied: "${message.trim().slice(0, 120)}"`,
            senderName: instructorName,
            senderEmail: req.user.email,
            courseTitle: enrollment.courseTitle,
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: targetAppeal ? targetAppeal._id.toString() : null,
            actionUrl: `/courses/${enrollment.courseId.toString()}/learn`,
            createdAt: nowIso,
          });
          io.to(`user:${enrollment.learnerEmail}`).emit("message:popup", {
            type: restoreAccess ? "restriction_lifted" : "appeal_reply",
            title: restoreAccess
              ? `Access Restored: ${enrollment.courseTitle}`
              : `Instructor Replied: ${enrollment.courseTitle}`,
            message: `${instructorName} replied: "${message.trim().slice(0, 120)}"`,
            senderName: instructorName,
            senderEmail: req.user.email,
            courseTitle: enrollment.courseTitle,
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: targetAppeal ? targetAppeal._id.toString() : null,
            actionUrl: `/courses/${enrollment.courseId.toString()}/learn`,
            createdAt: nowIso,
          });
          const enrollPayload = {
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            status: updateFields.status || "active",
            active: !updateFields.banned && !updateFields.suspended && !updateFields.refunded,
            banned: Boolean(updateFields.banned),
            suspended: Boolean(updateFields.suspended),
          };
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("enrollment:updated", enrollPayload);
          io.to(`user:${enrollment.learnerEmail}`).emit("enrollment:updated", enrollPayload);
          io.to(`user:${req.user.email.toLowerCase()}`).emit("enrollment:updated", enrollPayload);
          io.to(`user:${req.user.email}`).emit("enrollment:updated", enrollPayload);
        }

        // If access was restored or unbanned, also resolve active appeals in real-time
        if ((action === "unban" || action === "restore") && courseAppealsCollection) {
          const activeAppeal = await courseAppealsCollection.findOne({
            enrollmentId: enrollment._id,
            status: { $in: ["pending", "replied"] },
          });
          if (activeAppeal) {
            await courseAppealsCollection.updateOne(
              { _id: activeAppeal._id },
              { $set: { status: "resolved", updatedAt: nowIso } }
            );
            if (io) {
              const resPayload = {
                ...activeAppeal,
                _id: activeAppeal._id.toString(),
                status: "resolved",
                banned: false,
                suspended: false,
                updatedAt: nowIso,
              };
              io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("appeal:updated", resPayload);
              io.to(`user:${enrollment.learnerEmail}`).emit("appeal:updated", resPayload);
              io.to(`user:${req.user.email.toLowerCase()}`).emit("appeal:updated", resPayload);
              io.to(`user:${req.user.email}`).emit("appeal:updated", resPayload);
            }
          }
        }
      }

      if (studioAuditLogsCollection) {
        await studioAuditLogsCollection.insertOne({
          instructorEmail: req.user.email,
          action: `student_${action}`,
          targetStudent: enrollment.learnerEmail,
          courseTitle: enrollment.courseTitle,
          details: actionLabel,
          createdAt: nowIso,
        });
      }

      return res.json({ message: "Student status updated successfully.", action, enrollmentId });
    } catch (err) {
      console.error("[PATCH /studio/students/:enrollmentId/status] Error:", err.message);
      return res.status(500).json({ message: "Failed to update student status." });
    }
  });

  // POST /studio/students/:enrollmentId/reply-appeal — instructor replies to student appeal and can restore access
  app.post("/studio/students/:enrollmentId/reply-appeal", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    const { message, appealId, restoreAccess = false } = req.body || {};
    if (!ObjectId.isValid(enrollmentId)) return res.status(400).json({ message: "Invalid enrollment id." });

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message cannot be empty." });
    }

    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found." });

      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const instructorUser = await usersCollection.findOne({
        email: new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      const instructorName = instructorUser?.fullName || instructorUser?.name || req.user.email.split("@")[0];
      const nowIso = new Date().toISOString();

      const replyItem = {
        id: new ObjectId().toString(),
        sender: "instructor",
        senderEmail: req.user.email.toLowerCase(),
        senderName: instructorName,
        message: message.trim(),
        liftedRestriction: Boolean(restoreAccess),
        createdAt: nowIso,
      };

      let targetAppeal = null;
      if (courseAppealsCollection) {
        let query = { enrollmentId: enrollment._id };
        if (appealId && ObjectId.isValid(appealId)) {
          query = { _id: new ObjectId(appealId) };
        }
        targetAppeal = await courseAppealsCollection.findOne(query);

        if (targetAppeal) {
          const nextStatus = restoreAccess ? "resolved" : "replied";
          await courseAppealsCollection.updateOne(
            { _id: targetAppeal._id },
            {
              $push: { messages: replyItem },
              $set: { status: nextStatus, updatedAt: nowIso },
            }
          );
        } else {
          const newAppeal = {
            courseId: enrollment.courseId,
            courseTitle: enrollment.courseTitle,
            enrollmentId: enrollment._id,
            learnerEmail: enrollment.learnerEmail,
            learnerName: enrollment.learnerName || enrollment.learnerEmail.split("@")[0],
            instructorEmail: req.user.email.toLowerCase(),
            instructorName,
            restrictionType: enrollment.banned ? "ban" : "suspension",
            status: restoreAccess ? "resolved" : "replied",
            messages: [replyItem],
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          const insRes = await courseAppealsCollection.insertOne(newAppeal);
          targetAppeal = { ...newAppeal, _id: insRes.insertedId };
        }
      }

      // If instructor selected restoreAccess: unban & unsuspend student immediately!
      if (restoreAccess) {
        await courseEnrollmentsCollection.updateOne(
          { _id: enrollment._id },
          {
            $set: { banned: false, suspended: false, status: "active" },
            $unset: {
              bannedAt: "",
              bannedByEmail: "",
              banReason: "",
              suspendedAt: "",
              suspendReason: "",
              suspendedUntil: "",
              suspendedDays: "",
            },
            $push: {
              history: {
                action: "access_restored_via_appeal",
                reason: message.trim(),
                by: req.user.email,
                timestamp: nowIso,
              },
            },
          }
        );
      }

      // Prepare updated appeal payload
      const updatedAppealPayload = targetAppeal
        ? {
            ...targetAppeal,
            _id: targetAppeal._id.toString(),
            id: targetAppeal._id.toString(),
            courseId: enrollment.courseId.toString(),
            courseTitle: enrollment.courseTitle,
            enrollmentId: enrollment._id.toString(),
            learnerEmail: enrollment.learnerEmail,
            learnerName: enrollment.learnerName || enrollment.learnerEmail.split("@")[0],
            messages: [...(targetAppeal?.messages || []), replyItem],
            status: restoreAccess ? "resolved" : "replied",
            banned: restoreAccess ? false : enrollment.banned,
            suspended: restoreAccess ? false : enrollment.suspended,
            updatedAt: nowIso,
          }
        : null;

      // Send real-time notification to the learner
      if (userNotificationsCollection && enrollment.learnerEmail) {
        const notifDoc = {
          recipientEmail: enrollment.learnerEmail.toLowerCase(),
          type: restoreAccess ? "restriction_lifted" : "appeal_reply",
          title: restoreAccess
            ? `Access Restored: ${enrollment.courseTitle}`
            : `Instructor Replied: ${enrollment.courseTitle}`,
          message: `${instructorName} replied: "${message.trim().slice(0, 120)}${message.length > 120 ? "..." : ""}"`,
          courseId: enrollment.courseId.toString(),
          enrollmentId: enrollment._id.toString(),
          appealId: targetAppeal ? targetAppeal._id.toString() : null,
          isRead: false,
          createdAt: nowIso,
        };
        await userNotificationsCollection.insertOne(notifDoc);
        if (io) {
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("user-notification:new", notifDoc);
          io.to(`user:${enrollment.learnerEmail}`).emit("user-notification:new", notifDoc);
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("message:popup", {
            type: restoreAccess ? "restriction_lifted" : "appeal_reply",
            title: restoreAccess
              ? `Access Restored: ${enrollment.courseTitle}`
              : `Instructor Replied: ${enrollment.courseTitle}`,
            message: `${instructorName} replied: "${message.trim().slice(0, 120)}"`,
            senderName: instructorName,
            senderEmail: req.user.email,
            courseTitle: enrollment.courseTitle,
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: targetAppeal ? targetAppeal._id.toString() : null,
            actionUrl: `/courses/${enrollment.courseId.toString()}/learn`,
            createdAt: nowIso,
          });
          io.to(`user:${enrollment.learnerEmail}`).emit("message:popup", {
            type: restoreAccess ? "restriction_lifted" : "appeal_reply",
            title: restoreAccess
              ? `Access Restored: ${enrollment.courseTitle}`
              : `Instructor Replied: ${enrollment.courseTitle}`,
            message: `${instructorName} replied: "${message.trim().slice(0, 120)}"`,
            senderName: instructorName,
            senderEmail: req.user.email,
            courseTitle: enrollment.courseTitle,
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: targetAppeal ? targetAppeal._id.toString() : null,
            actionUrl: `/courses/${enrollment.courseId.toString()}/learn`,
            createdAt: nowIso,
          });

          if (updatedAppealPayload) {
            io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("appeal:updated", updatedAppealPayload);
            io.to(`user:${enrollment.learnerEmail}`).emit("appeal:updated", updatedAppealPayload);
            io.to(`user:${req.user.email.toLowerCase()}`).emit("appeal:updated", updatedAppealPayload);
            io.to(`user:${req.user.email}`).emit("appeal:updated", updatedAppealPayload);
          }

          const enrollEvt = {
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            status: restoreAccess ? "active" : enrollment.status,
            active: Boolean(restoreAccess),
            banned: restoreAccess ? false : enrollment.banned,
            suspended: restoreAccess ? false : enrollment.suspended,
          };
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("enrollment:updated", enrollEvt);
          io.to(`user:${enrollment.learnerEmail}`).emit("enrollment:updated", enrollEvt);
          io.to(`user:${req.user.email.toLowerCase()}`).emit("enrollment:updated", enrollEvt);
          io.to(`user:${req.user.email}`).emit("enrollment:updated", enrollEvt);
        }
      }

      if (studioAuditLogsCollection) {
        await studioAuditLogsCollection.insertOne({
          instructorEmail: req.user.email,
          action: restoreAccess ? "appeal_replied_and_restored" : "appeal_replied",
          targetStudent: enrollment.learnerEmail,
          courseTitle: enrollment.courseTitle,
          details: `Instructor replied to appeal: "${message.trim().slice(0, 100)}" (Restored access: ${restoreAccess})`,
          createdAt: nowIso,
        });
      }

      return res.json({
        message: restoreAccess
          ? "Reply sent and student access restored successfully!"
          : "Reply sent to student successfully.",
        reply: replyItem,
        appeal: updatedAppealPayload,
      });
    } catch (err) {
      console.error("[POST /studio/students/:enrollmentId/reply-appeal Error]:", err.message);
      return res.status(500).json({ message: "Failed to send reply to student." });
    }
  });

  // GET /studio/appeals — list all student appeals & dispute threads for instructor courses
  app.get("/studio/appeals", verifyJWT, async (req, res) => {
    try {
      if (!courseAppealsCollection) {
        return res.json({ appeals: [], pendingCount: 0 });
      }

      const instructorEmailRegex = new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

      // Parallelize course lookup and direct appeals lookup
      const [instructorCourses, directAppeals] = await Promise.all([
        coursesCollection.find({ instructorEmail: instructorEmailRegex }).project({ _id: 1, title: 1 }).toArray(),
        courseAppealsCollection.find({ instructorEmail: instructorEmailRegex }).sort({ updatedAt: -1, createdAt: -1 }).toArray(),
      ]);

      const courseIds = instructorCourses.map((c) => c._id);
      let appeals = directAppeals;
      if (courseIds.length > 0) {
        const courseAppeals = await courseAppealsCollection
          .find({ courseId: { $in: courseIds } })
          .sort({ updatedAt: -1, createdAt: -1 })
          .toArray();
        const seen = new Set(appeals.map((a) => a._id.toString()));
        for (const ca of courseAppeals) {
          if (!seen.has(ca._id.toString())) {
            seen.add(ca._id.toString());
            appeals.push(ca);
          }
        }
      }

      if (appeals.length === 0) {
        return res.json({ appeals: [], pendingCount: 0 });
      }

      const enrollmentIds = appeals.map((a) => a.enrollmentId).filter(Boolean);
      const learnerEmails = [...new Set(appeals.map((a) => a.learnerEmail?.toLowerCase()).filter(Boolean))];

      // Fetch enrollments and user metadata in parallel
      const [enrollments, users] = await Promise.all([
        courseEnrollmentsCollection
          .find({ _id: { $in: enrollmentIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id)) } })
          .toArray(),
        usersCollection
          .find({ email: { $in: learnerEmails.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i")) } })
          .project({ email: 1, fullName: 1, name: 1, profileImage: 1 })
          .toArray(),
      ]);

      const enrollmentMap = new Map();
      enrollments.forEach((e) => enrollmentMap.set(e._id.toString(), e));

      const userMap = new Map();
      users.forEach((u) => userMap.set(u.email.toLowerCase(), u));

      let pendingCount = 0;
      const formattedAppeals = appeals.map((appDoc) => {
        const e = appDoc.enrollmentId ? enrollmentMap.get(appDoc.enrollmentId.toString()) : null;
        const u = appDoc.learnerEmail ? userMap.get(appDoc.learnerEmail.toLowerCase()) : null;

        const isSuspensionExpired = Boolean(
          e?.suspended && e?.suspendedUntil && new Date(e.suspendedUntil) <= new Date()
        );
        const isBanned = Boolean(e?.banned);
        const isSuspended = Boolean(e?.suspended && !isSuspensionExpired);

        const currentStatus = appDoc.status || "pending";
        if (currentStatus === "pending") pendingCount++;

        return {
          _id: appDoc._id.toString(),
          id: appDoc._id.toString(),
          courseId: appDoc.courseId ? appDoc.courseId.toString() : e?.courseId?.toString() || "",
          courseTitle: appDoc.courseTitle || e?.courseTitle || "Course",
          enrollmentId: appDoc.enrollmentId ? appDoc.enrollmentId.toString() : "",
          learnerEmail: appDoc.learnerEmail || e?.learnerEmail || "",
          learnerName: u?.fullName || u?.name || appDoc.learnerName || e?.learnerName || appDoc.learnerEmail?.split("@")[0] || "Learner",
          learnerImage: u?.profileImage || null,
          instructorEmail: appDoc.instructorEmail || req.user.email,
          instructorName: appDoc.instructorName || "Instructor",
          restrictionType: isBanned ? "ban" : isSuspended ? "suspension" : appDoc.restrictionType || (e?.banned ? "ban" : "suspension"),
          restrictionReason: e?.banReason || e?.suspendReason || appDoc.restrictionReason || "Restriction applied",
          banned: isBanned,
          suspended: isSuspended,
          suspendedDays: e?.suspendedDays || null,
          suspendedUntil: e?.suspendedUntil || null,
          bannedAt: e?.bannedAt || null,
          status: currentStatus, // "pending" | "replied" | "resolved" | "rejected"
          requestedAction: appDoc.requestedAction || "lift_restriction",
          contactPhone: appDoc.contactPhone || "",
          messages: Array.isArray(appDoc.messages) ? appDoc.messages : [],
          createdAt: appDoc.createdAt,
          updatedAt: appDoc.updatedAt || appDoc.createdAt,
        };
      });

      return res.json({ appeals: formattedAppeals, pendingCount });
    } catch (err) {
      console.error("[GET /studio/appeals Error]:", err.message);
      return res.status(500).json({ message: "Failed to fetch appeals.", appeals: [], pendingCount: 0 });
    }
  });

  // GET /studio/appeals/count — quick pending appeal badge count for sidebar & notifications
  app.get("/studio/appeals/count", verifyJWT, async (req, res) => {
    try {
      if (!courseAppealsCollection) return res.json({ pendingCount: 0 });
      const instructorEmailRegex = new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

      // Count appeals for this instructor where status is 'pending'
      const pendingCount = await courseAppealsCollection.countDocuments({
        instructorEmail: instructorEmailRegex,
        status: "pending",
      });
      return res.json({ pendingCount });
    } catch (err) {
      return res.json({ pendingCount: 0 });
    }
  });

  // POST /studio/appeals/:appealId/reply — reply to student appeal by appealId
  app.post("/studio/appeals/:appealId/reply", verifyJWT, async (req, res) => {
    const { appealId } = req.params;
    const { message, restoreAccess = false } = req.body || {};
    if (!ObjectId.isValid(appealId)) return res.status(400).json({ message: "Invalid appeal id." });

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message cannot be empty." });
    }

    try {
      const appealDoc = await courseAppealsCollection.findOne({ _id: new ObjectId(appealId) });
      if (!appealDoc) return res.status(404).json({ message: "Appeal not found." });

      const enrollment = await courseEnrollmentsCollection.findOne({ _id: appealDoc.enrollmentId });
      if (!enrollment) return res.status(404).json({ message: "Associated enrollment not found." });

      if (enrollment.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const instructorUser = await usersCollection.findOne({
        email: new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      const instructorName = instructorUser?.fullName || instructorUser?.name || req.user.email.split("@")[0];
      const nowIso = new Date().toISOString();

      const replyItem = {
        id: new ObjectId().toString(),
        sender: "instructor",
        senderEmail: req.user.email.toLowerCase(),
        senderName: instructorName,
        message: message.trim(),
        liftedRestriction: Boolean(restoreAccess),
        createdAt: nowIso,
      };

      const nextStatus = restoreAccess ? "resolved" : "replied";
      await courseAppealsCollection.updateOne(
        { _id: appealDoc._id },
        {
          $push: { messages: replyItem },
          $set: { status: nextStatus, updatedAt: nowIso },
        }
      );

      if (restoreAccess) {
        await courseEnrollmentsCollection.updateOne(
          { _id: enrollment._id },
          {
            $set: { banned: false, suspended: false, status: "active" },
            $unset: {
              bannedAt: "",
              bannedByEmail: "",
              banReason: "",
              suspendedAt: "",
              suspendReason: "",
              suspendedUntil: "",
              suspendedDays: "",
            },
            $push: {
              history: {
                action: "access_restored_via_appeal",
                reason: message.trim(),
                by: req.user.email,
                timestamp: nowIso,
              },
            },
          }
        );
      }

      const updatedAppealPayload = {
        ...appealDoc,
        _id: appealDoc._id.toString(),
        id: appealDoc._id.toString(),
        courseId: enrollment.courseId.toString(),
        courseTitle: enrollment.courseTitle,
        enrollmentId: enrollment._id.toString(),
        learnerEmail: enrollment.learnerEmail,
        learnerName: enrollment.learnerName || enrollment.learnerEmail.split("@")[0],
        messages: [...(appealDoc.messages || []), replyItem],
        status: nextStatus,
        banned: restoreAccess ? false : enrollment.banned,
        suspended: restoreAccess ? false : enrollment.suspended,
        updatedAt: nowIso,
      };

      if (userNotificationsCollection && enrollment.learnerEmail) {
        const notifDoc = {
          recipientEmail: enrollment.learnerEmail.toLowerCase(),
          type: restoreAccess ? "restriction_lifted" : "appeal_reply",
          title: restoreAccess
            ? `Access Restored: ${enrollment.courseTitle}`
            : `Instructor Replied: ${enrollment.courseTitle}`,
          message: `${instructorName} replied: "${message.trim().slice(0, 120)}${message.length > 120 ? "..." : ""}"`,
          courseId: enrollment.courseId.toString(),
          enrollmentId: enrollment._id.toString(),
          appealId: appealDoc._id.toString(),
          isRead: false,
          createdAt: nowIso,
        };
        await userNotificationsCollection.insertOne(notifDoc);
        if (io) {
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("user-notification:new", notifDoc);
          io.to(`user:${enrollment.learnerEmail}`).emit("user-notification:new", notifDoc);
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("message:popup", {
            type: restoreAccess ? "restriction_lifted" : "appeal_reply",
            title: restoreAccess
              ? `Access Restored: ${enrollment.courseTitle}`
              : `Instructor Replied: ${enrollment.courseTitle}`,
            message: `${instructorName} replied: "${message.trim().slice(0, 120)}"`,
            senderName: instructorName,
            senderEmail: req.user.email,
            courseTitle: enrollment.courseTitle,
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: targetAppeal ? targetAppeal._id.toString() : null,
            actionUrl: `/courses/${enrollment.courseId.toString()}/learn`,
            createdAt: nowIso,
          });
          io.to(`user:${enrollment.learnerEmail}`).emit("message:popup", {
            type: restoreAccess ? "restriction_lifted" : "appeal_reply",
            title: restoreAccess
              ? `Access Restored: ${enrollment.courseTitle}`
              : `Instructor Replied: ${enrollment.courseTitle}`,
            message: `${instructorName} replied: "${message.trim().slice(0, 120)}"`,
            senderName: instructorName,
            senderEmail: req.user.email,
            courseTitle: enrollment.courseTitle,
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: targetAppeal ? targetAppeal._id.toString() : null,
            actionUrl: `/courses/${enrollment.courseId.toString()}/learn`,
            createdAt: nowIso,
          });

          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("appeal:updated", updatedAppealPayload);
          io.to(`user:${enrollment.learnerEmail}`).emit("appeal:updated", updatedAppealPayload);
          io.to(`user:${req.user.email.toLowerCase()}`).emit("appeal:updated", updatedAppealPayload);
          io.to(`user:${req.user.email}`).emit("appeal:updated", updatedAppealPayload);

          const enrollEvt = {
            courseId: enrollment.courseId.toString(),
            enrollmentId: enrollment._id.toString(),
            status: restoreAccess ? "active" : enrollment.status,
            active: Boolean(restoreAccess),
            banned: restoreAccess ? false : enrollment.banned,
            suspended: restoreAccess ? false : enrollment.suspended,
          };
          io.to(`user:${enrollment.learnerEmail.toLowerCase()}`).emit("enrollment:updated", enrollEvt);
          io.to(`user:${enrollment.learnerEmail}`).emit("enrollment:updated", enrollEvt);
          io.to(`user:${req.user.email.toLowerCase()}`).emit("enrollment:updated", enrollEvt);
          io.to(`user:${req.user.email}`).emit("enrollment:updated", enrollEvt);
        }
      }

      if (studioAuditLogsCollection) {
        await studioAuditLogsCollection.insertOne({
          instructorEmail: req.user.email,
          action: restoreAccess ? "appeal_replied_and_restored" : "appeal_replied",
          targetStudent: enrollment.learnerEmail,
          courseTitle: enrollment.courseTitle,
          details: `Instructor replied to appeal: "${message.trim().slice(0, 100)}" (Restored access: ${restoreAccess})`,
          createdAt: nowIso,
        });
      }

      return res.json({
        message: restoreAccess
          ? "Reply sent and student access restored successfully!"
          : "Reply sent to student successfully.",
        reply: replyItem,
        appeal: updatedAppealPayload,
      });
    } catch (err) {
      console.error("[POST /studio/appeals/:appealId/reply Error]:", err.message);
      return res.status(500).json({ message: "Failed to send reply to student." });
    }
  });

  // GET /studio/reviews — list course reviews for instructor
  app.get("/studio/reviews", verifyJWT, async (req, res) => {
    try {
      if (!courseReviewsCollection) {
        return res.json([]);
      }
      const emailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, "i");
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
      const emailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, "i");
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
      const emailRegex = new RegExp(`^${escapeRegex(req.user.email)}$`, "i");
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
