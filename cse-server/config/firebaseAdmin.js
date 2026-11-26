const fs = require("fs");
const path = require("path");
const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

let initialized = false;

const normalizePrivateKey = (obj) => {
  if (obj && typeof obj.private_key === "string") {
    obj.private_key = obj.private_key.replace(/\\n/g, "\n");
  }
  return obj;
};

const parseServiceAccountJson = (raw) => {
  const trimmed = raw.trim();
  const attempts = [trimmed, trimmed.endsWith("}") ? null : `${trimmed}}`].filter(
    Boolean,
  );

  for (const candidate of attempts) {
    try {
      return normalizePrivateKey(JSON.parse(candidate));
    } catch {
      /* try next */
    }
  }

  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_JSON is invalid or truncated. Use FIREBASE_SERVICE_ACCOUNT_PATH with a .json file instead.",
  );
};

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim(),
      "base64",
    ).toString("utf-8");
    return parseServiceAccountJson(decoded);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
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
      return parseServiceAccountJson(fs.readFileSync(filePath, "utf-8"));
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

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("[Firebase Admin] Initialized with service account credential.");
    } else if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log("[Firebase Admin] Initialized with FIREBASE_PROJECT_ID.");
    } else {
      console.warn(
        "[Firebase Admin] Not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID.",
      );
      return null;
    }

    initialized = true;
    return createAdminAdapter();
  } catch (error) {
    console.error("[Firebase Admin] Init failed:", error.message);
    return null;
  }
};

const getFirebaseAdmin = () => {
  if (!initialized && getApps().length === 0) {
    return initFirebaseAdmin();
  }
  return createAdminAdapter();
};

module.exports = { getFirebaseAdmin, initFirebaseAdmin };
