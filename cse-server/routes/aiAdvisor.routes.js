const { createAiAdvisorController } = require("../controllers/aiAdvisor.controller");
const { verifyJWT } = require("../middleware/verifyJWT");

const registerAiAdvisorRoutes = (app, deps) => {
  const controller = createAiAdvisorController(deps);

  app.post("/ai-advisor", verifyJWT, controller.postAdvisor);
  app.post("/ai-advisor/stream", verifyJWT, controller.postAdvisorStream);
  app.post("/ai-advisor/interview/stream", verifyJWT, controller.postInterviewStream);
  app.post("/ai-advisor/save-roadmap", verifyJWT, controller.saveRoadmap);
  app.get("/ai-advisor/history", verifyJWT, controller.getHistory);
  app.delete("/ai-advisor/history", verifyJWT, controller.clearHistory);
  app.get("/ai-advisor/health", controller.warmVectorStore);
};

module.exports = { registerAiAdvisorRoutes };
