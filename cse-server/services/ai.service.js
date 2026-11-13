const { ChatGroq } = require("@langchain/groq");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const {
  retrieveRelevantDocuments,
  keywordFallbackRetrieve,
} = require("./vectorRetrieval.service");

// Comprehensive CSE Domains Knowledge Mapping
const GOAL_SKILL_MAP = {
  "frontend developer": [
    "React 19",
    "TypeScript",
    "Tailwind CSS",
    "State Management (Zustand/Redux)",
    "Next.js / SSR",
    "Web Performance & Core Web Vitals",
  ],
  "backend developer": [
    "Node.js / Express",
    "Python / FastAPI",
    "REST & gRPC APIs",
    "PostgreSQL & Database Indexing",
    "Distributed Caching (Redis)",
    "Microservices & Message Queues (Kafka)",
  ],
  "full stack": [
    "React / TypeScript",
    "Node.js / Express / Go",
    "PostgreSQL & MongoDB",
    "System Design & REST/GraphQL",
    "Docker & Cloud Deployment",
    "CI/CD Pipelines",
  ],
  "data science": [
    "Python (NumPy, Pandas)",
    "Statistical Data Analysis",
    "SQL & Data Warehousing",
    "Machine Learning (Scikit-Learn)",
    "Data Visualization (Matplotlib, Seaborn)",
    "Big Data Processing (Apache Spark)",
  ],
  "machine learning": [
    "Python",
    "PyTorch / TensorFlow",
    "Deep Learning & CNNs/RNNs",
    "Transformer Models & Attention",
    "Large Language Models (LLMs) & Fine-Tuning",
    "MLOps & Model Serving (FastAPI, Docker, Triton)",
  ],
  "devops & cloud": [
    "Linux Administration",
    "Docker Containerization",
    "Kubernetes Orchestration",
    "CI/CD (GitHub Actions, GitLab CI)",
    "Infrastructure as Code (Terraform)",
    "Cloud Architecture (AWS / GCP / Azure)",
    "Monitoring & Telemetry (Prometheus, Grafana)",
  ],
  "cybersecurity": [
    "Network Protocols (TCP/IP, TLS, DNS)",
    "OWASP Top 10 Web Vulnerabilities",
    "Applied Cryptography (AES, RSA, ECC, Hashing)",
    "Penetration Testing & Burp Suite",
    "Zero Trust & Identity Management (JWT, OAuth)",
    "Security Information & Event Management (SIEM)",
  ],
  "competitive programming": [
    "Time & Space Complexity (Big-O Analysis)",
    "Arrays, Strings & Two Pointers",
    "Trees, BST & Heaps",
    "Graph Algorithms (BFS, DFS, Dijkstra, MST)",
    "Dynamic Programming (0/1 Knapsack, LCS, LIS, Bitmask DP)",
    "Advanced Structures (Segment Trees, Trie, Fenwick Tree)",
  ],
  "systems & embedded": [
    "C & Modern C++ (Pointers, Memory, RAII)",
    "Rust Systems Programming",
    "Operating Systems Concepts (Threads, Mutex, Deadlocks, Paging)",
    "Computer Architecture (Cache L1/L2/L3, Pipelining)",
    "Microcontrollers (ESP32, STM32, Arduino)",
    "IoT Protocols (MQTT, I2C, SPI, UART)",
  ],
  "mobile development": [
    "React Native / Flutter & Dart",
    "Native Android (Kotlin, Jetpack Compose)",
    "Native iOS (Swift, SwiftUI)",
    "Offline-First Architecture & SQLite",
    "Push Notifications & Deep Linking",
    "Mobile Performance Profiling & App Optimization",
  ],
  "database engineering": [
    "Advanced SQL & Schema Normalization",
    "ACID Guarantees & Transaction Isolation Levels",
    "B-Tree, LSM-Tree & GIN Index Internals",
    "NoSQL Architecture (MongoDB, Cassandra, Redis)",
    "Database Sharding, Replication & CAP Theorem",
    "Vector Databases & Similarity Search (pgvector, HNSW)",
  ],
  "blockchain & web3": [
    "Distributed Ledger & Consensus (PoW, PoS)",
    "Smart Contract Development (Solidity)",
    "Ethereum Virtual Machine (EVM) Internals",
    "Smart Contract Security Auditing & Reentrancy Guards",
    "Web3 Integration (Ethers.js, Viem, Wagmi)",
    "Zero-Knowledge Proofs (zk-SNARKs)",
  ],
  "system design": [
    "High-Level Design (HLD) & Low-Level Design (LLD)",
    "Scalability & Load Balancing (L4 vs L7, Consistent Hashing)",
    "Distributed Caching Strategies (Cache-Aside, Write-Back)",
    "Message Brokers (Apache Kafka, RabbitMQ)",
    "Rate Limiting Algorithms (Token Bucket, Leaky Bucket)",
    "Database Partitioning & 2PC / Saga Distributed Transactions",
  ],
  "game development": [
    "Unity & C# / Unreal Engine & C++",
    "3D Vector Mathematics & Physics Engines",
    "Shader Programming (GLSL/HLSL)",
    "Game Loop Architecture & Frame Rate Optimization",
    "Multiplayer Networking & State Synchronization",
  ],
};

const inferSkillGaps = (userProfile, goal, message = "") => {
  const query = `${goal || ""} ${message || ""}`.toLowerCase();
  
  let matchedKey = null;
  for (const key of Object.keys(GOAL_SKILL_MAP)) {
    const tokens = key.split(/[\s&/]+/);
    if (tokens.some((token) => token.length > 2 && query.includes(token))) {
      matchedKey = key;
      break;
    }
  }

  const targetSkills = matchedKey ? GOAL_SKILL_MAP[matchedKey] : GOAL_SKILL_MAP["full stack"];
  const owned = new Set(
    [...(userProfile.teachSkills || []), ...(userProfile.learnSkills || [])].map(
      (s) => s.toLowerCase().trim()
    )
  );

  return targetSkills
    .filter((skill) => !owned.has(skill.toLowerCase().trim()))
    .map((skill) => ({
      skill,
      priority: "high",
      reason: `Essential milestone for ${matchedKey || goal || "CSE Mastery"} based on current industry standards.`,
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
  const gaps = inferSkillGaps(userProfile, goal, message);
  const name = userProfile.fullName || "Engineer";

  return {
    careerDirection: `${name}, based on your current technical baseline and CSE career focus (${goal || "Computer Science Specialization"}), prioritize mastering core architectural fundamentals and modern tooling across ${(userProfile.learnSkills || []).slice(0, 3).join(", ") || gaps.map((g) => g.skill).slice(0, 2).join(", ")}.`,
    skillGapAnalysis: gaps,
    learningRoadmap: [
      {
        phase: "Phase 1: Foundations & Core Concepts",
        focus: gaps[0]?.skill || "Core Algorithmic Foundations",
        action: "Master theoretical principles, time/space complexity, and complete hands-on implementations.",
      },
      {
        phase: "Phase 2: Architectural Integration & Best Practices",
        focus: gaps[1]?.skill || "Distributed Architecture",
        action: "Build end-to-end working modules, integrate automated unit/integration testing, and apply clean architecture.",
      },
      {
        phase: "Phase 3: Production Engineering & Showcase",
        focus: gaps[2]?.skill || "Production Deployment & Scaling",
        action: `Ship a production-grade project showcasing ${goal || "CSE domain excellence"} with performance benchmarks.`,
      },
    ],
    suggestedProjects: [
      `Build a high-performance system applying ${gaps[0]?.skill || "core principles"} with real-time benchmarking`,
      "Design an event-driven microservice or asynchronous pipeline featuring structured error handling and observability",
      "Author a technical deep-dive writeup detailing your architectural trade-offs, scalability bottlenecks, and solutions",
    ],
    recommendedSkills: gaps.map((g) => g.skill).slice(0, 6),
    prioritySteps: gaps.slice(0, 3).map((g, i) => ({
      step: `Master ${g.skill}`,
      timeframe: i === 0 ? "Next 2 weeks" : i === 1 ? "Weeks 3-5" : "Month 2",
      why: g.reason,
    })),
    mentorSuggestions,
    reply: `Hello ${name}! For "${message}", the key to advancing in this CSE domain is mastering ${gaps[0]?.skill || "the core missing competencies"}. Focus on structural understanding rather than surface-level tutorials. Review your tailored roadmap below to systematically bridge your skill gaps.`,
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
    throw new Error("Model returned invalid JSON format");
  }
};

const getSafeGeminiModelName = () => {
  const envModel = process.env.GEMINI_MODEL;
  if (!envModel || envModel.includes("1.5") || envModel.includes("8b")) {
    return "gemini-2.5-flash";
  }
  return envModel;
};

const invokeLLM = async (systemPrompt, userPrompt) => {
  // 1. Primary: Google Gemini (High reasoning, multi-language Bengali/English, up-to-date)
  if (process.env.GOOGLE_API_KEY) {
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const modelName = getSafeGeminiModelName();
      const geminiModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.25,
        },
      });

      const fullPrompt = `${systemPrompt}\n\n---\n${userPrompt}`;
      const result = await geminiModel.generateContent(fullPrompt);
      const text = result?.response?.text();
      if (text) {
        return {
          content: text,
          mode: `gemini (${modelName})+rag`,
        };
      }
    } catch (err) {
      console.warn("[AI Advisor] Gemini invocation failed, trying Groq fallback:", err.message);
    }
  }

  // 2. Secondary: Groq LLM
  if (process.env.GROQ_API_KEY) {
    try {
      const groqModel = new ChatGroq({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.25,
        apiKey: process.env.GROQ_API_KEY,
      });
      const completion = await groqModel.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      return {
        content: completion.content,
        mode: "groq+rag",
      };
    } catch (err) {
      console.warn("[AI Advisor] Groq invocation failed:", err.message);
    }
  }

  return null;
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
    .map((c, i) => `[Doc ${i + 1}: ${c.source} | Category: ${c.category || "General"}]\n${c.content.slice(0, 1000)}`)
    .join("\n\n");

  const systemPrompt = `You are the Principal AI Computer Science & Engineering (CSE) Advisor & Technical Mentor inside the "Collaborative Skill Engine" platform.
You possess authoritative mastery across ALL academic and industry domains of Computer Science & Engineering, including:
1. Software Engineering, Clean Architecture, Design Patterns (GoF), SOLID principles, Microservices, and Distributed Systems.
2. Data Structures, Algorithms & Competitive Programming (Asymptotic Analysis, Dynamic Programming, Graph Theory, Trees, Greedy, LeetCode/Codeforces strategies).
3. Backend & Cloud Infrastructure (Node.js/Express, Python/FastAPI/Django, Go, Java Spring Boot, PostgreSQL, MongoDB, Redis, Kafka, Docker, Kubernetes, AWS/GCP).
4. Frontend Engineering (React 19, TypeScript, Next.js, Web Vitals, Rendering Performance, State Management).
5. Artificial Intelligence, Machine Learning & Deep Learning (PyTorch, TensorFlow, CNNs, Transformers, LLMs, RAG, Fine-tuning, MLOps).
6. Cybersecurity & Ethical Hacking (OWASP Top 10, Network Security, Cryptography, Penetration Testing, Zero Trust, Incident Response).
7. Computer Systems, Operating Systems & Embedded Systems/IoT (Concurrency, Memory Management, Linux Internals, C/C++, Rust, RTOS, ESP32, MQTT).
8. Database Systems (RDBMS ACID, Indexing B-Trees/LSM, NoSQL, Sharding, Vector Databases).
9. Mobile Development (Flutter, React Native, Native Kotlin/Swift, Offline-First Sync).
10. Blockchain & Web3 (Solidity, EVM, Smart Contracts Security, DeFi).

STRICT OPERATIONAL RULES:
- Provide rigorous, technically immaculate, and actionable advice. Never give superficial or generic statements.
- Address complex engineering concepts with clear intuition, concrete tools, and architectural guidance.
- Natural Language Adaptation: If the user communicates in Bengali (বাংলা), formulate your conversational "reply" in natural, professional, polished Bengali while preserving standard English technical terms (e.g., "Dynamic Programming", "Dijkstra's Algorithm", "Cache Invalidation", "B-Tree Indexing", "Deadlock Prevention", "Microservices"). If the user asks in English, reply in English.
- Personalization: Always reference the user's name, profile skills, proficiency level, education, and stated goals.
- Code & Debugging Sandbox: When providing algorithms, data structures, or code solutions, always provide complete, runnable code inside standard Markdown code fences (e.g. \`\`\`python, \`\`\`cpp, or \`\`\`javascript) so the student can immediately test it via the in-chat live runner. When the student asks for debugging or reports an error/crash:
  1. Pinpoint the exact faulty line number and reason for the crash or logic flaw.
  2. Explain the root cause clearly in accessible language.
  3. Provide the complete corrected code inside a Markdown code block ready for live 1-click execution.

VISUAL & AESTHETIC PRESENTATION RULES (HIGH PRIORITY):
- Never output an unbroken wall of plain text paragraphs. Structure your conversational "reply" with beautiful, eye-catching Markdown:
  1. Header / Intuition Summary: Start with a crisp headline like \`### 🎯 Strategy Overview\` or \`### 🧠 Core Intuition\`.
  2. Structured Breakdown: Use bullet points with bold lead-ins (e.g. \`• **Mechanism:** ...\`).
  3. Comparison Tables: When comparing concepts, patterns, or tools (e.g. SQL vs NoSQL, Mutex vs Semaphore), ALWAYS format as a neat Markdown table:
     | Criterion | Approach A | Approach B | Industry Recommendation |
     |---|---|---|---|
  4. Code Snippets: Include clean, commented code inside \`\`\`python, \`\`\`cpp, or \`\`\`javascript blocks with 1-click execution.
  5. Callout Blocks:
     Use \`> 💡 **Engineering Pro-Tip:** ...\` for high-value architectural optimizations.
     Use \`> ⚠️ **Common Trap:** ...\` for subtle gotchas, memory leaks, or edge cases.
  6. Actionable Checklist: Conclude with a 2-3 step checklist using \`- [ ] Step 1: ...\`.
- Emphasize keywords with inline code \`like_this\` and bolding **like this**.

- Output ONLY valid JSON strictly adhering to the schema below without any Markdown fences or extra commentary outside the JSON:
{
  "careerDirection": "string (1-2 sentences on specific trajectory and strategy)",
  "skillGapAnalysis": [
    { "skill": "string", "priority": "high|medium|low", "reason": "string (concrete industry rationale)" }
  ],
  "learningRoadmap": [
    { "phase": "string", "focus": "string", "action": "string (specific actionable curriculum/task)" }
  ],
  "suggestedProjects": ["string (concrete production-grade project idea with tech stack)"],
  "recommendedSkills": ["string"],
  "prioritySteps": [
    { "step": "string", "timeframe": "string", "why": "string" }
  ],
  "mentorSuggestions": [
    { "fullName": "string", "email": "string", "reason": "string", "matchPercentage": number }
  ],
  "reply": "string (direct, deeply helpful conversational answer to the user's message)"
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
    headline: userProfile.headline,
    bio: userProfile.bio,
    connectionsCount: (userProfile.connections || []).length,
  },
  null,
  2
)}

GOAL: ${goal || "General Computer Science & Engineering Excellence"}
USER MESSAGE: ${message}

MEMORY:
- Platform Chat Summary: ${memoryContext.platformChatSummary || "None"}
- Advisor History Summary: ${memoryContext.advisorChatSummary || "None"}
- Recent Goals: ${(memoryContext.recentGoals || []).join(", ") || "None"}

AVAILABLE PLATFORM MENTORS:
${JSON.stringify(mentorSuggestions.slice(0, 5), null, 2)}

DOMAIN KNOWLEDGE BASE (RAG RETRIEVAL):
${ragContext || "No domain knowledge retrieved."}`;

  try {
    const llmResult = await invokeLLM(systemPrompt, userPrompt);
    if (!llmResult) {
      throw new Error("No active LLM provider available");
    }

    const parsed = parseJsonFromModel(
      typeof llmResult.content === "string"
        ? llmResult.content
        : JSON.stringify(llmResult.content)
    );

    return {
      ...parsed,
      mentorSuggestions:
        parsed.mentorSuggestions?.length > 0
          ? parsed.mentorSuggestions
          : mentorSuggestions,
      retrievedSources: ragResult.chunks.map((c) => c.source),
      mode: llmResult.mode,
    };
  } catch (llmError) {
    console.warn("[AI Advisor] LLM invocation failed, using domain fallback:", llmError.message);
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

const streamAdvisorResponse = async ({
  userProfile,
  goal,
  message,
  memoryContext,
  mentorSuggestions,
  onToken,
}) => {
  let ragResult;
  try {
    ragResult = await retrieveRelevantDocuments({
      goal,
      message,
      teachSkills: userProfile.teachSkills || [],
      learnSkills: userProfile.learnSkills || [],
      limit: 3,
    });
  } catch (err) {
    ragResult = { chunks: [], retrievedText: "" };
  }

  const ragContext = ragResult.chunks
    .map((c) => `--- SOURCE: ${c.source} ---\n${c.text}`)
    .join("\n\n");

  const prompt = `You are the Principal AI Computer Science & Engineering (CSE) Advisor & Technical Mentor inside the "Collaborative Skill Engine" platform.
Format your output strictly into two sections:
[REPLY]
(Provide a direct, deeply technical, and conversational answer in Markdown. If the user writes in Bengali, reply in natural, polished Bengali while preserving all standard English technical terminology.)

VISUAL & AESTHETIC PRESENTATION RULES (CRITICAL):
- Never output an unbroken wall of plain text paragraphs. Make the response look exceptionally clean, modern, and beautifully structured:
  1. Header / Intuition Summary: Start with a crisp headline like \`### 🎯 Strategy Overview\` or \`### 🧠 Core Intuition\`.
  2. Structured Breakdown: Use bullet points with bold lead-ins (e.g. \`• **Mechanism:** ...\`).
  3. Comparison Tables: When comparing concepts, patterns, or tools (e.g. SQL vs NoSQL, Mutex vs Semaphore), ALWAYS format as a neat Markdown table:
     | Criterion | Approach A | Approach B | Industry Verdict |
     |---|---|---|---|
  4. Code Snippets: When code is helpful or requested, provide clean, runnable, commented code inside \`\`\`python, \`\`\`cpp, or \`\`\`javascript blocks ready for live 1-click execution.
  5. Callout Blocks:
     Use \`> 💡 **Engineering Pro-Tip:** ...\` for architectural optimizations.
     Use \`> ⚠️ **Common Trap:** ...\` for subtle gotchas, memory leaks, or edge cases.
  6. Actionable Checklist: Conclude with a 2-3 step checklist using \`- [ ] Step 1: ...\`.
- Emphasize keywords with inline code \`like_this\` and bolding **like this**.
[/REPLY]
[INSIGHTS]
{
  "careerDirection": "string (1-2 sentences on specific trajectory and strategy)",
  "skillGapAnalysis": [
    { "skill": "string", "priority": "high|medium|low", "reason": "string (concrete industry rationale)" }
  ],
  "learningRoadmap": [
    { "phase": "string", "focus": "string", "action": "string (specific actionable curriculum/task)" }
  ],
  "suggestedProjects": ["string (concrete production-grade project idea with tech stack)"],
  "recommendedSkills": ["string"],
  "prioritySteps": [
    { "step": "string", "timeframe": "string", "why": "string" }
  ]
}
[/INSIGHTS]

USER CONTEXT:
- Name: ${userProfile.fullName || "Engineer"}
- Target Goal: ${goal || "Software Engineering"}
- Teach Skills: ${(userProfile.teachSkills || []).join(", ") || "None"}
- Learn Skills: ${(userProfile.learnSkills || []).join(", ") || "None"}
- Platform Chat Summary: ${memoryContext?.platformChatSummary || "None"}

DOMAIN KNOWLEDGE BASE:
${ragContext || "No domain knowledge retrieved."}

USER MESSAGE:
"${message}"`;

  let inReply = false;
  let inInsights = false;
  let fullReply = "";
  let insightsRaw = "";
  let streamSuccess = false;

  if (process.env.GOOGLE_API_KEY) {
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const modelName = getSafeGeminiModelName();
      const geminiModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.25 },
      });

      const responseStream = await geminiModel.generateContentStream(prompt);

      for await (const chunk of responseStream.stream) {
        const text = chunk.text();
        if (!text) continue;

        let cur = text;
        if (!inReply && !inInsights && cur.includes("[REPLY]")) {
          const parts = cur.split("[REPLY]");
          cur = parts[1] || "";
          inReply = true;
        }

        if (inReply) {
          if (cur.includes("[/REPLY]")) {
            const parts = cur.split("[/REPLY]");
            const token = parts[0];
            if (token) {
              fullReply += token;
              onToken?.(token);
            }
            inReply = false;
            inInsights = true;
            if (parts[1] && parts[1].includes("[INSIGHTS]")) {
              insightsRaw += parts[1].split("[INSIGHTS]")[1] || "";
            }
          } else {
            fullReply += cur;
            onToken?.(cur);
          }
        } else if (inInsights) {
          insightsRaw += cur;
        } else {
          fullReply += cur;
          onToken?.(cur);
        }
      }
      streamSuccess = true;
    } catch (err) {
      console.warn("[AI Advisor Stream] Gemini streaming failed:", err.message);
    }
  }

  let parsedInsights = {};
  if (insightsRaw) {
    try {
      const cleaned = insightsRaw.replace("[/INSIGHTS]", "").trim();
      parsedInsights = parseJsonFromModel(cleaned);
    } catch {
      parsedInsights = {};
    }
  }

  if (!streamSuccess || !fullReply) {
    const fallback = buildStructuredFallback({
      userProfile,
      goal,
      message,
      ragChunks: ragResult.chunks,
      mentorSuggestions,
      memoryContext,
    });
    const words = (fallback.reply || "").split(" ");
    for (const w of words) {
      onToken?.(w + " ");
    }
    return {
      ...fallback,
      mentorSuggestions,
      retrievedSources: ragResult.chunks.map((c) => c.source),
      mode: "fallback",
    };
  }

  const gaps = inferSkillGaps(userProfile, goal, message);
  return {
    reply: fullReply.trim(),
    careerDirection: parsedInsights.careerDirection || `Target direction for ${goal || "Engineering"}`,
    skillGapAnalysis: parsedInsights.skillGapAnalysis?.length > 0 ? parsedInsights.skillGapAnalysis : gaps,
    learningRoadmap: parsedInsights.learningRoadmap?.length > 0 ? parsedInsights.learningRoadmap : [
      { phase: "Phase 1: Foundations", focus: "Core CS & Language Internals", action: "Build foundational project" },
      { phase: "Phase 2: Advanced Scalability", focus: "System Design & Cloud Architecture", action: "Deploy containerized services" }
    ],
    suggestedProjects: parsedInsights.suggestedProjects || [`Production-ready ${goal || "CSE"} project`],
    recommendedSkills: parsedInsights.recommendedSkills || gaps.map(g => g.skill),
    prioritySteps: parsedInsights.prioritySteps || gaps.slice(0, 3).map((g, i) => ({
      step: `Master ${g.skill}`,
      timeframe: `Week ${i + 1}`,
      why: g.reason
    })),
    mentorSuggestions,
    retrievedSources: ragResult.chunks.map((c) => c.source),
    mode: "gemini-stream+rag",
  };
};

const generateMockInterviewPrompt = ({ userProfile, role, level, action, interviewHistory, candidateAnswer }) => {
  const historyText = (interviewHistory || [])
    .map((h) => `${h.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${h.text || h.message || h.content}`)
    .join("\n\n");

  return `You are a Principal Engineering Director & Lead Technical Interviewer at a top-tier tech company (Google/Meta level) conducting a live 1-on-1 technical interview.

CANDIDATE DETAILS:
- Name: ${userProfile.fullName || "Candidate"}
- Target Role: ${role}
- Experience Level: ${level} (Junior: 0-2 yrs, Mid-Level: 2-5 yrs, Senior: 5+ yrs)
- Candidate Background & Teach Skills: ${(userProfile.teachSkills || []).join(", ") || "General CSE"}
- Candidate Learn Skills: ${(userProfile.learnSkills || []).join(", ") || "Advanced Systems"}

INTERVIEW HISTORY SO FAR:
${historyText || "No previous turns. This is the start of the interview."}

LATEST CANDIDATE INPUT:
${candidateAnswer || (action === "start" ? "Candidate just initiated the interview session." : "No input provided.")}

CURRENT ACTION REQUESTED: "${action}" (Options: "start" | "answer" | "conclude")

INSTRUCTIONS FOR ACTION "${action}":
${
  action === "start"
    ? `1. Greet the candidate professionally and warm them up (1 short sentence).
2. State the target role (${role} - ${level}) and outline that you will cover progressive technical rounds (Language Internals, Concurrency/Scale, Database/Storage Architecture, High-Scale System Design).
3. Immediately ask Question 1: A deep, realistic scenario-based question tailored to ${role} at ${level} level. Ask only ONE question.`
    : action === "answer"
    ? `1. Briefly evaluate the candidate's answer with precise technical critique (point out what was accurate, and what was missing or shallow).
2. If the answer had edge cases missing, ask a sharp follow-up probe. If the answer was thorough, transition smoothly and ask the NEXT technical round question.
3. Keep the conversation engaging, challenging, and strictly ONE question at a time.`
    : `The interview is concluded. Provide an official, rigorous "Technical Interview Scorecard" formatted with:
- **Overall Rating**: [Score out of 10, e.g. 8.2/10]
- **Hiring Recommendation**: [Strong Hire / Hire / Leaning Hire / Needs Growth]
- **Skill Breakdown**:
  * Core Language & Internals: [Score/10]
  * Concurrency & Scalability: [Score/10]
  * Database & Architectural Design: [Score/10]
  * Communication & Problem Solving: [Score/10]
- **Key Strengths (শক্তিশালী দিক)**: 3-4 specific technical strengths shown during the interview.
- **Critical Growth Areas (উন্নতির জায়গা)**: Concrete gaps, missing trade-offs, or unhandled failure modes.
- **Model Answers**: A concise bulleted architectural summary of how a Senior Staff Engineer would ideally answer the questions asked.`
}

LANGUAGE & TONE:
- If candidate communicates in Bengali, formulate your conversational explanation in natural professional Bengali while keeping all technical terms in English (e.g. "Event Loop", "Garbage Collection", "Mutex", "Connection Pooling", "Cache stampede", "Optimistic Concurrency"). If in English, reply in English.
- Be encouraging, highly competent, and direct.`;
};

const streamInterviewTurn = async ({
  userProfile,
  role = "Backend Engineer",
  level = "Mid-Level",
  action = "start",
  interviewHistory = [],
  candidateAnswer = "",
  onToken,
}) => {
  const prompt = generateMockInterviewPrompt({
    userProfile,
    role,
    level,
    action,
    interviewHistory,
    candidateAnswer,
  });

  let fullReply = "";
  if (process.env.GOOGLE_API_KEY) {
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const modelName = getSafeGeminiModelName();
      const geminiModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.35 },
      });

      const responseStream = await geminiModel.generateContentStream(prompt);
      for await (const chunk of responseStream.stream) {
        const text = chunk.text();
        if (text) {
          fullReply += text;
          onToken?.(text);
        }
      }
      return { success: true, reply: fullReply.trim() };
    } catch (err) {
      console.warn("[Mock Interview Stream] Gemini error:", err.message);
    }
  }

  // Fallback
  const fallbackReply = action === "start"
    ? `Welcome ${userProfile.fullName || "Candidate"} to your ${role} (${level}) technical interview. Let's begin Round 1: How does asynchronous I/O and event-driven architecture work in high-concurrency systems?`
    : `Thank you for your answer. In production, we also need to guard against deadlocks and connection exhaustion. How would you handle connection pooling and exponential backoff under high load?`;

  const words = fallbackReply.split(" ");
  for (const w of words) {
    onToken?.(w + " ");
  }
  return { success: true, reply: fallbackReply };
};

module.exports = {
  generateAdvisorResponse,
  streamAdvisorResponse,
  streamInterviewTurn,
  inferSkillGaps,
  GOAL_SKILL_MAP,
};
