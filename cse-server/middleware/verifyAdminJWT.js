const jwt = require("jsonwebtoken");

/**
 * verifyAdminJWT — Robust, multi-vector Admin Route Guard
 * Supports:
 *   1. Cookies: req.cookies?.admin_token
 *   2. Authorization Header: Bearer <token>
 *   3. Custom Header: x-admin-token
 *
 * Verifies cryptographic signature using process.env.ADMIN_JWT_SECRET.
 * Attaches decoded admin information to req.adminUser.
 */
const verifyAdminJWT = (req, res, next) => {
  let token = req.cookies?.admin_token;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token && req.headers["x-admin-token"]) {
    token = req.headers["x-admin-token"];
  }

  if (!token) {
    return res.status(401).json({ message: "Administrative authorization required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.adminUser = {
      email: (decoded.email || "").toLowerCase(),
      role: decoded.role || "Admin",
      isMasterAdmin: (decoded.email || "").toLowerCase() === (process.env.ADMIN_EMAIL || "").toLowerCase(),
    };
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Admin session expired. Please sign in again."
        : "Invalid administrative credentials. Please sign in again.";
    return res.status(401).json({ message });
  }
};

module.exports = { verifyAdminJWT };
