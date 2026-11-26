const jwt = require("jsonwebtoken");
const { getFirebaseAdmin } = require("../config/firebaseAdmin");

const verifyJWT = async (req, res, next) => {
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
    return next();
  } catch (jwtError) {
    // Seamless fallback: if client passed a valid Firebase ID token (e.g. during cold start or token exchange race)
    try {
      const firebaseAdmin = getFirebaseAdmin();
      if (firebaseAdmin) {
        const fbDecoded = await firebaseAdmin.auth().verifyIdToken(token);
        if (fbDecoded?.email) {
          req.user = {
            uid: fbDecoded.uid,
            email: fbDecoded.email.toLowerCase(),
            mongoId: null,
          };
          return next();
        }
      }
    } catch {
      // ignore Firebase fallback failure and report standard JWT error
    }

    const message =
      jwtError.name === "TokenExpiredError"
        ? "Token expired. Please sign in again."
        : "Invalid token. Please sign in again.";
    return res.status(401).json({ message });
  }
};

module.exports = { verifyJWT };
