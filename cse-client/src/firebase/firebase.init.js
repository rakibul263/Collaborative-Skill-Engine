import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_apiKey,
  authDomain: import.meta.env.VITE_authDomain,
  projectId: import.meta.env.VITE_projectId,
  storageBucket: import.meta.env.VITE_storageBucket,
  messagingSenderId: import.meta.env.VITE_messagingSenderId,
  appId: import.meta.env.VITE_appId,
};

let app = null;
let auth = null;

const isValidApiKey =
  typeof firebaseConfig.apiKey === "string" &&
  firebaseConfig.apiKey.trim().length > 0 &&
  !firebaseConfig.apiKey.includes("your_") &&
  firebaseConfig.apiKey !== "undefined";

if (isValidApiKey) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  } catch (error) {
    console.error("[Firebase Init Error]:", error);
    auth = null;
  }
} else {
  console.warn(
    "[Firebase Warning] VITE_apiKey is missing or invalid. Set VITE_apiKey in cse-client/.env to enable Firebase Auth."
  );
}

export { app, auth };
