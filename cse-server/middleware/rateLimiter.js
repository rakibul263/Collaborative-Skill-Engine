const { rateLimit } = require("express-rate-limit");

const isTest = process.env.NODE_ENV === "test";

// Helper to create rate limiter with bypass for test environments
const createLimiter = (options) => {
  if (isTest) {
    return (req, res, next) => next();
  }
  return rateLimit({
    standardHeaders: true, // Return standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    ...options,
  });
};

/**
 * Auth Rate Limiter
 * Guards against brute-force attacks on credential & token exchanges
 */
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts per window per IP
  message: {
    message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
});

/**
 * AI Advisor & RAG Rate Limiter
 * Guards against token drain and external LLM quota exhaustion
 */
const aiAdvisorLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 prompts per minute per IP
  message: {
    message: "AI Advisor query limit reached. Please wait a minute before sending another prompt.",
    code: "AI_RATE_LIMIT_EXCEEDED",
  },
});

/**
 * Code Execution Sandbox Limiter
 * Guards server CPU and process pool from fork-bombs and execution flooding
 */
const codeExecutionLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // Max 15 code executions per minute
  message: {
    error: "Code execution rate limit reached (15 runs/min). Please wait before running more scripts.",
    errorType: "RateLimitExceeded",
  },
});

/**
 * Payment & Checkout Limiter
 * Guards Stripe checkout session generation from automated session harvesting
 */
const paymentLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // Max 15 checkout initializations per minute
  message: {
    message: "Checkout session initialization limit reached. Please try again shortly.",
    code: "PAYMENT_RATE_LIMIT_EXCEEDED",
  },
});

/**
 * General Public API Limiter
 * Catch-all defense against high-frequency HTTP flood attacks
 */
const globalApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per 15 minutes per IP
  skip: (req) => {
    // Skip health checks, static assets, and admin operations
    return (
      req.path === "/health" ||
      req.path === "/server-time" ||
      req.path.startsWith("/admin-api")
    );
  },
  message: {
    message: "Too many requests to platform API from this IP address. Please slow down.",
    code: "GLOBAL_RATE_LIMIT_EXCEEDED",
  },
});

module.exports = {
  authLimiter,
  aiAdvisorLimiter,
  codeExecutionLimiter,
  paymentLimiter,
  globalApiLimiter,
};

