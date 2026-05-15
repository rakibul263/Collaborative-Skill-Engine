const jwt = require("jsonwebtoken");
const { getFirebaseAdmin } = require("../config/firebaseAdmin");
const { findUserByEmail, normalizeEmail } = require("../utils/userLookup");

const registerAuthRoutes = (app, { usersCollection }) => {
  app.post("/auth/token", async (req, res) => {
    try {
      const { firebaseToken } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({ message: "Firebase token is required." });
      }

      const firebaseAdmin = getFirebaseAdmin();
      if (!firebaseAdmin) {
        return res.status(503).json({ message: "Firebase Admin not configured." });
      }

      const decoded = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
      if (!decoded.email) {
        return res.status(401).json({ message: "Token missing email." });
      }

      const email = normalizeEmail(decoded.email);
      const userDoc = await findUserByEmail(usersCollection, email);

      if (userDoc?.isDeactivated === true) {
        return res.status(403).json({
          message: "Account deactivated. Contact: collaborativeskillengine@gmail.com",
        });
      }

      const payload = {
        uid: decoded.uid,
        email,
        mongoId: userDoc?._id?.toString() || null,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        user: {
          uid: decoded.uid,
          email,
          displayName: userDoc?.fullName || decoded.name || "",
          photoURL: userDoc?.profileImage || decoded.picture || "",
        },
      });
    } catch (error) {
      console.error("[Auth] Token exchange failed:", error.message);
      return res.status(401).json({ message: "Invalid Firebase token." });
    }
  });
};

module.exports = { registerAuthRoutes };
