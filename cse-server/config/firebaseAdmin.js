const fs = require("fs");
const path = require("path");
const https = require("https");
const jwt = require("jsonwebtoken");
const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

let initialized = false;
let hasServiceAccount = false;

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const DEFAULT_FIREBASE_PROJECT_ID = "collaborative-skill-engine";

let cachedPublicCerts = null;
let cachedPublicCertsExpiresAt = 0;

const normalizePrivateKey = (obj) => {
  if (obj && typeof obj.private_key === "string") {
    obj.private_key = obj.private_key.replace(/\\n/g, "\n");
  }
  return obj;
};

const parseServiceAccountJson = (raw) => {
  const trimmed = String(raw || "").trim();
  const attempts = [trimmed, trimmed.endsWith("}") ? null : `${trimmed}}`].filter(
    Boolean,
  );

  for (const candidate of attempts) {
    try {
      const parsed = normalizePrivateKey(JSON.parse(candidate));
      if (parsed && parsed.project_id && parsed.private_key && parsed.client_email) {
        return parsed;
      }
    } catch {
      /* try next */
    }
  }
  return null;
};

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim(),
        "base64",
      ).toString("utf-8");
      const parsed = parseServiceAccountJson(decoded);
      if (parsed) return parsed;
    } catch {
      /* fall through to next credential source */
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed) return parsed;
    console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON invalid/truncated; falling back.");
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return normalizePrivateKey({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    });
  }

  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : null,
    "/etc/secrets/firebase-service-account.json",
    path.join(__dirname, "../firebase-service-account.json"),
  ].filter(Boolean);

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const parsed = parseServiceAccountJson(fs.readFileSync(filePath, "utf-8"));
      if (parsed) return parsed;
    }
  }
  return null;
};

const createAdminAdapter = () => {
  const apps = getApps();
  if (!apps.length) return null;
  const app = getApp();
  return {
    app,
    auth: () => getAuth(app),
  };
};

const initFirebaseAdmin = () => {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return createAdminAdapter();
  }

  try {
    const serviceAccount = parseServiceAccount();
    const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      hasServiceAccount = true;
      console.log("[Firebase Admin] Initialized with service account credential.");
    } else if (projectId) {
      initializeApp({ projectId });
      console.log(`[Firebase Admin] Initialized with projectId (${projectId}) + Google public certs.`);
    }

    initialized = getApps().length > 0;
    return createAdminAdapter();
  } catch (error) {
    console.warn("[Firebase Admin] Init warning (using public x509 verification):", error.message);
    return null;
  }
};

const getFirebaseAdmin = () => {
  if (!initialized && getApps().length === 0) {
    return initFirebaseAdmin();
  }
  return createAdminAdapter();
};

const fetchGooglePublicCerts = (forceRefresh = false) => {
  if (!forceRefresh && cachedPublicCerts && Date.now() < cachedPublicCertsExpiresAt) {
    return Promise.resolve(cachedPublicCerts);
  }

  return new Promise((resolve, reject) => {
    const req = https.get(GOOGLE_CERTS_URL, { timeout: 10000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to fetch Google certs: HTTP ${res.statusCode}`));
        }
        try {
          const certs = JSON.parse(body);
          const cacheControl = String(res.headers["cache-control"] || "");
          const match = cacheControl.match(/max-age=(\d+)/i);
          const maxAgeSec = match ? Number(match[1]) : 3600;
          cachedPublicCerts = certs;
          cachedPublicCertsExpiresAt = Date.now() + Math.max(60, maxAgeSec) * 1000;
          resolve(certs);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Timed out fetching Google certs"));
    });
  });
};

/**
 * Verifies a Firebase ID token cleanly across all environments:
 * 1) Uses Firebase Admin SDK when initialized with service account credentials
 * 2) Falls back to official Google public x509 certificate RS256 verification
 *    so Render/cloud deployments work even without committing private service keys.
 */
const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Firebase token is required.");
  }

  const admin = getFirebaseAdmin();
  if (admin && hasServiceAccount) {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (sdkErr) {
      // Only fall through if Admin SDK failed for a config/credential reason,
      // not an expired/invalid user token.
      const msg = String(sdkErr?.message || "");
      if (!msg.includes("credential") && !msg.includes("Project ID") && !msg.includes("Could not load the default credentials")) {
        throw sdkErr;
      }
    }
  }

  const projectId = (
    process.env.FIREBASE_PROJECT_ID ||
    DEFAULT_FIREBASE_PROJECT_ID
  ).trim();

  const decodedHeader = jwt.decode(idToken, { complete: true });
  const kid = decodedHeader?.header?.kid;
  if (!decodedHeader || decodedHeader.header?.alg !== "RS256" || !kid) {
    throw new Error("Invalid Firebase token header.");
  }

  let certs = await fetchGooglePublicCerts(false);
  if (!certs[kid]) {
    certs = await fetchGooglePublicCerts(true);
  }
  const certPem = certs[kid];
  if (!certPem) {
    throw new Error("Unknown Firebase signing key.");
  }

  const verified = jwt.verify(idToken, certPem, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (!verified?.sub || typeof verified.sub !== "string") {
    throw new Error("Firebase token missing subject.");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (verified.auth_time && verified.auth_time > nowSec + 300) {
    throw new Error("Firebase token auth_time is in the future.");
  }

  return {
    ...verified,
    uid: verified.user_id || verified.sub,
  };
};

module.exports = {
  getFirebaseAdmin,
  initFirebaseAdmin,
  verifyFirebaseIdToken,
};
