const fs = require("fs");
const path = require("path");

const KNOWLEDGE_DIR = path.join(__dirname, "../data/knowledge");

const loadKnowledgeDocuments = () => {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((file) => file.endsWith(".md"));

  return files.map((file) => {
    const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), "utf-8");
    const topic = file.replace(".md", "").replace(/-/g, " ");
    return {
      pageContent: content,
      metadata: {
        source: file,
        topic,
        category: inferCategory(file),
      },
    };
  });
};

const inferCategory = (filename) => {
  if (filename.includes("frontend")) return "frontend";
  if (filename.includes("backend")) return "backend";
  if (filename.includes("fullstack")) return "fullstack";
  if (filename.includes("data-science")) return "data-science";
  if (filename.includes("devops")) return "devops";
  if (filename.includes("ai-ml")) return "ai-ml";
  if (filename.includes("career")) return "career";
  return "skills";
};

module.exports = { loadKnowledgeDocuments, KNOWLEDGE_DIR };
