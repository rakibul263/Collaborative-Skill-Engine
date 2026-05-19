const {
  retrieveRelevantDocuments,
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
    ragResult = { chunks: [] };
  }

  const fallback = buildStructuredFallback({
    userProfile,
    goal,
    message,
    ragChunks: ragResult.chunks || [],
    mentorSuggestions,
    memoryContext,
  });

  return { ...fallback, mode: "rules+rag" };
};

module.exports = { generateAdvisorResponse, inferSkillGaps };
