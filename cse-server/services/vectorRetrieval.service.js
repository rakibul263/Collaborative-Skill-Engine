const fs = require("fs");
const path = require("path");
const { Document } = require("@langchain/core/documents");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { loadKnowledgeDocuments } = require("./knowledgeLoader");

const VECTOR_DIR = path.join(__dirname, "../storage/faiss-index");
let vectorStore = null;
let initPromise = null;
let vectorDisabled = false;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);

// Embeddings: use Google if available, otherwise vector store is disabled (keyword fallback used)
const getEmbeddings = () => {
  if (process.env.GOOGLE_API_KEY) {
    const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
    return new GoogleGenerativeAIEmbeddings({
      model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }
  throw new Error("No embedding provider available — vector store disabled");
};

const buildVectorStore = async () => {
  const rawDocs = loadKnowledgeDocuments().map(
    (doc) =>
      new Document({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      }),
  );

  if (rawDocs.length === 0) {
    throw new Error("No knowledge documents found");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 900,
    chunkOverlap: 120,
  });
  const chunks = await splitter.splitDocuments(rawDocs);
  const embeddings = getEmbeddings();
  const store = await FaissStore.fromDocuments(chunks, embeddings);

  fs.mkdirSync(path.dirname(VECTOR_DIR), { recursive: true });
  await store.save(VECTOR_DIR);
  return store;
};

const initVectorStore = async () => {
  if (vectorStore) return vectorStore;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let embeddings;
    try {
      embeddings = getEmbeddings();
    } catch {
      console.warn(
        "[AI Advisor] No embedding provider — RAG vector store disabled, using keyword fallback",
      );
      vectorDisabled = true;
      return null;
    }

    if (fs.existsSync(path.join(VECTOR_DIR, "faiss.index"))) {
      vectorStore = await FaissStore.load(VECTOR_DIR, embeddings);
      return vectorStore;
    }

    console.log("[AI Advisor] Building FAISS index from knowledge docs...");
    vectorStore = await buildVectorStore();
    console.log("[AI Advisor] FAISS index ready");
    return vectorStore;
  })();

  try {
    return await withTimeout(initPromise, 45000, "FAISS init");
  } catch (error) {
    console.warn("[AI Advisor] Vector store unavailable:", error.message);
    initPromise = null;
    vectorDisabled = true;
    return null;
  }
};

const retrieveRelevantDocuments = async ({
  goal = "",
  message = "",
  teachSkills = [],
  learnSkills = [],
  topK = 5,
}) => {
  if (vectorDisabled) {
    return keywordFallbackRetrieve({ goal, teachSkills, learnSkills });
  }

  const store = await initVectorStore();
  if (!store) {
    return keywordFallbackRetrieve({ goal, teachSkills, learnSkills });
  }

  const query = [
    `Career goal: ${goal}`,
    `User question: ${message}`,
    `Skills to teach: ${teachSkills.join(", ")}`,
    `Skills to learn: ${learnSkills.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const results = await store.similaritySearch(query, topK);
  const chunks = results.map((doc) => ({
    content: doc.pageContent,
    source: doc.metadata?.source || "unknown",
    topic: doc.metadata?.topic || "",
    category: doc.metadata?.category || "",
  }));

  return { chunks, query };
};

const keywordFallbackRetrieve = ({ goal, teachSkills, learnSkills }) => {
  const rawDocs = loadKnowledgeDocuments();
  const terms = [
    goal,
    ...teachSkills,
    ...learnSkills,
    "roadmap",
    "career",
  ]
    .join(" ")
    .toLowerCase();

  const scored = rawDocs
    .map((doc) => {
      const text = doc.pageContent.toLowerCase();
      let score = 0;
      if (goal && text.includes(goal.toLowerCase().split(" ")[0])) {
        score += 3;
      }
      for (const skill of [...teachSkills, ...learnSkills]) {
        if (skill && text.includes(skill.toLowerCase())) score += 2;
      }
      if (doc.metadata.category && terms.includes(doc.metadata.category)) {
        score += 1;
      }
      return { doc, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    chunks: scored.map(({ doc }) => ({
      content: doc.pageContent.slice(0, 1200),
      source: doc.metadata.source,
      topic: doc.metadata.topic,
      category: doc.metadata.category,
    })),
    query: "keyword-fallback",
  };
};

module.exports = {
  initVectorStore,
  retrieveRelevantDocuments,
  keywordFallbackRetrieve,
  VECTOR_DIR,
};
