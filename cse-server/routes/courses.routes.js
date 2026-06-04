const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");
const { calculateProfileCompletion, MIN_COURSE_CREATION_COMPLETION } = require("../utils/profileCompletion");

const registerCoursesRoutes = (app, {
  coursesCollection,
  courseEnrollmentsCollection,
  usersCollection,
  ratingsCollection,
  schedulesCollection,
  userNotificationsCollection,
  lessonsCollection,
  io,
}) => {

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

    const canCreateCourse = profileStatus.canCreateCourse || sessionCount >= 1 || userDoc?.hasStudioAccess === true;

    return {
      averageRating,
      sessionCount,
      eligibleTopics: eligibleTopics.length > 0 ? eligibleTopics : ["Software Architecture", "Full-Stack Web Development"],
      canCreateCourse,
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
        enrolledAt: enrollmentMap.get(c._id.toString()) || null,
      }));

      return res.json(result);
    } catch (err) {
      console.error("[GET /courses/my-enrollments]", err.message);
      return res.status(500).json({ message: "Failed to fetch enrolled courses." });
    }
  });

  // GET /courses/earnings
  app.get("/courses/earnings", verifyJWT, async (req, res) => {
    try {
      const result = await courseEnrollmentsCollection.aggregate([
        { $match: { instructorEmail: req.user.email } },
        { $group: { _id: null, totalEarnings: { $sum: "$instructorEarnings" } } },
      ]).toArray();
      return res.json({ totalEarnings: result[0] ? Number(result[0].totalEarnings.toFixed(2)) : 0 });
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
      return res.json(courses.map((c) => ({ ...c, _id: c._id.toString() })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch courses." });
    }
  });

  // GET /courses/public
  app.get("/courses/public", async (req, res) => {
    try {
      const courses = await coursesCollection
        .find({ status: { $in: ["approved", "pending_review"] } })
        .sort({ createdAt: -1 })
        .toArray();
      return res.json(courses.map((c) => ({ ...c, _id: c._id.toString() })));
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
      return res.json({ ...course, _id: course._id.toString() });
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
      const numPrice = Number(price);
      if (!price || isNaN(numPrice) || numPrice < 1 || numPrice > 9999.99) errors.price = "Price must be between $1.00 and $9,999.99.";
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

      // Verify user has >= 50% profile completion or mentoring sessions or studio access
      const userDoc = await usersCollection.findOne({ email: new RegExp(`^${req.user.email}$`, "i") });
      const profileStatus = calculateProfileCompletion(userDoc || {});
      
      if (!profileStatus.canCreateCourse && userDoc?.hasStudioAccess !== true) {
        return res.status(403).json({
          message: `Your profile completion is ${profileStatus.completion}%. Profile completion must be at least ${MIN_COURSE_CREATION_COMPLETION}% to create a course.`,
          completion: profileStatus.completion,
          missingItems: profileStatus.missingItems,
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
        price: Number(numPrice.toFixed(2)),
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
      return res.status(201).json({ ...courseDoc, _id: result.insertedId.toString() });
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

      const commission = Number((course.price * 0.15).toFixed(2));
      const instructorEarnings = Number((course.price * 0.85).toFixed(2));
      const now = new Date().toISOString();

      const enrollmentDoc = {
        courseId: new ObjectId(id),
        courseTitle: course.title,
        instructorEmail: course.instructorEmail,
        learnerEmail: req.user.email,
        price: course.price,
        commission,
        instructorEarnings,
        createdAt: now,
      };

      const result = await courseEnrollmentsCollection.insertOne(enrollmentDoc);
      return res.status(201).json({ ...enrollmentDoc, _id: result.insertedId.toString(), courseId: id });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ message: "You are already enrolled in this course." });
      return res.status(500).json({ message: "Enrollment failed." });
    }
  });

  // GET /courses/:id/enrollment
  app.get("/courses/:id/enrollment", verifyJWT, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid course id." });
    try {
      const enrollment = await courseEnrollmentsCollection.findOne({
        courseId: new ObjectId(id),
        learnerEmail: req.user.email,
      });
      return res.json({ enrolled: !!enrollment });
    } catch (err) {
      return res.status(500).json({ message: "Failed to check enrollment." });
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
      const numPrice = Number(price);
      if (!price || isNaN(numPrice) || numPrice < 1 || numPrice > 9999.99) errors.price = "Price must be between $1.00 and $9,999.99.";
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
        price: Number(numPrice.toFixed(2)),
        thumbnailUrl: thumbnailUrl.trim(),
        curriculum: curriculum.map((c) => ({ title: c.title.trim() })),
        updatedAt: now,
        ...statusUpdate,
      };

      await coursesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

      const updated = await coursesCollection.findOne({ _id: new ObjectId(id) });
      return res.json({ ...updated, _id: updated._id.toString() });
    } catch (err) {
      return res.status(500).json({ message: "Failed to save changes. Please try again." });
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
      return res.json(lessons.map((l) => ({ ...l, _id: l._id.toString(), courseId: l.courseId.toString() })));
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch lessons." });
    }
  });

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
        videoLinks,
        videoUrl,
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

      let formattedVideoLinks = [];
      if (Array.isArray(videoLinks) && videoLinks.length > 0) {
        formattedVideoLinks = videoLinks;
      } else if (typeof videoUrl === "string" && videoUrl.trim().length > 0) {
        formattedVideoLinks = [videoUrl.trim()];
      }

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
        videoLinks: formattedVideoLinks,
        videoDuration: videoDuration || 0,
        pdfResources: Array.isArray(pdfResources) ? pdfResources : [],
        assignments: Array.isArray(assignments) ? assignments : [],
        quizzes: Array.isArray(quizzes) ? quizzes : [],
        isFreePreview: !!isFreePreview,
        isLocked: isLocked !== undefined ? !!isLocked : true,
        sectionTitle: sectionTitle ? sectionTitle.trim() : "Main Section",
        order,
        createdAt: now,
        updatedAt: now,
      };

      const result = await lessonsCollection.insertOne(lessonDoc);
      const insertedId = result.insertedId.toString();

      if (formattedVideoLinks.length > 0 && userNotificationsCollection) {
        (async () => {
          try {
            const enrollments = await courseEnrollmentsCollection
              .find({ courseId: new ObjectId(id), banned: { $ne: true } }, { projection: { learnerEmail: 1 } })
              .toArray();

            for (const enrollment of enrollments) {
              const notifDoc = {
                recipientEmail: enrollment.learnerEmail,
                type: "course_video_upload",
                title: `New Lesson: ${title.trim()}`,
                message: `${course.instructorName || "Your instructor"} uploaded a new video lesson "${title.trim()}" in ${course.title}.`,
                courseId: id,
                courseName: course.title,
                lessonTitle: title.trim(),
                instructorName: course.instructorName || req.user.email,
                lessonId: insertedId,
                isRead: false,
                createdAt: now,
              };

              const notifResult = await userNotificationsCollection.insertOne(notifDoc);
              if (io) {
                io.to(`user:${enrollment.learnerEmail}`).emit("user-notification:new", {
                  ...notifDoc,
                  _id: notifResult.insertedId.toString(),
                });
              }
            }
          } catch (notifErr) {
            console.error("[Lesson Notification Error]:", notifErr.message);
          }
        })();
      }

      return res.status(201).json({ ...lessonDoc, _id: insertedId, courseId: id });
    } catch (err) {
      return res.status(500).json({ message: "Failed to save lesson. Please try again." });
    }
  });

  // PATCH /lessons/:lessonId — update an existing lesson
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
        videoLinks,
        videoUrl,
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

      let formattedVideoLinks = [];
      if (Array.isArray(videoLinks) && videoLinks.length > 0) {
        formattedVideoLinks = videoLinks;
      } else if (typeof videoUrl === "string" && videoUrl.trim().length > 0) {
        formattedVideoLinks = [videoUrl.trim()];
      } else {
        formattedVideoLinks = lesson.videoLinks || [];
      }

      if (Object.keys(errors).length > 0) return res.status(400).json({ message: "Validation failed.", errors });

      const now = new Date().toISOString();
      const updateData = {
        title: title.trim(),
        description: description ? description.trim() : lesson.description || "",
        richTextContent: richTextContent !== undefined ? richTextContent.trim() : lesson.richTextContent || "",
        videoLinks: formattedVideoLinks,
        videoDuration: videoDuration !== undefined ? videoDuration : lesson.videoDuration || 0,
        pdfResources: Array.isArray(pdfResources) ? pdfResources : lesson.pdfResources || [],
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
      return res.json({ message: "Lesson deleted successfully.", lessonId });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete lesson." });
    }
  });
};

module.exports = { registerCoursesRoutes };
