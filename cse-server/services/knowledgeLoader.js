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
  const f = filename.toLowerCase();
  if (f.includes("frontend")) return "frontend";
  if (f.includes("backend")) return "backend";
  if (f.includes("fullstack")) return "fullstack";
  if (f.includes("data-science")) return "data-science";
  if (f.includes("devops") || f.includes("sre")) return "devops";
  if (f.includes("ai") || f.includes("ml") || f.includes("learning")) return "ai-ml";
  if (f.includes("security") || f.includes("cyber")) return "cybersecurity";
  if (f.includes("dsa") || f.includes("algorithm") || f.includes("competitive")) return "dsa";
  if (f.includes("system") || f.includes("embedded") || f.includes("iot")) return "systems";
  if (f.includes("mobile") || f.includes("flutter") || f.includes("native")) return "mobile";
  if (f.includes("database") || f.includes("storage")) return "databases";
  if (f.includes("cloud") || f.includes("design")) return "system-design";
  if (f.includes("blockchain") || f.includes("web3")) return "blockchain";
  if (f.includes("career")) return "career";
  return "skills";
};

module.exports = { loadKnowledgeDocuments, KNOWLEDGE_DIR };
