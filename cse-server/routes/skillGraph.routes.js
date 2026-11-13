const jwt = require("jsonwebtoken");
const multer = require("multer");
const {
  SKILL_NODES,
  CAREER_TRACKS,
  performSkillGapAnalysis,
} = require("../services/skillGraph.service");
const { parseCv } = require("../services/cvParser.service");

// Multer in-memory storage for CV uploads
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || "").toLowerCase();
    const hasAllowedExt = ALLOWED_EXTENSIONS.some((allowed) =>
      ext.endsWith(allowed)
    );
    const allowedMime = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/octet-stream",
      "binary/octet-stream",
    ];
    if (hasAllowedExt || allowedMime.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
  },
});

// Optional JWT middleware: decodes user token if provided without rejecting guests
const optionalJWT = (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ? decoded.email.toLowerCase() : null,
      mongoId: decoded.mongoId || null,
    };
  } catch {
    req.user = null;
  }
  next();
};

/**
 * Reusable helper to build full gap analysis with matching platform courses & mentors
 */
const buildGapAnalysisWithResources = async ({
  targetEmail,
  userSkills = [],
  careerTrackId = "ai-engineer",
  usersCollection,
  coursesCollection,
  ratingsCollection,
}) => {
  let effectiveSkills = [...userSkills];
  let userLearnSkills = [];
  let portfolioSynced = false;
  let hasCvOrSkills = false;
  let portfolioSourceInfo = {
    skillsCount: 0,
    projectsCount: 0,
    certificatesCount: 0,
  };

  // 1. Automatically fetch CV and Portfolio data from user's MongoDB profile
  if (targetEmail && usersCollection) {
    const userDoc =
      (await usersCollection.findOne({ email: targetEmail })) ||
      (await usersCollection.findOne({
        email: { $regex: new RegExp(`^${targetEmail}$`, "i") },
      }));

    if (userDoc) {
      portfolioSynced = true;
      userLearnSkills = userDoc.learnSkills || [];

      const collectedSkills = new Set([
        ...effectiveSkills,
        ...(userDoc.teachSkills || []),
      ]);

      // Helper to safely extract skill tokens whether array, string, or object
      const extractTokens = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) {
          return raw.flatMap((item) => extractTokens(item));
        }
        if (typeof raw === "string") {
          return raw
            .split(/[,/|;\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 1);
        }
        if (typeof raw === "object") {
          return extractTokens(raw.name || raw.skill || raw.title || "");
        }
        return [];
      };

      // Extract tech stack from user's portfolio projects
      if (Array.isArray(userDoc.projects)) {
        portfolioSourceInfo.projectsCount = userDoc.projects.length;
        userDoc.projects.forEach((proj) => {
          if (proj) {
            const rawStack = proj.techStack || proj.skills || proj.tags;
            extractTokens(rawStack).forEach((clean) => {
              collectedSkills.add(clean);
            });
          }
        });
      }

      // Extract skills from user's certificates
      if (Array.isArray(userDoc.certificates)) {
        portfolioSourceInfo.certificatesCount = userDoc.certificates.length;
        userDoc.certificates.forEach((cert) => {
          if (cert) {
            const rawSkills = cert.skills || cert.tags;
            extractTokens(rawSkills).forEach((clean) => {
              collectedSkills.add(clean);
            });
          }
        });
      }

      effectiveSkills = Array.from(collectedSkills);
      portfolioSourceInfo.skillsCount = effectiveSkills.length;

      hasCvOrSkills =
        effectiveSkills.length > 0 ||
        (userDoc.teachSkills && userDoc.teachSkills.length > 0) ||
        userDoc.hasCv === true;
    }
  } else if (effectiveSkills.length > 0) {
    hasCvOrSkills = true;
    portfolioSourceInfo.skillsCount = effectiveSkills.length;
  }

  // 2. Execute Dijkstra / A* gap analysis
  const result = performSkillGapAnalysis({
    userSkills: effectiveSkills,
    userLearnSkills,
    careerTrackId,
  });

  // 3. Match platform courses & mentors for all target and ready skills
  const allTargetSkills = [
    ...(result.immediateNext || []),
    ...(result.criticalPath || []),
  ];

  let publicCourses = [];
  if (coursesCollection) {
    publicCourses = await coursesCollection
      .find({ status: { $in: ["approved", "pending_review"] } })
      .project({
        title: 1,
        topic: 1,
        tags: 1,
        price: 1,
        thumbnailUrl: 1,
        instructorName: 1,
        instructorEmail: 1,
        rating: 1,
        level: 1,
      })
      .limit(60)
      .toArray();
  }

  let potentialMentors = [];
  if (usersCollection) {
    potentialMentors = await usersCollection
      .find({
        ...(targetEmail ? { email: { $ne: targetEmail } } : {}),
        teachSkills: { $exists: true, $ne: [] },
        isDeactivated: { $ne: true },
      })
      .project({
        fullName: 1,
        email: 1,
        headline: 1,
        teachSkills: 1,
        teachLevel: 1,
        profileImage: 1,
      })
      .limit(80)
      .toArray();
  }

  let ratingMap = new Map();
  if (ratingsCollection && potentialMentors.length > 0) {
    const mentorEmails = potentialMentors.map((m) => m.email);
    const ratings = await ratingsCollection
      .aggregate([
        { $match: { targetEmail: { $in: mentorEmails } } },
        {
          $group: {
            _id: "$targetEmail",
            averageRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 },
          },
        },
      ])
      .toArray();
    ratingMap = new Map(ratings.map((r) => [r._id, r]));
  }

  // Build skillResources map for each skill (with guaranteed fallbacks)
  const skillResources = {};
  const uniqueSkills = new Map();
  allTargetSkills.forEach((s) => uniqueSkills.set(s.id, s));

  uniqueSkills.forEach((skill, skillId) => {
    const skillNameLower = (skill.name || skillId).toLowerCase();
    const keywords = [
      skillId.toLowerCase(),
      skillNameLower.replace(/[^a-z0-9]/g, " "),
      ...skillNameLower.split(/[\s\/\(\)\-]+/).filter((w) => w.length > 2),
    ];

    // Match courses
    const matchedCourses = publicCourses
      .filter((c) => {
        const courseText = `${c.title || ""} ${c.topic || ""} ${(c.tags || []).join(" ")}`.toLowerCase();
        return keywords.some((kw) => kw && courseText.includes(kw));
      })
      .slice(0, 3)
      .map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        topic: c.topic,
        price: Math.round(Number(c.price || 0)),
        thumbnailUrl: c.thumbnailUrl,
        instructorName: c.instructorName || "Platform Instructor",
        rating: Number(c.rating || 4.9).toFixed(1),
      }));

    const finalCourses =
      matchedCourses.length > 0
        ? matchedCourses
        : publicCourses.slice(0, 2).map((c) => ({
            _id: c._id.toString(),
            title: c.title,
            topic: c.topic,
            price: Math.round(Number(c.price || 0)),
            thumbnailUrl: c.thumbnailUrl,
            instructorName: c.instructorName || "Platform Instructor",
            rating: Number(c.rating || 4.9).toFixed(1),
            isDomainFallback: true,
          }));

    // Match mentors
    const matchedMentors = potentialMentors
      .filter((m) => {
        const mentorSkills = (m.teachSkills || []).map((s) => s.toLowerCase());
        return keywords.some(
          (kw) => kw && mentorSkills.some((ms) => ms.includes(kw) || kw.includes(ms))
        );
      })
      .slice(0, 3)
      .map((m) => {
        const r = ratingMap.get(m.email);
        return {
          _id: m._id.toString(),
          email: m.email,
          fullName: m.fullName || "Expert Mentor",
          headline: m.headline || "Practicing Specialist",
          profileImage: m.profileImage,
          teachLevel: m.teachLevel || "Expert",
          teachSkills: m.teachSkills || [],
          averageRating: r ? Number(r.averageRating.toFixed(1)) : 4.9,
          totalRatings: r ? r.totalRatings : 0,
        };
      });

    const finalMentors =
      matchedMentors.length > 0
        ? matchedMentors
        : potentialMentors.slice(0, 2).map((m) => {
            const r = ratingMap.get(m.email);
            return {
              _id: m._id.toString(),
              email: m.email,
              fullName: m.fullName || "Senior Mentor",
              headline: m.headline || "Engineering Specialist",
              profileImage: m.profileImage,
              teachLevel: m.teachLevel || "Expert",
              teachSkills: m.teachSkills || [],
              averageRating: r ? Number(r.averageRating.toFixed(1)) : 4.9,
              totalRatings: r ? r.totalRatings : 0,
              isRecommended: true,
            };
          });

    skillResources[skillId] = {
      courses: finalCourses,
      mentors: finalMentors,
    };
  });

  result.skillResources = skillResources;
  result.portfolioSynced = portfolioSynced;
  result.hasCvOrSkills = hasCvOrSkills;
  result.portfolioSourceInfo = portfolioSourceInfo;
  result.effectiveSkills = effectiveSkills;

  return result;
};

const registerSkillGraphRoutes = (
  app,
  { usersCollection, coursesCollection, ratingsCollection }
) => {
  // GET /api/skill-graph/ontology — returns the complete DAG nodes and career tracks
  app.get("/api/skill-graph/ontology", async (_req, res) => {
    try {
      res.json({
        nodes: Object.values(SKILL_NODES),
        careerTracks: Object.values(CAREER_TRACKS),
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to load skill ontology", error: err.message });
    }
  });

  // POST /api/skill-graph/gap-analysis — performs Dijkstra / A* gap analysis (Guest & Auth friendly)
  app.post("/api/skill-graph/gap-analysis", optionalJWT, async (req, res) => {
    try {
      const { userSkills = [], careerTrackId = "ai-engineer", email } = req.body;
      const targetEmail = (req.user?.email || email || "").toLowerCase();

      const result = await buildGapAnalysisWithResources({
        targetEmail,
        userSkills,
        careerTrackId,
        usersCollection,
        coursesCollection,
        ratingsCollection,
      });

      res.json(result);
    } catch (err) {
      console.error("[skill-gap-analysis]", err.message);
      res.status(500).json({ message: "Gap analysis failed", error: err.message });
    }
  });

  // POST /api/skill-graph/upload-cv — Upload CV, parse skills, save directly to user profile, and run gap analysis
  app.post(
    "/api/skill-graph/upload-cv",
    optionalJWT,
    (req, res, next) => {
      upload.single("cv")(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            message:
              err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
                ? "CV file is too large. Maximum size is 5MB."
                : err.message || "CV upload failed.",
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "CV file (PDF, DOCX, TXT) is required." });
        }

        const targetEmail = (req.user?.email || req.body.email || "").toLowerCase();
        const careerTrackId = req.body.careerTrackId || "ai-engineer";

        // Parse CV using Groq LLM service
        const parsed = await parseCv({
          file: req.file,
          suggestLearn: true,
          teachSkills: [],
        });

        const extractedTeachSkills = parsed.teachSkills || [];
        const extractedLearnSkills = parsed.suggestedLearnSkills || [];

        // Save parsed skills directly into MongoDB profile if user is registered
        if (targetEmail && usersCollection) {
          const updateDoc = {
            $set: {
              hasCv: true,
              cvLastUploadedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };

          if (extractedTeachSkills.length > 0) {
            updateDoc.$addToSet = updateDoc.$addToSet || {};
            updateDoc.$addToSet.teachSkills = { $each: extractedTeachSkills };
          }

          if (extractedLearnSkills.length > 0) {
            updateDoc.$addToSet = updateDoc.$addToSet || {};
            updateDoc.$addToSet.learnSkills = { $each: extractedLearnSkills };
          }

          if (parsed.profileDetails?.education) {
            updateDoc.$set.education = parsed.profileDetails.education;
          }
          if (parsed.profileDetails?.summary) {
            updateDoc.$set.about = parsed.profileDetails.summary;
          }

          await usersCollection.updateOne(
            { email: new RegExp(`^${targetEmail}$`, "i") },
            updateDoc
          );
        }

        // Run gap analysis immediately with newly saved CV skills
        const gapAnalysis = await buildGapAnalysisWithResources({
          targetEmail,
          userSkills: extractedTeachSkills,
          careerTrackId,
          usersCollection,
          coursesCollection,
          ratingsCollection,
        });

        res.json({
          success: true,
          message: `CV successfully parsed! Added ${extractedTeachSkills.length} competencies to your profile.`,
          extractedSkills: extractedTeachSkills,
          extractedLearnSkills,
          profileDetails: parsed.profileDetails,
          gapAnalysis,
        });
      } catch (err) {
        console.error("[upload-cv]", err.message);
        res.status(500).json({ message: err.message || "Failed to process and save CV." });
      }
    }
  );
};

module.exports = { registerSkillGraphRoutes };
