const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

let initialized = false;

const parseServiceAccountJson = (raw) => {
  const trimmed = raw.trim();
  const attempts = [trimmed, trimmed.endsWith("}") ? null : `${trimmed}}`].filter(
    Boolean,
  );

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next */
    }
  }

  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_JSON is invalid or truncated. Use FIREBASE_SERVICE_ACCOUNT_PATH with a .json file instead.",
  );
};

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  // Check explicit path from env, then fallback to default file location
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, "../firebase-service-account.json");

  if (fs.existsSync(filePath)) {
    return parseServiceAccountJson(fs.readFileSync(filePath, "utf-8"));
  }
  return null;
};

const initFirebaseAdmin = () => {
  if (initialized) return admin;

  try {
    const serviceAccount = parseServiceAccount();

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      console.warn(
        "[Firebase Admin] Not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID.",
      );
      return null;
    }

    initialized = true;
    return admin;
  } catch (error) {
    console.error("[Firebase Admin] Init failed:", error.message);
    return null;
  }
};

const getFirebaseAdmin = () => {
  if (!initialized) return initFirebaseAdmin();
  return admin.apps.length ? admin : null;
};

module.exports = { getFirebaseAdmin, initFirebaseAdmin };
