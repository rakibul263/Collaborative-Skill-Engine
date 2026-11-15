const { createAiAdvisorController } = require("../controllers/aiAdvisor.controller");
const { verifyJWT } = require("../middleware/verifyJWT");
const { aiAdvisorLimiter } = require("../middleware/rateLimiter");

const registerAiAdvisorRoutes = (app, deps) => {
  const controller = createAiAdvisorController(deps);

  app.post("/ai-advisor", verifyJWT, aiAdvisorLimiter, controller.postAdvisor);
  app.post("/ai-advisor/stream", verifyJWT, aiAdvisorLimiter, controller.postAdvisorStream);
  app.post("/ai-advisor/interview/stream", verifyJWT, aiAdvisorLimiter, controller.postInterviewStream);
  app.post("/ai-advisor/save-roadmap", verifyJWT, controller.saveRoadmap);
  app.get("/ai-advisor/history", verifyJWT, controller.getHistory);
  app.delete("/ai-advisor/history", verifyJWT, controller.clearHistory);
  app.get("/ai-advisor/health", controller.warmVectorStore);
};

module.exports = { registerAiAdvisorRoutes };
