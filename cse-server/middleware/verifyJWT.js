const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      mongoId: decoded.mongoId || null,
    };
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Token expired. Please sign in again."
        : "Invalid token. Please sign in again.";
    return res.status(401).json({ message });
  }
};

module.exports = { verifyJWT };
