const { ChatGroq } = require("@langchain/groq");
const {
  retrieveRelevantDocuments,
  keywordFallbackRetrieve,
} = require("./vectorRetrieval.service");

const GOAL_SKILL_MAP = {
  "frontend developer": ["React", "TypeScript", "Tailwind CSS", "Accessibility"],
  "backend developer": ["Node.js", "Express", "MongoDB", "API Design"],
  "full stack": ["React", "Node.js", "MongoDB", "Docker"],
  "data science": ["Python", "Pandas", "SQL", "Machine Learning"],
  devops: ["Docker", "CI/CD", "Linux", "Cloud Deploy"],
};

const inferSkillGaps = (userProfile, goal) => {
  const goalKey = Object.keys(GOAL_SKILL_MAP).find((k) =>
    (goal || "").toLowerCase().includes(k.split(" ")[0]),
  );
  const targetSkills = goalKey ? GOAL_SKILL_MAP[goalKey] : GOAL_SKILL_MAP["frontend developer"];
  const owned = new Set(
    [...(userProfile.teachSkills || []), ...(userProfile.learnSkills || [])].map(
      (s) => s.toLowerCase(),
    ),
  );

  return targetSkills
    .filter((skill) => !owned.has(skill.toLowerCase()))
    .map((skill) => ({
      skill,
      priority: "high",
      reason: `Required for ${goal || "your target role"} but not in your profile yet`,
    }));
};

const buildStructuredFallback = ({
  userProfile,
  goal,
  message,
  ragChunks,
  mentorSuggestions,
  memoryContext,
}) => {
  const gaps = inferSkillGaps(userProfile, goal);
  const name = userProfile.fullName || "there";

  return {
    careerDirection: `${name}, based on your teach level (${userProfile.teachLevel || "N/A"}) and learn level (${userProfile.learnLevel || "Mastery"}), focus on ${goal || "your stated goal"} while leveraging ${(userProfile.teachSkills || []).slice(0, 3).join(", ") || "your current skills"}.`,
    skillGapAnalysis: gaps,
    learningRoadmap: [
      {
        phase: "Week 1-2",
        focus: gaps[0]?.skill || "Core fundamentals",
        action: "Complete one module and ship a small UI/API slice in your MERN project",
      },
      {
        phase: "Week 3-4",
        focus: gaps[1]?.skill || "Integration",
        action: "Add tests + README section documenting decisions",
      },
      {
        phase: "Month 2",
        focus: "Portfolio",
        action: `Polish Collaborative Skill Engine features aligned with ${goal || "target role"}`,
      },
    ],
    suggestedProjects: [
      `Extend your platform with a ${goal || "career"} dashboard using your existing React + Tailwind stack`,
      "Document mentor match algorithm and match scores in a technical blog post",
      "Add automated skill-gap widget on profile page fed by advisor API",
    ],
    recommendedSkills: gaps.map((g) => g.skill).slice(0, 5),
    prioritySteps: gaps.slice(0, 3).map((g, i) => ({
      step: `Learn ${g.skill}`,
      timeframe: i === 0 ? "Next 2 weeks" : i === 1 ? "Weeks 3-4" : "Month 2",
      why: g.reason,
    })),
    mentorSuggestions,
    reply: `Hi ${name} — for "${message}", prioritize ${gaps[0]?.skill || "one missing core skill"} next. Your learn skills (${(userProfile.learnSkills || []).join(", ")}) align with ${goal || "growth"}; use mentor matches on the Experts page. Memory: ${memoryContext.advisorChatSummary}`,
    retrievedSources: ragChunks.map((c) => c.source),
  };
};

const parseJsonFromModel = (text) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("Model returned invalid JSON");
  }
};

const generateAdvisorResponse = async ({
  userProfile,
  goal,
  message,
  memoryContext,
  mentorSuggestions,
}) => {
  let ragResult;
  try {
    ragResult = await retrieveRelevantDocuments({
      goal,
      message,
      teachSkills: userProfile.teachSkills || [],
      learnSkills: userProfile.learnSkills || [],
    });
  } catch {
    ragResult = keywordFallbackRetrieve({
      goal,
      teachSkills: userProfile.teachSkills || [],
      learnSkills: userProfile.learnSkills || [],
    });
  }

  const ragContext = ragResult.chunks
    .map(
      (c, i) =>
        `[Doc ${i + 1}: ${c.source}]\n${c.content.slice(0, 900)}`,
    )
    .join("\n\n");

  // Build model: use Groq (free, fast). Fallback to rules-based if no key set.
  let model = null;

  if (process.env.GROQ_API_KEY) {
    model = new ChatGroq({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.4,
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  if (!model) {
    const fallback = buildStructuredFallback({
      userProfile,
      goal,
      message,
      ragChunks: ragResult.chunks,
      mentorSuggestions,
      memoryContext,
    });
    return { ...fallback, mode: "rules+rag" };
  }

  const systemPrompt = `You are the AI Career Advisor inside "Collaborative Skill Engine".
Rules:
- NEVER give generic advice. Always reference the user's name, skills, levels, education, and memory.
- Use RAG context when relevant.
- Be concise, actionable, bullet-friendly.
- Adapt recommendations to teachLevel and learnLevel.
- Output ONLY valid JSON with this schema:
{
  "careerDirection": "string",
  "skillGapAnalysis": [{"skill":"string","priority":"high|medium|low","reason":"string"}],
  "learningRoadmap": [{"phase":"string","focus":"string","action":"string"}],
  "suggestedProjects": ["string"],
  "recommendedSkills": ["string"],
  "prioritySteps": [{"step":"string","timeframe":"string","why":"string"}],
  "mentorSuggestions": [{"fullName":"string","email":"string","reason":"string","matchPercentage":number}],
  "reply": "string (conversational answer to user message)"
}`;

  const userPrompt = `USER PROFILE:
${JSON.stringify(
    {
      fullName: userProfile.fullName,
      email: userProfile.email,
      teachSkills: userProfile.teachSkills,
      learnSkills: userProfile.learnSkills,
      teachLevel: userProfile.teachLevel,
      learnLevel: userProfile.learnLevel,
      education: userProfile.education,
      connectionsCount: (userProfile.connections || []).length,
    },
    null,
    2,
  )}

GOAL: ${goal || "Not specified"}
USER MESSAGE: ${message}

MEMORY:
- Platform chats: ${memoryContext.platformChatSummary}
- Advisor history: ${memoryContext.advisorChatSummary}
- Recent goals: ${(memoryContext.recentGoals || []).join(", ") || "none"}

MENTOR MATCHES (from platform):
${JSON.stringify(mentorSuggestions.slice(0, 5), null, 2)}

RAG CONTEXT:
${ragContext || "No documents retrieved"}`;

  try {
    const completion = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const parsed = parseJsonFromModel(
      typeof completion.content === "string"
        ? completion.content
        : JSON.stringify(completion.content),
    );

    return {
      ...parsed,
      mentorSuggestions:
        parsed.mentorSuggestions?.length > 0
          ? parsed.mentorSuggestions
          : mentorSuggestions,
      retrievedSources: ragResult.chunks.map((c) => c.source),
      mode: "groq+rag",
    };
  } catch (llmError) {
    console.warn("[AI Advisor] Groq failed, using rules fallback:", llmError.message);
    const fallback = buildStructuredFallback({
      userProfile,
      goal,
      message,
      ragChunks: ragResult.chunks,
      mentorSuggestions,
      memoryContext,
    });
    return { ...fallback, mode: "fallback+rag", llmError: llmError.message };
  }
};

module.exports = { generateAdvisorResponse, inferSkillGaps };
