const fs = require("fs");
const path = require("path");
const { Document } = require("@langchain/core/documents");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { loadKnowledgeDocuments } = require("./knowledgeLoader");

const VECTOR_DIR = path.join(__dirname, "../storage/faiss-index");
let vectorStore = null;
let initPromise = null;

const getEmbeddings = () => {
  const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
  return new GoogleGenerativeAIEmbeddings({
    model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
    apiKey: process.env.GOOGLE_API_KEY,
  });
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
    if (fs.existsSync(path.join(VECTOR_DIR, "faiss.index"))) {
      vectorStore = await FaissStore.load(VECTOR_DIR, getEmbeddings());
      return vectorStore;
    }

    console.log("[AI Advisor] Building FAISS index from knowledge docs...");
    vectorStore = await buildVectorStore();
    console.log("[AI Advisor] FAISS index ready");
    return vectorStore;
  })();

  try {
    return await initPromise;
  } catch (error) {
    console.warn("[AI Advisor] Vector store unavailable:", error.message);
    initPromise = null;
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
  const store = await initVectorStore();
  if (!store) {
    throw new Error("Vector store not available");
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

module.exports = {
  initVectorStore,
  retrieveRelevantDocuments,
  VECTOR_DIR,
};
