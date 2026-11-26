/**
 * Hybrid Vector Retrieval Engine for Mentor Recommendation
 * 
 * Combines Bi-Encoder Dense Semantic Vector Retrieval with Sparse Okapi BM25 Keyword Search.
 * Formula: HybridScore = α * DenseCosineSimilarity + (1 - α) * NormalizedBM25
 * 
 * Dense Embeddings:
 * - Uses Google text-embedding-004 via @langchain/google-genai when GOOGLE_API_KEY is available.
 * - Built-in Sub-Word Vectorizer fallback when offline or without external API keys.
 * 
 * Sparse Search:
 * - Full implementation of Okapi BM25 (k1 = 1.5, b = 0.75) with dynamic corpus statistics.
 */

// ─── OKAPI BM25 KEYWORD SEARCH ENGINE ───
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "build", "building", "by", "can",
  "do", "for", "from", "get", "have", "help", "how", "i", "in", "into", "is",
  "it", "learn", "learning", "like", "looking", "make", "me", "mentor", "mentors",
  "model", "models", "my", "need", "of", "on", "or", "our", "project", "projects",
  "seek", "seeking", "skill", "skills", "some", "someone", "teach", "teaches",
  "teaching", "that", "the", "their", "them", "this", "to", "use", "using",
  "want", "with", "work", "working", "would", "you", "your",
]);

const tokenize = (text = "", { removeStopwords = true } = {}) => {
  const rawTokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.#+/-]/g, " ")
    .split(/[\s/]+/)
    .flatMap((tok) => {
      if (!tok) return [];
      const parts = [tok];
      // Also index base token for Node.js -> node, React.js -> react
      if (tok.endsWith(".js") && tok.length > 3) {
        parts.push(tok.slice(0, -3));
      }
      return parts;
    });

  return rawTokens.filter((t) => {
    if (!(t.length > 1 || t === "c" || t === "r")) return false;
    if (removeStopwords && STOPWORDS.has(t)) return false;
    return true;
  });
};

class OkapiBM25 {
  constructor(documents = [], k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.corpusSize = documents.length;
    this.docLengths = [];
    this.docTermFreqs = [];
    this.docFreqs = {}; // n(t): number of docs containing term t
    this.avgDocLength = 0;

    let totalLength = 0;

    documents.forEach((doc, idx) => {
      const tokens = tokenize(doc.text);
      this.docLengths[idx] = tokens.length;
      totalLength += tokens.length;

      const tf = {};
      const uniqueTerms = new Set();

      tokens.forEach((term) => {
        tf[term] = (tf[term] || 0) + 1;
        uniqueTerms.add(term);
      });

      this.docTermFreqs[idx] = tf;

      uniqueTerms.forEach((term) => {
        this.docFreqs[term] = (this.docFreqs[term] || 0) + 1;
      });
    });

    this.avgDocLength = this.corpusSize > 0 ? totalLength / this.corpusSize : 1;
  }

  // Robertson-Spärck Jones IDF
  idf(term) {
    const docFreq = this.docFreqs[term] || 0;
    const n = this.corpusSize;
    return Math.log(1 + (n - docFreq + 0.5) / (docFreq + 0.5));
  }

  scoreQuery(queryText) {
    const queryTokens = tokenize(queryText);
    const scores = [];

    for (let idx = 0; idx < this.corpusSize; idx++) {
      let score = 0;
      const docLength = this.docLengths[idx] || 1;
      const tfMap = this.docTermFreqs[idx] || {};

      for (const token of queryTokens) {
        if (!tfMap[token]) continue;

        const termFreq = tfMap[token];
        const termIdf = this.idf(token);
        const numerator = termFreq * (this.k1 + 1);
        const denominator =
          termFreq +
          this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

        score += termIdf * (numerator / denominator);
      }

      scores[idx] = Math.max(0, score);
    }

    return scores;
  }
}

// ─── DENSE VECTOR EMBEDDING & COSINE SIMILARITY ───
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// FNV-1a 32-bit hash for position-independent sub-word & token projection
const fnv1aHash = (str = "") => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

// Pure JavaScript Deterministic Sub-Word Hashing Dense Vectorizer (Resilient Fallback)
const generateLocalDenseEmbedding = (text = "", dims = 512) => {
  const vector = new Array(dims).fill(0);
  const tokens = tokenize(text);

  tokens.forEach((token) => {
    // Whole-token feature (position-independent so query and profile align reliably)
    const wholeIdx = fnv1aHash(`w:${token}`) % dims;
    vector[wholeIdx] += 2.0;

    // Character bi-grams & tri-grams for partial/morphological skill overlap
    for (let i = 0; i < token.length - 1; i++) {
      const biIdx = fnv1aHash(`b:${token.slice(i, i + 2)}`) % dims;
      vector[biIdx] += 0.5 / (1 + Math.log(token.length));
      if (i < token.length - 2) {
        const triIdx = fnv1aHash(`t:${token.slice(i, i + 3)}`) % dims;
        vector[triIdx] += 0.85 / (1 + Math.log(token.length));
      }
    }
  });

  // L2 Normalize vector
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vector.map((v) => v / norm) : vector;
};

let remoteEmbeddingsDisabled = false;
let activeRemoteEmbeddingModel = null;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

const isValidEmbeddingVector = (vec) =>
  Array.isArray(vec) && vec.length > 0 && vec.some((v) => Number.isFinite(v) && v !== 0);

const toSkillArray = (skills) => {
  if (Array.isArray(skills)) {
    return skills.map((s) => String(s || "").trim()).filter(Boolean);
  }
  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const getRemoteModelCandidates = () => {
  if (remoteEmbeddingsDisabled || !process.env.GOOGLE_API_KEY) return [];
  if (activeRemoteEmbeddingModel) return [activeRemoteEmbeddingModel];
  const configured = String(process.env.GEMINI_EMBEDDING_MODEL || "").trim();
  // text-embedding-004 was deprecated on Gemini v1beta; fall back to gemini-embedding-001 automatically
  const list = [configured, "gemini-embedding-001"].filter(Boolean);
  return Array.from(new Set(list));
};

/**
 * Gets embeddings provider for a specific Google model name & taskType
 */
const createEmbeddingsInstance = (modelName, taskType) => {
  if (!process.env.GOOGLE_API_KEY || !modelName) return null;
  try {
    const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
    return new GoogleGenerativeAIEmbeddings({
      model: modelName,
      apiKey: process.env.GOOGLE_API_KEY,
      ...(taskType ? { taskType } : {}),
    });
  } catch (err) {
    console.warn("[Hybrid Retrieval] Google Generative AI Embeddings init failed:", err.message);
    return null;
  }
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Main Hybrid Mentor Retrieval Engine
 */
const retrieveHybridRecommendedMentors = async ({
  mentors = [],
  query = "",
  alpha = 0.65, // Dense vs Sparse weighting: 0.65 dense semantic + 0.35 keyword
  limit = 8,
}) => {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery || mentors.length === 0) {
    return mentors.slice(0, limit);
  }

  // 1. Prepare mentor document representations (focused on TEACHING expertise, not what they want to learn)
  const mentorDocs = mentors.map((m) => {
    const teachSkillsList = toSkillArray(m.teachSkills);
    const teachSkillsText = teachSkillsList.join(", ");
    // Clean searchable text without boilerplate words ("Teaches:", "Interested in:", "Level:")
    const fullText = [
      m.fullName || "",
      m.headline || "",
      teachSkillsText,
      m.bio || "",
      m.education || "",
      m.teachLevel || "",
    ]
      .filter(Boolean)
      .join(" — ");

    const searchableLower = [
      m.fullName || "",
      m.headline || "",
      teachSkillsText,
      m.bio || "",
    ]
      .join(" ")
      .toLowerCase();

    return {
      mentor: m,
      text: fullText,
      searchableLower,
      teachSkillsLower: teachSkillsList.map((s) => s.toLowerCase()),
    };
  });

  // 2. Compute BM25 Sparse Keyword Scores (stopword-free)
  const bm25Engine = new OkapiBM25(mentorDocs);
  const rawBm25Scores = bm25Engine.scoreQuery(cleanQuery);

  const maxBm25 = Math.max(...rawBm25Scores, 0);
  const normalizedBm25Scores =
    maxBm25 > 0 ? rawBm25Scores.map((score) => score / maxBm25) : rawBm25Scores.map(() => 0);

  // 3. Compute Bi-Encoder Dense Semantic Vector Scores
  let rawDenseSimilarities = [];
  let usedRemoteEmbeddings = false;
  const modelCandidates = getRemoteModelCandidates();

  if (modelCandidates.length > 0) {
    const docTexts = mentorDocs.map((d) => d.text || d.mentor?.fullName || "Mentor");
    let lastErrMsg = "";

    for (const modelName of modelCandidates) {
      const queryEmbeddings = createEmbeddingsInstance(modelName, "RETRIEVAL_QUERY");
      const docEmbeddings = createEmbeddingsInstance(modelName, "RETRIEVAL_DOCUMENT");
      if (!queryEmbeddings || !docEmbeddings) continue;

      try {
        const [queryVector, docVectors] = await withTimeout(
          Promise.all([
            queryEmbeddings.embedQuery(cleanQuery),
            docEmbeddings.embedDocuments(docTexts),
          ]),
          9000,
          `Google hybrid embeddings (${modelName})`
        );

        if (
          !isValidEmbeddingVector(queryVector) ||
          !Array.isArray(docVectors) ||
          docVectors.length !== mentorDocs.length ||
          !docVectors.some((dv) => isValidEmbeddingVector(dv) && dv.length === queryVector.length)
        ) {
          throw new Error("Empty or mismatched embedding vectors returned by remote provider");
        }

        rawDenseSimilarities = docVectors.map((docVec) =>
          isValidEmbeddingVector(docVec) && docVec.length === queryVector.length
            ? Math.max(0, cosineSimilarity(queryVector, docVec))
            : 0
        );
        activeRemoteEmbeddingModel = modelName;
        usedRemoteEmbeddings = true;
        break;
      } catch (err) {
        lastErrMsg = String(err?.message || "");
        if (
          lastErrMsg.includes("403") ||
          lastErrMsg.includes("401") ||
          lastErrMsg.includes("API key") ||
          lastErrMsg.includes("PERMISSION_DENIED")
        ) {
          remoteEmbeddingsDisabled = true;
          break;
        }
      }
    }

    if (rawDenseSimilarities.length === 0 && lastErrMsg) {
      if (
        lastErrMsg.includes("404") ||
        lastErrMsg.includes("400") ||
        lastErrMsg.includes("not found")
      ) {
        remoteEmbeddingsDisabled = true;
      }
      console.warn("[Hybrid Retrieval] Fallback to local dense vectorizer due to:", lastErrMsg);
    }
  }

  // Fallback to local dense vectorizer if Google embeddings unavailable or failed
  if (rawDenseSimilarities.length === 0) {
    const queryVec = generateLocalDenseEmbedding(cleanQuery);
    rawDenseSimilarities = mentorDocs.map((doc) => {
      const docVec = generateLocalDenseEmbedding(doc.text);
      return Math.max(0, cosineSimilarity(queryVec, docVec));
    });
  }

  // 4. Relevance Filtering, Calibrated Scoring & Reciprocal Fusion
  // Fall back to unfiltered tokens only if the entire query consisted of generic words
  let queryTokens = tokenize(cleanQuery, { removeStopwords: true });
  if (queryTokens.length === 0) {
    queryTokens = tokenize(cleanQuery, { removeStopwords: false });
  }

  const scoredResults = [];

  mentorDocs.forEach((doc, idx) => {
    const rawDense = rawDenseSimilarities[idx] || 0;
    const rawBm25 = rawBm25Scores[idx] || 0;
    const bm25Score = normalizedBm25Scores[idx] || 0;

    // Identify meaningful matched tokens in the mentor's teaching skills, headline, or bio
    const matchedTokens = Array.from(
      new Set(
        queryTokens.filter((token) => {
          if (doc.teachSkillsLower.some((sk) => sk === token || sk.includes(token))) {
            return true;
          }
          if (token.length >= 2 && doc.searchableLower.includes(token)) {
            return true;
          }
          return false;
        })
      )
    );

    const hasKeywordMatch = rawBm25 > 0 || matchedTokens.length > 0;

    // Calibrate cosine score: Gemini RETRIEVAL embeddings have ~0.55 noise floor on unrelated English text
    const denseScore = usedRemoteEmbeddings
      ? clamp01((rawDense - 0.54) / (0.82 - 0.54))
      : clamp01(rawDense);

    // Relevance gate: reject unrelated mentors instead of returning everyone in the database
    const isRelevant = usedRemoteEmbeddings
      ? (hasKeywordMatch && rawDense >= 0.55) || rawDense >= 0.618
      : hasKeywordMatch || rawDense >= 0.35;

    if (!isRelevant) return;

    // Linear combination score (preserve meaningful semantic score for pure conceptual queries)
    let hybridScore = alpha * denseScore + (1 - alpha) * bm25Score;
    if (maxBm25 === 0 && denseScore > 0) {
      hybridScore = Math.max(hybridScore, denseScore * 0.85);
    }

    // Dynamic explainability reasoning
    let matchReason = "";
    if (denseScore >= 0.55 && bm25Score >= 0.5) {
      matchReason = "Strong semantic alignment with exact technology overlap";
    } else if (bm25Score >= 0.4 || matchedTokens.length > 0) {
      matchReason = "Direct keyword & skill overlap in mentor profile";
    } else if (denseScore >= 0.3) {
      matchReason = "High conceptual domain match with your learning target";
    } else {
      matchReason = "Relevant background matching parts of your learning inquiry";
    }

    scoredResults.push({
      ...doc.mentor,
      hybridMetrics: {
        hybridScore: Math.round(hybridScore * 100),
        denseScore: Math.round(denseScore * 100),
        bm25Score: Math.round(bm25Score * 100),
        matchedTokens,
        matchReason,
      },
    });
  });

  // Sort descending by Hybrid Score (tie-break by keyword overlap then dense score)
  scoredResults.sort((a, b) => {
    if (b.hybridMetrics.hybridScore !== a.hybridMetrics.hybridScore) {
      return b.hybridMetrics.hybridScore - a.hybridMetrics.hybridScore;
    }
    return b.hybridMetrics.bm25Score - a.hybridMetrics.bm25Score;
  });

  return scoredResults.slice(0, limit);
};

module.exports = {
  OkapiBM25,
  cosineSimilarity,
  retrieveHybridRecommendedMentors,
};

