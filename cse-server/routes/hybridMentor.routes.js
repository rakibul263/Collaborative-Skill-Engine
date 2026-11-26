const { verifyJWT } = require("../middleware/verifyJWT");
const { retrieveHybridRecommendedMentors } = require("../services/hybridMentorRetrieval.service");

const registerHybridMentorRoutes = (
  app,
  { usersCollection, ratingsCollection, connectionRequestsCollection }
) => {
  // POST /api/mentors/hybrid-recommend — Bi-Encoder Dense Retrieval + BM25 Sparse Search
  app.post("/api/mentors/hybrid-recommend", verifyJWT, async (req, res) => {
    try {
      const { query, email, alpha = 0.65, limit = 8 } = req.body || {};

      if (!query || !String(query).trim()) {
        return res.status(400).json({ message: "Search query is required for hybrid retrieval." });
      }

      const rawEmail = String(email || req.user?.email || "").trim();
      const lowerEmail = rawEmail.toLowerCase();
      const emailVariants = Array.from(new Set([rawEmail, lowerEmail].filter(Boolean)));

      // Fetch potential mentors, requester connections, and pending requests in parallel
      const [rawMentors, currentUserDoc, pendingRequests] = await Promise.all([
        usersCollection
          .find(
            {
              ...(emailVariants.length > 0 ? { email: { $nin: emailVariants } } : {}),
              teachSkills: { $exists: true, $ne: [] },
              isDeactivated: { $ne: true },
            },
            {
              projection: {
                _id: 1,
                fullName: 1,
                name: 1,
                email: 1,
                profileImage: 1,
                photoURL: 1,
                bio: 1,
                about: 1,
                headline: 1,
                designation: 1,
                education: 1,
                teachSkills: 1,
                learnSkills: 1,
                teachLevel: 1,
                learnLevel: 1,
              },
            }
          )
          .limit(200)
          .toArray(),
        lowerEmail
          ? usersCollection.findOne(
              { email: { $in: emailVariants } },
              { projection: { email: 1, connections: 1 } }
            )
          : Promise.resolve(null),
        connectionRequestsCollection && emailVariants.length > 0
          ? connectionRequestsCollection
              .find({
                status: "pending",
                $or: [
                  { senderEmail: { $in: emailVariants } },
                  { receiverEmail: { $in: emailVariants } },
                ],
              })
              .toArray()
          : Promise.resolve([]),
      ]);

      const candidateMentors = rawMentors.filter(
        (m) => String(m.email || "").toLowerCase().trim() !== lowerEmail
      );

      if (candidateMentors.length === 0) {
        return res.json([]);
      }

      // Attach ratings to mentors (case-insensitive email lookup)
      const mentorEmails = Array.from(
        new Set(
          candidateMentors.flatMap((m) => {
            const e = String(m.email || "").trim();
            return e ? [e, e.toLowerCase()] : [];
          })
        )
      );
      const ratingSummary =
        ratingsCollection && mentorEmails.length > 0
          ? await ratingsCollection
              .aggregate([
                { $match: { targetEmail: { $in: mentorEmails } } },
                {
                  $group: {
                    _id: { $toLower: "$targetEmail" },
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 },
                  },
                },
              ])
              .toArray()
          : [];

      const ratingMap = new Map(
        ratingSummary
          .filter((r) => r._id)
          .map((r) => [
            String(r._id).toLowerCase(),
            {
              averageRating: Number((r.averageRating || 0).toFixed(1)),
              totalRatings: r.totalRatings || 0,
            },
          ])
      );

      const connectedEmails = new Set(
        (currentUserDoc?.connections || [])
          .map((c) => String(c?.email || "").toLowerCase().trim())
          .filter(Boolean)
      );

      const pendingRequestMap = new Map();
      (pendingRequests || []).forEach((request) => {
        const isSender = String(request.senderEmail || "").toLowerCase().trim() === lowerEmail;
        const other = String(isSender ? request.receiverEmail : request.senderEmail || "")
          .toLowerCase()
          .trim();
        if (other) {
          pendingRequestMap.set(other, {
            connectionStatus: isSender ? "sent" : "received",
            requestId: request._id,
          });
        }
      });

      const formattedMentors = candidateMentors.map((m) => {
        const mEmailLower = String(m.email || "").toLowerCase().trim();
        const rating = ratingMap.get(mEmailLower) || { averageRating: 0, totalRatings: 0 };
        const reqInfo = pendingRequestMap.get(mEmailLower);

        let connectionStatus = "none";
        if (connectedEmails.has(mEmailLower)) connectionStatus = "connected";
        else if (reqInfo?.connectionStatus) connectionStatus = reqInfo.connectionStatus;

        return {
          _id: m._id,
          fullName: m.fullName || m.name || "Expert Mentor",
          email: m.email,
          profileImage: m.profileImage || m.photoURL,
          bio: m.bio || m.about || "",
          headline: m.headline || m.designation || "",
          education: m.education || "Verified Expert",
          teachSkills: Array.isArray(m.teachSkills) ? m.teachSkills : [],
          learnSkills: Array.isArray(m.learnSkills) ? m.learnSkills : [],
          teachLevel: m.teachLevel || "Expert",
          learnLevel: m.learnLevel || "Learner",
          connectionStatus,
          requestId: reqInfo?.requestId || null,
          averageRating: rating.averageRating,
          totalRatings: rating.totalRatings,
        };
      });

      // Execute Hybrid Retrieval Engine
      const results = await retrieveHybridRecommendedMentors({
        mentors: formattedMentors,
        query: String(query).trim(),
        alpha: Math.max(0.1, Math.min(0.9, Number(alpha) || 0.65)),
        limit: Math.max(1, Math.min(20, Number(limit) || 8)),
      });

      res.json(results);
    } catch (err) {
      console.error("[hybrid-recommend]", err.message);
      res.status(500).json({ message: "Hybrid mentor retrieval failed", error: err.message });
    }
  });
};

module.exports = { registerHybridMentorRoutes };

