const { verifyJWT } = require("../middleware/verifyJWT");
const { retrieveHybridRecommendedMentors } = require("../services/hybridMentorRetrieval.service");

const registerHybridMentorRoutes = (app, { usersCollection, ratingsCollection }) => {
  // POST /api/mentors/hybrid-recommend — Bi-Encoder Dense Retrieval + BM25 Sparse Search
  app.post("/api/mentors/hybrid-recommend", verifyJWT, async (req, res) => {
    try {
      const { query, email, alpha = 0.65, limit = 8 } = req.body;

      if (!query || !query.trim()) {
        return res.status(400).json({ message: "Search query is required for hybrid retrieval." });
      }

      // Fetch potential mentors
      const candidateMentors = await usersCollection
        .find({
          email: { $ne: email },
          teachSkills: { $exists: true, $ne: [] },
          isDeactivated: { $ne: true },
        })
        .limit(60)
        .toArray();

      if (candidateMentors.length === 0) {
        return res.json([]);
      }

      // Attach ratings to mentors
      const mentorEmails = candidateMentors.map((m) => m.email);
      const ratingSummary = await ratingsCollection
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

      const ratingMap = new Map(
        ratingSummary.map((r) => [
          r._id,
          {
            averageRating: Number((r.averageRating || 0).toFixed(1)),
            totalRatings: r.totalRatings || 0,
          },
        ])
      );

      const formattedMentors = candidateMentors.map((m) => {
        const rating = ratingMap.get(m.email) || { averageRating: 4.8, totalRatings: 0 };
        return {
          _id: m._id,
          fullName: m.fullName || m.name || "Expert Mentor",
          email: m.email,
          profileImage: m.profileImage || m.photoURL,
          bio: m.bio || m.about || "",
          headline: m.headline || m.designation || "",
          education: m.education || "Verified Expert",
          teachSkills: m.teachSkills || [],
          learnSkills: m.learnSkills || [],
          teachLevel: m.teachLevel || "Expert",
          averageRating: rating.averageRating,
          totalRatings: rating.totalRatings,
        };
      });

      // Execute Hybrid Retrieval Engine
      const results = await retrieveHybridRecommendedMentors({
        mentors: formattedMentors,
        query: query.trim(),
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

