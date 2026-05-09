const { getFirebaseAdmin } = require("../config/firebaseAdmin");

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({
        message: "Authorization required. Send Firebase ID token as Bearer token.",
      });
    }

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(503).json({
        message:
          "Firebase Admin is not configured on the server. Add FIREBASE_SERVICE_ACCOUNT_JSON to .env.",
      });
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(token);

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
