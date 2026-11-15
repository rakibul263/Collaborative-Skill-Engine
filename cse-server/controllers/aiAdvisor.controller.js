const { buildMemoryContext, saveAdvisorTurn, fetchAdvisorSessions } = require("../services/memory.service");
const { findMentorSuggestions } = require("../services/mentorMatcher.service");
const { generateAdvisorResponse, streamAdvisorResponse, streamInterviewTurn } = require("../services/ai.service");
const { initVectorStore } = require("../services/vectorRetrieval.service");

const createAiAdvisorController = (deps) => {
  const {
    usersCollection,
    conversationsCollection,
    messagesCollection,
    aiAdvisorSessionsCollection,
    coursesCollection,
  } = deps;

  const getUserOr404 = async (authUser, res) => {
    const user = await usersCollection.findOne({ email: authUser.email });
    if (!user) {
      res.status(404).json({ message: "User not found. Complete profile registration first." });
      return null;
    }
    if (user.uid && authUser.uid && user.uid !== authUser.uid) {
      console.warn(
        `[AI Advisor] uid mismatch for ${authUser.email} — allowing by email`,
      );
    }
    return user;
  };

  const postAdvisor = async (req, res) => {
    try {
      const { goal, message } = req.body;
      const email = req.user.email;

      if (!message?.trim()) {
        return res.status(400).json({ message: "message is required" });
      }

      const userProfile = await getUserOr404(req.user, res);
      if (!userProfile) return;

      const memoryContext = await buildMemoryContext({
        aiAdvisorSessionsCollection,
        conversationsCollection,
        messagesCollection,
        email,
      });

      const mentorSuggestions = await findMentorSuggestions({
        usersCollection,
        currentUser: userProfile,
        limit: 5,
      });

      const responsePayload = await generateAdvisorResponse({
        userProfile,
        goal: goal || memoryContext.recentGoals?.slice(-1)[0] || "",
        message: message.trim(),
        memoryContext,
        mentorSuggestions,
      });

      // Enrich mentor suggestions so emails and profile images match authentic platform records
      if (Array.isArray(responsePayload.mentorSuggestions) && responsePayload.mentorSuggestions.length > 0) {
        responsePayload.mentorSuggestions = responsePayload.mentorSuggestions.map((m) => {
          const matched = mentorSuggestions.find(
            (real) =>
              (real.email && real.email.toLowerCase() === m.email?.toLowerCase()) ||
              (real.fullName && real.fullName.toLowerCase() === m.fullName?.toLowerCase())
          );
          return {
            fullName: matched?.fullName || m.fullName,
            email: matched?.email || m.email,
            profileImage: matched?.profileImage || m.profileImage || null,
            teachSkills: matched?.teachSkills || m.teachSkills || [],
            matchPercentage: m.matchPercentage || matched?.matchPercentage || 92,
            reason: m.reason || matched?.reason || "Matched on complementary skill interests",
          };
        });
      } else {
        responsePayload.mentorSuggestions = mentorSuggestions;
      }

      // Live Approved Course Recommendations from platform coursesCollection
      let courseSuggestions = [];
      if (coursesCollection) {
        try {
          const approvedCourses = await coursesCollection
            .find({ status: { $in: ["approved", "active"] } })
            .limit(30)
            .toArray();

          if (approvedCourses.length > 0) {
            const tokens = [
              goal,
              ...(userProfile.learnSkills || []),
              ...(responsePayload.recommendedSkills || []),
              ...(responsePayload.skillGapAnalysis?.map((g) => g.skill) || []),
              message,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .split(/[\s,/-]+/)
              .filter((t) => t.length > 2);

            const scoredCourses = approvedCourses.map((c) => {
              const text = `${c.title || ""} ${c.topic || ""} ${c.description || ""}`.toLowerCase();
              let score = 0;
              for (const tok of tokens) {
                if (text.includes(tok)) score += 1;
              }
              return { course: c, score };
            });

            scoredCourses.sort((a, b) => b.score - a.score);
            courseSuggestions = scoredCourses.slice(0, 4).map(({ course }) => ({
              _id: course._id.toString(),
              title: course.title,
              topic: course.topic,
              description:
                course.description && course.description.length > 140
                  ? course.description.slice(0, 140) + "..."
                  : course.description || "",
              price: Math.round(Number(course.price || 0)),
              thumbnailUrl: course.thumbnailUrl,
              instructorName: course.instructorName || "Platform Instructor",
              totalLessons: Array.isArray(course.curriculum) ? course.curriculum.length : 0,
            }));
          }
        } catch (cErr) {
          console.warn("[AI Advisor Course Match] Error:", cErr.message);
        }
      }
      responsePayload.courseSuggestions = courseSuggestions;

      const saved = await saveAdvisorTurn(aiAdvisorSessionsCollection, {
        userEmail: email,
        goal: goal || null,
        userMessage: message.trim(),
        responsePayload,
      });

      return res.json({
        success: true,
        sessionId: saved._id,
        user: {
          fullName: userProfile.fullName,
          teachSkills: userProfile.teachSkills,
          learnSkills: userProfile.learnSkills,
          teachLevel: userProfile.teachLevel,
          learnLevel: userProfile.learnLevel,
        },
        memory: {
          platformChatSummary: memoryContext.platformChatSummary,
          advisorChatSummary: memoryContext.advisorChatSummary,
          interests: memoryContext.interests,
        },
        ...responsePayload,
      });
    } catch (error) {
      console.error("[AI Advisor]", error);
      return res.status(500).json({
        message: "Failed to get AI advice. Please try again.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  const postAdvisorStream = async (req, res) => {
    try {
      const { goal, message } = req.body || {};
      const email = req.user.email;

      if (!message?.trim()) {
        return res.status(400).json({ message: "message is required" });
      }

      const userProfile = await getUserOr404(req.user, res);
      if (!userProfile) return;

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const memoryContext = await buildMemoryContext({
        aiAdvisorSessionsCollection,
        conversationsCollection,
        messagesCollection,
        email,
      });

      const mentorSuggestions = await findMentorSuggestions({
        usersCollection,
        currentUser: userProfile,
        limit: 5,
      });

      // Match approved courses
      let courseSuggestions = [];
      if (coursesCollection) {
        try {
          const approvedCourses = await coursesCollection
            .find({ status: { $in: ["approved", "active"] } })
            .limit(30)
            .toArray();

          if (approvedCourses.length > 0) {
            const tokens = [
              goal,
              ...(userProfile.learnSkills || []),
              message,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .split(/[\s,/-]+/)
              .filter((t) => t.length > 2);

            const scoredCourses = approvedCourses.map((c) => {
              const text = `${c.title || ""} ${c.topic || ""} ${c.description || ""}`.toLowerCase();
              let score = 0;
              for (const tok of tokens) {
                if (text.includes(tok)) score += 1;
              }
              return { course: c, score };
            });

            scoredCourses.sort((a, b) => b.score - a.score);
            courseSuggestions = scoredCourses.slice(0, 4).map(({ course }) => ({
              _id: course._id.toString(),
              title: course.title,
              topic: course.topic,
              description:
                course.description && course.description.length > 140
                  ? course.description.slice(0, 140) + "..."
                  : course.description || "",
              price: Math.round(Number(course.price || 0)),
              thumbnailUrl: course.thumbnailUrl,
              instructorName: course.instructorName || "Platform Instructor",
              totalLessons: Array.isArray(course.curriculum) ? course.curriculum.length : 0,
            }));
          }
        } catch (cErr) {
          console.warn("[AI Advisor Course Match] Error:", cErr.message);
        }
      }

      let isAborted = false;
      req.on("close", () => {
        isAborted = true;
      });

      // Stream the response token-by-token
      const responsePayload = await streamAdvisorResponse({
        userProfile,
        goal: goal || memoryContext.recentGoals?.slice(-1)[0] || "",
        message: message.trim(),
        memoryContext,
        mentorSuggestions,
        onToken: (token) => {
          if (isAborted || res.writableEnded) return;
          try {
            res.write(`data: ${JSON.stringify({ type: "token", text: token })}\n\n`);
          } catch {
            isAborted = true;
          }
        },
      });

      if (isAborted || res.writableEnded) return;

      responsePayload.courseSuggestions = courseSuggestions;

      const saved = await saveAdvisorTurn(aiAdvisorSessionsCollection, {
        userEmail: email,
        goal: goal || null,
        userMessage: message.trim(),
        responsePayload,
      });

      // Send final metadata completion payload
      res.write(
        `data: ${JSON.stringify({
          type: "done",
          sessionId: saved._id,
          user: {
            fullName: userProfile.fullName,
            teachSkills: userProfile.teachSkills,
            learnSkills: userProfile.learnSkills,
            teachLevel: userProfile.teachLevel,
            learnLevel: userProfile.learnLevel,
          },
          memory: {
            platformChatSummary: memoryContext.platformChatSummary,
            advisorChatSummary: memoryContext.advisorChatSummary,
            interests: memoryContext.interests,
          },
          ...responsePayload,
        })}\n\n`
      );
      res.end();
    } catch (error) {
      console.error("[AI Advisor Stream Error]", error);
      if (!res.headersSent) {
        return res.status(500).json({ message: "Failed to stream advice" });
      }
      res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
      res.end();
    }
  };

  const postInterviewStream = async (req, res) => {
    try {
      const email = req.user.email;
      const {
        role = "Backend Engineer",
        level = "Mid-Level",
        action = "start",
        interviewHistory = [],
        candidateAnswer = "",
      } = req.body || {};

      const userProfile = await getUserOr404(req.user, res);
      if (!userProfile) return;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      let isAborted = false;
      req.on("close", () => {
        isAborted = true;
      });

      const result = await streamInterviewTurn({
        userProfile,
        role,
        level,
        action,
        interviewHistory,
        candidateAnswer: (candidateAnswer || "").trim(),
        onToken: (token) => {
          if (isAborted || res.writableEnded) return;
          try {
            res.write(`data: ${JSON.stringify({ type: "token", text: token })}\n\n`);
          } catch {
            isAborted = true;
          }
        },
      });

      if (isAborted || res.writableEnded) return;

      let scorecardId = null;
      if (action === "conclude" && aiAdvisorSessionsCollection) {
        const doc = {
          userEmail: email,
          type: "mock_interview_scorecard",
          role,
          level,
          reply: result.reply,
          turnsCount: interviewHistory.length,
          createdAt: new Date().toISOString(),
        };
        const ins = await aiAdvisorSessionsCollection.insertOne(doc);
        scorecardId = ins.insertedId.toString();
      }

      res.write(
        `data: ${JSON.stringify({
          type: "done",
          scorecardId,
          role,
          level,
          action,
          reply: result.reply,
        })}\n\n`
      );
      res.end();
    } catch (error) {
      console.error("[Mock Interview Stream Error]", error);
      if (!res.headersSent) {
        return res.status(500).json({ message: "Failed to stream interview" });
      }
      res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
      res.end();
    }
  };

  const getHistory = async (req, res) => {
    try {
      const email = req.user.email;

      const userProfile = await getUserOr404(req.user, res);
      if (!userProfile) return;

      const history = await fetchAdvisorSessions(
        aiAdvisorSessionsCollection,
        email,
        30,
      );

      return res.json({
        history: history.map((h) => ({
          ...h,
          _id: h._id?.toString?.() || h._id,
        })),
      });
    } catch (error) {
      console.error("[AI Advisor History]", error);
      return res.status(500).json({ message: "Failed to fetch advisor history" });
    }
  };

  const clearHistory = async (req, res) => {
    try {
      const email = req.user.email;
      await aiAdvisorSessionsCollection.deleteMany({ userEmail: email });
      return res.json({ success: true, message: "Advisor conversation history reset successfully" });
    } catch (error) {
      console.error("[AI Advisor Clear History]", error);
      return res.status(500).json({ message: "Failed to clear advisor history" });
    }
  };

  const saveRoadmap = async (req, res) => {
    try {
      const email = req.user.email;
      const { goal, roadmap, careerDirection, prioritySteps } = req.body;

      if (!roadmap || !Array.isArray(roadmap) || roadmap.length === 0) {
        return res.status(400).json({ message: "A valid roadmap array is required." });
      }

      const userProfile = await getUserOr404(req.user, res);
      if (!userProfile) return;

      const activeRoadmap = {
        goal: goal || userProfile.activeRoadmap?.goal || "Software Engineering Career Path",
        careerDirection: careerDirection || userProfile.activeRoadmap?.careerDirection || "",
        roadmap,
        prioritySteps: Array.isArray(prioritySteps) ? prioritySteps : [],
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await usersCollection.updateOne(
        { email },
        { $set: { activeRoadmap, updatedAt: new Date().toISOString() } }
      );

      return res.json({
        success: true,
        message: "Learning roadmap saved to your profile successfully.",
        activeRoadmap,
      });
    } catch (error) {
      console.error("[AI Advisor Save Roadmap]", error);
      return res.status(500).json({ message: "Failed to save roadmap to profile." });
    }
  };

  const warmVectorStore = async (_req, res) => {
    try {
      const store = await initVectorStore();
      return res.json({
        ready: Boolean(store),
        message: store
          ? "Vector store loaded"
          : "Vector store unavailable (check OPENAI_API_KEY)",
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };

  return {
    postAdvisor,
    postAdvisorStream,
    postInterviewStream,
    getHistory,
    clearHistory,
    warmVectorStore,
    saveRoadmap,
  };
};

module.exports = { createAiAdvisorController };
