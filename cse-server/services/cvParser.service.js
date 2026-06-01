const { ChatGroq } = require("@langchain/groq");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const { INITIAL_SKILLS } = require("../data/initialSkills");
const { normalize } = require("../utils/skillNormalize");

const LLM_TIMEOUT_MS = 20000;

const withTimeout = (promise, ms, label = "Request") =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms,
      );
    }),
  ]);

const KNOWN_SKILL_ALIASES = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  reactjs: "React",
  react: "React",
  nextjs: "Next.js",
  next: "Next.js",
  nodejs: "Node.js",
  node: "Node.js",
  expressjs: "Express.js",
  express: "Express.js",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  mysql: "MySQL",
  python: "Python",
  django: "Django",
  figma: "Figma",
  canva: "Canva",
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  ai: "AI",
  seo: "SEO",
};

const extractTextFromFile = async (file) => {
  const { buffer, mimetype, originalname } = file;

  if (mimetype === "application/pdf" || originalname.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalname.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (mimetype === "text/plain" || originalname.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, or TXT.");
};

const matchToKnownSkill = (skillName) => {
  const trimmed = (skillName || "").trim();
  if (!trimmed) return null;

  const exact = INITIAL_SKILLS.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact;

  const normInput = normalize(trimmed);
  const alias = KNOWN_SKILL_ALIASES[normInput] || KNOWN_SKILL_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const fuzzy = INITIAL_SKILLS.find((s) => normalize(s) === normInput);
  if (fuzzy) return fuzzy;

  const partial = INITIAL_SKILLS.find(
    (s) =>
      normInput.includes(normalize(s)) || normalize(s).includes(normInput),
  );
  if (partial) return partial;

  return trimmed;
};

const dedupeSkills = (skills) => {
  const seen = new Set();
  return skills
    .map((s) => matchToKnownSkill(s))
    .filter(Boolean)
    .filter((s) => {
      const key = normalize(s);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const fallbackExtractSkills = (cvText) => {
  const lower = cvText.toLowerCase();
  const found = [];

  for (const skill of INITIAL_SKILLS) {
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower)) found.push(skill);
  }

  for (const [alias, canonical] of Object.entries(KNOWN_SKILL_ALIASES)) {
    if (alias.length <= 2) continue;
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower) && !found.includes(canonical)) found.push(canonical);
  }

  return dedupeSkills(found);
};

const fallbackSuggestLearn = (teachSkills) => {
  const owned = new Set(teachSkills.map((s) => normalize(s)));
  const suggestions = INITIAL_SKILLS.filter((s) => !owned.has(normalize(s)));

  const priority = [
    "TypeScript",
    "Docker",
    "Machine Learning",
    "Next.js",
    "Express.js",
    "UI Design",
    "UX Design",
    "SEO",
    "Digital Marketing",
  ];

  const ranked = [
    ...priority.filter((s) => suggestions.includes(s)),
    ...suggestions.filter((s) => !priority.includes(s)),
  ];

  return ranked.slice(0, 6);
};

const fallbackProfileDetails = (cvText) => {
  const lines = cvText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const emailMatch = cvText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = cvText.match(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,
  );
  const linkedinMatch = cvText.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i,
  );
  const portfolioMatch = cvText.match(
    /(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:dev|io|com|me|portfolio)[^\s]*/i,
  );

  const educationLine = lines.find((l) =>
    /university|college|institute|b\.?sc|m\.?sc|bachelor|master|diploma/i.test(l),
  );

  const summary = lines.slice(0, 3).join(" ").slice(0, 400);

  return {
    fullName: lines[0]?.slice(0, 80) || "",
    education: educationLine || "",
    summary,
    experience: [],
    educationHistory: educationLine
      ? [{ degree: "", institution: educationLine, year: "" }]
      : [],
    certifications: [],
    languages: [],
    location: "",
    phone: phoneMatch?.[0] || "",
    email: emailMatch?.[0] || "",
    linkedin: linkedinMatch?.[0] || "",
    portfolio: portfolioMatch?.[0] || "",
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

const parseCvWithGroq = async ({ cvText, suggestLearn, teachSkills }) => {
  const model = new ChatGroq({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    temperature: 0.2,
    apiKey: process.env.GROQ_API_KEY,
  });

  const systemPrompt = `You extract structured data from CV/resume text for a skill-matching platform.
Output ONLY valid JSON with this schema:
{
  "teachSkills": ["skills the person already knows and can teach/contribute"],
  "suggestedLearnSkills": ["skills worth learning next — only populate when suggestLearn is true"],
  "profileDetails": {
    "fullName": "string",
    "education": "primary education/institute as one line",
    "summary": "2-3 sentence professional summary",
    "experience": [{"title":"string","company":"string","duration":"string","description":"string"}],
    "educationHistory": [{"degree":"string","institution":"string","year":"string"}],
    "certifications": ["string"],
    "languages": ["string"],
    "location": "string",
    "phone": "string",
    "email": "string",
    "linkedin": "string",
    "portfolio": "string"
  }
}
Rules:
- teachSkills: extract ALL technical and creative skills from the CV (programming, design, tools, frameworks).
- Use standard skill names (e.g. "JavaScript" not "JS", "Node.js" not "NodeJS").
- suggestedLearnSkills: only when suggestLearn=true. Suggest 4-8 skills the person does NOT already have but would benefit from learning based on their background and career trajectory. Do NOT repeat teachSkills.
- profileDetails: extract every useful profile field you can find.
- If a field is missing, use empty string or empty array.`;

  const userPrompt = `KNOWN PLATFORM SKILLS (prefer matching these names when applicable):
${INITIAL_SKILLS.join(", ")}

suggestLearn: ${suggestLearn ? "true" : "false"}
${teachSkills?.length ? `Already selected teach skills: ${teachSkills.join(", ")}` : ""}

CV TEXT:
${cvText.slice(0, 12000)}`;

  const completion = await withTimeout(
    model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]),
    LLM_TIMEOUT_MS,
    "CV analysis",
  );

  const parsed = parseJsonFromModel(
    typeof completion.content === "string"
      ? completion.content
      : JSON.stringify(completion.content),
  );

  return {
    teachSkills: dedupeSkills(parsed.teachSkills || []),
    suggestedLearnSkills: suggestLearn
      ? dedupeSkills(parsed.suggestedLearnSkills || [])
      : [],
    profileDetails: {
      fullName: parsed.profileDetails?.fullName || "",
      education: parsed.profileDetails?.education || "",
      summary: parsed.profileDetails?.summary || "",
      experience: Array.isArray(parsed.profileDetails?.experience)
        ? parsed.profileDetails.experience
        : [],
      educationHistory: Array.isArray(parsed.profileDetails?.educationHistory)
        ? parsed.profileDetails.educationHistory
        : [],
      certifications: Array.isArray(parsed.profileDetails?.certifications)
        ? parsed.profileDetails.certifications
        : [],
      languages: Array.isArray(parsed.profileDetails?.languages)
        ? parsed.profileDetails.languages
        : [],
      location: parsed.profileDetails?.location || "",
      phone: parsed.profileDetails?.phone || "",
      email: parsed.profileDetails?.email || "",
      linkedin: parsed.profileDetails?.linkedin || "",
      portfolio: parsed.profileDetails?.portfolio || "",
    },
    mode: "groq",
  };
};

const parseCv = async ({ file, suggestLearn = false, teachSkills = [] }) => {
  const cvText = (await extractTextFromFile(file)).trim();

  if (!cvText || cvText.length < 50) {
    throw new Error(
      "Could not extract enough text from the CV. Try a text-based PDF or DOCX file.",
    );
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const result = await parseCvWithGroq({ cvText, suggestLearn, teachSkills });
      return { ...result, cvText };
    } catch (err) {
      console.warn("[CV Parser] Groq failed, using fallback:", err.message);
    }
  }

  const teach = fallbackExtractSkills(cvText);
  return {
    teachSkills: teach,
    suggestedLearnSkills: suggestLearn
      ? fallbackSuggestLearn(teachSkills.length ? teachSkills : teach)
      : [],
    profileDetails: fallbackProfileDetails(cvText),
    cvText,
    mode: "keyword-fallback",
  };
};

const suggestLearnFromCv = async ({ cvText, teachSkills }) => {
  if (!cvText?.trim()) {
    throw new Error("CV text not available. Please upload your CV again.");
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const result = await parseCvWithGroq({
        cvText,
        suggestLearn: true,
        teachSkills,
      });
      return {
        suggestedLearnSkills: result.suggestedLearnSkills,
        mode: result.mode,
      };
    } catch (err) {
      console.warn("[CV Parser] Learn suggest failed, using fallback:", err.message);
    }
  }

  return {
    suggestedLearnSkills: fallbackSuggestLearn(teachSkills),
    mode: "keyword-fallback",
  };
};

module.exports = {
  extractTextFromFile,
  parseCv,
  suggestLearnFromCv,
  matchToKnownSkill,
  dedupeSkills,
};
