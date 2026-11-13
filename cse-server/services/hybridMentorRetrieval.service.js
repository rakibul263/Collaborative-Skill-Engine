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
const tokenize = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\.\#\+\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
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

// Pure JavaScript Deterministic Hashing Dense Vectorizer (Resilient Fallback)
const generateLocalDenseEmbedding = (text = "", dims = 128) => {
  const vector = new Array(dims).fill(0);
  const tokens = tokenize(text);

  tokens.forEach((token, tIdx) => {
    // Generate bi-grams & subwords
    for (let i = 0; i < token.length - 1; i++) {
      const charCode1 = token.charCodeAt(i);
      const charCode2 = token.charCodeAt(i + 1);
      const hash = (charCode1 * 31 + charCode2 * 17 + tIdx) % dims;
      vector[hash] += 1.0 / (1 + Math.log(token.length));
    }
  });

  // L2 Normalize vector
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vector.map((v) => v / norm) : vector;
};

/**
 * Gets embeddings provider (Google text-embedding-004 or local fallback)
 */
const getEmbeddingsInstance = () => {
  if (process.env.GOOGLE_API_KEY) {
    try {
      const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
      return new GoogleGenerativeAIEmbeddings({
        model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
        apiKey: process.env.GOOGLE_API_KEY,
      });
    } catch (err) {
      console.warn("[Hybrid Retrieval] Google Generative AI Embeddings init failed:", err.message);
    }
  }
  return null;
};

/**
 * Main Hybrid Mentor Retrieval Engine
 */
const retrieveHybridRecommendedMentors = async ({
  mentors = [],
  query = "",
  alpha = 0.65, // Dense vs Sparse weighting: 0.65 dense semantic + 0.35 keyword
  limit = 8,
}) => {
  if (!query || mentors.length === 0) {
    return mentors.slice(0, limit);
  }

  // 1. Prepare mentor document representations
  const mentorDocs = mentors.map((m) => {
    const teachSkillsText = (m.teachSkills || []).join(", ");
    const learnSkillsText = (m.learnSkills || []).join(", ");
    const fullText = [
      m.fullName || "",
      m.headline || "",
      m.bio || "",
      teachSkillsText ? `Teaches: ${teachSkillsText}` : "",
      learnSkillsText ? `Interested in: ${learnSkillsText}` : "",
      m.teachLevel ? `Level: ${m.teachLevel}` : "",
      m.education || "",
    ]
      .filter(Boolean)
      .join(" — ");

    return {
      mentor: m,
      text: fullText,
    };
  });

  // 2. Compute BM25 Sparse Keyword Scores
  const bm25Engine = new OkapiBM25(mentorDocs);
  const rawBm25Scores = bm25Engine.scoreQuery(query);

  const maxBm25 = Math.max(...rawBm25Scores, 0.001);
  const normalizedBm25Scores = rawBm25Scores.map((score) => score / maxBm25);

  // 3. Compute Bi-Encoder Dense Semantic Vector Scores
  let denseSimilarities = [];
  const embeddingsInstance = getEmbeddingsInstance();

  if (embeddingsInstance) {
    try {
      const docTexts = mentorDocs.map((d) => d.text);
      // Generate query embedding & document embeddings
      const [queryVector, docVectors] = await Promise.all([
        embeddingsInstance.embedQuery(query),
        embeddingsInstance.embedDocuments(docTexts),
      ]);

      denseSimilarities = docVectors.map((docVec) =>
        Math.max(0, cosineSimilarity(queryVector, docVec))
      );
    } catch (err) {
      console.warn("[Hybrid Retrieval] Fallback to local dense vectorizer due to:", err.message);
      embeddingsInstance = null; // Trigger fallback
    }
  }

  // Fallback to local dense vectorizer if Google embeddings unavailable or failed
  if (denseSimilarities.length === 0) {
    const queryVec = generateLocalDenseEmbedding(query);
    denseSimilarities = mentorDocs.map((doc) => {
      const docVec = generateLocalDenseEmbedding(doc.text);
      return Math.max(0, cosineSimilarity(queryVec, docVec));
    });
  }

  // 4. Reciprocal Rank Fusion & Hybrid Composite Score
  const queryTokens = tokenize(query);

  const scoredResults = mentorDocs.map((doc, idx) => {
    const denseScore = denseSimilarities[idx] || 0;
    const bm25Score = normalizedBm25Scores[idx] || 0;

    // Linear combination score
    const hybridScore = alpha * denseScore + (1 - alpha) * bm25Score;

    // Identify matched concept highlights
    const matchedTokens = queryTokens.filter((token) =>
      doc.text.toLowerCase().includes(token)
    );

    // Dynamic explainability reasoning
    let matchReason = "";
    if (denseScore > 0.75 && bm25Score > 0.6) {
      matchReason = "Strong semantic alignment with exact technology overlap";
    } else if (denseScore > 0.7) {
      matchReason = "High conceptual domain match with your learning target";
    } else if (bm25Score > 0.6) {
      matchReason = "Direct keyword overlap in mentor skills and bio";
    } else {
      matchReason = "Relevant background matching parts of your learning inquiry";
    }

    return {
      ...doc.mentor,
      hybridMetrics: {
        hybridScore: Math.round(hybridScore * 100),
        denseScore: Math.round(denseScore * 100),
        bm25Score: Math.round(bm25Score * 100),
        matchedTokens: Array.from(new Set(matchedTokens)),
        matchReason,
      },
    };
  });

  // Sort descending by Hybrid Score
  scoredResults.sort(
    (a, b) => b.hybridMetrics.hybridScore - a.hybridMetrics.hybridScore
  );

  return scoredResults.slice(0, limit);
};

module.exports = {
  OkapiBM25,
  cosineSimilarity,
  retrieveHybridRecommendedMentors,
};

