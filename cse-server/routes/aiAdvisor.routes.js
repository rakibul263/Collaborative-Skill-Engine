const { createAiAdvisorController } = require("../controllers/aiAdvisor.controller");
const { verifyJWT } = require("../middleware/verifyJWT");

const registerAiAdvisorRoutes = (app, deps) => {
  const controller = createAiAdvisorController(deps);

  app.post("/ai-advisor", verifyJWT, controller.postAdvisor);
  app.get("/ai-advisor/history", verifyJWT, controller.getHistory);
  app.get("/ai-advisor/health", controller.warmVectorStore);
};

module.exports = { registerAiAdvisorRoutes };
