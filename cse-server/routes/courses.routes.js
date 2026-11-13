const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const { verifyJWT } = require("../middleware/verifyJWT");
const { calculateProfileCompletion, MIN_COURSE_CREATION_COMPLETION } = require("../utils/profileCompletion");
const { detectReviewFraud, sanitizeIp } = require("../utils/geoSecurity");
const {
  CURRENCY_CODE,
  fromPoisha,
  splitRevenuePoisha,
  validateBdtPrice,
  resolveEnrollmentPoisha,
  formatInvoiceNumber,
  generateNewInvoiceNumber,
} = require("../utils/money");

const PDF_STORAGE_DIR = path.join(__dirname, "..", "storage", "lesson-pdfs");
fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });
    cb(null, PDF_STORAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".pdf") || ".pdf";
    const safeBase =
      path
        .basename(file.originalname || "worksheet.pdf", ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 50) || "lesson_pdf";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeBase}.pdf`);
  },
});

const uploadLessonPdfs = multer({
  storage: pdfStorage,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfExt = (file.originalname || "").toLowerCase().endsWith(".pdf");
    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF (.pdf) files are allowed."));
    }
  },
});

const YOUTUBE_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.|studio\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|video\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

const extractYouTubeVideoId = (rawUrl) => {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const ytMatch = trimmed.match(YOUTUBE_URL_REGEX);
  return ytMatch && ytMatch[1] ? ytMatch[1] : null;
};

const normalizeVideoLink = (rawUrl) => {
  if (typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    return `https://www.youtube.com/watch?v=${ytId}`;
  }
  return trimmed;
};

const sanitizeVideoLinks = (videoLinks, videoUrl) => {
  if (Array.isArray(videoLinks)) {
    return videoLinks.map(normalizeVideoLink).filter(Boolean);
  }
  if (typeof videoUrl === "string") {
    const normalized = normalizeVideoLink(videoUrl);
    return normalized ? [normalized] : [];
  }
  return null;
};

const normalizeCoursePrice = (c) => {
  if (!c) return 0;
  const poisha = Number(c.pricePoisha);
  if (Number.isFinite(poisha) && poisha > 0) {
    return Math.round(poisha / 100);
  }
  const p = Number(c.price);
  if (Number.isFinite(p)) {
    const rounded = Math.round(p);
    if (rounded >= 50000 && rounded % 100 === 0) {
      return Math.round(rounded / 100);
    }
    return Math.max(0, rounded);
  }
  return 0;
};

const sanitizeLessonVideos = ({
  videos,
  videoLinks,
  videoUrl,
  videoVisibility = "unlisted",
  videoMeta = null,
  fallbackDuration = 15,
}) => {
  if (Array.isArray(videos)) {
    const cleaned = [];
    videos.forEach((v, idx) => {
      const rawUrl = typeof v === "string" ? v : v?.url || v?.videoUrl || "";
      const normalizedUrl = normalizeVideoLink(rawUrl);
      const ytId = extractYouTubeVideoId(normalizedUrl) || v?.videoId || v?.embedId || null;
      if (!ytId && !normalizedUrl) return;
      const finalUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : normalizedUrl;
      cleaned.push({
        id: String(v?.id || `vid_${idx + 1}_${ytId || "item"}`),
        title: String(v?.title || "").trim() || `Video Part ${cleaned.length + 1}`,
        url: finalUrl,
        videoId: ytId,
        duration: Math.max(1, Number(v?.duration) || Number(fallbackDuration) || 15),
        visibility: v?.visibility === "public" ? "public" : (videoVisibility === "public" ? "public" : "unlisted"),
        thumbnailUrl:
          String(v?.thumbnailUrl || "").trim() ||
          (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ""),
        authorName: String(v?.authorName || "").trim(),
      });
    });
    return cleaned;
  }

  const parsedLinks = sanitizeVideoLinks(videoLinks, videoUrl);
  if (parsedLinks === null) return null;

  return parsedLinks
    .map((url, idx) => {
      const ytId = extractYouTubeVideoId(url);
      if (!ytId && !url) return null;
      return {
        id: `vid_${idx + 1}_${ytId || "item"}`,
        title:
          idx === 0 && parsedLinks.length === 1 && videoMeta?.title
            ? String(videoMeta.title).trim()
            : `Video Part ${idx + 1}`,
        url,
        videoId: ytId,
        duration: Math.max(1, Number(fallbackDuration) || 15),
        visibility: videoVisibility === "public" ? "public" : "unlisted",
        thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "",
        authorName: idx === 0 && videoMeta?.authorName ? String(videoMeta.authorName).trim() : "",
      };
    })
    .filter(Boolean);
};

const normalizeLessonVideosForRead = (lesson = {}) => {
  if (Array.isArray(lesson.videos) && lesson.videos.length > 0) {
    return lesson.videos.map((v, idx) => {
      const ytId = v.videoId || v.embedId || extractYouTubeVideoId(v.url || "");
      return {
        id: String(v.id || `vid_${idx + 1}_${ytId || "item"}`),
        title: String(v.title || "").trim() || `Video Part ${idx + 1}`,
        url: ytId ? `https://www.youtube.com/watch?v=${ytId}` : (v.url || ""),
        videoId: ytId,
        duration: Math.max(1, Number(v.duration) || Number(lesson.videoDuration) || 15),
        visibility: v.visibility || lesson.videoVisibility || "unlisted",
        thumbnailUrl:
          v.thumbnailUrl ||
          (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ""),
        authorName: v.authorName || "",
      };
    });
  }

  const links = Array.isArray(lesson.videoLinks) ? lesson.videoLinks.filter(Boolean) : [];
  return links.map((url, idx) => {
    const ytId = extractYouTubeVideoId(url);
    return {
      id: `vid_${idx + 1}_${ytId || "item"}`,
      title:
        idx === 0 && lesson.videoMeta?.title
          ? String(lesson.videoMeta.title).trim()
          : `Video Part ${idx + 1}`,
      url: ytId ? `https://www.youtube.com/watch?v=${ytId}` : url,
      videoId: ytId,
      duration: Math.max(1, Math.round((Number(lesson.videoDuration) || 15) / Math.max(1, links.length))),
      visibility: lesson.videoVisibility || "unlisted",
      thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "",
      authorName: lesson.videoMeta?.authorName || "",
    };
  });
};

const sanitizePdfResources = (pdfResources) => {
  if (!Array.isArray(pdfResources)) return [];
  const cleaned = [];
  pdfResources.forEach((p, idx) => {
    if (!p || typeof p.fileUrl !== "string" || !p.fileUrl.trim()) return;
    const fileUrl = p.fileUrl.trim();
    cleaned.push({
      id: String(p.id || `pdf_${idx + 1}_${Date.now()}`),
      title: String(p.title || "").trim() || `Worksheet #${cleaned.length + 1}`,
      fileUrl,
      fileName: String(p.fileName || "").trim(),
      sizeBytes: Number(p.sizeBytes) || 0,
      storageType: p.storageType || (fileUrl.includes("/courses/pdfs/") ? "local" : "external"),
    });
  });
  return cleaned;
};

const CERTIFICATE_THRESHOLD_PERCENT = 80;
const PLATFORM_DISPLAY_NAME = "Collaborative Skill Engine";

const generateCertificateCode = (nowDate = new Date()) => {
  const y = nowDate.getUTCFullYear();
  const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `CSE-${y}-${hex}`;
};

/**
 * Computes deterministic SHA-256 HMAC digital signature for verifiable credentials.
 */
const computeCertificateHash = (doc) => {
  if (!doc) return "";
  const secret =
    process.env.CERTIFICATE_SECRET ||
    process.env.JWT_SECRET ||
    "CSE-CRYPTOGRAPHIC-VERIFIABLE-CREDENTIALS-SECRET-2026";
  const courseIdStr = doc.courseId ? doc.courseId.toString() : "";
  const issuedIso = doc.issuedAt ? new Date(doc.issuedAt).toISOString() : "";
  const completion = Math.min(100, Math.round(Number(doc.completionPercent || 0)));
  const payload = [
    String(doc.certificateCode || "").trim().toUpperCase(),
    courseIdStr,
    String(doc.learnerEmail || "").trim().toLowerCase(),
    String(doc.recipientName || "").trim(),
    issuedIso,
    completion,
  ].join("::");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const computeVideosRequiredForThreshold = (totalVideos) => {
  const total = Math.max(0, Number(totalVideos) || 0);
  if (total === 0) return 0;
  for (let k = 1; k <= total; k += 1) {
    if (Math.round((k / total) * 100) >= CERTIFICATE_THRESHOLD_PERCENT) {
      return k;
    }
  }
  return total;
};

const serializeCertificate = (doc, { includeEmail = true } = {}) => {
  if (!doc) return null;
  const hash = doc.certHash || computeCertificateHash(doc);
  const serialized = {
    _id: doc._id ? doc._id.toString() : undefined,
    courseId: doc.courseId ? doc.courseId.toString() : "",
    recipientName: doc.recipientName || "Course Graduate",
    courseTitle: doc.courseTitle || "Course",
    courseTopic: doc.courseTopic || "Technology & Engineering",
    instructorName: doc.instructorName || "Course Instructor",
    instructorSignature: doc.instructorSignature || "",
    platformName: doc.platformName || PLATFORM_DISPLAY_NAME,
    totalVideos: Number(doc.totalVideos || 0),
    completedVideos: Number(doc.completedVideos || 0),
    completionPercent: Math.min(100, Math.round(Number(doc.completionPercent || 0))),
    thresholdPercent: CERTIFICATE_THRESHOLD_PERCENT,
    certificateCode: doc.certificateCode,
    certHash: hash,
    issuedAt: doc.issuedAt,
  };
  if (includeEmail) {
    serialized.learnerEmail = doc.learnerEmail;
    serialized.instructorEmail = doc.instructorEmail || "";
  }
  return serialized;
};

const buildCertificateStatusPayload = ({
  totalVideos = 0,
  completedVideos = 0,
  percent = 0,
  certDoc = null,
  newlyIssued = false,
  eligible = false,
}) => {
  const safePercent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  const videosRequired = computeVideosRequiredForThreshold(totalVideos);
  const unlocked = Boolean(certDoc) || (eligible && totalVideos > 0 && safePercent >= CERTIFICATE_THRESHOLD_PERCENT);
  return {
    thresholdPercent: CERTIFICATE_THRESHOLD_PERCENT,
    unlocked,
    newlyIssued: Boolean(newlyIssued),
    currentPercent: safePercent,
    remainingPercent: Math.max(0, CERTIFICATE_THRESHOLD_PERCENT - safePercent),
    totalVideos,
    completedVideos,
    videosRequired,
    videosNeeded: unlocked ? 0 : Math.max(0, videosRequired - completedVideos),
    data: serializeCertificate(certDoc),
  };
};

const getOptionalUser = (req) => {
  try {
    const header = req.headers?.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : req.cookies?.token || (typeof req.query?.token === "string" ? req.query.token.trim() : null);
    if (!token || !process.env.JWT_SECRET) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.email
      ? { uid: decoded.uid, email: decoded.email.toLowerCase(), role: decoded.role || null }
      : null;
  } catch {
    return null;
  }
};

const registerCoursesRoutes = (app, {
  coursesCollection,
  courseEnrollmentsCollection,
  usersCollection,
  ratingsCollection,
  schedulesCollection,
  userNotificationsCollection,
  lessonsCollection,
  lessonProgressCollection,
  courseCertificatesCollection,
  courseAppealsCollection = null,
  adminDisputesCollection = null,
  adminAuditLogsCollection = null,
  courseReviewsCollection = null,
  adminSecurityAlertsCollection = null,
  io,
}) => {

  const ensureCourseCertificate = async ({
    courseId,
    course,
    learnerEmail,
    totalVideos = 0,
    completedVideos = 0,
    percent = 0,
    allowIssue = false,
  }) => {
    if (!courseCertificatesCollection || !course || !learnerEmail) {
      return { cert: null, newlyIssued: false };
    }
    const cleanEmail = String(learnerEmail).trim().toLowerCase();
    const emailRegex = new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const courseObjId = courseId instanceof ObjectId ? courseId : new ObjectId(String(courseId));

    const [existingCert, learnerDoc] = await Promise.all([
      courseCertificatesCollection.findOne({ courseId: courseObjId, learnerEmail: cleanEmail }),
      usersCollection.findOne(
        { email: emailRegex },
        { projection: { fullName: 1, name: 1, displayName: 1, email: 1 } }
      ),
    ]);

    const resolvedRecipientName =
      learnerDoc?.fullName?.trim() ||
      learnerDoc?.name?.trim() ||
      learnerDoc?.displayName?.trim() ||
      existingCert?.recipientName ||
      cleanEmail.split("@")[0];

    if (existingCert) {
      const nextPercent = Math.max(
        Math.min(100, Math.round(Number(percent) || 0)),
        Number(existingCert.completionPercent || 0)
      );
      const nextCompleted = Math.max(
        Number(completedVideos) || 0,
        Number(existingCert.completedVideos || 0)
      );
      const nextTotal = Math.max(
        Number(totalVideos) || 0,
        Number(existingCert.totalVideos || 0)
      );

      if (
        resolvedRecipientName !== existingCert.recipientName ||
        nextPercent !== existingCert.completionPercent ||
        nextCompleted !== existingCert.completedVideos ||
        nextTotal !== existingCert.totalVideos
      ) {
        await courseCertificatesCollection.updateOne(
          { _id: existingCert._id },
          {
            $set: {
              recipientName: resolvedRecipientName,
              completionPercent: nextPercent,
              completedVideos: nextCompleted,
              totalVideos: nextTotal,
            },
          }
        );
        existingCert.recipientName = resolvedRecipientName;
        existingCert.completionPercent = nextPercent;
        existingCert.completedVideos = nextCompleted;
        existingCert.totalVideos = nextTotal;
      }

      if (!existingCert.instructorSignature && (course.instructorEmail || existingCert.instructorEmail)) {
        const instEmail = course.instructorEmail || existingCert.instructorEmail;
        const instUser = await usersCollection.findOne(
          { email: new RegExp(`^${instEmail}$`, "i") },
          { projection: { instructorSignature: 1 } }
        );
        if (instUser?.instructorSignature) {
          existingCert.instructorSignature = instUser.instructorSignature;
          await courseCertificatesCollection.updateOne(
            { _id: existingCert._id },
            { $set: { instructorSignature: instUser.instructorSignature } }
          );
        }
      }

      return {
        cert: existingCert,
        newlyIssued: false,
      };
    }

    if (!allowIssue || totalVideos <= 0 || percent < CERTIFICATE_THRESHOLD_PERCENT) {
      return { cert: null, newlyIssued: false };
    }

    let resolvedInstructorName = course.instructorName?.trim() || "";
    if (!resolvedInstructorName && course.instructorEmail) {
      const instRegex = new RegExp(
        `^${String(course.instructorEmail).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
      const instDoc = await usersCollection.findOne(
        { email: instRegex },
        { projection: { fullName: 1, name: 1, displayName: 1, instructorSignature: 1 } }
      );
      resolvedInstructorName =
        instDoc?.fullName?.trim() ||
        instDoc?.name?.trim() ||
        instDoc?.displayName?.trim() ||
        course.instructorEmail.split("@")[0];
    }

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const initialCode = generateCertificateCode(nowDate);
    const certDoc = {
      courseId: courseObjId,
      learnerEmail: cleanEmail,
      recipientName: resolvedRecipientName,
      courseTitle: course.title || "Course",
      courseTopic: course.topic || "Technology & Engineering",
      instructorEmail: course.instructorEmail || "",
      instructorName: resolvedInstructorName || "Course Instructor",
      instructorSignature: instDoc?.instructorSignature || "",
      platformName: PLATFORM_DISPLAY_NAME,
      totalVideos,
      completedVideos,
      completionPercent: Math.min(100, Math.round(percent)),
      thresholdPercent: CERTIFICATE_THRESHOLD_PERCENT,
      certificateCode: initialCode,
      issuedAt: nowIso,
    };
    certDoc.certHash = computeCertificateHash(certDoc);

    let newlyIssued = false;
    try {
      const upsertRes = await courseCertificatesCollection.updateOne(
        { courseId: courseObjId, learnerEmail: cleanEmail },
        { $setOnInsert: certDoc },
        { upsert: true }
      );
      newlyIssued = Boolean(upsertRes.upsertedCount > 0);
    } catch (err) {
      if (err?.code === 11000) {
        // Retry once in case certificateCode collided; otherwise existing courseId+learnerEmail doc wins
        const existingAfterRace = await courseCertificatesCollection.findOne({
          courseId: courseObjId,
          learnerEmail: cleanEmail,
        });
        if (existingAfterRace) {
          if (!existingAfterRace.certHash) {
            existingAfterRace.certHash = computeCertificateHash(existingAfterRace);
            courseCertificatesCollection
              .updateOne({ _id: existingAfterRace._id }, { $set: { certHash: existingAfterRace.certHash } })
              .catch(() => {});
          }
          return { cert: existingAfterRace, newlyIssued: false };
        }
        certDoc.certificateCode = generateCertificateCode(new Date());
        certDoc.certHash = computeCertificateHash(certDoc);
        const retryRes = await courseCertificatesCollection.updateOne(
          { courseId: courseObjId, learnerEmail: cleanEmail },
          { $setOnInsert: certDoc },
          { upsert: true }
        );
        newlyIssued = Boolean(retryRes.upsertedCount > 0);
      } else {
        throw err;
      }
    }

    const saved = await courseCertificatesCollection.findOne({
      courseId: courseObjId,
      learnerEmail: cleanEmail,
    });

    if (saved && !saved.certHash) {
      saved.certHash = computeCertificateHash(saved);
      courseCertificatesCollection
        .updateOne({ _id: saved._id }, { $set: { certHash: saved.certHash } })
        .catch(() => {});
    }

    if (newlyIssued && saved && userNotificationsCollection) {
      try {
        const notifDoc = {
          recipientEmail: cleanEmail,
          type: "course_certificate_issued",
          title: `Certificate Earned: ${course.title}`,
          message: `Congratulations ${resolvedRecipientName}! You completed ${saved.completionPercent}% of "${course.title}" and unlocked your official ${PLATFORM_DISPLAY_NAME} certificate (${saved.certificateCode}).`,
          courseId: courseObjId.toString(),
          courseName: course.title || "",
          certificateCode: saved.certificateCode,
          isRead: false,
          createdAt: nowIso,
        };
        const notifRes = await userNotificationsCollection.insertOne(notifDoc);
        if (io) {
          io.to(`user:${cleanEmail}`).emit("user-notification:new", {
            ...notifDoc,
            _id: notifRes.insertedId.toString(),
          });
        }
      } catch (notifErr) {
        console.error("[Certificate Notification Error]:", notifErr.message);
      }
    }

    return { cert: saved, newlyIssued };
  };

  // Helper: compute eligibility data for a user
  const getEligibilityData = async (email) => {
    const userDoc = await usersCollection.findOne({ email: new RegExp(`^${email}$`, "i") });
    const profileStatus = calculateProfileCompletion(userDoc || {});

    const [ratingsResult, expiredSessions, existingCourses] = await Promise.all([
      ratingsCollection.aggregate([
        { $match: { targetEmail: new RegExp(`^${email}$`, "i") } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]).toArray(),
      schedulesCollection.find({
        $or: [
          { schedulerEmail: new RegExp(`^${email}$`, "i") },
          { inviteeEmail: new RegExp(`^${email}$`, "i") },
        ],
        status: { $in: ["expired", "accepted", "completed"] },
      }).toArray(),
      coursesCollection.find({ instructorEmail: new RegExp(`^${email}$`, "i") }, { projection: { topic: 1 } }).toArray(),
    ]);

    const averageRating = ratingsResult[0] ? Number((ratingsResult[0].avg).toFixed(2)) : 0;
    const sessionCount = expiredSessions.length;
    const sessionTopics = [...new Set(expiredSessions.map((s) => s.title).filter(Boolean))];
    const userSkills = Array.isArray(userDoc?.teachSkills) ? userDoc.teachSkills : [];
    const allTopics = [...new Set([...sessionTopics, ...userSkills])];

    const usedTopics = new Set(existingCourses.map((c) => c.topic));
    const eligibleTopics = allTopics.filter((t) => !usedTopics.has(t));

    // Original Strict Business Logic: At least 1 completed mentoring session AND average rating >= 4.0
    const meetsOriginalMentorshipCriteria = sessionCount >= 1 && averageRating >= 4.0;
    const canCreateCourse = meetsOriginalMentorshipCriteria || userDoc?.role === "Admin";

    return {
      averageRating,
      sessionCount,
      eligibleTopics: eligibleTopics.length > 0 ? eligibleTopics : ["Software Architecture", "Full-Stack Web Development"],
      canCreateCourse,
      meetsOriginalMentorshipCriteria,
      completion: profileStatus.completion,
      profileStatus,
    };
  };

  // GET /courses/eligibility
  app.get("/courses/eligibility", verifyJWT, async (req, res) => {
    try {
      const data = await getEligibilityData(req.user.email);
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ message: "Failed to load eligibility information." });
    }
  });

  // GET /courses/my-enrollments — returns all courses the authenticated user has enrolled in
  app.get("/courses/my-enrollments", verifyJWT, async (req, res) => {
    try {
      const enrollments = await courseEnrollmentsCollection
        .find({ learnerEmail: req.user.email })
        .sort({ createdAt: -1 })
        .toArray();

      if (enrollments.length === 0) return res.json([]);

      // courseId is stored as ObjectId in the enrollment doc
      const courseIds = enrollments
        .map((e) => {
          try {
            return e.courseId instanceof ObjectId
              ? e.courseId
              : new ObjectId(String(e.courseId));
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const courses = await coursesCollection
        .find({ _id: { $in: courseIds } }, {
          projection: {
            title: 1,
            topic: 1,
            thumbnailUrl: 1,
            price: 1,
            status: 1,
            instructorName: 1,
            instructorEmail: 1,
            description: 1,
          },
        })
        .toArray();

      // Build a map: courseId string → enrollment createdAt
      const enrollmentMap = new Map(
        enrollments.map((e) => [
          (e.courseId instanceof ObjectId ? e.courseId : new ObjectId(String(e.courseId))).toString(),
          e.enrolledAt || e.createdAt || null,
        ])
      );

      const result = courses.map((c) => ({
        ...c,
        _id: c._id.toString(),
        price: normalizeCoursePrice(c),
        enrolledAt: enrollmentMap.get(c._id.toString()) || null,
      }));

      return res.json(result);
    } catch (err) {
      console.error("[GET /courses/my-enrollments]", err.message);
      return res.status(500).json({ message: "Failed to fetch enrolled courses." });
    }
  });

  // GET /courses/my-purchases — detailed buyer purchase history with invoice & progress metadata
  app.get("/courses/my-purchases", verifyJWT, async (req, res) => {
    try {
      const buyerEmailRegex = new RegExp(`^${req.user.email}$`, "i");
      const enrollments = await courseEnrollmentsCollection
        .find({ learnerEmail: buyerEmailRegex })
        .sort({ createdAt: -1 })
        .toArray();

      if (enrollments.length === 0) {
        return res.json({
          currency: CURRENCY_CODE,
          totalPurchases: 0,
          activeCourses: 0,
          totalSpent: 0,
          totalSpentPoisha: 0,
          purchases: [],
        });
      }

      const courseIds = [
        ...new Set(
          enrollments
            .map((e) => {
              try {
                return e.courseId instanceof ObjectId ? e.courseId : new ObjectId(String(e.courseId));
              } catch {
                return null;
              }
            })
            .filter(Boolean)
        ),
      ];

      const instructorEmails = [...new Set(enrollments.map((e) => e.instructorEmail).filter(Boolean))];

      const [courses, instructorDocs, buyerDoc, lessons, progressDocs, certDocs] = await Promise.all([
        coursesCollection.find({ _id: { $in: courseIds } }).toArray(),
        usersCollection
          .find(
            { email: { $in: instructorEmails } },
            { projection: { email: 1, fullName: 1, name: 1 } }
          )
          .toArray(),
        usersCollection.findOne(
          { email: buyerEmailRegex },
          { projection: { fullName: 1, name: 1, email: 1 } }
        ),
        lessonsCollection ? lessonsCollection.find({ courseId: { $in: courseIds } }).toArray() : [],
        lessonProgressCollection
          ? lessonProgressCollection.find({ learnerEmail: req.user.email.toLowerCase(), courseId: { $in: courseIds } }).toArray()
          : [],
        courseCertificatesCollection
          ? courseCertificatesCollection
              .find({ learnerEmail: req.user.email.toLowerCase(), courseId: { $in: courseIds } })
              .toArray()
          : [],
      ]);

      const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));
      const certMap = new Map(certDocs.map((c) => [c.courseId.toString(), c]));
      const instructorMap = new Map(
        instructorDocs.map((u) => [u.email.toLowerCase(), u.fullName || u.name || u.email])
      );

      // Build per-course video counts & completed counts
      const videosPerCourse = new Map();
      for (const l of lessons) {
        const cIdStr = l.courseId.toString();
        const vidsCount = normalizeLessonVideosForRead(l).length;
        videosPerCourse.set(cIdStr, (videosPerCourse.get(cIdStr) || 0) + vidsCount);
      }

      const completedPerCourse = new Map();
      for (const p of progressDocs) {
        const cIdStr = p.courseId.toString();
        completedPerCourse.set(cIdStr, (completedPerCourse.get(cIdStr) || 0) + 1);
      }

      let totalSpentPoisha = 0;
      let activeCourses = 0;
      const buyerName = buyerDoc?.fullName || buyerDoc?.name || req.user.email.split("@")[0];

      const purchases = enrollments.map((e) => {
        const cIdStr = e.courseId ? e.courseId.toString() : "";
        const courseDoc = courseMap.get(cIdStr) || {};
        const split = resolveEnrollmentPoisha(e);
        if (!e.refunded) {
          totalSpentPoisha += split.pricePoisha;
        }
        const isSuspensionExpired = Boolean(
          e.suspended && e.suspendedUntil && new Date(e.suspendedUntil) <= new Date()
        );
        const status = e.refunded
          ? "refunded"
          : e.banned
          ? "banned"
          : e.suspended && !isSuspensionExpired
          ? "suspended"
          : "active";
        if (status === "active") activeCourses += 1;

        const totalVideos = videosPerCourse.get(cIdStr) || 0;
        const completedVideos = completedPerCourse.get(cIdStr) || 0;
        const progressPercent =
          totalVideos > 0 ? Math.min(100, Math.round((completedVideos / totalVideos) * 100)) : 0;
        const existingCert = certMap.get(cIdStr) || null;
        const certificateUnlocked =
          Boolean(existingCert) ||
          (status === "active" && totalVideos > 0 && progressPercent >= CERTIFICATE_THRESHOLD_PERCENT);

        return {
          enrollmentId: e._id.toString(),
          invoiceNumber: formatInvoiceNumber(e),
          courseId: cIdStr,
          courseTitle: courseDoc.title || e.courseTitle || "Untitled Course",
          topic: courseDoc.topic || "General",
          thumbnailUrl: courseDoc.thumbnailUrl || "",
          instructorEmail: e.instructorEmail || courseDoc.instructorEmail || "",
          instructorName:
            courseDoc.instructorName ||
            instructorMap.get((e.instructorEmail || "").toLowerCase()) ||
            "Platform Instructor",
          learnerName: buyerName,
          learnerEmail: e.learnerEmail,
          currency: CURRENCY_CODE,
          price: fromPoisha(split.pricePoisha),
          pricePoisha: split.pricePoisha,
          commission: fromPoisha(split.commissionPoisha),
          instructorEarnings: fromPoisha(split.instructorEarningsPoisha),
          purchasedAt: e.createdAt,
          status,
          banned: Boolean(e.banned),
          bannedAt: e.bannedAt || null,
          banReason: e.banReason || (Array.isArray(e.history) ? e.history.slice().reverse().find(h => h.action === "banned")?.reason : null) || null,
          suspended: Boolean(e.suspended && !isSuspensionExpired),
          suspendedAt: e.suspendedAt || null,
          suspendedDays: e.suspendedDays || null,
          suspendedUntil: e.suspendedUntil || null,
          suspendReason: e.suspendReason || (Array.isArray(e.history) ? e.history.slice().reverse().find(h => h.action === "suspended")?.reason : null) || null,
          totalVideos,
          completedVideos,
          progressPercent,
          certificateUnlocked,
          certificateCode: existingCert?.certificateCode || null,
          certificateIssuedAt: existingCert?.issuedAt || null,
        };
      });

      return res.json({
        currency: CURRENCY_CODE,
        totalPurchases: purchases.length,
        activeCourses,
        totalSpent: fromPoisha(totalSpentPoisha),
        totalSpentPoisha,
        purchases,
      });
    } catch (err) {
      console.error("[GET /courses/my-purchases]", err.message);
      return res.status(500).json({ message: "Failed to fetch purchase history." });
    }
  });

  // GET /courses/certificates/verify/:code — public certificate authenticity check by code or SHA-256 hash
  app.get("/courses/certificates/verify/:code", async (req, res) => {
    const rawIdentifier = String(req.params.code || "").trim();
    if (!rawIdentifier || !courseCertificatesCollection) {
      return res.status(404).json({ valid: false, tamperProof: false, message: "Certificate not found." });
    }
    try {
      const isHexHash = /^[a-fA-F0-9]{64}$/.test(rawIdentifier);
      const query = isHexHash
        ? { certHash: rawIdentifier.toLowerCase() }
        : {
            $or: [
              { certificateCode: rawIdentifier.toUpperCase() },
              { certHash: rawIdentifier.toLowerCase() },
            ],
          };

      let cert = await courseCertificatesCollection.findOne(query);

      // Fallback: If searched by code and not found, try case-insensitive code search
      if (!cert && !isHexHash) {
        cert = await courseCertificatesCollection.findOne({
          certificateCode: new RegExp(`^${rawIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
      }

      if (!cert) {
        return res.status(404).json({
          valid: false,
          tamperProof: false,
          message: "Certificate credential not found in verification registry.",
          identifier: rawIdentifier,
        });
      }

      const expectedHash = computeCertificateHash(cert);
      if (!cert.certHash) {
        cert.certHash = expectedHash;
        courseCertificatesCollection
          .updateOne({ _id: cert._id }, { $set: { certHash: expectedHash } })
          .catch(() => {});
      }

      const isSignatureValid =
        cert.certHash && cert.certHash.toLowerCase() === expectedHash.toLowerCase();

      if (!isSignatureValid) {
        return res.status(400).json({
          valid: false,
          tamperProof: false,
          message: "Cryptographic signature mismatch! This certificate appears to be altered or forged.",
          providedIdentifier: rawIdentifier,
          verifiedAt: new Date().toISOString(),
        });
      }

      if (!cert.instructorSignature && cert.instructorEmail) {
        const instUser = await usersCollection.findOne(
          { email: new RegExp(`^${cert.instructorEmail}$`, "i") },
          { projection: { instructorSignature: 1 } }
        );
        if (instUser?.instructorSignature) {
          cert.instructorSignature = instUser.instructorSignature;
        }
      }

      return res.json({
        valid: true,
        tamperProof: true,
        certHash: cert.certHash,
        certificateCode: cert.certificateCode,
        algorithm: "HMAC-SHA256",
        verifiedAt: new Date().toISOString(),
        issuer: PLATFORM_DISPLAY_NAME,
        certificate: serializeCertificate(cert, { includeEmail: false }),
      });
    } catch (err) {
      return res.status(500).json({ valid: false, tamperProof: false, message: "Failed to verify certificate." });
    }
  });

  // POST /courses/:id/reviews — student reviews a course with Sybil Review Fraud Detection
  app.post("/courses/:id/reviews", verifyJWT, async (req, res) => {
    const { id } = req.params;
    const { rating, reviewText = "" } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
    if (!courseReviewsCollection) {
      return res.status(503).json({ message: "Reviews service unavailable." });
    }

    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) {
        return res.status(404).json({ message: "Course not found." });
      }

      const reviewerEmail = req.user.email;
      if (course.instructorEmail && course.instructorEmail.toLowerCase() === reviewerEmail.toLowerCase()) {
        return res.status(400).json({ message: "Instructors cannot review their own course." });
      }

      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "127.0.0.1";

      // Sybil Review Fraud Detection
      const fraudCheck = await detectReviewFraud({
        courseReviewsCollection,
        ip: clientIp,
        reviewerEmail,
        targetIdOrEmail: id,
        rating: numRating,
        isCourse: true,
      });

      const now = new Date().toISOString();
      const reviewerUser = await usersCollection.findOne({ email: new RegExp(`^${reviewerEmail}$`, "i") });
      const reviewerName = reviewerUser?.fullName || req.user.displayName || "Learner";

      const reviewDoc = {
        courseId: id,
        courseTitle: course.title || "Course",
        instructorEmail: course.instructorEmail || "",
        reviewerEmail,
        reviewerName,
        reviewerPhoto: reviewerUser?.profileImage || "",
        reviewerIp: sanitizeIp(clientIp),
        rating: numRating,
        reviewText: String(reviewText || "").trim(),
        fraudStatus: fraudCheck.isFraud ? "QUARANTINED" : "APPROVED",
        quarantineReason: fraudCheck.isFraud ? fraudCheck.reason : null,
        updatedAt: now,
      };

      await courseReviewsCollection.updateOne(
        { courseId: id, reviewerEmail },
        {
          $set: reviewDoc,
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      if (fraudCheck.isFraud && adminSecurityAlertsCollection) {
        const alertDoc = {
          type: "REVIEW_FRAUD_RING",
          severity: fraudCheck.severity || "HIGH",
          status: "AUTO_QUARANTINED",
          targetType: "course",
          targetId: id,
          targetName: course.title || "Course",
          reviewerEmail,
          reviewerIp: sanitizeIp(clientIp),
          rating: numRating,
          reviewText: String(reviewText || "").trim(),
          ringAccounts: fraudCheck.ringAccounts,
          details: fraudCheck.reason,
          timestamp: new Date(),
          createdAt: now,
        };
        await adminSecurityAlertsCollection.insertOne(alertDoc);
        if (io) {
          io.emit("admin-security:new-alert", alertDoc);
        }
      }

      // Recompute course average rating (only non-quarantined reviews)
      const agg = await courseReviewsCollection.aggregate([
        { $match: { courseId: id, fraudStatus: { $ne: "QUARANTINED" } } },
        {
          $group: {
            _id: "$courseId",
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]).toArray();

      const newAvg = agg[0] ? Number(agg[0].averageRating.toFixed(1)) : numRating;
      const newTotal = agg[0] ? agg[0].totalReviews : 1;

      await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { averageRating: newAvg, totalReviews: newTotal, rating: newAvg } }
      );

      return res.json({
        message: fraudCheck.isFraud
          ? "Review submitted and queued for verification."
          : "Review submitted successfully!",
        quarantined: fraudCheck.isFraud,
        review: reviewDoc,
      });
    } catch (err) {
      console.error("[POST /courses/:id/reviews Error]:", err.message);
      return res.status(500).json({ message: "Failed to submit review." });
    }
  });

  // GET /courses/:id/reviews — fetch reviews for a course
  app.get("/courses/:id/reviews", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id) || !courseReviewsCollection) {
      return res.json({ reviews: [], averageRating: 5.0, totalReviews: 0 });
    }
    try {
      const reviews = await courseReviewsCollection
        .find({ courseId: id, fraudStatus: { $ne: "QUARANTINED" } })
        .sort({ createdAt: -1 })
        .toArray();

      const totalReviews = reviews.length;
      const averageRating =
        totalReviews > 0
          ? Number((reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1))
          : 5.0;

      return res.json({
        reviews: reviews.map((r) => ({ ...r, _id: r._id.toString() })),
        averageRating,
        totalReviews,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch course reviews." });
    }
  });

  // GET /courses/invoices/:enrollmentId — authorized for Buyer (learner) OR Course Owner (instructor) OR Admin
  app.get("/courses/invoices/:enrollmentId", verifyJWT, async (req, res) => {
    const { enrollmentId } = req.params;
    if (!ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({ message: "Invalid invoice / enrollment id." });
    }
    try {
      const enrollment = await courseEnrollmentsCollection.findOne({ _id: new ObjectId(enrollmentId) });
      if (!enrollment) {
        return res.status(404).json({ message: "Invoice record not found." });
      }

      const requesterEmail = req.user.email.toLowerCase();
      const isBuyer = (enrollment.learnerEmail || "").toLowerCase() === requesterEmail;
      const isOwner = (enrollment.instructorEmail || "").toLowerCase() === requesterEmail;
      const isAdmin = req.user.role === "Admin" || req.user.role === "admin";

      if (!isBuyer && !isOwner && !isAdmin) {
        return res.status(403).json({ message: "Access denied. You do not own this invoice." });
      }

      const viewerRole = isOwner ? "owner" : isAdmin ? "admin" : "buyer";
      const [courseDoc, buyerDoc, sellerDoc] = await Promise.all([
        enrollment.courseId
          ? coursesCollection.findOne({ _id: new ObjectId(String(enrollment.courseId)) })
          : null,
        usersCollection.findOne(
          { email: new RegExp(`^${enrollment.learnerEmail}$`, "i") },
          { projection: { fullName: 1, name: 1, email: 1 } }
        ),
        usersCollection.findOne(
          { email: new RegExp(`^${enrollment.instructorEmail}$`, "i") },
          { projection: { fullName: 1, name: 1, email: 1 } }
        ),
      ]);

      const split = resolveEnrollmentPoisha(enrollment);
      const status = enrollment.refunded
        ? "REFUNDED"
        : enrollment.banned
        ? "RESTRICTED"
        : enrollment.suspended
        ? "SUSPENDED"
        : "PAID";

      return res.json({
        enrollmentId: enrollment._id.toString(),
        invoiceNumber: formatInvoiceNumber(enrollment),
        currency: CURRENCY_CODE,
        issuedAt: enrollment.createdAt || new Date().toISOString(),
        status,
        viewerRole,
        buyer: {
          name: buyerDoc?.fullName || buyerDoc?.name || enrollment.learnerEmail.split("@")[0],
          email: enrollment.learnerEmail,
        },
        seller: {
          name:
            courseDoc?.instructorName ||
            sellerDoc?.fullName ||
            sellerDoc?.name ||
            enrollment.instructorEmail.split("@")[0],
          email: enrollment.instructorEmail,
        },
        course: {
          id: enrollment.courseId ? enrollment.courseId.toString() : "",
          title: courseDoc?.title || enrollment.courseTitle || "Untitled Course",
          topic: courseDoc?.topic || "General",
          thumbnailUrl: courseDoc?.thumbnailUrl || "",
        },
        financials: {
          grossBdt: fromPoisha(split.pricePoisha),
          grossPoisha: split.pricePoisha,
          taxBdt: 0,
          platformCommissionBdt: fromPoisha(split.commissionPoisha),
          platformCommissionPoisha: split.commissionPoisha,
          platformCommissionPct: 15,
          instructorNetBdt: fromPoisha(split.instructorEarningsPoisha),
          instructorNetPoisha: split.instructorEarningsPoisha,
          instructorNetPct: 85,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load invoice details." });
    }
  });

  // GET /courses/earnings
  app.get("/courses/earnings", verifyJWT, async (req, res) => {
    try {
      const enrollments = await courseEnrollmentsCollection
        .find({ instructorEmail: new RegExp(`^${req.user.email}$`, "i") })
        .toArray();
      let totalEarningsPoisha = 0;
      for (const e of enrollments) {
        totalEarningsPoisha += resolveEnrollmentPoisha(e).instructorEarningsPoisha;
      }
      return res.json({
        currency: CURRENCY_CODE,
        totalEarningsPoisha,
        totalEarnings: fromPoisha(totalEarningsPoisha),
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch earnings." });
    }
  });

  // GET /courses/mine
  app.get("/courses/mine", verifyJWT, async (req, res) => {
    try {
      const courses = await coursesCollection
        .find({ instructorEmail: { $regex: new RegExp(`^${req.user.email}$`, "i") } })
        .sort({ createdAt: -1 })
        .toArray();
      return res.json(courses.map((c) => ({ ...c, _id: c._id.toString(), price: normalizeCoursePrice(c) })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch courses." });
    }
  });

  // In-memory cache for public course catalog (High Performance)
  let publicCoursesCache = null;
  let publicCoursesExpiresAt = 0;
  const invalidatePublicCoursesCache = () => {
    publicCoursesCache = null;
    publicCoursesExpiresAt = 0;
  };

  // GET /courses/public
  app.get("/courses/public", async (req, res) => {
    try {
      if (publicCoursesCache && Date.now() < publicCoursesExpiresAt) {
        return res.json(publicCoursesCache);
      }

      const courses = await coursesCollection
        .find({ status: { $in: ["approved", "pending_review"] } })
        .sort({ createdAt: -1 })
        .toArray();
      const mapped = courses.map((c) => ({ ...c, _id: c._id.toString(), price: normalizeCoursePrice(c) }));
      
      publicCoursesCache = mapped;
      publicCoursesExpiresAt = Date.now() + 30000; // 30-second TTL cache

      return res.json(mapped);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch courses." });
    }
  });

  // GET /courses/public/:id
  app.get("/courses/public/:id", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({
        _id: new ObjectId(id),
        status: { $in: ["approved", "pending_review"] },
      });
      if (!course) return res.status(404).json({ message: "Course not found." });
      return res.json({ ...course, _id: course._id.toString(), price: normalizeCoursePrice(course) });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch course." });
    }
  });

  // POST /courses — create a draft course
  app.post("/courses", verifyJWT, async (req, res) => {
    try {
      const { title, topic, description, price, thumbnailUrl, curriculum } = req.body;

      // Field validation
      const errors = {};
      if (!title || title.trim().length < 1 || title.trim().length > 120) errors.title = "Title must be 1–120 characters.";
      if (!description || description.trim().length < 10 || description.trim().length > 2000) errors.description = "Description must be 10–2000 characters.";
      const priceCheck = validateBdtPrice(price);
      if (!priceCheck.valid) errors.price = priceCheck.error;
      if (!thumbnailUrl || thumbnailUrl.trim().length < 1 || thumbnailUrl.trim().length > 500) errors.thumbnailUrl = "Thumbnail URL must be 1–500 characters.";
      if (!Array.isArray(curriculum) || curriculum.length < 1 || curriculum.length > 50) errors.curriculum = "Curriculum must have 1–50 items.";
      else {
        for (const item of curriculum) {
          if (!item.title || item.title.trim().length < 1 || item.title.trim().length > 100) {
            errors.curriculum = "Each curriculum item title must be 1–100 characters.";
            break;
          }
        }
      }
      if (Object.keys(errors).length > 0) return res.status(400).json({ message: "Validation failed.", errors });

      // Verify original strict eligibility: At least 1 mentoring session + rating >= 4.0, or permanent studio access
      const userDoc = await usersCollection.findOne({ email: new RegExp(`^${req.user.email}$`, "i") });
      const eligibility = await getEligibilityData(req.user.email);
      
      if (!eligibility.canCreateCourse) {
        return res.status(403).json({
          message: "Course creation restricted: Requires at least 1 completed mentoring session and an average rating of 4.0 or higher.",
          sessionCount: eligibility.sessionCount,
          averageRating: eligibility.averageRating,
          requiredSessions: 1,
          minRating: 4.0,
        });
      }

      // Verify topic is in eligible topics
      const { eligibleTopics } = await getEligibilityData(req.user.email);
      if (!topic || !eligibleTopics.includes(topic)) {
        return res.status(400).json({ message: "Invalid topic selection." });
      }

      const instructorName = userDoc?.fullName || userDoc?.name || "Unknown";
      const now = new Date().toISOString();
      const courseDoc = {
        instructorEmail: req.user.email,
        instructorName,
        title: title.trim(),
        topic,
        description: description.trim(),
        currency: CURRENCY_CODE,
        price: priceCheck.price,
        pricePoisha: priceCheck.pricePoisha,
        thumbnailUrl: thumbnailUrl.trim(),
        curriculum: curriculum.map((c) => ({ title: c.title.trim() })),
        status: "draft",
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        approvedBy: null,
        rejectedBy: null,
        rejectionReason: "",
      };

      const result = await coursesCollection.insertOne(courseDoc);
      invalidatePublicCoursesCache();
      const insertedCourseId = result.insertedId.toString();

      // Auto-seed initial lesson modules from curriculum so instructor can immediately attach YouTube Unlisted videos
      if (lessonsCollection && Array.isArray(courseDoc.curriculum)) {
        for (let idx = 0; idx < courseDoc.curriculum.length; idx++) {
          const item = courseDoc.curriculum[idx];
          await lessonsCollection.insertOne({
            courseId: result.insertedId,
            instructorEmail: req.user.email,
            title: item.title,
            description: "",
            richTextContent: "",
            videos: [],
            videoLinks: [],
            videoVisibility: "unlisted",
            videoMeta: null,
            videoDuration: 15,
            pdfResources: [],
            assignments: [],
            quizzes: [],
            isFreePreview: idx === 0,
            isLocked: idx !== 0,
            sectionTitle: "Core Curriculum",
            order: idx + 1,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return res.status(201).json({ ...courseDoc, _id: insertedCourseId });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ message: "You already have a course on this topic." });
      return res.status(500).json({ message: "Failed to create course." });
    }
  });

  // PATCH /courses/:id/submit
  // Auto-approves the course so it appears in the marketplace immediately.
  app.patch("/courses/:id/submit", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });
      if (course.instructorEmail !== req.user.email) return res.status(403).json({ message: "Access denied." });
      if (!["draft", "rejected"].includes(course.status)) {
        return res.status(409).json({ message: "This course has already been submitted." });
      }

      const now = new Date().toISOString();
      // Auto-approve: skip pending_review and go directly to approved
      await coursesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "approved",
            submittedAt: now,
            approvedAt: now,
            updatedAt: now,
          },
        }
      );
      invalidatePublicCoursesCache();

      const updated = {
        ...course,
        status: "approved",
        submittedAt: now,
        approvedAt: now,
        updatedAt: now,
        _id: course._id.toString(),
      };
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Submission failed. Please try again." });
    }
  });

  // POST /courses/:id/enroll
  app.post("/courses/:id/enroll", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course || course.status !== "approved") return res.status(404).json({ message: "Course not found or not available." });
      if (course.instructorEmail === req.user.email) return res.status(400).json({ message: "You cannot enroll in your own course." });

      const coursePriceBdt = Number.isFinite(course.pricePoisha)
        ? fromPoisha(course.pricePoisha)
        : course.price;
      const split = splitRevenuePoisha(coursePriceBdt);
      const nowDate = new Date();
      const now = nowDate.toISOString();
      const invoiceNumber = generateNewInvoiceNumber(nowDate);

      const enrollmentDoc = {
        courseId: new ObjectId(id),
        courseTitle: course.title,
        instructorEmail: course.instructorEmail,
        learnerEmail: req.user.email,
        invoiceNumber,
        currency: split.currency,
        price: split.price,
        pricePoisha: split.pricePoisha,
        commission: split.commission,
        commissionPoisha: split.commissionPoisha,
        instructorEarnings: split.instructorEarnings,
        instructorEarningsPoisha: split.instructorEarningsPoisha,
        createdAt: now,
      };

      const result = await courseEnrollmentsCollection.insertOne(enrollmentDoc);
      return res.status(201).json({ ...enrollmentDoc, _id: result.insertedId.toString(), courseId: id });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ message: "You are already enrolled in this course." });
      return res.status(500).json({ message: "Enrollment failed." });
    }
  });

  // GET /courses/:id/enrollment — detailed enrollment status, restriction reasons, instructor metadata & appeal threads
  app.get("/courses/:id/enrollment", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const emailRegex = new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      let enrollment = await courseEnrollmentsCollection.findOne({
        courseId: new ObjectId(id),
        learnerEmail: emailRegex,
      });

      // Auto-lift temporary suspension if the duration has elapsed
      if (enrollment && enrollment.suspended && enrollment.suspendedUntil) {
        if (new Date(enrollment.suspendedUntil) <= new Date()) {
          const nowIso = new Date().toISOString();
          await courseEnrollmentsCollection.updateOne(
            { _id: enrollment._id },
            {
              $set: { suspended: false, status: enrollment.banned ? "banned" : "active" },
              $unset: { suspendedAt: "", suspendReason: "", suspendedUntil: "", suspendedDays: "" },
              $push: {
                history: {
                  action: "unsuspended_auto",
                  reason: "Suspension period elapsed",
                  timestamp: nowIso,
                  by: "system",
                },
              },
            }
          );
          enrollment.suspended = false;
          enrollment.status = enrollment.banned ? "banned" : "active";
        }
      }

      const isActive = Boolean(
        enrollment && !enrollment.banned && !enrollment.suspended && !enrollment.refunded
      );

      // Fetch course details & instructor info
      let courseDoc = null;
      if (coursesCollection) {
        courseDoc = await coursesCollection.findOne(
          { _id: new ObjectId(id) },
          { projection: { title: 1, topic: 1, thumbnailUrl: 1, instructorEmail: 1, instructorName: 1 } }
        );
      }

      // Fetch existing appeal threads between this learner and instructor
      let appeals = [];
      if (courseAppealsCollection && enrollment) {
        appeals = await courseAppealsCollection
          .find({
            courseId: new ObjectId(id),
            learnerEmail: emailRegex,
          })
          .sort({ createdAt: -1 })
          .toArray();
      }

      const banReason =
        enrollment?.banReason ||
        (Array.isArray(enrollment?.history)
          ? enrollment.history.slice().reverse().find((h) => h.action === "banned")?.reason
          : null) ||
        "Violation of platform community or course guidelines";

      const suspendReason =
        enrollment?.suspendReason ||
        (Array.isArray(enrollment?.history)
          ? enrollment.history.slice().reverse().find((h) => h.action === "suspended")?.reason
          : null) ||
        "Temporary access suspension for administrative review";

      return res.json({
        enrolled: isActive,
        enrollmentId: enrollment ? enrollment._id.toString() : null,
        invoiceNumber: enrollment ? formatInvoiceNumber(enrollment) : null,
        status: enrollment
          ? enrollment.refunded
            ? "refunded"
            : enrollment.banned
            ? "banned"
            : enrollment.suspended
            ? "suspended"
            : "active"
          : null,
        banned: Boolean(enrollment?.banned),
        bannedAt: enrollment?.bannedAt || null,
        banReason,
        suspended: Boolean(enrollment?.suspended),
        suspendedAt: enrollment?.suspendedAt || null,
        suspendedDays: enrollment?.suspendedDays || null,
        suspendedUntil: enrollment?.suspendedUntil || null,
        suspendReason,
        courseTitle: courseDoc?.title || enrollment?.courseTitle || "Course",
        thumbnailUrl: courseDoc?.thumbnailUrl || "",
        instructorEmail: courseDoc?.instructorEmail || enrollment?.instructorEmail || "",
        instructorName: courseDoc?.instructorName || enrollment?.instructorName || "Course Instructor",
        appeals: appeals.map((a) => ({ ...a, _id: a._id.toString() })),
        activeAppeal: appeals[0] ? { ...appeals[0], _id: appeals[0]._id.toString() } : null,
      });
    } catch (err) {
      console.error("[GET /courses/:id/enrollment Error]:", err.message);
      return res.status(500).json({ message: "Failed to check enrollment." });
    }
  });

  // POST /courses/:id/appeal-instructor — learner messages instructor with problem details to appeal ban/suspension
  app.post("/courses/:id/appeal-instructor", verifyJWT, async (req, res) => {
    const { id } = req.params;
    const { message, issueDetails, requestedAction = "lift_restriction", contactPhone = "" } = req.body || {};
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Please provide an explanation or message for the instructor." });
    }

    try {
      const emailRegex = new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const enrollment = await courseEnrollmentsCollection.findOne({
        courseId: new ObjectId(id),
        learnerEmail: emailRegex,
      });

      if (!enrollment) {
        return res.status(404).json({ message: "No enrollment found for this course." });
      }

      if (!enrollment.banned && !enrollment.suspended) {
        return res.status(400).json({ message: "Your enrollment is currently active. No appeal is required." });
      }

      const courseDoc = await coursesCollection.findOne({ _id: new ObjectId(id) });
      const instructorEmail = enrollment.instructorEmail || courseDoc?.instructorEmail;

      const userDoc = await usersCollection.findOne({ email: emailRegex });
      const learnerName = userDoc?.fullName || userDoc?.name || enrollment.learnerName || req.user.email.split("@")[0];

      const now = new Date().toISOString();
      const restrictionType = enrollment.banned ? "ban" : "suspension";
      const restrictionReason = enrollment.banned
        ? enrollment.banReason || "Violation of guidelines"
        : enrollment.suspendReason || "Temporary suspension";

      const appealDoc = {
        courseId: new ObjectId(id),
        courseTitle: courseDoc?.title || enrollment.courseTitle || "Course",
        enrollmentId: enrollment._id,
        learnerEmail: req.user.email.toLowerCase(),
        learnerName,
        instructorEmail: (instructorEmail || "").toLowerCase(),
        instructorName: courseDoc?.instructorName || enrollment.instructorName || "Course Instructor",
        restrictionType,
        restrictionReason,
        status: "pending", // "pending" | "replied" | "resolved" | "rejected"
        requestedAction,
        contactPhone: contactPhone ? String(contactPhone).trim() : "",
        messages: [
          {
            id: new ObjectId().toString(),
            sender: "learner",
            senderEmail: req.user.email.toLowerCase(),
            senderName: learnerName,
            message: message.trim(),
            issueDetails: issueDetails ? issueDetails.trim() : "",
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      let insertedId = null;
      let finalAppealDoc = null;
      if (courseAppealsCollection) {
        // If an appeal already exists for this enrollment and is still active/replied, append message
        const existingAppeal = await courseAppealsCollection.findOne({
          enrollmentId: enrollment._id,
          status: { $in: ["pending", "replied"] },
        });

        if (existingAppeal) {
          const newMsg = {
            id: new ObjectId().toString(),
            sender: "learner",
            senderEmail: req.user.email.toLowerCase(),
            senderName: learnerName,
            message: message.trim(),
            issueDetails: issueDetails ? issueDetails.trim() : "",
            createdAt: now,
          };
          await courseAppealsCollection.updateOne(
            { _id: existingAppeal._id },
            {
              $push: { messages: newMsg },
              $set: { status: "pending", updatedAt: now },
            }
          );
          insertedId = existingAppeal._id;
          finalAppealDoc = {
            ...existingAppeal,
            _id: existingAppeal._id.toString(),
            id: existingAppeal._id.toString(),
            messages: [...(existingAppeal.messages || []), newMsg],
            status: "pending",
            updatedAt: now,
          };
        } else {
          const insertRes = await courseAppealsCollection.insertOne(appealDoc);
          insertedId = insertRes.insertedId;
          finalAppealDoc = {
            ...appealDoc,
            _id: insertedId.toString(),
            id: insertedId.toString(),
          };
        }
      }

      // Notify instructor in real-time
      if (userNotificationsCollection && instructorEmail) {
        const notifDoc = {
          recipientEmail: instructorEmail.toLowerCase(),
          type: "course_appeal",
          title: `Appeal from ${learnerName} (${courseDoc?.title || "Course"})`,
          message: `${learnerName} has submitted an appeal regarding course ${restrictionType}: "${message.trim().slice(0, 120)}${message.length > 120 ? "..." : ""}"`,
          courseId: id,
          enrollmentId: enrollment._id.toString(),
          appealId: insertedId ? insertedId.toString() : null,
          actionUrl: "/studio/appeals",
          link: "/studio/appeals",
          isRead: false,
          createdAt: now,
        };
        await userNotificationsCollection.insertOne(notifDoc);
        if (io) {
          const appealPayload = {
            ...(finalAppealDoc || appealDoc),
            _id: insertedId ? insertedId.toString() : null,
            id: insertedId ? insertedId.toString() : null,
            courseId: id.toString(),
            courseTitle: courseDoc?.title || enrollment.courseTitle || "Course",
            enrollmentId: enrollment._id.toString(),
            learnerName,
            learnerEmail: req.user.email.toLowerCase(),
            restrictionType,
            restrictionReason,
            banned: Boolean(enrollment.banned),
            suspended: Boolean(enrollment.suspended),
            contactPhone: contactPhone ? String(contactPhone).trim() : (finalAppealDoc?.contactPhone || ""),
          };

          io.to(`user:${instructorEmail.toLowerCase()}`).emit("user-notification:new", notifDoc);
          io.to(`user:${instructorEmail}`).emit("user-notification:new", notifDoc);
          io.to(`user:${instructorEmail.toLowerCase()}`).emit("message:popup", {
            type: "course_appeal",
            title: `Student Appeal: ${learnerName}`,
            message: message.trim().slice(0, 120),
            senderName: learnerName,
            senderEmail: req.user.email.toLowerCase(),
            courseTitle: courseDoc?.title || enrollment.courseTitle || "Course",
            courseId: id.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: insertedId ? insertedId.toString() : null,
            actionUrl: "/studio/appeals",
            createdAt: now,
          });
          io.to(`user:${instructorEmail}`).emit("message:popup", {
            type: "course_appeal",
            title: `Student Appeal: ${learnerName}`,
            message: message.trim().slice(0, 120),
            senderName: learnerName,
            senderEmail: req.user.email.toLowerCase(),
            courseTitle: courseDoc?.title || enrollment.courseTitle || "Course",
            courseId: id.toString(),
            enrollmentId: enrollment._id.toString(),
            appealId: insertedId ? insertedId.toString() : null,
            actionUrl: "/studio/appeals",
            createdAt: now,
          });
          io.to(`user:${instructorEmail.toLowerCase()}`).emit("appeal:new", appealPayload);
          io.to(`user:${instructorEmail}`).emit("appeal:new", appealPayload);
          io.to(`user:${instructorEmail.toLowerCase()}`).emit("appeal:updated", appealPayload);
          io.to(`user:${instructorEmail}`).emit("appeal:updated", appealPayload);
        }
      }

      return res.json({
        message: "Your appeal and explanation have been submitted to the instructor successfully.",
        appeal: { ...(finalAppealDoc || appealDoc), _id: insertedId ? insertedId.toString() : null },
      });
    } catch (err) {
      console.error("[POST /courses/:id/appeal-instructor] Error:", err.message);
      return res.status(500).json({ message: "Failed to submit appeal." });
    }
  });

  // POST /courses/:id/report-admin — learner reports restriction dispute to Platform Admin
  app.post("/courses/:id/report-admin", verifyJWT, async (req, res) => {
    const { id } = req.params;
    const { category = "unfair_ban", reason, details } = req.body || {};
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });

    if (!details || !details.trim()) {
      return res.status(400).json({ message: "Please provide complete problem details for Platform Administration." });
    }

    try {
      const emailRegex = new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const enrollment = await courseEnrollmentsCollection.findOne({
        courseId: new ObjectId(id),
        learnerEmail: emailRegex,
      });

      const courseDoc = await coursesCollection.findOne({ _id: new ObjectId(id) });
      const userDoc = await usersCollection.findOne({ email: emailRegex });
      const learnerName = userDoc?.fullName || userDoc?.name || req.user.email.split("@")[0];
      const now = new Date().toISOString();

      const disputeDoc = {
        courseId: new ObjectId(id),
        courseTitle: courseDoc?.title || enrollment?.courseTitle || "Course",
        enrollmentId: enrollment?._id || null,
        learnerEmail: req.user.email.toLowerCase(),
        learnerName,
        instructorEmail: (enrollment?.instructorEmail || courseDoc?.instructorEmail || "").toLowerCase(),
        instructorName: courseDoc?.instructorName || enrollment?.instructorName || "Course Instructor",
        category,
        reason: reason ? reason.trim() : category,
        details: details.trim(),
        status: "pending",
        createdAt: now,
      };

      if (adminDisputesCollection) {
        await adminDisputesCollection.insertOne(disputeDoc);
      }

      if (adminAuditLogsCollection) {
        await adminAuditLogsCollection.insertOne({
          adminEmail: "system",
          action: "student_dispute_filed",
          target: req.user.email,
          details: {
            courseId: id,
            courseTitle: disputeDoc.courseTitle,
            instructorEmail: disputeDoc.instructorEmail,
            category,
            snippet: details.trim().slice(0, 150),
          },
          timestamp: now,
        });
      }

      // Notify platform admins
      if (userNotificationsCollection && usersCollection) {
        const admins = await usersCollection.find({ role: "admin" }).toArray();
        for (const admin of admins) {
          const notif = {
            recipientEmail: admin.email,
            type: "admin_dispute",
            title: `Student Dispute: ${disputeDoc.courseTitle}`,
            message: `${learnerName} filed a dispute against ${disputeDoc.instructorEmail}: "${details.trim().slice(0, 100)}"`,
            courseId: id,
            isRead: false,
            createdAt: now,
          };
          await userNotificationsCollection.insertOne(notif);
          if (io) {
            io.to(`user:${admin.email}`).emit("user-notification:new", notif);
          }
        }
      }

      return res.json({
        message: "Your dispute has been reported to Platform Administration. Our team will review the case.",
      });
    } catch (err) {
      console.error("[POST /courses/:id/report-admin] Error:", err.message);
      return res.status(500).json({ message: "Failed to submit dispute." });
    }
  });

  // GET /courses/:id/appeals — fetch appeal history for learner in this course
  app.get("/courses/:id/appeals", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      if (!courseAppealsCollection) return res.json([]);
      const emailRegex = new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const list = await courseAppealsCollection
        .find({
          courseId: new ObjectId(id),
          learnerEmail: emailRegex,
        })
        .sort({ createdAt: -1 })
        .toArray();
      return res.json(list.map((a) => ({ ...a, _id: a._id.toString() })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch appeals." });
    }
  });

  // GET /courses/:id/certificate — fetch or auto-issue learner's certificate once 80% is completed
  app.get("/courses/:id/certificate", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });

      const cleanEmail = req.user.email.toLowerCase();
      const emailRegex = new RegExp(
        `^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );

      const isInstructor = course.instructorEmail?.toLowerCase() === cleanEmail;
      const [enrollment, requesterUserDoc, allLessons, allProgress] = await Promise.all([
        courseEnrollmentsCollection.findOne({
          courseId: new ObjectId(id),
          learnerEmail: emailRegex,
        }),
        usersCollection.findOne({ email: emailRegex }, { projection: { role: 1 } }),
        lessonsCollection ? lessonsCollection.find({ courseId: new ObjectId(id) }).toArray() : [],
        lessonProgressCollection
          ? lessonProgressCollection
              .find({ courseId: new ObjectId(id), learnerEmail: cleanEmail })
              .toArray()
          : [],
      ]);

      const isAdmin =
        requesterUserDoc?.role === "Admin" || requesterUserDoc?.role === "admin";
      const hasActiveEnrollment = Boolean(
        enrollment && !enrollment.banned && !enrollment.suspended && !enrollment.refunded
      );
      const hasFullAccess = isInstructor || isAdmin || hasActiveEnrollment;

      const totalVideos = allLessons.reduce(
        (sum, l) => sum + normalizeLessonVideosForRead(l).length,
        0
      );
      const watchedCount = allProgress.filter((p) => p.status === "watched").length;
      const skippedCount = allProgress.filter((p) => p.status === "skipped").length;
      const completedVideos = watchedCount + skippedCount;
      const percent =
        totalVideos > 0 ? Math.min(100, Math.round((completedVideos / totalVideos) * 100)) : 0;

      const { cert, newlyIssued } = await ensureCourseCertificate({
        courseId: id,
        course,
        learnerEmail: cleanEmail,
        totalVideos,
        completedVideos,
        percent,
        allowIssue: hasFullAccess,
      });

      return res.json(
        buildCertificateStatusPayload({
          totalVideos,
          completedVideos,
          percent,
          certDoc: cert,
          newlyIssued,
          eligible: hasFullAccess,
        })
      );
    } catch (err) {
      console.error("[GET /courses/:id/certificate]", err.message);
      return res.status(500).json({ message: "Failed to load certificate status." });
    }
  });

  // PATCH /courses/:id — edit an existing course
  app.patch("/courses/:id", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });
      if (course.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const { title, description, price, thumbnailUrl, curriculum } = req.body;

      const errors = {};
      if (!title || title.trim().length < 1 || title.trim().length > 120) errors.title = "Title must be 1–120 characters.";
      if (!description || description.trim().length < 10 || description.trim().length > 2000) errors.description = "Description must be 10–2000 characters.";
      const priceCheck = validateBdtPrice(price);
      if (!priceCheck.valid) errors.price = priceCheck.error;
      if (!thumbnailUrl || thumbnailUrl.trim().length < 1 || thumbnailUrl.trim().length > 500) errors.thumbnailUrl = "Thumbnail URL must be 1–500 characters.";
      if (!Array.isArray(curriculum) || curriculum.length < 1 || curriculum.length > 50) {
        errors.curriculum = "Curriculum must have 1–50 items.";
      } else {
        for (const item of curriculum) {
          if (!item.title || item.title.trim().length < 1 || item.title.trim().length > 100) {
            errors.curriculum = "Each curriculum item title must be 1–100 characters.";
            break;
          }
        }
      }
      if (Object.keys(errors).length > 0) return res.status(400).json({ message: "Validation failed.", errors });

      const now = new Date().toISOString();

      let statusUpdate = {};
      if (course.status === "approved") {
        statusUpdate = { status: "pending_review", submittedAt: now };
      } else if (course.status === "pending_review") {
        statusUpdate = { status: "draft", submittedAt: null };
      }

      const updateFields = {
        title: title.trim(),
        description: description.trim(),
        currency: CURRENCY_CODE,
        price: priceCheck.price,
        pricePoisha: priceCheck.pricePoisha,
        thumbnailUrl: thumbnailUrl.trim(),
        curriculum: curriculum.map((c) => ({ title: c.title.trim() })),
        updatedAt: now,
        ...statusUpdate,
      };

      await coursesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
      invalidatePublicCoursesCache();

      const updated = await coursesCollection.findOne({ _id: new ObjectId(id) });
      return res.json({ ...updated, _id: updated._id.toString() });
    } catch (err) {
      return res.status(500).json({ message: "Failed to save changes. Please try again." });
    }
  });

  // POST /lessons/upload-pdf — upload up to 10 lesson PDF resources into persistent storage
  app.post(
    "/lessons/upload-pdf",
    verifyJWT,
    (req, res, next) => {
      uploadLessonPdfs.array("pdfs", 10)(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            message:
              err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
                ? "PDF file exceeds the 15MB per-file limit."
                : err.message || "PDF upload failed.",
          });
        }
        next();
      });
    },
    async (req, res) => {
      const uploaded = Array.isArray(req.files) ? req.files : [];
      if (uploaded.length === 0) {
        return res.status(400).json({ message: "Please select at least one PDF file to upload." });
      }

      const hasCloudinary = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );

      const files = await Promise.all(
        uploaded.map(async (file, idx) => {
          const cleanTitle = path
            .basename(file.originalname || file.filename, path.extname(file.originalname || ".pdf"))
            .replace(/[-_]+/g, " ")
            .trim();

          let fileUrl = `/courses/pdfs/${file.filename}`;
          let storageType = "local";
          let publicId = null;

          // If Cloudinary is available, upload directly to cloud raw storage for ephemeral-safe persistence
          if (hasCloudinary) {
            try {
              const uploadRes = await cloudinary.uploader.upload(file.path, {
                resource_type: "raw",
                folder: "cse_lesson_pdfs",
                public_id: `${Date.now()}_${path.basename(file.filename, ".pdf")}`,
                use_filename: true,
              });
              if (uploadRes?.secure_url) {
                fileUrl = uploadRes.secure_url;
                storageType = "cloudinary";
                publicId = uploadRes.public_id;
                // Clean up local temp disk file after successful cloud upload
                try {
                  fs.unlinkSync(file.path);
                } catch (_) {}
              }
            } catch (cloudErr) {
              console.warn("[Cloudinary PDF Upload Fallback to Local Storage]:", cloudErr.message);
            }
          }

          return {
            id: `pdf_${Date.now()}_${idx}`,
            title: cleanTitle || `Worksheet #${idx + 1}`,
            fileName: file.filename,
            fileUrl,
            publicId,
            sizeBytes: file.size || 0,
            storageType,
          };
        })
      );

      return res.status(201).json({ files });
    }
  );

  // GET /courses/pdfs/:filename — stream stored lesson PDF inline for authorized learners/instructors
  app.get("/courses/pdfs/:filename", async (req, res) => {
    try {
      const safeName = path.basename(req.params.filename || "");
      if (!safeName || !/^[a-zA-Z0-9._-]+\.pdf$/i.test(safeName)) {
        return res.status(400).json({ message: "Invalid PDF filename." });
      }
      const fullPath = path.join(PDF_STORAGE_DIR, safeName);
      if (!fs.existsSync(fullPath)) {
        // Check if file is stored in Cloudinary
        const matchingLesson = await lessonsCollection.findOne({
          "pdfResources.fileName": safeName,
        });
        const matchedPdf = matchingLesson?.pdfResources?.find((p) => p.fileName === safeName);
        if (matchedPdf?.fileUrl && matchedPdf.fileUrl.startsWith("http")) {
          return res.redirect(matchedPdf.fileUrl);
        }
        return res.status(404).json({ message: "PDF file not found." });
      }

      const requester = getOptionalUser(req);
      if (!requester?.email) {
        const previewLesson = await lessonsCollection.findOne({
          isFreePreview: true,
          "pdfResources.fileUrl": { $regex: safeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") },
        });
        if (!previewLesson) {
          return res.status(401).json({ message: "Authentication required to view course PDF." });
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Robots-Tag", "noindex, noarchive");
      res.setHeader("Cache-Control", "private, max-age=3600");
      return res.sendFile(fullPath);
    } catch (err) {
      return res.status(500).json({ message: "Failed to load PDF resource." });
    }
  });

  // GET /courses/:id/lessons — list lessons for a course (instructor only)
  app.get("/courses/:id/lessons", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });
      if (course.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }
      const lessons = await lessonsCollection
        .find({ courseId: new ObjectId(id) })
        .sort({ order: 1 })
        .toArray();
      return res.json(
        lessons.map((l) => {
          const videos = normalizeLessonVideosForRead(l);
          return {
            ...l,
            _id: l._id.toString(),
            courseId: l.courseId.toString(),
            videos,
            videoLinks: videos.map((v) => v.url).filter(Boolean),
            pdfResources: sanitizePdfResources(l.pdfResources),
          };
        })
      );
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch lessons." });
    }
  });

  // Helper: notify enrolled students when a new video lesson is published/attached
  const notifyEnrolledStudentsVideo = async ({
    course,
    courseId,
    lessonTitle,
    lessonId,
    instructorEmail,
    videoTitle = null,
    now,
  }) => {
    if (!userNotificationsCollection) return;
    try {
      const courseObjId = ObjectId.isValid(courseId) ? new ObjectId(courseId) : null;
      const query = {
        $or: [
          ...(courseObjId ? [{ courseId: courseObjId }] : []),
          { courseId: String(courseId) },
        ],
        banned: { $ne: true },
        suspended: { $ne: true },
        refunded: { $ne: true },
      };

      const enrollments = await courseEnrollmentsCollection
        .find(query, { projection: { learnerEmail: 1 } })
        .toArray();

      const courseName = course?.title || "your enrolled course";
      const instName = course?.instructorName || instructorEmail || "Your instructor";
      const actionDisplay = videoTitle ? `"${videoTitle}"` : `"${lessonTitle}"`;

      for (const enrollment of enrollments) {
        if (!enrollment.learnerEmail) continue;
        const cleanLearnerEmail = String(enrollment.learnerEmail).trim().toLowerCase();
        if (cleanLearnerEmail === String(instructorEmail).trim().toLowerCase()) continue;

        const notifDoc = {
          recipientEmail: cleanLearnerEmail,
          type: "course_video_upload",
          title: `New Video Lesson: ${lessonTitle}`,
          message: `${instName} uploaded a video lesson ${actionDisplay} in ${courseName}.`,
          courseId: String(courseId),
          courseName,
          lessonTitle,
          instructorName: instName,
          lessonId: lessonId ? String(lessonId) : null,
          isRead: false,
          createdAt: now || new Date().toISOString(),
        };

        const notifResult = await userNotificationsCollection.insertOne(notifDoc);
        const fullNotif = {
          ...notifDoc,
          _id: notifResult.insertedId.toString(),
        };

        if (io) {
          io.to(`user:${cleanLearnerEmail}`).emit("user-notification:new", fullNotif);
          if (String(enrollment.learnerEmail).trim() !== cleanLearnerEmail) {
            io.to(`user:${String(enrollment.learnerEmail).trim()}`).emit("user-notification:new", fullNotif);
          }
        }
      }
    } catch (notifErr) {
      console.error("[Lesson Notification Error]:", notifErr.message);
    }
  };

  // In-memory cache for auto-detected YouTube video metadata: videoId -> { data, expiresAt }
  const ytMetaCache = new Map();

  // GET /courses/youtube-meta — auto-detect video title, duration (minutes & seconds), author, and thumbnail
  app.get("/courses/youtube-meta", async (req, res) => {
    const rawUrl = String(req.query.url || req.query.id || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ message: "Video URL or ID is required." });
    }

    const videoId =
      extractYouTubeVideoId(rawUrl) ||
      (/^[A-Za-z0-9_-]{11}$/.test(rawUrl) ? rawUrl : null);
    if (!videoId) {
      return res.status(400).json({ message: "Invalid YouTube URL or video ID." });
    }

    const now = Date.now();
    const cached = ytMetaCache.get(videoId);
    if (cached && cached.expiresAt > now) {
      return res.json(cached.data);
    }

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let title = "";
    let authorName = "";
    let durationSeconds = 0;
    let durationMinutes = 15;

    try {
      const ytResponse = await fetch(watchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(4500),
      });

      if (ytResponse.ok) {
        const html = await ytResponse.text();

        // 1. Duration in seconds from player JSON or schema metadata
        const secMatch = html.match(/"lengthSeconds":"(\d+)"/);
        if (secMatch && secMatch[1]) {
          durationSeconds = parseInt(secMatch[1], 10);
          durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
        } else {
          const isoMatch = html.match(
            /itemprop="duration"\s+content="PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i
          );
          if (isoMatch) {
            const h = parseInt(isoMatch[1] || "0", 10);
            const m = parseInt(isoMatch[2] || "0", 10);
            const s = parseInt(isoMatch[3] || "0", 10);
            durationSeconds = h * 3600 + m * 60 + s;
            durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          }
        }

        // 2. Title from itemprop or og:title
        const titleMatch =
          html.match(/itemprop="name"\s+content="([^"]+)"/i) ||
          html.match(/<meta property="og:title"\s+content="([^"]+)"/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .trim();
        }

        // 3. Author from author tag or json
        const authorMatch =
          html.match(/"author":"([^"]+)"/) ||
          html.match(/<link itemprop="name"\s+content="([^"]+)"/i);
        if (authorMatch && authorMatch[1]) {
          authorName = authorMatch[1].trim();
        }
      }
    } catch {
      // Gracefully fall back to oEmbed
    }

    // Fallback to oEmbed for title/author if watch page HTML didn't yield them
    if (!title) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          title = oembedData.title || title;
          authorName = oembedData.author_name || authorName;
        }
      } catch {
        /* ignore */
      }
    }

    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const durationFormatted =
      durationSeconds > 0 ? `${mins}:${secs < 10 ? "0" : ""}${secs}` : `${durationMinutes}m`;

    const payload = {
      success: true,
      videoId,
      watchUrl,
      title: title || `Video Part (${videoId})`,
      duration: durationMinutes,
      durationMinutes,
      durationSeconds,
      durationFormatted,
      authorName: authorName || "YouTube Creator",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };

    if (ytMetaCache.size > 300) {
      const oldestKey = ytMetaCache.keys().next().value;
      ytMetaCache.delete(oldestKey);
    }
    ytMetaCache.set(videoId, { data: payload, expiresAt: now + 15 * 60 * 1000 });

    return res.json(payload);
  });

  // GET /courses/public/:id/lessons — public/student syllabus with anti-share protection & progress
  app.get("/courses/public/:id/lessons", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });

      const requester = getOptionalUser(req);
      let canWatchAll = false;
      let isPrivileged = false;

      if (requester?.email) {
        const cleanEmail = requester.email.toLowerCase();
        const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const isInstructor =
          course.instructorEmail?.toLowerCase() === cleanEmail;
        let isAdmin = requester.role === "Admin" || requester.role === "admin";
        if (!isInstructor && !isAdmin) {
          const uDoc = await usersCollection.findOne(
            { email: new RegExp(`^${escapedEmail}$`, "i") },
            { projection: { role: 1 } }
          );
          if (uDoc?.role === "Admin" || uDoc?.role === "admin") {
            isAdmin = true;
          }
        }
        isPrivileged = isInstructor || isAdmin;
        if (isPrivileged) {
          canWatchAll = true;
        } else {
          const enrollment = await courseEnrollmentsCollection.findOne({
            courseId: new ObjectId(id),
            learnerEmail: { $regex: new RegExp(`^${escapedEmail}$`, "i") },
          });
          if (enrollment && !enrollment.banned && !enrollment.suspended && !enrollment.refunded) {
            canWatchAll = true;
          }
        }
      }

      if (!canWatchAll && !["approved", "pending_review"].includes(course.status)) {
        return res.status(404).json({ message: "Course not found." });
      }

      const lessons = lessonsCollection
        ? await lessonsCollection.find({ courseId: new ObjectId(id) }).sort({ order: 1 }).toArray()
        : [];

      const progressMap = new Map();
      if (lessonProgressCollection && requester?.email) {
        const progressDocs = await lessonProgressCollection
          .find({
            courseId: new ObjectId(id),
            learnerEmail: requester.email.toLowerCase(),
          })
          .toArray();
        progressDocs.forEach((doc) => {
          progressMap.set(`${doc.lessonId.toString()}:${doc.videoKey}`, doc.status || "watched");
        });
      }

      let courseTotalVideos = 0;
      let courseWatchedCount = 0;
      let courseSkippedCount = 0;

      const safeLessons = lessons.map((l) => {
        const lid = l._id.toString();
        const normalizedVideos = normalizeLessonVideosForRead(l);
        const unlocked = canWatchAll || !!l.isFreePreview;

        let watchedCount = 0;
        let skippedCount = 0;
        const lessonVideosWithProgress = normalizedVideos.map((v) => {
          const progressStatus = progressMap.get(`${lid}:${v.id}`) || null;
          if (progressStatus === "watched") watchedCount += 1;
          else if (progressStatus === "skipped") skippedCount += 1;

          if (!unlocked) {
            return {
              id: v.id,
              title: v.title,
              duration: v.duration,
              progressStatus,
              locked: true,
            };
          }

          // Anti-share guard: never expose raw youtube.com/watch?v=... URLs to learners
          const safeVideo = {
            id: v.id,
            title: v.title,
            embedId: v.videoId,
            duration: v.duration,
            visibility: v.visibility,
            thumbnailUrl: v.thumbnailUrl,
            authorName: v.authorName,
            progressStatus,
          };
          if (isPrivileged) {
            safeVideo.url = v.url;
          }
          return safeVideo;
        });

        courseTotalVideos += normalizedVideos.length;
        courseWatchedCount += watchedCount;
        courseSkippedCount += skippedCount;
        const completedCount = watchedCount + skippedCount;

        return {
          _id: lid,
          courseId: l.courseId.toString(),
          title: l.title,
          description: l.description || "",
          sectionTitle: l.sectionTitle || "Main Section",
          order: l.order || 1,
          videoDuration: normalizedVideos.length > 0
            ? normalizedVideos.reduce((acc, v) => acc + (Number(v.duration) || 0), 0)
            : Number(l.videoDuration) || 0,
          videoVisibility: l.videoVisibility || "unlisted",
          videoMeta: unlocked ? (l.videoMeta || null) : null,
          isFreePreview: !!l.isFreePreview,
          hasVideo: normalizedVideos.length > 0,
          videoCount: normalizedVideos.length,
          completedVideosCount: completedCount,
          watchedVideosCount: watchedCount,
          skippedVideosCount: skippedCount,
          completed: normalizedVideos.length > 0 && completedCount >= normalizedVideos.length,
          locked: !unlocked,
          videos: lessonVideosWithProgress,
          // Keep videoLinks ONLY for privileged instructors/admins so learners cannot inspect raw share URLs
          videoLinks: unlocked && isPrivileged ? normalizedVideos.map((v) => v.url).filter(Boolean) : [],
          richTextContent: unlocked ? (l.richTextContent || "") : "",
          pdfResources: unlocked ? sanitizePdfResources(l.pdfResources) : [],
        };
      });

      const courseCompletedVideos = courseWatchedCount + courseSkippedCount;
      const coursePercent =
        courseTotalVideos > 0
          ? Math.min(100, Math.round((courseCompletedVideos / courseTotalVideos) * 100))
          : 0;

      let certPayload = buildCertificateStatusPayload({
        totalVideos: courseTotalVideos,
        completedVideos: courseCompletedVideos,
        percent: coursePercent,
        certDoc: null,
        newlyIssued: false,
        eligible: false,
      });

      if (canWatchAll && requester?.email) {
        const { cert, newlyIssued } = await ensureCourseCertificate({
          courseId: id,
          course,
          learnerEmail: requester.email,
          totalVideos: courseTotalVideos,
          completedVideos: courseCompletedVideos,
          percent: coursePercent,
          allowIssue: true,
        });
        certPayload = buildCertificateStatusPayload({
          totalVideos: courseTotalVideos,
          completedVideos: courseCompletedVideos,
          percent: coursePercent,
          certDoc: cert,
          newlyIssued,
          eligible: true,
        });
      }

      return res.json({
        canWatchAll,
        lessons: safeLessons,
        courseProgress: {
          totalVideos: courseTotalVideos,
          watchedCount: courseWatchedCount,
          skippedCount: courseSkippedCount,
          completedVideos: courseCompletedVideos,
          percent: coursePercent,
        },
        certificate: certPayload,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch course lessons." });
    }
  });

  // POST /courses/:courseId/lessons/:lessonId/videos/:videoKey/progress — mark video watched or skipped
  app.post(
    "/courses/:courseId/lessons/:lessonId/videos/:videoKey/progress",
    verifyJWT,
    async (req, res) => {
      const { courseId, lessonId, videoKey } = req.params;
      if (!ObjectId.isValid(courseId) || !ObjectId.isValid(lessonId) || !videoKey) {
        return res.status(400).json({ message: "Invalid progress parameters." });
      }
      if (!lessonProgressCollection) {
        return res.status(503).json({ message: "Progress tracking unavailable." });
      }

      try {
        const [course, lesson] = await Promise.all([
          coursesCollection.findOne({ _id: new ObjectId(courseId) }),
          lessonsCollection.findOne({ _id: new ObjectId(lessonId), courseId: new ObjectId(courseId) }),
        ]);

        if (!course || !lesson) {
          return res.status(404).json({ message: "Course or lesson not found." });
        }

        const requesterEmail = req.user.email.toLowerCase();
        const isInstructor = course.instructorEmail?.toLowerCase() === requesterEmail;
        let isPrivileged = isInstructor || req.user.role === "Admin" || req.user.role === "admin";
        if (!isPrivileged) {
          const userDoc = await usersCollection.findOne(
            { email: new RegExp(`^${requesterEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            { projection: { role: 1 } }
          );
          if (userDoc?.role === "Admin" || userDoc?.role === "admin") {
            isPrivileged = true;
          }
        }

        let hasFullAccess = isPrivileged;
        if (!hasFullAccess) {
          const enrollment = await courseEnrollmentsCollection.findOne({
            courseId: new ObjectId(courseId),
            learnerEmail: { $regex: new RegExp(`^${requesterEmail}$`, "i") },
          });
          if (enrollment && !enrollment.banned && !enrollment.suspended && !enrollment.refunded) {
            hasFullAccess = true;
          }
        }

        const hasAccess = hasFullAccess || !!lesson.isFreePreview;
        if (!hasAccess) {
          return res.status(403).json({ message: "Enroll in this course to track lesson progress." });
        }

        const { status = "watched", watchedSeconds = 0, durationSeconds = 0 } = req.body || {};
        const cleanKey = decodeURIComponent(String(videoKey)).trim();

        if (status === "unwatched") {
          await lessonProgressCollection.deleteOne({
            learnerEmail: requesterEmail,
            lessonId: new ObjectId(lessonId),
            videoKey: cleanKey,
          });
        } else {
          const normalizedStatus = status === "skipped" ? "skipped" : "watched";
          await lessonProgressCollection.updateOne(
            {
              learnerEmail: requesterEmail,
              lessonId: new ObjectId(lessonId),
              videoKey: cleanKey,
            },
            {
              $set: {
                courseId: new ObjectId(courseId),
                lessonId: new ObjectId(lessonId),
                learnerEmail: requesterEmail,
                videoKey: cleanKey,
                status: normalizedStatus,
                watchedSeconds: Math.max(0, Number(watchedSeconds) || 0),
                durationSeconds: Math.max(0, Number(durationSeconds) || 0),
                updatedAt: new Date().toISOString(),
              },
            },
            { upsert: true }
          );
        }

        // Compute updated course totals
        const [allLessons, allProgress] = await Promise.all([
          lessonsCollection.find({ courseId: new ObjectId(courseId) }).toArray(),
          lessonProgressCollection
            .find({ courseId: new ObjectId(courseId), learnerEmail: requesterEmail })
            .toArray(),
        ]);

        const totalVideos = allLessons.reduce(
          (sum, l) => sum + normalizeLessonVideosForRead(l).length,
          0
        );
        const watchedCount = allProgress.filter((p) => p.status === "watched").length;
        const skippedCount = allProgress.filter((p) => p.status === "skipped").length;
        const completedVideos = watchedCount + skippedCount;
        const percent =
          totalVideos > 0 ? Math.min(100, Math.round((completedVideos / totalVideos) * 100)) : 0;

        const { cert, newlyIssued } = await ensureCourseCertificate({
          courseId,
          course,
          learnerEmail: requesterEmail,
          totalVideos,
          completedVideos,
          percent,
          allowIssue: hasFullAccess,
        });

        return res.json({
          success: true,
          lessonId,
          videoKey: cleanKey,
          status: status === "unwatched" ? null : status === "skipped" ? "skipped" : "watched",
          courseProgress: {
            totalVideos,
            watchedCount,
            skippedCount,
            completedVideos,
            percent,
          },
          certificate: buildCertificateStatusPayload({
            totalVideos,
            completedVideos,
            percent,
            certDoc: cert,
            newlyIssued,
            eligible: hasFullAccess,
          }),
        });
      } catch (err) {
        return res.status(500).json({ message: "Failed to save video progress." });
      }
    }
  );

  // POST /courses/:id/lessons — create a new lesson
  app.post("/courses/:id/lessons", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
      if (!course) return res.status(404).json({ message: "Course not found." });
      if (course.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const {
        title,
        description,
        richTextContent,
        videos,
        videoLinks,
        videoUrl,
        videoVisibility,
        videoMeta,
        videoDuration,
        pdfResources,
        assignments,
        quizzes,
        isFreePreview,
        isLocked,
        sectionTitle,
      } = req.body;

      const errors = {};
      if (!title || title.trim().length < 1 || title.trim().length > 150) {
        errors.title = "Title must be 1–150 characters.";
      }

      const formattedVideos =
        sanitizeLessonVideos({
          videos,
          videoLinks,
          videoUrl,
          videoVisibility,
          videoMeta,
          fallbackDuration: videoDuration,
        }) || [];
      const formattedVideoLinks = formattedVideos.map((v) => v.url).filter(Boolean);
      const formattedPdfs = sanitizePdfResources(pdfResources);
      const computedDuration =
        formattedVideos.length > 0
          ? formattedVideos.reduce((sum, v) => sum + (Number(v.duration) || 0), 0)
          : Number(videoDuration) || 0;

      if (Object.keys(errors).length > 0) return res.status(400).json({ message: "Validation failed.", errors });

      const lastLesson = await lessonsCollection
        .findOne({ courseId: new ObjectId(id) }, { sort: { order: -1 }, projection: { order: 1 } });
      const order = lastLesson ? lastLesson.order + 1 : 1;

      const now = new Date().toISOString();
      const lessonDoc = {
        courseId: new ObjectId(id),
        instructorEmail: req.user.email,
        title: title.trim(),
        description: description ? description.trim() : "",
        richTextContent: richTextContent ? richTextContent.trim() : "",
        videos: formattedVideos,
        videoLinks: formattedVideoLinks,
        videoVisibility: videoVisibility || "unlisted",
        videoMeta: videoMeta || (formattedVideos[0] ? {
          videoId: formattedVideos[0].videoId,
          title: formattedVideos[0].title,
          authorName: formattedVideos[0].authorName || "",
          thumbnailUrl: formattedVideos[0].thumbnailUrl,
          provider: "youtube",
        } : null),
        videoDuration: computedDuration,
        pdfResources: formattedPdfs,
        assignments: Array.isArray(assignments) ? assignments : [],
        quizzes: Array.isArray(quizzes) ? quizzes : [],
        isFreePreview: !!isFreePreview,
        isLocked: isLocked !== undefined ? !!isLocked : !isFreePreview,
        sectionTitle: sectionTitle ? sectionTitle.trim() : "Main Section",
        order,
        createdAt: now,
        updatedAt: now,
      };

      const result = await lessonsCollection.insertOne(lessonDoc);
      const insertedId = result.insertedId.toString();

      if (formattedVideos.length > 0) {
        notifyEnrolledStudentsVideo({
          course,
          courseId: id,
          lessonTitle: title.trim(),
          lessonId: insertedId,
          instructorEmail: req.user.email,
          videoTitle: formattedVideos[0]?.title || null,
          now,
        });
      }

      return res.status(201).json({ ...lessonDoc, _id: insertedId, courseId: id });
    } catch (err) {
      return res.status(500).json({ message: "Failed to save lesson. Please try again." });
    }
  });

  // PATCH /lessons/:lessonId — update an existing lesson or attach/update YouTube Unlisted videos
  app.patch("/lessons/:lessonId", verifyJWT, async (req, res) => {
    const { lessonId } = req.params;
    if (!ObjectId.isValid(lessonId)) return res.status(400).json({ message: "Invalid lesson id." });
    try {
      const lesson = await lessonsCollection.findOne({ _id: new ObjectId(lessonId) });
      if (!lesson) return res.status(404).json({ message: "Lesson not found." });
      if (lesson.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      const {
        title,
        description,
        richTextContent,
        videos,
        videoLinks,
        videoUrl,
        videoVisibility,
        videoMeta,
        videoDuration,
        pdfResources,
        assignments,
        quizzes,
        isFreePreview,
        isLocked,
        sectionTitle,
        notifyStudents,
      } = req.body;

      const errors = {};
      if (title !== undefined && (!title || title.trim().length < 1 || title.trim().length > 150)) {
        errors.title = "Title must be 1–150 characters.";
      }

      const existingVideos = normalizeLessonVideosForRead(lesson);
      const parsedVideos = sanitizeLessonVideos({
        videos,
        videoLinks,
        videoUrl,
        videoVisibility: videoVisibility !== undefined ? videoVisibility : (lesson.videoVisibility || "unlisted"),
        videoMeta: videoMeta !== undefined ? videoMeta : lesson.videoMeta,
        fallbackDuration: videoDuration !== undefined ? videoDuration : lesson.videoDuration,
      });
      const formattedVideos = parsedVideos !== null ? parsedVideos : existingVideos;
      const formattedVideoLinks = formattedVideos.map((v) => v.url).filter(Boolean);

      if (Object.keys(errors).length > 0) return res.status(400).json({ message: "Validation failed.", errors });

      const hadNoVideosBefore = existingVideos.length === 0;
      const computedDuration =
        formattedVideos.length > 0
          ? formattedVideos.reduce((sum, v) => sum + (Number(v.duration) || 0), 0)
          : videoDuration !== undefined
          ? Number(videoDuration) || 0
          : lesson.videoDuration || 0;

      const now = new Date().toISOString();
      const nextTitle = title !== undefined ? title.trim() : lesson.title;
      const updateData = {
        title: nextTitle,
        description: description !== undefined ? String(description).trim() : lesson.description || "",
        richTextContent: richTextContent !== undefined ? String(richTextContent).trim() : lesson.richTextContent || "",
        videos: formattedVideos,
        videoLinks: formattedVideoLinks,
        videoVisibility: videoVisibility !== undefined ? videoVisibility : (lesson.videoVisibility || "unlisted"),
        videoMeta: videoMeta !== undefined ? videoMeta : (formattedVideos[0] ? {
          videoId: formattedVideos[0].videoId,
          title: formattedVideos[0].title,
          authorName: formattedVideos[0].authorName || "",
          thumbnailUrl: formattedVideos[0].thumbnailUrl,
          provider: "youtube",
        } : lesson.videoMeta || null),
        videoDuration: computedDuration,
        pdfResources: Array.isArray(pdfResources)
          ? sanitizePdfResources(pdfResources)
          : sanitizePdfResources(lesson.pdfResources),
        assignments: Array.isArray(assignments) ? assignments : lesson.assignments || [],
        quizzes: Array.isArray(quizzes) ? quizzes : lesson.quizzes || [],
        isFreePreview: isFreePreview !== undefined ? !!isFreePreview : lesson.isFreePreview || false,
        isLocked: isLocked !== undefined ? !!isLocked : lesson.isLocked || false,
        sectionTitle: sectionTitle ? sectionTitle.trim() : lesson.sectionTitle || "Main Section",
        updatedAt: now,
      };

      await lessonsCollection.updateOne(
        { _id: new ObjectId(lessonId) },
        { $set: updateData }
      );

      const hasVideosNow = formattedVideos.length > 0;
      const shouldNotify = hasVideosNow && notifyStudents !== false;

      if (shouldNotify) {
        const course = await coursesCollection.findOne({ _id: lesson.courseId });
        notifyEnrolledStudentsVideo({
          course,
          courseId: lesson.courseId.toString(),
          lessonTitle: nextTitle,
          lessonId,
          instructorEmail: req.user.email,
          videoTitle: formattedVideos[0]?.title || null,
          now,
        });
      }

      const updated = await lessonsCollection.findOne({ _id: new ObjectId(lessonId) });
      return res.json({ ...updated, _id: updated._id.toString(), courseId: updated.courseId.toString() });
    } catch (err) {
      return res.status(500).json({ message: "Failed to save lesson. Please try again." });
    }
  });

  // DELETE /lessons/:lessonId — delete a lesson
  app.delete("/lessons/:lessonId", verifyJWT, async (req, res) => {
    const { lessonId } = req.params;
    if (!ObjectId.isValid(lessonId)) return res.status(400).json({ message: "Invalid lesson id." });
    try {
      const lesson = await lessonsCollection.findOne({ _id: new ObjectId(lessonId) });
      if (!lesson) return res.status(404).json({ message: "Lesson not found." });
      if (lesson.instructorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied." });
      }

      await lessonsCollection.deleteOne({ _id: new ObjectId(lessonId) });
      if (lessonProgressCollection) {
        await lessonProgressCollection.deleteMany({ lessonId: new ObjectId(lessonId) });
      }
      return res.json({ message: "Lesson deleted successfully.", lessonId });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete lesson." });
    }
  });
};

module.exports = { registerCoursesRoutes };
