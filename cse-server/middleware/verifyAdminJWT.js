const jwt = require("jsonwebtoken");

const verifyAdminJWT = (req, res, next) => {
  const token = req.cookies?.admin_token;

  if (!token) {
    return res.status(401).json({ message: "Admin authentication required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.adminUser = { email: decoded.email };
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Admin session expired. Please log in again."
        : "Invalid admin token. Please log in again.";
    return res.status(401).json({ message });
  }
};

module.exports = { verifyAdminJWT };
