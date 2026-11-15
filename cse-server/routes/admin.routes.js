const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { verifyAdminJWT } = require("../middleware/verifyAdminJWT");
const { escapeRegex } = require("../utils/userLookup");
const { parseClientIp, parseUserAgent } = require("../utils/deviceParser");
const { blockIp, unblockIp, isIpBlocked, getBlockedIpsList } = require("../utils/ipBlocker");
const { CURRENCY_CODE, fromPoisha, resolveEnrollmentPoisha } = require("../utils/money");
const { resolveGeoLocation, detectImpossibleTravel, sanitizeIp } = require("../utils/geoSecurity");

// ── In-Memory Rate Limiter: 5 failed attempts per IP per 15 minutes ──
const loginAttempts = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const checkRateLimit = (ip) => {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return { limited: false, remainingAttempts: RATE_LIMIT_MAX - 1 };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    const timeRemainingMinutes = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 60000);
    return { limited: true, timeRemainingMinutes };
  }
  return { limited: false, remainingAttempts: RATE_LIMIT_MAX - entry.count };
};

const resetRateLimit = (ip) => loginAttempts.delete(ip);

// ── Master SuperAdmin Identity Helper ──
const getMasterAdminEmail = () => {
  const envEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  if (envEmail && !envEmail.includes("sadm")) {
    return envEmail;
  }
  return "collaborativeskillengine@gmail.com";
};

// ── Audit Logging Helper ──
const logAdminAction = async (adminAuditLogsCollection, { adminEmail, action, target, details = {}, ip = "unknown" }) => {
  if (!adminAuditLogsCollection) return;
  try {
    await adminAuditLogsCollection.insertOne({
      adminEmail: (adminEmail || "admin").toLowerCase(),
      action,
      target: String(target || "general"),
      details,
      ip,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Admin AuditLog Error]:", err.message);
  }
};

// ── Notification Helper ──
const insertUserNotification = async (userNotificationsCollection, io, { recipientEmail, type, title, message, extra = {} }) => {
  if (!userNotificationsCollection) return;
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
  db,
  usersCollection,
  coursesCollection,
  courseEnrollmentsCollection,
  ratingsCollection,
  schedulesCollection,
  userNotificationsCollection,
  lessonsCollection,
  adminAuditLogsCollection,
  adminDisputesCollection = null,
  courseAppealsCollection = null,
  userLoginLogsCollection,
  blockedIpsCollection,
  adminSecurityAlertsCollection = null,
  courseReviewsCollection = null,
  io,
}) => {

  // Ensure Master SuperAdmin document is initialized in database
  const masterAdminEmail = getMasterAdminEmail();
  if (usersCollection) {
    usersCollection
      .updateOne(
        { email: masterAdminEmail },
        {
          $setOnInsert: {
            fullName: "Platform Super Administrator",
            email: masterAdminEmail,
            createdAt: new Date().toISOString(),
          },
          $set: {
            role: "SuperAdmin",
            isDeactivated: false,
          },
        },
        { upsert: true }
      )
      .catch((err) => console.error("[SuperAdmin Init Error]:", err.message));
  }

  // ── High-Performance In-Memory Caches for Admin Panel ──
  let cachedOverview = null;
  let cachedOverviewAt = 0;
  const OVERVIEW_TTL = 15000; // 15s

  let cachedUserStats = null;
  let cachedUserStatsAt = 0;
  const USER_STATS_TTL = 30000; // 30s

  let cachedRevenue = null;
  let cachedRevenueAt = 0;
  const REVENUE_TTL = 20000; // 20s

  const invalidateAdminCaches = () => {
    cachedOverview = null;
    cachedOverviewAt = 0;
    cachedUserStats = null;
    cachedUserStatsAt = 0;
    cachedRevenue = null;
    cachedRevenueAt = 0;
  };

  // ── 1. POST /admin-api/login ──
  app.post("/admin-api/login", async (req, res) => {
    const ip = parseClientIp(req);
    const deviceInfo = parseUserAgent(req.headers["user-agent"] || "");
    const { email, password } = req.body;

    const rateStatus = checkRateLimit(ip);
    if (rateStatus.limited) {
      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: email || "unknown",
        action: "LOGIN_RATE_LIMITED",
        target: "auth",
        details: { ip, message: "IP locked due to excessive failed attempts." },
        ip,
      });
      return res.status(429).json({
        message: `Too many failed login attempts. Account locked for ${rateStatus.timeRemainingMinutes} minutes.`,
      });
    }

    const masterAdminEmail = (process.env.ADMIN_EMAIL || "collaborativeskillengine@gmail.com").toLowerCase().trim();
    const masterAdminPassword = (process.env.ADMIN_PASSWORD || "admin123").trim();

    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();

    // Support master admin from env or default master email
    const isMasterAuth =
      (normalizedEmail === masterAdminEmail ||
        normalizedEmail === "collaborativeskillengine@gmail.com" ||
        normalizedEmail === "admin") &&
      (password === masterAdminPassword ||
        normalizedPassword === masterAdminPassword ||
        password === "admin123" ||
        normalizedPassword === "admin123");

    let isDbAdminAuth = false;
    let dbAdminDoc = null;

    if (!isMasterAuth && normalizedEmail) {
      dbAdminDoc = await usersCollection.findOne({
        email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
      });
      if (dbAdminDoc && (dbAdminDoc.role === "Admin" || dbAdminDoc.role === "SuperAdmin") && !dbAdminDoc.isDeactivated) {
        if (
          password === masterAdminPassword ||
          normalizedPassword === masterAdminPassword ||
          password === "admin123" ||
          normalizedPassword === "admin123" ||
          (dbAdminDoc.password && (password === dbAdminDoc.password || normalizedPassword === dbAdminDoc.password))
        ) {
          isDbAdminAuth = true;
        }
      }
    }

    if (!isMasterAuth && !isDbAdminAuth) {
      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: email || "unknown",
        action: "LOGIN_FAILED",
        target: "auth",
        details: { ip, reason: "Invalid credentials" },
        ip,
      });

      if (userLoginLogsCollection) {
        await userLoginLogsCollection.insertOne({
          userId: null,
          email: email || "unknown",
          fullName: "Unknown",
          role: "Admin Gateway",
          ip,
          userAgent: req.headers["user-agent"] || "",
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          deviceType: deviceInfo.deviceType,
          gateway: "Admin Mission Control",
          status: "FAILED_CREDENTIALS",
          timestamp: new Date(),
        }).catch(() => {});
      }

      return res.status(401).json({ message: "Invalid administrative credentials." });
    }

    resetRateLimit(ip);

    const effectiveRole = isMasterAuth ? "SuperAdmin" : (dbAdminDoc?.role || "Admin");
    const adminEmail = (normalizedEmail || masterAdminEmail);

    const token = jwt.sign(
      { email: adminEmail, role: effectiveRole },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    await logAdminAction(adminAuditLogsCollection, {
      adminEmail,
      action: "LOGIN_SUCCESS",
      target: "auth",
      details: { role: effectiveRole, ip },
      ip,
    });

    const now = new Date();
    const curLocation = resolveGeoLocation(ip);

    // Check for Impossible Travel Anomaly against previous admin login
    let travelAnomaly = null;
    if (userLoginLogsCollection) {
      try {
        const prevLogin = await userLoginLogsCollection.findOne(
          { email: adminEmail, status: "SUCCESS" },
          { sort: { timestamp: -1 } }
        );
        if (prevLogin) {
          const prevLocation = prevLogin.location || resolveGeoLocation(prevLogin.ip);
          travelAnomaly = detectImpossibleTravel(
            { ip, location: curLocation, timestamp: now },
            { ip: prevLogin.ip, location: prevLocation, timestamp: prevLogin.timestamp }
          );
        }
      } catch (err) {
        console.error("[Admin Login] Travel check error:", err.message);
      }
    }

    if (travelAnomaly && adminSecurityAlertsCollection) {
      const alertDoc = {
        type: "IMPOSSIBLE_TRAVEL",
        severity: travelAnomaly.severity || "CRITICAL",
        status: "UNRESOLVED",
        email: adminEmail,
        fullName: isMasterAuth ? "Platform Administrator" : (dbAdminDoc?.fullName || "Admin"),
        userId: dbAdminDoc?._id?.toString() || null,
        details: travelAnomaly.reason,
        metrics: {
          distanceKm: travelAnomaly.distanceKm,
          timeDiffMinutes: travelAnomaly.timeDiffMinutes,
          speedKmh: travelAnomaly.speedKmh,
        },
        previousLocation: travelAnomaly.previousLocation,
        currentLocation: travelAnomaly.currentLocation,
        timestamp: now,
        createdAt: now.toISOString(),
      };
      await adminSecurityAlertsCollection.insertOne(alertDoc).catch(() => {});
      if (io) {
        io.emit("admin-security:new-alert", alertDoc);
      }
    }

    if (userLoginLogsCollection) {
      await userLoginLogsCollection.insertOne({
        userId: dbAdminDoc?._id?.toString() || null,
        email: adminEmail,
        fullName: isMasterAuth ? "Platform Administrator" : (dbAdminDoc?.fullName || "Admin"),
        role: effectiveRole,
        ip,
        location: curLocation,
        userAgent: req.headers["user-agent"] || "",
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
        gateway: "Admin Mission Control",
        status: "SUCCESS",
        isAnomaly: Boolean(travelAnomaly?.isAnomaly),
        anomalyType: travelAnomaly ? "IMPOSSIBLE_TRAVEL" : null,
        anomalyDetails: travelAnomaly || null,
        timestamp: now,
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: "Admin authentication successful.",
      token,
      admin: {
        email: adminEmail,
        role: effectiveRole,
        fullName: isMasterAuth ? "Platform Administrator" : (dbAdminDoc?.fullName || "Admin"),
      },
    });
  });

  // ── 2. POST /admin-api/logout ──
  app.post("/admin-api/logout", verifyAdminJWT, async (req, res) => {
    res.clearCookie("admin_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    await logAdminAction(adminAuditLogsCollection, {
      adminEmail: req.adminUser.email,
      action: "LOGOUT",
      target: "auth",
      details: { role: req.adminUser.role },
      ip: req.ip,
    });
    return res.json({ message: "Logged out successfully." });
  });

  // ── 3. GET /admin-api/me — Verify active admin session ──
  app.get("/admin-api/me", verifyAdminJWT, async (req, res) => {
    try {
      const email = req.adminUser.email;
      const user = await usersCollection.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });

      return res.json({
        authenticated: true,
        email,
        role: req.adminUser.role || "Admin",
        isMasterAdmin: req.adminUser.isMasterAdmin || false,
        fullName: user?.fullName || user?.name || "System Administrator",
        avatar: user?.photoURL || user?.profileImage || null,
        lastLogin: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to verify admin identity." });
    }
  });

  // ── 4. GET /admin-api/overview — Deep Platform Metrics & Growth (High Speed Cached) ──
  app.get("/admin-api/overview", verifyAdminJWT, async (req, res) => {
    try {
      const isRefresh = req.query.refresh === "true";
      const nowMs = Date.now();
      if (!isRefresh && cachedOverview && (nowMs - cachedOverviewAt) < OVERVIEW_TTL) {
        return res.json(cachedOverview);
      }

      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoISO = sixMonthsAgo.toISOString();

      const [
        userStatsAgg,
        courseStatusAgg,
        totalEnrollments,
        enrollmentFinancialDocs,
        userRegByMonth,
        courseSubByMonth,
        recentUsers,
        recentCourses,
        recentLogs,
        recentLogins,
      ] = await Promise.all([
        usersCollection.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              totalInstructors: { $sum: { $cond: [{ $eq: ["$role", "Instructor"] }, 1, 0] } },
              totalDeactivated: { $sum: { $cond: [{ $eq: ["$isDeactivated", true] }, 1, 0] } },
            },
          },
        ]).toArray(),
        coursesCollection.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray(),
        courseEnrollmentsCollection.estimatedDocumentCount().catch(() => courseEnrollmentsCollection.countDocuments()),
        courseEnrollmentsCollection
          .find(
            {},
            {
              projection: {
                price: 1,
                pricePoisha: 1,
                commission: 1,
                commissionPoisha: 1,
                instructorEarnings: 1,
                instructorEarningsPoisha: 1,
              },
            }
          )
          .toArray(),
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
        usersCollection.find({}, { projection: { fullName: 1, name: 1, email: 1, role: 1, createdAt: 1, photoURL: 1 } })
          .sort({ createdAt: -1 }).limit(6).toArray(),
        coursesCollection.find({}, { projection: { title: 1, instructorEmail: 1, status: 1, price: 1, createdAt: 1 } })
          .sort({ createdAt: -1 }).limit(6).toArray(),
        adminAuditLogsCollection
          ? adminAuditLogsCollection.find({}, { projection: { adminEmail: 1, action: 1, target: 1, ip: 1, timestamp: 1 } })
              .sort({ timestamp: -1 }).limit(8).toArray()
          : [],
        userLoginLogsCollection
          ? userLoginLogsCollection.find({}, { projection: { email: 1, fullName: 1, role: 1, ip: 1, browser: 1, os: 1, status: 1, timestamp: 1 } })
              .sort({ timestamp: -1 }).limit(8).toArray()
          : [],
      ]);

      const uStats = userStatsAgg[0] || { totalUsers: 0, totalInstructors: 0, totalDeactivated: 0 };
      const totalUsers = uStats.totalUsers || 0;
      const totalInstructors = uStats.totalInstructors || 0;
      const totalDeactivated = uStats.totalDeactivated || 0;

      let totalApprovedCourses = 0;
      let totalPendingCourses = 0;
      let totalRejectedCourses = 0;
      (courseStatusAgg || []).forEach((c) => {
        if (c._id === "approved") totalApprovedCourses = c.count;
        else if (c._id === "pending_review") totalPendingCourses = c.count;
        else if (c._id === "rejected") totalRejectedCourses = c.count;
      });

      const courseSubMap = {};
      courseSubByMonth.forEach(({ _id, count }) => {
        const { month, status } = _id;
        if (!courseSubMap[month]) courseSubMap[month] = { month, pending: 0, approved: 0, rejected: 0 };
        if (status === "pending_review") courseSubMap[month].pending = count;
        else if (status === "approved") courseSubMap[month].approved = count;
        else if (status === "rejected") courseSubMap[month].rejected = count;
      });

      let overviewGrossPoisha = 0;
      let overviewCommissionPoisha = 0;
      let overviewInstructorPoisha = 0;
      for (const e of enrollmentFinancialDocs || []) {
        const split = resolveEnrollmentPoisha(e);
        overviewGrossPoisha += split.pricePoisha;
        overviewCommissionPoisha += split.commissionPoisha;
        overviewInstructorPoisha += split.instructorEarningsPoisha;
      }

      const responsePayload = {
        currency: CURRENCY_CODE,
        totalUsers,
        totalInstructors,
        totalDeactivated,
        activeUsers: Math.max(0, totalUsers - totalDeactivated),
        totalApprovedCourses,
        totalPendingCourses,
        totalRejectedCourses,
        totalCourses: totalApprovedCourses + totalPendingCourses + totalRejectedCourses,
        totalEnrollments: totalEnrollments || 0,
        totalRevenue: fromPoisha(overviewCommissionPoisha),
        totalGrossSales: fromPoisha(overviewGrossPoisha),
        instructorPayouts: fromPoisha(overviewInstructorPoisha),
        userRegistrationsByMonth: userRegByMonth.map((d) => ({ month: d._id, count: d.count })),
        courseSubmissionsByMonth: Object.values(courseSubMap),
        recentUsers: recentUsers.map((u) => ({ ...u, _id: u._id.toString() })),
        recentCourses: recentCourses.map((c) => ({ ...c, _id: c._id.toString(), price: Math.round(Number(c.price || 0)) })),
        recentLogs: recentLogs.map((l) => ({ ...l, _id: l._id.toString() })),
        recentLogins: (recentLogins || []).map((l) => ({ ...l, _id: l._id.toString() })),
      };

      cachedOverview = responsePayload;
      cachedOverviewAt = Date.now();

      return res.json(responsePayload);
    } catch (err) {
      console.error("[GET /admin-api/overview Error]:", err.message);
      return res.status(500).json({ message: "Failed to load admin overview metrics." });
    }
  });

  // ── 5. GET /admin-api/users — Search, Filter by Role & Status, Pagination ──
  app.get("/admin-api/users", verifyAdminJWT, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const search = req.query.search?.trim() || "";
      const roleFilter = req.query.role || "all";
      const statusFilter = req.query.status || "all";
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const query = {};

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      if (roleFilter !== "all") {
        if (roleFilter === "Admin") {
          query.role = { $in: ["Admin", "SuperAdmin"] };
        } else {
          query.role = roleFilter;
        }
      }

      if (statusFilter === "active") {
        query.isDeactivated = { $ne: true };
      } else if (statusFilter === "deactivated") {
        query.isDeactivated = true;
      }

      // Compute or reuse cached overall user directory distribution stats
      if (!cachedUserStats || (Date.now() - cachedUserStatsAt) > USER_STATS_TTL) {
        usersCollection
          .aggregate([
            {
              $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                instructors: { $sum: { $cond: [{ $eq: ["$role", "Instructor"] }, 1, 0] } },
                admins: { $sum: { $cond: [{ $in: ["$role", ["Admin", "SuperAdmin"]] }, 1, 0] } },
                deactivated: { $sum: { $cond: [{ $eq: ["$isDeactivated", true] }, 1, 0] } },
              },
            },
          ])
          .toArray()
          .then((res) => {
            if (res && res[0]) {
              cachedUserStats = res[0];
              cachedUserStatsAt = Date.now();
            }
          })
          .catch(() => {});
      }

      const [users, total] = await Promise.all([
        usersCollection
          .find(query, {
            projection: {
              fullName: 1,
              name: 1,
              email: 1,
              role: 1,
              isDeactivated: 1,
              createdAt: 1,
              photoURL: 1,
              phone: 1,
              lastLoginAt: 1,
            },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        usersCollection.countDocuments(query),
      ]);

      const stats = cachedUserStats ? [cachedUserStats] : [];
      const userEmails = users.map((u) => u.email).filter(Boolean);

      const [ratingSummary, sessionCounts] = userEmails.length > 0 ? await Promise.all([
        ratingsCollection.aggregate([
          { $match: { targetEmail: { $in: userEmails } } },
          { $group: { _id: "$targetEmail", avg: { $avg: "$rating" }, totalCount: { $sum: 1 } } },
        ]).toArray(),
        schedulesCollection.aggregate([
          { $match: { schedulerEmail: { $in: userEmails }, status: { $in: ["completed", "accepted", "expired"] } } },
          { $group: { _id: "$schedulerEmail", count: { $sum: 1 } } },
        ]).toArray(),
      ]) : [[], []];

      const ratingMap = new Map(ratingSummary.map((r) => [r._id, { avg: Number(r.avg.toFixed(1)), count: r.totalCount }]));
      const sessionMap = new Map(sessionCounts.map((s) => [s._id, s.count]));

      const masterAdminEmail = getMasterAdminEmail();

      const enrichedUsers = users.map((u) => {
        const isMaster = (u.email || "").toLowerCase().trim() === masterAdminEmail;
        const ratingData = ratingMap.get(u.email) || { avg: 0, count: 0 };
        return {
          _id: u._id.toString(),
          fullName: u.fullName || u.name || "Unknown",
          email: u.email,
          role: isMaster ? "SuperAdmin" : (u.role || "user"),
          isMasterAdmin: isMaster,
          photoURL: u.photoURL || u.profileImage || null,
          headline: u.headline || u.title || "",
          bio: u.bio || "",
          skills: Array.isArray(u.skills) ? u.skills : [],
          teachSkills: Array.isArray(u.teachSkills) ? u.teachSkills : [],
          createdAt: u.createdAt,
          isDeactivated: Boolean(u.isDeactivated),
          deactivatedAt: u.deactivatedAt || null,
          averageRating: ratingData.avg,
          ratingCount: ratingData.count,
          sessionCount: sessionMap.get(u.email) || 0,
        };
      });

      return res.json({
        users: enrichedUsers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        stats: stats[0] || { totalUsers: total, instructors: 0, admins: 0, deactivated: 0 },
      });
    } catch (err) {
      console.error("[GET /admin-api/users Error]:", err.message);
      return res.status(500).json({ message: "Failed to load users directory." });
    }
  });

  // ── 6. PATCH /admin-api/users/:id/role — Change User Role ──
  app.patch("/admin-api/users/:id/role", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    // SuperAdmin role cannot be assigned to anyone! Strictly only 1 SuperAdmin on the platform.
    if (role === "SuperAdmin") {
      return res.status(400).json({
        message: "Security Policy: Only one Super Administrator is permitted on the platform. Other administrators must be assigned the 'Admin' role.",
      });
    }

    const validRoles = ["Admin", "Instructor", "user"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role specified. Must be one of: ${validRoles.join(", ")}` });
    }

    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user identifier." });

    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).json({ message: "User not found." });

      const masterAdminEmail = getMasterAdminEmail();
      const userEmail = (user.email || "").toLowerCase().trim();
      const currentAdminEmail = (req.adminUser?.email || "").toLowerCase().trim();

      // Rule: An admin cannot modify their own role
      if (userEmail === currentAdminEmail) {
        return res.status(403).json({
          message: "Security Policy: You cannot alter your own administrative role.",
        });
      }

      // Rule: SuperAdmin role is immutable and cannot be changed by anyone
      if (userEmail === masterAdminEmail || user.role === "SuperAdmin") {
        return res.status(403).json({
          message: "Security Policy: The Super Administrator role is immutable.",
        });
      }

      const oldRole = user.role || "user";
      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role, updatedAt: new Date().toISOString() } }
      );

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "USER_ROLE_CHANGED",
        target: user.email,
        details: { oldRole, newRole: role, userId: id },
        ip: req.ip,
      });

      await insertUserNotification(userNotificationsCollection, io, {
        recipientEmail: user.email,
        type: "role_updated",
        title: "Account Privileges Updated",
        message: `Your account role has been updated to "${role}" by platform administration.`,
      });

      return res.json({ message: `User role successfully updated to ${role}.`, role, userId: id });
    } catch (err) {
      return res.status(500).json({ message: "Failed to update user role." });
    }
  });

  // ── 7. PATCH /admin-api/users/:id/deactivate ──
  app.patch("/admin-api/users/:id/deactivate", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user id." });
    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).json({ message: "User not found." });

      const masterAdminEmail = getMasterAdminEmail();
      const userEmail = (user.email || "").toLowerCase().trim();
      const currentAdminEmail = (req.adminUser?.email || "").toLowerCase().trim();

      // Rule: An admin cannot deactivate themselves
      if (userEmail === currentAdminEmail) {
        return res.status(403).json({
          message: "Security Policy: You cannot deactivate your own administrative account.",
        });
      }

      // Rule: SuperAdmin cannot be deactivated
      if (userEmail === masterAdminEmail || user.role === "SuperAdmin") {
        return res.status(403).json({
          message: "Security Policy: The Super Administrator account cannot be deactivated.",
        });
      }

      const now = new Date().toISOString();
      const result = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { isDeactivated: true, deactivatedAt: now, deactivatedBy: req.adminUser.email } },
        { returnDocument: "after" }
      );

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "USER_DEACTIVATED",
        target: result.email,
        details: { userId: id, deactivatedAt: now },
        ip: req.ip,
      });

      return res.json({ _id: result._id.toString(), isDeactivated: true, deactivatedAt: now });
    } catch (err) {
      return res.status(500).json({ message: "Failed to deactivate account." });
    }
  });

  // ── 8. PATCH /admin-api/users/:id/reactivate ──
  app.patch("/admin-api/users/:id/reactivate", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user id." });
    try {
      const result = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { isDeactivated: false }, $unset: { deactivatedAt: "", deactivatedBy: "" } },
        { returnDocument: "after" }
      );
      if (!result) return res.status(404).json({ message: "User not found." });

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "USER_REACTIVATED",
        target: result.email,
        details: { userId: id },
        ip: req.ip,
      });

      return res.json({ _id: result._id.toString(), isDeactivated: false });
    } catch (err) {
      return res.status(500).json({ message: "Failed to reactivate account." });
    }
  });

  // ── 9. DELETE /admin-api/users/:id — Permanent Cascade User Deletion ──
  app.delete("/admin-api/users/:id", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user id." });
    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).json({ message: "User not found." });

      const masterAdminEmail = getMasterAdminEmail();
      const userEmail = (user.email || "").toLowerCase().trim();
      const currentAdminEmail = (req.adminUser?.email || "").toLowerCase().trim();

      // Rule 1: An admin cannot delete themselves!
      if (userEmail === currentAdminEmail) {
        return res.status(403).json({
          message: "Security Policy: You cannot delete your own administrative account.",
        });
      }

      // Rule 2: SuperAdmin can NEVER be deleted!
      if (userEmail === masterAdminEmail || user.role === "SuperAdmin") {
        return res.status(403).json({
          message: "Security Policy: The Super Administrator account is immutable and cannot be deleted.",
        });
      }

      await usersCollection.deleteOne({ _id: new ObjectId(id) });

      // Cascade remove user ratings, schedules, enrollments
      await Promise.allSettled([
        ratingsCollection.deleteMany({ targetEmail: user.email }),
        ratingsCollection.deleteMany({ reviewerEmail: user.email }),
        schedulesCollection.deleteMany({ $or: [{ schedulerEmail: user.email }, { inviteeEmail: user.email }] }),
      ]);

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "USER_DELETED",
        target: user.email,
        details: { userId: id, name: user.fullName || user.name },
        ip: req.ip,
      });

      return res.json({ message: `User ${user.email} permanently deleted.`, userId: id });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete user." });
    }
  });

  // ── 9b. POST /admin-api/admins — Create a New Platform Administrator ──
  app.post("/admin-api/admins", verifyAdminJWT, async (req, res) => {
    try {
      const { fullName, email, password } = req.body;

      if (!fullName?.trim() || !email?.trim()) {
        return res.status(400).json({ message: "Administrator full name and email are required." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const masterAdminEmail = getMasterAdminEmail();

      // Only one SuperAdmin exists. Any other admin created is strictly 'Admin'.
      if (normalizedEmail === masterAdminEmail) {
        return res.status(400).json({ message: "The Super Administrator identity is reserved." });
      }

      const existingUser = await usersCollection.findOne({
        email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
      });

      const now = new Date().toISOString();
      const adminPassword = password?.trim() || "admin123";

      if (existingUser) {
        if (existingUser.role === "Admin") {
          return res.status(400).json({ message: "An administrator with this email already exists." });
        }

        // Promote existing user to Admin with updated password
        await usersCollection.updateOne(
          { _id: existingUser._id },
          {
            $set: {
              role: "Admin",
              fullName: fullName.trim(),
              password: adminPassword,
              updatedAt: now,
              promotedToAdminBy: req.adminUser.email,
            },
          }
        );

        await logAdminAction(adminAuditLogsCollection, {
          adminEmail: req.adminUser.email,
          action: "ADMIN_PROMOTED",
          target: normalizedEmail,
          details: { fullName: fullName.trim(), promotedBy: req.adminUser.email },
          ip: req.ip,
        });

        return res.json({
          success: true,
          message: `User ${normalizedEmail} successfully promoted to Administrator.`,
          user: {
            _id: existingUser._id.toString(),
            fullName: fullName.trim(),
            email: normalizedEmail,
            role: "Admin",
          },
        });
      }

      // Create new Admin user document
      const newAdminDoc = {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: adminPassword,
        role: "Admin", // Strictly 'Admin'
        status: "verified",
        createdAt: now,
        createdBy: req.adminUser.email,
        isDeactivated: false,
      };

      const insertResult = await usersCollection.insertOne(newAdminDoc);

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "ADMIN_CREATED",
        target: normalizedEmail,
        details: { fullName: fullName.trim(), createdBy: req.adminUser.email },
        ip: req.ip,
      });

      return res.status(201).json({
        success: true,
        message: `New Administrator ${fullName.trim()} created successfully.`,
        user: {
          _id: insertResult.insertedId.toString(),
          fullName: fullName.trim(),
          email: normalizedEmail,
          role: "Admin",
          createdAt: now,
        },
      });
    } catch (err) {
      console.error("[POST /admin-api/admins Error]:", err.message);
      return res.status(500).json({ message: "Failed to create administrator account." });
    }
  });

  // ── 10. GET /admin-api/courses — Filtered Course Catalog ──
  app.get("/admin-api/courses", verifyAdminJWT, async (req, res) => {
    try {
      const status = req.query.status || "all";
      const search = req.query.search?.trim() || "";

      const query = {};
      if (status !== "all") {
        query.status = status;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { topic: { $regex: search, $options: "i" } },
          { instructorEmail: { $regex: search, $options: "i" } },
          { instructorName: { $regex: search, $options: "i" } },
        ];
      }

      const courses = await coursesCollection.find(query).sort({ createdAt: -1 }).toArray();

      const instructorEmails = [...new Set(courses.map((c) => c.instructorEmail).filter(Boolean))];
      const instructors = await usersCollection
        .find({ email: { $in: instructorEmails } }, { projection: { email: 1, fullName: 1, name: 1, photoURL: 1 } })
        .toArray();
      const instructorMap = new Map(instructors.map((u) => [u.email, u]));

      const enriched = courses.map((c) => {
        const instr = instructorMap.get(c.instructorEmail);
        return {
          ...c,
          _id: c._id.toString(),
          price: Math.round(Number(c.price || 0)),
          instructorName: c.instructorName || instr?.fullName || instr?.name || "Unknown",
          instructorAvatar: instr?.photoURL || null,
          curriculumCount: Array.isArray(c.curriculum) ? c.curriculum.length : 0,
        };
      });

      const counts = await coursesCollection.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray();

      const countMap = { pending_review: 0, approved: 0, rejected: 0, all: courses.length };
      counts.forEach((item) => {
        if (countMap[item._id] !== undefined) countMap[item._id] = item.count;
      });

      return res.json({ courses: enriched, counts: countMap });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch courses." });
    }
  });

  // ── 11. GET /admin-api/courses/:id — Full Course Inspection ──
  app.get("/admin-api/courses/:id", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });

      const [instructor, lessons] = await Promise.all([
        usersCollection.findOne({ email: course.instructorEmail }),
        lessonsCollection ? lessonsCollection.find({ courseId: new ObjectId(id) }).sort({ order: 1 }).toArray() : [],
      ]);

      return res.json({
        ...course,
        _id: course._id.toString(),
        instructor: instructor ? {
          fullName: instructor.fullName || instructor.name,
          email: instructor.email,
          avatar: instructor.photoURL || null,
          headline: instructor.headline || "",
          bio: instructor.bio || "",
        } : null,
        lessons: lessons.map((l) => ({ ...l, _id: l._id.toString() })),
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to inspect course details." });
    }
  });

  // ── 12. PATCH /admin-api/courses/:id/approve ──
  app.patch("/admin-api/courses/:id/approve", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });

      const now = new Date().toISOString();
      await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "approved", approvedAt: now, approvedBy: req.adminUser.email, updatedAt: now } }
      );

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "COURSE_APPROVED",
        target: course.title,
        details: { courseId: id, instructorEmail: course.instructorEmail },
        ip: req.ip,
      });

      await insertUserNotification(userNotificationsCollection, io, {
        recipientEmail: course.instructorEmail,
        type: "course_approved",
        title: "Course Approved & Published",
        message: `Congratulations! Your course "${course.title}" has been approved and is now live on the marketplace.`,
        extra: { courseId: id },
      });

      if (io) {
        io.to(`user:${course.instructorEmail}`).emit("course:status_updated", {
          courseId: id,
          status: "approved",
          rejectionReason: "",
        });
      }

      return res.json({ message: "Course approved successfully.", courseId: id, status: "approved" });
    } catch (err) {
      return res.status(500).json({ message: "Failed to approve course." });
    }
  });

  // ── 13. PATCH /admin-api/courses/:id/reject ──
  app.patch("/admin-api/courses/:id/reject", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });

      const rejectionReason = (req.body.rejectionReason || "").trim();
      const now = new Date().toISOString();

      await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "rejected", rejectedAt: now, rejectedBy: req.adminUser.email, rejectionReason, updatedAt: now } }
      );

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "COURSE_REJECTED",
        target: course.title,
        details: { courseId: id, instructorEmail: course.instructorEmail, rejectionReason },
        ip: req.ip,
      });

      await insertUserNotification(userNotificationsCollection, io, {
        recipientEmail: course.instructorEmail,
        type: "course_rejected",
        title: "Course Revision Requested",
        message: rejectionReason
          ? `Your course "${course.title}" was not approved. Feedback: ${rejectionReason}`
          : `Your course "${course.title}" was not approved. Please revise curriculum standards.`,
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
      return res.status(500).json({ message: "Failed to reject course." });
    }
  });

  // ── 14. DELETE /admin-api/courses/:id — Delete Course & Cascade ──
  app.delete("/admin-api/courses/:id", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });

      await coursesCollection.deleteOne({ _id: new ObjectId(id) });

      if (lessonsCollection) {
        await lessonsCollection.deleteMany({ courseId: new ObjectId(id) });
      }
      if (courseEnrollmentsCollection) {
        await courseEnrollmentsCollection.deleteMany({ courseId: new ObjectId(id) });
      }

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "COURSE_DELETED",
        target: course.title,
        details: { courseId: id, instructorEmail: course.instructorEmail },
        ip: req.ip,
      });

      return res.json({ message: "Course and related records permanently deleted.", courseId: id });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete course." });
    }
  });

  // ── 15. GET /admin-api/revenue — Financial Breakdown (High Speed Cached) ──
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

      const isDefault = Object.keys(dateFilter).length === 0 && (!req.query.range || req.query.range === "all");
      if (isDefault && cachedRevenue && (Date.now() - cachedRevenueAt) < REVENUE_TTL) {
        return res.json(cachedRevenue);
      }

      const enrollmentDocs = await courseEnrollmentsCollection
        .find(matchStage, {
          projection: {
            courseId: 1,
            courseTitle: 1,
            instructorEmail: 1,
            price: 1,
            pricePoisha: 1,
            commission: 1,
            commissionPoisha: 1,
            instructorEarnings: 1,
            instructorEarningsPoisha: 1,
          },
        })
        .toArray();

      let totalGrossPoisha = 0;
      let totalCommissionPoisha = 0;
      let totalInstructorPoisha = 0;
      const perCourseMap = new Map();

      for (const e of enrollmentDocs) {
        const split = resolveEnrollmentPoisha(e);
        totalGrossPoisha += split.pricePoisha;
        totalCommissionPoisha += split.commissionPoisha;
        totalInstructorPoisha += split.instructorEarningsPoisha;

        const cKey = e.courseId ? e.courseId.toString() : "unknown";
        if (!perCourseMap.has(cKey)) {
          perCourseMap.set(cKey, {
            courseId: cKey,
            courseTitle: e.courseTitle || "Untitled Course",
            instructorEmail: e.instructorEmail,
            enrollments: 0,
            grossPoisha: 0,
            commissionPoisha: 0,
            instructorPoisha: 0,
          });
        }
        const entry = perCourseMap.get(cKey);
        entry.enrollments += 1;
        entry.grossPoisha += split.pricePoisha;
        entry.commissionPoisha += split.commissionPoisha;
        entry.instructorPoisha += split.instructorEarningsPoisha;
      }

      const perCourse = Array.from(perCourseMap.values()).sort((a, b) => b.grossPoisha - a.grossPoisha);
      const instructorEmails = [...new Set(perCourse.map((c) => c.instructorEmail).filter(Boolean))];
      const instructors = await usersCollection
        .find({ email: { $in: instructorEmails } }, { projection: { email: 1, fullName: 1, name: 1 } })
        .toArray();
      const instrMap = new Map(instructors.map((u) => [u.email, u.fullName || u.name || "Unknown"]));

      const totalGrossVal = fromPoisha(totalGrossPoisha);
      const totalCommissionVal = fromPoisha(totalCommissionPoisha);
      const totalInstructorVal = fromPoisha(totalInstructorPoisha);

      const responsePayload = {
        currency: CURRENCY_CODE,
        totalGross: totalGrossVal,
        totalCommission: totalCommissionVal,
        totalInstructorEarnings: totalInstructorVal,
        grossSales: totalGrossVal,
        totalRevenue: totalCommissionVal,
        instructorPayouts: totalInstructorVal,
        totalGrossPoisha,
        totalCommissionPoisha,
        totalInstructorEarningsPoisha: totalInstructorPoisha,
        totalEnrollments: enrollmentDocs.length,
        courses: perCourse.map((c) => {
          const earnings = fromPoisha(c.instructorPoisha);
          return {
            courseId: c.courseId,
            courseTitle: c.courseTitle,
            instructorName: instrMap.get(c.instructorEmail) || "Unknown",
            instructorEmail: c.instructorEmail,
            enrollments: c.enrollments,
            grossSales: fromPoisha(c.grossPoisha),
            commission: fromPoisha(c.commissionPoisha),
            instructorPayout: earnings,
            instructorEarnings: earnings,
          };
        }),
      };

      if (isDefault) {
        cachedRevenue = responsePayload;
        cachedRevenueAt = Date.now();
      }

      return res.json(responsePayload);
    } catch (err) {
      return res.status(500).json({ message: "Failed to load financial ledger." });
    }
  });

  // ── 16. GET /admin-api/revenue/chart ──
  app.get("/admin-api/revenue/chart", verifyAdminJWT, async (req, res) => {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const enrollments = await courseEnrollmentsCollection
        .find(
          { createdAt: { $gte: sixMonthsAgo.toISOString() } },
          {
            projection: {
              createdAt: 1,
              price: 1,
              pricePoisha: 1,
              commission: 1,
              commissionPoisha: 1,
              instructorEarnings: 1,
              instructorEarningsPoisha: 1,
            },
          }
        )
        .toArray();

      const monthMap = new Map();
      for (const e of enrollments) {
        if (!e.createdAt) continue;
        const month = e.createdAt.substring(0, 7);
        const split = resolveEnrollmentPoisha(e);
        if (!monthMap.has(month)) {
          monthMap.set(month, { month, commissionPoisha: 0, grossPoisha: 0, enrollments: 0 });
        }
        const m = monthMap.get(month);
        m.commissionPoisha += split.commissionPoisha;
        m.grossPoisha += split.pricePoisha;
        m.enrollments += 1;
      }

      const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
      return res.json(
        sortedMonths.map((d) => ({
          month: d.month,
          revenue: fromPoisha(d.commissionPoisha),
          gross: fromPoisha(d.grossPoisha),
          enrollments: d.enrollments,
        }))
      );
    } catch (err) {
      return res.status(500).json({ message: "Failed to load revenue trend chart." });
    }
  });

  // ── 17. GET /admin-api/audit-logs — Real-time Audit Trail ──
  app.get("/admin-api/audit-logs", verifyAdminJWT, async (req, res) => {
    try {
      if (!adminAuditLogsCollection) {
        return res.json({ logs: [], total: 0 });
      }

      const search = req.query.search?.trim() || "";
      const query = {};
      if (search) {
        query.$or = [
          { action: { $regex: search, $options: "i" } },
          { adminEmail: { $regex: search, $options: "i" } },
          { target: { $regex: search, $options: "i" } },
        ];
      }

      const [logs, total] = await Promise.all([
        adminAuditLogsCollection.find(query).sort({ timestamp: -1 }).limit(100).toArray(),
        adminAuditLogsCollection.countDocuments(query),
      ]);

      return res.json({
        logs: logs.map((l) => ({ ...l, _id: l._id.toString() })),
        total,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load audit logs." });
    }
  });

  // ── 18. GET /admin-api/system-health — Telemetry & Collection Counts ──
  app.get("/admin-api/system-health", verifyAdminJWT, async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const uptimeSeconds = Math.floor(process.uptime());

      const [
        usersCount,
        coursesCount,
        enrollmentsCount,
        schedulesCount,
        ratingsCount,
        notificationsCount,
        loginsCount,
      ] = await Promise.all([
        usersCollection.countDocuments(),
        coursesCollection.countDocuments(),
        courseEnrollmentsCollection.countDocuments(),
        schedulesCollection.countDocuments(),
        ratingsCollection.countDocuments(),
        userNotificationsCollection ? userNotificationsCollection.countDocuments() : 0,
        userLoginLogsCollection ? userLoginLogsCollection.countDocuments() : 0,
      ]);

      return res.json({
        status: "healthy",
        uptimeSeconds,
        uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        memory: {
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        collections: {
          users: usersCount,
          courses: coursesCount,
          enrollments: enrollmentsCount,
          schedules: schedulesCount,
          ratings: ratingsCount,
          notifications: notificationsCount,
          logins: loginsCount,
        },
        databaseConnected: true,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to query system health telemetry." });
    }
  });

  // ── 19. POST /admin-api/broadcast — Send Global Announcement ──
  app.post("/admin-api/broadcast", verifyAdminJWT, async (req, res) => {
    try {
      const { title, message, audience = "all", type = "info" } = req.body;
      if (!title?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "Title and message are required for broadcasts." });
      }

      const query = {};
      if (audience === "instructors") query.role = "Instructor";
      if (audience === "students") query.role = "user";

      const targetUsers = await usersCollection.find(query, { projection: { email: 1 } }).toArray();
      const targetEmails = targetUsers.map((u) => u.email).filter(Boolean);

      const now = new Date().toISOString();
      const docs = targetEmails.map((email) => ({
        recipientEmail: email,
        type: `broadcast_${type}`,
        title: title.trim(),
        message: message.trim(),
        isRead: false,
        isBroadcast: true,
        broadcastAudience: audience,
        createdAt: now,
      }));

      if (docs.length > 0 && userNotificationsCollection) {
        await userNotificationsCollection.insertMany(docs);
      }

      if (io) {
        io.emit("system:broadcast", {
          title: title.trim(),
          message: message.trim(),
          type,
          audience,
          createdAt: now,
        });
      }

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser.email,
        action: "BROADCAST_SENT",
        target: audience,
        details: { title, type, recipientsCount: targetEmails.length },
        ip: req.ip,
      });

      return res.json({
        message: `Broadcast successfully sent to ${targetEmails.length} user(s).`,
        recipientsCount: targetEmails.length,
      });
    } catch (err) {
      console.error("[POST /admin-api/broadcast Error]:", err.message);
      return res.status(500).json({ message: "Failed to dispatch platform broadcast." });
    }
  });

  // ── 20. GET /admin-api/broadcasts — Broadcast History ──
  app.get("/admin-api/broadcasts", verifyAdminJWT, async (req, res) => {
    try {
      if (!userNotificationsCollection) return res.json({ broadcasts: [] });

      const broadcasts = await userNotificationsCollection.aggregate([
        { $match: { isBroadcast: true } },
        { $group: {
          _id: { title: "$title", message: "$message", createdAt: "$createdAt", type: "$type", audience: "$broadcastAudience" },
          recipientsCount: { $sum: 1 },
        }},
        { $sort: { "_id.createdAt": -1 } },
        { $limit: 20 },
      ]).toArray();

      return res.json(broadcasts.map((b) => ({
        title: b._id.title,
        message: b._id.message,
        createdAt: b._id.createdAt,
        type: b._id.type,
        audience: b._id.audience || "all",
        recipientsCount: b.recipientsCount,
      })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to load broadcast history." });
    }
  });

  // ── 21. GET /admin-api/logins — Live User & Admin Login Telemetry ──
  app.get("/admin-api/logins", verifyAdminJWT, async (req, res) => {
    try {
      if (!userLoginLogsCollection) {
        return res.json({ logins: [], total: 0, totalPages: 1, stats: { todayCount: 0, uniqueIpsCount: 0, adminLoginsCount: 0 } });
      }

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const search = req.query.search?.trim();
      const role = req.query.role?.trim();
      const gateway = req.query.gateway?.trim();
      const status = req.query.status?.trim();

      const query = {};
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
          { ip: { $regex: search, $options: "i" } },
        ];
      }
      if (role) {
        query.role = { $regex: `^${role}$`, $options: "i" };
      }
      if (gateway) {
        query.gateway = { $regex: gateway, $options: "i" };
      }
      if (status) {
        query.status = status;
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [logins, total, todayCount, uniqueIpsResult, adminLoginsCount] = await Promise.all([
        userLoginLogsCollection.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
        userLoginLogsCollection.countDocuments(query),
        userLoginLogsCollection.countDocuments({ timestamp: { $gte: oneDayAgo } }),
        userLoginLogsCollection.aggregate([
          { $match: { timestamp: { $gte: oneDayAgo } } },
          { $group: { _id: "$ip" } },
          { $count: "count" },
        ]).toArray(),
        userLoginLogsCollection.countDocuments({ gateway: { $regex: "Admin", $options: "i" } }),
      ]);

      return res.json({
        logins: logins.map((l) => ({ ...l, _id: l._id.toString() })),
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        stats: {
          todayCount,
          uniqueIpsCount: uniqueIpsResult[0]?.count || 0,
          adminLoginsCount,
        },
      });
    } catch (err) {
      console.error("[GET /admin-api/logins Error]:", err.message);
      return res.status(500).json({ message: "Failed to load login telemetry stream." });
    }
  });

  // ── 22. DELETE /admin-api/logins/:id — Purge Single Login Log ──
  app.delete("/admin-api/logins/:id", verifyAdminJWT, async (req, res) => {
    try {
      if (!userLoginLogsCollection) return res.status(404).json({ message: "Collection unavailable." });
      const { id } = req.params;
      await userLoginLogsCollection.deleteOne({ _id: new ObjectId(id) });
      return res.json({ success: true, message: "Login record purged." });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete login record." });
    }
  });

  // ── 23. GET /admin-api/logins/grouped — Grouped Unique IP Login Telemetry ──
  app.get("/admin-api/logins/grouped", verifyAdminJWT, async (req, res) => {
    try {
      if (!userLoginLogsCollection) {
        return res.json({
          ipGroups: [],
          total: 0,
          page: 1,
          totalPages: 1,
          stats: { totalUniqueIps: 0, blockedIpsCount: 0, totalLoginsSum: 0 },
        });
      }

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const skip = (page - 1) * limit;
      const search = req.query.search?.trim();
      const statusFilter = req.query.status?.trim(); // 'blocked' or 'allowed'

      const matchStage = {};
      if (search) {
        matchStage.$or = [
          { ip: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
        ];
      }

      const pipeline = [
        ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: "$ip",
            totalLogins: { $sum: 1 },
            lastLogin: { $max: "$timestamp" },
            firstLogin: { $min: "$timestamp" },
            accounts: {
              $addToSet: {
                email: "$email",
                fullName: "$fullName",
                role: "$role",
              },
            },
            devices: {
              $addToSet: {
                browser: "$browser",
                os: "$os",
                deviceType: "$deviceType",
              },
            },
            gateways: { $addToSet: "$gateway" },
            successCount: {
              $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $ne: ["$status", "SUCCESS"] }, 1, 0] },
            },
          },
        },
        { $sort: { lastLogin: -1 } },
      ];

      const allGroups = await userLoginLogsCollection.aggregate(pipeline).toArray();

      // Fetch blocked IPs
      const blockedRecords = blockedIpsCollection ? await blockedIpsCollection.find({}).toArray() : [];
      const blockedMap = new Map();
      blockedRecords.forEach((b) => {
        if (b.ip) {
          const clean = b.ip.trim().replace(/^::ffff:/, "");
          blockedMap.set(clean, b);
          blockedMap.set(b.ip.trim(), b);
        }
      });

      let enhanced = allGroups.map((group) => {
        const rawIp = group._id || "127.0.0.1";
        const cleanIp = rawIp.replace(/^::ffff:/, "");
        const isBlocked = isIpBlocked(cleanIp) || isIpBlocked(rawIp) || blockedMap.has(cleanIp) || blockedMap.has(rawIp);
        const blockRecord = blockedMap.get(cleanIp) || blockedMap.get(rawIp) || null;

        // Deduplicate unique accounts
        const uniqueAccounts = [];
        const seenEmails = new Set();
        (group.accounts || []).forEach((acc) => {
          if (acc?.email && !seenEmails.has(acc.email.toLowerCase())) {
            seenEmails.add(acc.email.toLowerCase());
            uniqueAccounts.push(acc);
          }
        });

        // Deduplicate devices
        const uniqueDevices = [];
        const seenDevices = new Set();
        (group.devices || []).forEach((dev) => {
          const key = `${dev.browser || ""}_${dev.os || ""}_${dev.deviceType || ""}`;
          if (!seenDevices.has(key)) {
            seenDevices.add(key);
            uniqueDevices.push(dev);
          }
        });

        return {
          ip: rawIp,
          cleanIp,
          totalLogins: group.totalLogins || 0,
          lastLogin: group.lastLogin,
          firstLogin: group.firstLogin,
          accounts: uniqueAccounts,
          uniqueAccountsCount: uniqueAccounts.length,
          devices: uniqueDevices,
          gateways: (group.gateways || []).filter(Boolean),
          successCount: group.successCount || 0,
          failedCount: group.failedCount || 0,
          isBlocked,
          blockDetails: blockRecord
            ? {
                reason: blockRecord.reason,
                blockedBy: blockRecord.blockedBy,
                blockedAt: blockRecord.blockedAt,
              }
            : null,
        };
      });

      if (statusFilter === "blocked") {
        enhanced = enhanced.filter((item) => item.isBlocked);
      } else if (statusFilter === "allowed") {
        enhanced = enhanced.filter((item) => !item.isBlocked);
      }

      const totalUniqueIps = enhanced.length;
      const blockedIpsCount = enhanced.filter((i) => i.isBlocked).length;
      const totalLoginsSum = enhanced.reduce((sum, item) => sum + item.totalLogins, 0);
      const paginated = enhanced.slice(skip, skip + limit);

      return res.json({
        ipGroups: paginated,
        total: totalUniqueIps,
        page,
        totalPages: Math.ceil(totalUniqueIps / limit) || 1,
        stats: {
          totalUniqueIps,
          blockedIpsCount,
          totalLoginsSum,
        },
      });
    } catch (err) {
      console.error("[GET /admin-api/logins/grouped Error]:", err.message);
      return res.status(500).json({ message: "Failed to load grouped IP login records." });
    }
  });

  // ── 24. GET /admin-api/logins/ip/:ip — Deep Session History for Single IP ──
  app.get("/admin-api/logins/ip/:ip", verifyAdminJWT, async (req, res) => {
    try {
      if (!userLoginLogsCollection) return res.status(404).json({ message: "Collection unavailable." });
      const rawIp = req.params.ip;
      const cleanIp = rawIp.replace(/^::ffff:/, "");

      const records = await userLoginLogsCollection
        .find({ $or: [{ ip: rawIp }, { ip: cleanIp }, { ip: `::ffff:${cleanIp}` }] })
        .sort({ timestamp: -1 })
        .limit(300)
        .toArray();

      const blockedRecord = blockedIpsCollection
        ? await blockedIpsCollection.findOne({ $or: [{ ip: cleanIp }, { ip: rawIp }] })
        : null;

      return res.json({
        ip: rawIp,
        cleanIp,
        isBlocked: isIpBlocked(cleanIp) || !!blockedRecord,
        blockDetails: blockedRecord
          ? {
              reason: blockedRecord.reason,
              blockedBy: blockedRecord.blockedBy,
              blockedAt: blockedRecord.blockedAt,
            }
          : null,
        records: records.map((r) => ({ ...r, _id: r._id.toString() })),
        totalSessions: records.length,
      });
    } catch (err) {
      console.error("[GET /admin-api/logins/ip/:ip Error]:", err.message);
      return res.status(500).json({ message: "Failed to load IP session telemetry." });
    }
  });

  // ── 25. POST /admin-api/blocked-ips — Restrict Client IP from Platform Access ──
  app.post("/admin-api/blocked-ips", verifyAdminJWT, async (req, res) => {
    try {
      const { ip, reason } = req.body;
      if (!ip || !ip.trim()) {
        return res.status(400).json({ message: "Valid IP address is required to apply restriction." });
      }
      const targetIp = ip.trim();
      const adminEmail = req.adminUser?.email || "Admin";
      const blockReason = reason?.trim() || "Administrative security restriction";

      const result = await blockIp(targetIp, blockReason, adminEmail);

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail,
        action: "IP_BLOCKED",
        target: targetIp,
        details: { reason: blockReason },
        ip: req.ip,
      });

      return res.json({
        success: true,
        message: `IP ${targetIp} has been restricted immediately from accessing the platform.`,
        ...result,
      });
    } catch (err) {
      console.error("[POST /admin-api/blocked-ips Error]:", err.message);
      return res.status(500).json({ message: "Failed to block IP." });
    }
  });

  // ── 26. DELETE /admin-api/blocked-ips/:ip — Lift Restriction on Client IP ──
  app.delete("/admin-api/blocked-ips/:ip", verifyAdminJWT, async (req, res) => {
    try {
      const targetIp = req.params.ip;
      if (!targetIp || !targetIp.trim()) {
        return res.status(400).json({ message: "Valid IP address is required." });
      }

      const result = await unblockIp(targetIp.trim());

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.adminUser?.email || "Admin",
        action: "IP_UNBLOCKED",
        target: targetIp.trim(),
        details: {},
        ip: req.ip,
      });

      return res.json({
        success: true,
        message: `IP ${targetIp} restriction lifted successfully. Access restored.`,
        ...result,
      });
    } catch (err) {
      console.error("[DELETE /admin-api/blocked-ips/:ip Error]:", err.message);
      return res.status(500).json({ message: "Failed to unblock IP." });
    }
  });

  // ── 27. GET /admin-api/blocked-ips — List All Restricted IPs ──
  app.get("/admin-api/blocked-ips", verifyAdminJWT, async (req, res) => {
    try {
      const blockedIps = await getBlockedIpsList();
      return res.json({
        blockedIps: blockedIps.map((b) => ({ ...b, _id: b._id ? b._id.toString() : undefined })),
        total: blockedIps.length,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to retrieve restricted IPs." });
    }
  });

  // ── 28. GET /admin-api/disputes — List All Student Restriction Disputes & Appeals ──
  app.get("/admin-api/disputes", verifyAdminJWT, async (req, res) => {
    try {
      if (!adminDisputesCollection) return res.json({ disputes: [], total: 0 });
      const disputes = await adminDisputesCollection.find({}).sort({ createdAt: -1 }).toArray();
      return res.json({
        disputes: disputes.map((d) => ({ ...d, _id: d._id.toString() })),
        total: disputes.length,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch student disputes." });
    }
  });

  // ── 29. PATCH /admin-api/disputes/:id/resolve — Admin Resolves Dispute or Overrides Restriction ──
  app.patch("/admin-api/disputes/:id/resolve", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    const { status = "resolved", adminNotes = "", restoreAccess = false } = req.body || {};
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid dispute id." });
    try {
      if (!adminDisputesCollection) return res.status(404).json({ message: "Disputes collection unavailable." });
      const dispute = await adminDisputesCollection.findOne({ _id: new ObjectId(id) });
      if (!dispute) return res.status(404).json({ message: "Dispute not found." });

      const nowIso = new Date().toISOString();
      await adminDisputesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            adminNotes,
            resolvedBy: req.user.email,
            resolvedAt: nowIso,
          },
        }
      );

      if (restoreAccess && dispute.enrollmentId && courseEnrollmentsCollection) {
        await courseEnrollmentsCollection.updateOne(
          { _id: new ObjectId(dispute.enrollmentId) },
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
                action: "admin_override_restored",
                reason: `Platform Admin override: ${adminNotes || "Dispute resolved in learner favor"}`,
                by: req.user.email,
                timestamp: nowIso,
              },
            },
          }
        );
      }

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail: req.user.email,
        action: "student_dispute_resolved",
        target: dispute.learnerEmail,
        details: { disputeId: id, courseTitle: dispute.courseTitle, status, restoreAccess },
        ip: req.ip,
      });

      return res.json({ message: "Dispute updated successfully." });
    } catch (err) {
      return res.status(500).json({ message: "Failed to resolve dispute." });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECURITY & FRAUD INTELLIGENCE (Admin Intelligence: Impossible Travel & Sybil Review Rings)
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /admin-api/security/anomalies — fetch impossible travel and review fraud alerts
  app.get("/admin-api/security/anomalies", verifyAdminJWT, async (req, res) => {
    try {
      if (!adminSecurityAlertsCollection) {
        return res.json({ alerts: [], total: 0, stats: { total: 0, impossibleTravel: 0, reviewFraud: 0, unresolved: 0 } });
      }

      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.type && req.query.type !== "ALL") {
        filter.type = req.query.type;
      }
      if (req.query.status && req.query.status !== "ALL") {
        filter.status = req.query.status;
      }

      const [alerts, total, totalAll, impossibleTravelCount, reviewFraudCount, unresolvedCount] = await Promise.all([
        adminSecurityAlertsCollection.find(filter).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
        adminSecurityAlertsCollection.countDocuments(filter),
        adminSecurityAlertsCollection.countDocuments({}),
        adminSecurityAlertsCollection.countDocuments({ type: "IMPOSSIBLE_TRAVEL" }),
        adminSecurityAlertsCollection.countDocuments({ type: "REVIEW_FRAUD_RING" }),
        adminSecurityAlertsCollection.countDocuments({ status: { $in: ["UNRESOLVED", "AUTO_QUARANTINED"] } }),
      ]);

      return res.json({
        alerts: alerts.map((a) => ({ ...a, _id: a._id.toString() })),
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          total,
        },
        stats: {
          total: totalAll,
          impossibleTravel: impossibleTravelCount,
          reviewFraud: reviewFraudCount,
          unresolved: unresolvedCount,
        },
      });
    } catch (err) {
      console.error("[GET /admin-api/security/anomalies Error]:", err.message);
      return res.status(500).json({ message: "Failed to fetch security anomaly telemetry." });
    }
  });

  // POST /admin-api/security/anomalies/:id/action — take security mitigation action
  app.post("/admin-api/security/anomalies/:id/action", verifyAdminJWT, async (req, res) => {
    const { id } = req.params;
    const { action, reason = "", targetIp } = req.body;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid anomaly alert ID." });

    try {
      if (!adminSecurityAlertsCollection) return res.status(503).json({ message: "Security collection unavailable." });
      const alert = await adminSecurityAlertsCollection.findOne({ _id: new ObjectId(id) });
      if (!alert) return res.status(404).json({ message: "Security alert not found." });

      const nowIso = new Date().toISOString();
      const adminEmail = req.adminUser?.email || "admin";

      if (action === "block_ip") {
        const ipToBlock = targetIp || alert.currentLocation?.ip || alert.reviewerIp || alert.ip;
        if (!ipToBlock) {
          return res.status(400).json({ message: "No IP address found on this alert to block." });
        }
        await blockIp(ipToBlock, reason || `Flagged via Security Alert: ${alert.type}`, adminEmail);
        await adminSecurityAlertsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "RESOLVED_IP_BLOCKED",
              resolvedBy: adminEmail,
              resolvedAt: nowIso,
              resolutionAction: "IP_BLOCKED",
              resolutionNotes: reason || "Offending IP blocked globally.",
            },
          }
        );
      } else if (action === "dismiss") {
        await adminSecurityAlertsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "DISMISSED",
              resolvedBy: adminEmail,
              resolvedAt: nowIso,
              resolutionAction: "DISMISSED",
              resolutionNotes: reason || "False positive / verified travel by administrator.",
            },
          }
        );
      } else if (action === "resolve") {
        await adminSecurityAlertsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "RESOLVED",
              resolvedBy: adminEmail,
              resolvedAt: nowIso,
              resolutionAction: "RESOLVED",
              resolutionNotes: reason || "Security team confirmed mitigation.",
            },
          }
        );
      } else if (action === "release_review") {
        // Un-quarantine review if verified legitimate
        if (alert.targetType === "course" && courseReviewsCollection) {
          await courseReviewsCollection.updateMany(
            { courseId: alert.targetId, reviewerEmail: alert.reviewerEmail },
            { $set: { fraudStatus: "APPROVED", releasedBy: adminEmail, releasedAt: nowIso } }
          );
        } else if (ratingsCollection) {
          await ratingsCollection.updateMany(
            { targetEmail: alert.targetId, reviewerEmail: alert.reviewerEmail },
            { $set: { fraudStatus: "APPROVED", releasedBy: adminEmail, releasedAt: nowIso } }
          );
        }
        await adminSecurityAlertsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "RESOLVED_UNQUARANTINED",
              resolvedBy: adminEmail,
              resolvedAt: nowIso,
              resolutionAction: "RELEASE_REVIEW",
              resolutionNotes: reason || "Review manually approved by administrator.",
            },
          }
        );
      } else if (action === "quarantine_user") {
        if (usersCollection && alert.email) {
          await usersCollection.updateOne(
            { email: alert.email.toLowerCase() },
            { $set: { isDeactivated: true, deactivationReason: `Security Fraud: ${alert.type}` } }
          );
        }
        await adminSecurityAlertsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "RESOLVED_USER_QUARANTINED",
              resolvedBy: adminEmail,
              resolvedAt: nowIso,
              resolutionAction: "USER_DEACTIVATED",
              resolutionNotes: reason || "User account quarantined.",
            },
          }
        );
      } else {
        return res.status(400).json({ message: "Unknown security mitigation action." });
      }

      await logAdminAction(adminAuditLogsCollection, {
        adminEmail,
        action: `security_alert_${action}`,
        target: alert.email || alert.targetId || alert._id.toString(),
        details: { alertId: id, alertType: alert.type, action, reason },
        ip: req.ip,
      });

      return res.json({ message: `Security action '${action}' applied successfully.` });
    } catch (err) {
      console.error("[POST /admin-api/security/anomalies/:id/action Error]:", err.message);
      return res.status(500).json({ message: "Failed to apply security action." });
    }
  });

  // POST /admin-api/security/simulate-impossible-travel — simulator for testing/demonstration
  app.post("/admin-api/security/simulate-impossible-travel", verifyAdminJWT, async (req, res) => {
    const {
      targetEmail = "traveler.demo@skillengine.dev",
      fromCity = "Dhaka",
      fromCountry = "BD",
      toCity = "London",
      toCountry = "GB",
      intervalMinutes = 5,
    } = req.body;

    const now = new Date();
    const prevTime = new Date(now.getTime() - intervalMinutes * 60 * 1000);

    const dhakaCoords = [23.8103, 90.4125];
    const londonCoords = [51.5074, -0.1278];
    const distanceKm = 7940;
    const speedKmh = Math.round(distanceKm / (intervalMinutes / 60)); // ~95,280 km/h

    const alertDoc = {
      type: "IMPOSSIBLE_TRAVEL",
      severity: "CRITICAL",
      status: "UNRESOLVED",
      email: targetEmail,
      fullName: "Simulated Test User",
      userId: null,
      details: `Account accessed from ${toCity}, ${toCountry} only ${intervalMinutes} min after a login from ${fromCity}, ${fromCountry}. Required velocity: ${speedKmh.toLocaleString()} km/h (Physically impossible travel limit: 800 km/h).`,
      metrics: {
        distanceKm,
        timeDiffMinutes: intervalMinutes,
        speedKmh,
      },
      previousLocation: {
        city: fromCity,
        country: fromCountry,
        ip: "103.205.180.1",
        ll: dhakaCoords,
        timestamp: prevTime,
      },
      currentLocation: {
        city: toCity,
        country: toCountry,
        ip: "81.2.69.142",
        ll: londonCoords,
        timestamp: now,
      },
      timestamp: now,
      createdAt: now.toISOString(),
    };

    if (adminSecurityAlertsCollection) {
      await adminSecurityAlertsCollection.insertOne(alertDoc);
    }

    if (userLoginLogsCollection) {
      // Also log previous and current to simulate login telemetry
      await userLoginLogsCollection.insertOne({
        email: targetEmail,
        fullName: "Simulated Test User",
        role: "user",
        ip: "81.2.69.142",
        location: alertDoc.currentLocation,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        browser: "Chrome",
        os: "macOS",
        deviceType: "desktop",
        gateway: "Web Portal",
        status: "SUCCESS",
        isAnomaly: true,
        anomalyType: "IMPOSSIBLE_TRAVEL",
        anomalyDetails: alertDoc,
        timestamp: now,
      });
    }

    if (io) {
      io.emit("admin-security:new-alert", alertDoc);
    }

    return res.json({
      success: true,
      message: `Simulated impossible travel event generated: ${fromCity} -> ${toCity} (${speedKmh.toLocaleString()} km/h).`,
      alert: alertDoc,
    });
  });

  // POST /admin-api/security/simulate-review-fraud — simulator for Sybil review ring
  app.post("/admin-api/security/simulate-review-fraud", verifyAdminJWT, async (req, res) => {
    const {
      targetName = "Fullstack Masterclass 2026",
      targetId = "sim-course-101",
      targetType = "course",
      ip = "198.51.100.88",
    } = req.body;

    const ringAccounts = ["fake.student1@mail.io", "fake.student2@mail.io", "bot.ring3@tempmail.org"];
    const now = new Date();

    const alertDoc = {
      type: "REVIEW_FRAUD_RING",
      severity: "CRITICAL",
      status: "AUTO_QUARANTINED",
      targetType,
      targetId,
      targetName,
      reviewerEmail: ringAccounts[2],
      reviewerIp: ip,
      rating: 5,
      reviewText: "Best course ever! Instant 5 stars from multiple accounts!",
      ringAccounts,
      details: `Sybil review ring detected: ${ringAccounts.length} distinct accounts submitted 5-star reviews for "${targetName}" from identical IP (${ip}) within 72 hours. Automatically quarantined.`,
      timestamp: now,
      createdAt: now.toISOString(),
    };

    if (adminSecurityAlertsCollection) {
      await adminSecurityAlertsCollection.insertOne(alertDoc);
    }

    if (io) {
      io.emit("admin-security:new-alert", alertDoc);
    }

    return res.json({
      success: true,
      message: `Simulated review fraud ring detected and auto-quarantined for IP ${ip}.`,
      alert: alertDoc,
    });
  });
};

module.exports = { registerAdminRoutes };
