const jwt = require("jsonwebtoken");
const { verifyFirebaseIdToken } = require("../config/firebaseAdmin");
const { findUserByEmail, normalizeEmail } = require("../utils/userLookup");
const { parseClientIp, parseUserAgent } = require("../utils/deviceParser");
const { resolveGeoLocation, detectImpossibleTravel } = require("../utils/geoSecurity");
const { authLimiter } = require("../middleware/rateLimiter");

const registerAuthRoutes = (app, {
  usersCollection,
  userLoginLogsCollection,
  adminSecurityAlertsCollection = null,
  io = null,
}) => {
  // IP Status verification endpoint for clients
  app.get("/auth/ip-status", (req, res) => {
    const clientIp = parseClientIp(req);
    return res.json({
      blocked: false,
      ip: clientIp,
      status: "allowed",
    });
  });

  app.post("/auth/token", authLimiter, async (req, res) => {
    const clientIp = parseClientIp(req);
    const deviceInfo = parseUserAgent(req.headers["user-agent"] || "");

    try {
      const { firebaseToken } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({ message: "Firebase token is required." });
      }

      const decoded = await verifyFirebaseIdToken(firebaseToken);
      if (!decoded.email) {
        return res.status(401).json({ message: "Token missing email." });
      }

      const email = normalizeEmail(decoded.email);
      const userDoc = await findUserByEmail(usersCollection, email);

      if (userDoc?.isDeactivated === true) {
        if (userLoginLogsCollection) {
          await userLoginLogsCollection.insertOne({
            userId: userDoc?._id?.toString() || null,
            email,
            fullName: userDoc?.fullName || decoded.name || "User",
            role: userDoc?.role || "user",
            ip: clientIp,
            userAgent: req.headers["user-agent"] || "",
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            deviceType: deviceInfo.deviceType,
            gateway: "Web Portal",
            status: "BLOCKED_DEACTIVATED",
            timestamp: new Date(),
          }).catch(() => {});
        }

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

      // Return token immediately so login/token-exchange never stalls on telemetry writes
      res.json({
        token,
        user: {
          uid: decoded.uid,
          email,
          displayName: userDoc?.fullName || decoded.name || "",
          photoURL: userDoc?.profileImage || decoded.picture || "",
        },
      });

      // Fire-and-forget security & login telemetry
      void (async () => {
        try {
          const now = new Date();
          const curLocation = resolveGeoLocation(clientIp);
          let travelAnomaly = null;

          if (userLoginLogsCollection) {
            try {
              const prevLogin = await userLoginLogsCollection.findOne(
                { email, status: "SUCCESS" },
                { sort: { timestamp: -1 } }
              );
              if (prevLogin) {
                const prevLocation = prevLogin.location || resolveGeoLocation(prevLogin.ip);
                travelAnomaly = detectImpossibleTravel(
                  { ip: clientIp, location: curLocation, timestamp: now },
                  { ip: prevLogin.ip, location: prevLocation, timestamp: prevLogin.timestamp }
                );
              }
            } catch (travelErr) {
              console.error("[Auth] Impossible travel check error:", travelErr.message);
            }
          }

          if (travelAnomaly && adminSecurityAlertsCollection) {
            const alertDoc = {
              type: "IMPOSSIBLE_TRAVEL",
              severity: travelAnomaly.severity || "CRITICAL",
              status: "UNRESOLVED",
              email,
              fullName: userDoc?.fullName || decoded.name || "User",
              userId: userDoc?._id?.toString() || null,
              details: travelAnomaly.reason,
              metrics: {
                distanceKm: travelAnomaly.distanceKm,
                timeDiffMinutes: travelAnomaly.timeDiffMinutes,
                speedKmh: travelAnomaly.speedKmh,
              },
              previousLocation: travelAnomaly.previousLocation,
              currentLocation: travelAnomaly.currentLocation,
              timestamp: now,
              createdAt: now.toISOString(),
            };
            await adminSecurityAlertsCollection.insertOne(alertDoc).catch(() => {});
            if (io) {
              io.emit("admin-security:new-alert", alertDoc);
            }
          }

          if (userLoginLogsCollection) {
            await userLoginLogsCollection.insertOne({
              userId: userDoc?._id?.toString() || null,
              email,
              fullName: userDoc?.fullName || decoded.name || "User",
              role: userDoc?.role || "user",
              ip: clientIp,
              location: curLocation,
              userAgent: req.headers["user-agent"] || "",
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              deviceType: deviceInfo.deviceType,
              gateway: "Web Portal",
              status: "SUCCESS",
              isAnomaly: Boolean(travelAnomaly?.isAnomaly),
              anomalyType: travelAnomaly ? "IMPOSSIBLE_TRAVEL" : null,
              anomalyDetails: travelAnomaly || null,
              timestamp: now,
            }).catch((err) => console.error("[Auth] Log failed:", err.message));
          }

          if (userDoc?._id) {
            await usersCollection.updateOne(
              { _id: userDoc._id },
              {
                $set: {
                  lastLogin: now,
                  lastLoginIp: clientIp,
                  lastLoginLocation: curLocation,
                  lastLoginDevice: `${deviceInfo.browser} on ${deviceInfo.os}`,
                },
              }
            ).catch(() => {});
          }
        } catch {
          // non-blocking telemetry
        }
      })();
      return;
    } catch (error) {
      console.error("[Auth] Token exchange failed:", error.message);

      if (userLoginLogsCollection) {
        await userLoginLogsCollection.insertOne({
          email: "unknown",
          fullName: "Unknown",
          role: "user",
          ip: clientIp,
          userAgent: req.headers["user-agent"] || "",
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          deviceType: deviceInfo.deviceType,
          gateway: "Web Portal",
          status: "FAILED_INVALID_TOKEN",
          timestamp: new Date(),
        }).catch(() => {});
      }

      return res.status(401).json({ message: "Invalid Firebase token." });
    }
  });
};

module.exports = { registerAuthRoutes };
