const { buildMemoryContext, saveAdvisorTurn, fetchAdvisorSessions } = require("../services/memory.service");
const { findMentorSuggestions } = require("../services/mentorMatcher.service");
const { generateAdvisorResponse } = require("../services/ai.service");
const { initVectorStore } = require("../services/vectorRetrieval.service");

const createAiAdvisorController = (deps) => {
  const {
    usersCollection,
    conversationsCollection,
    messagesCollection,
    aiAdvisorSessionsCollection,
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

  return { postAdvisor, getHistory, warmVectorStore };
};

module.exports = { createAiAdvisorController };
