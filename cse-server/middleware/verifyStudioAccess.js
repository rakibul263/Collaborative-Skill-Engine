const { verifyJWT } = require("./verifyJWT");

/**
 * Middleware to verify that the user is authenticated and has studio access.
 */
const verifyStudioAccess = (req, res, next) => {
  verifyJWT(req, res, () => {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: "Unauthorized. Token invalid or missing." });
    }
    next();
  });
};

module.exports = { verifyStudioAccess };
