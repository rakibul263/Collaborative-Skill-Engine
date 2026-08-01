import { getJWT, setJWT } from "./jwt";
import { auth } from "@/firebase/firebase.init";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 30000;

const ensureJWTHeaders = async () => {
  const headers = {};
  let token = getJWT();
  if (!token) {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const firebaseToken = await currentUser.getIdToken(true);
        const res = await fetch(`${API_URL}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firebaseToken }),
        });
        const data = await res.json();
        if (data.token) {
          setJWT(data.token);
          token = data.token;
        }
      } catch {
        // fall through
      }
    }
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const jwtHeaders = await ensureJWTHeaders();
  const headers = { ...options.headers, ...jwtHeaders };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    return res;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "CV upload timed out. Please check your server connection and try again.",
      );
    }
    throw new Error(
      "Could not reach the server. Make sure cse-server is running on port 3000.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

export const parseCvFile = async (file, { teachSkills = [] } = {}) => {
  const formData = new FormData();
  formData.append("cv", file);
  formData.append("suggestLearn", "false");
  if (teachSkills.length) {
    formData.append("teachSkills", JSON.stringify(teachSkills));
  }

  const res = await fetchWithTimeout(`${API_URL}/parse-cv`, {
    method: "POST",
    body: formData,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned an invalid response while parsing CV.");
  }

  if (!res.ok) {
    throw new Error(data.message || "Failed to parse CV");
  }
  return data;
};

export const suggestLearnSkillsFromCv = async (cvText, teachSkills = []) => {
  const res = await fetchWithTimeout(`${API_URL}/parse-cv/suggest-learn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cvText, teachSkills }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned an invalid response for skill suggestions.");
  }

  if (!res.ok) {
    throw new Error(data.message || "Failed to get skill suggestions");
  }
  return data;
};
