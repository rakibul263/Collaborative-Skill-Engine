const { verifyFirebaseIdToken } = require("../config/firebaseAdmin");

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({
        message: "Authorization required. Send Firebase ID token as Bearer token.",
      });
    }

    const decoded = await verifyFirebaseIdToken(token);

    if (!decoded.email) {
      return res.status(401).json({
        message: "Token missing email. Use an email/password Firebase account.",
      });
    }

    req.authUser = {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
    };

    return next();
  } catch (error) {
    console.error("[Auth]", error.code || error.message);
    return res.status(401).json({
      message: "Invalid or expired Firebase token. Please sign in again.",
    });
  }
};

module.exports = { verifyFirebaseToken };
