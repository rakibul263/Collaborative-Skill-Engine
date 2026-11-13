const { ObjectId } = require("mongodb");

const summarizeTextSnippets = (snippets = [], maxItems = 12) => {
  const cleaned = snippets
    .map((t) => String(t || "").trim())
    .filter((t) => t.length > 8)
    .slice(-maxItems);

  if (cleaned.length === 0) {
    return "No prior conversation themes detected.";
  }

  const keywords = new Map();
  const stop = new Set([
    "the",
    "and",
    "for",
    "you",
    "are",
    "with",
    "this",
    "that",
    "have",
    "from",
    "what",
    "how",
    "can",
    "will",
    "your",
    "about",
    "please",
    "thanks",
    "hello",
    "hi",
  ]);

  for (const line of cleaned) {
    line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w))
      .forEach((word) => {
        keywords.set(word, (keywords.get(word) || 0) + 1);
      });
  }

  const topTerms = [...keywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  const recentThemes = cleaned.slice(-3).map((t) => t.slice(0, 120));

  return {
    topTerms,
    recentThemes,
    messageCount: cleaned.length,
    summary: `Discussed themes include: ${topTerms.join(", ") || "general career growth"}. Recent focus: ${recentThemes.join(" | ")}`,
  };
};

const fetchAdvisorSessions = async (aiAdvisorSessionsCollection, email, limit = 20) => {
  const sessions = await aiAdvisorSessionsCollection
    .find({ userEmail: email })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return sessions.reverse();
};

const fetchPlatformChatContext = async (
  conversationsCollection,
  messagesCollection,
  email,
  messageLimit = 40,
) => {
  const conversations = await conversationsCollection
    .find({ participants: email })
    .sort({ lastMessageAt: -1 })
    .limit(8)
    .toArray();

  if (conversations.length === 0) {
    return { snippets: [], conversationCount: 0 };
  }

  const conversationIds = conversations.map((c) => c._id);
  const messages = await messagesCollection
    .find({ conversationId: { $in: conversationIds } })
    .sort({ createdAt: -1 })
    .limit(messageLimit)
    .toArray();

  const snippets = messages
    .filter((m) => m.senderEmail === email || m.text)
    .map((m) => m.text)
    .filter(Boolean);

  return {
    snippets,
    conversationCount: conversations.length,
  };
};

const buildMemoryContext = async ({
  aiAdvisorSessionsCollection,
  conversationsCollection,
  messagesCollection,
  email,
}) => {
  const [advisorSessions, platformChat] = await Promise.all([
    fetchAdvisorSessions(aiAdvisorSessionsCollection, email, 15),
    fetchPlatformChatContext(
      conversationsCollection,
      messagesCollection,
      email,
    ),
  ]);

  const advisorSnippets = advisorSessions.flatMap((s) => [
    s.userMessage,
    s.assistantSummary || s.reply,
  ]);

  const platformSummary = summarizeTextSnippets(platformChat.snippets);
  const advisorSummary = summarizeTextSnippets(advisorSnippets);

  const lastGoals = advisorSessions
    .map((s) => s.goal)
    .filter(Boolean)
    .slice(-3);

  return {
    advisorHistory: advisorSessions,
    platformChatSummary:
      typeof platformSummary === "string"
        ? platformSummary
        : platformSummary.summary,
    advisorChatSummary:
      typeof advisorSummary === "string"
        ? advisorSummary
        : advisorSummary.summary,
    recentGoals: lastGoals,
    interests: {
      platform: typeof platformSummary === "object" ? platformSummary.topTerms : [],
      advisor: typeof advisorSummary === "object" ? advisorSummary.topTerms : [],
    },
  };
};

const saveAdvisorTurn = async (
  aiAdvisorSessionsCollection,
  {
    userEmail,
    goal,
    userMessage,
    responsePayload,
  },
) => {
  const now = new Date().toISOString();
  const doc = {
    userEmail,
    goal: goal || null,
    userMessage,
    reply: responsePayload.reply,
    assistantSummary: responsePayload.reply?.slice(0, 500),
    careerDirection: responsePayload.careerDirection,
    skillGapAnalysis: responsePayload.skillGapAnalysis,
    learningRoadmap: responsePayload.learningRoadmap,
    suggestedProjects: responsePayload.suggestedProjects,
    recommendedSkills: responsePayload.recommendedSkills,
    prioritySteps: responsePayload.prioritySteps,
    mentorSuggestions: responsePayload.mentorSuggestions,
    courseSuggestions: responsePayload.courseSuggestions || [],
    retrievedSources: responsePayload.retrievedSources || [],
    createdAt: now,
  };

  const result = await aiAdvisorSessionsCollection.insertOne(doc);
  return { ...doc, _id: result.insertedId.toString() };
};

module.exports = {
  buildMemoryContext,
  saveAdvisorTurn,
  fetchAdvisorSessions,
  summarizeTextSnippets,
};
