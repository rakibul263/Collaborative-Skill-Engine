import { auth } from "@/firebase/firebase.init";
import { getJWT } from "./jwt";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const STORAGE_PREFIX = "cse_fc_";
const MAX_STORAGE_BYTES = 180_000;

const memoryCache = new Map();
const inFlightRequests = new Map();
const subscribers = new Map();

let activeScopeEmail = "";

export const setFastCacheUserScope = (email) => {
  activeScopeEmail = email ? String(email).toLowerCase().trim() : "";
};

const getActiveScope = () => {
  if (activeScopeEmail) return activeScopeEmail;
  if (auth?.currentUser?.email) {
    return String(auth.currentUser.email).toLowerCase().trim();
  }
  const token = getJWT();
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.email) return String(payload.email).toLowerCase().trim();
    } catch {
      // ignore malformed token
    }
  }
  return "anon";
};

export const normalizeApiPath = (rawUrl = "", params = null) => {
  let clean = String(rawUrl || "").trim();
  if (API_URL && clean.startsWith(API_URL)) {
    clean = clean.slice(API_URL.length);
  }
  if (!clean.startsWith("/")) {
    clean = `/${clean}`;
  }
  if (params && typeof params === "object") {
    const [base, existingQuery] = clean.split("?");
    const search = new URLSearchParams(existingQuery || "");
    Object.keys(params)
      .sort()
      .forEach((k) => {
        if (params[k] !== undefined && params[k] !== null) {
          search.set(k, String(params[k]));
        }
      });
    const qs = search.toString();
    clean = qs ? `${base}?${qs}` : base;
  }
  return clean;
};

const PUBLIC_CACHE_PREFIXES = [
  "/platform-stats",
  "/courses/public",
  "/notifications",
  "/experts/",
  "/ratings/summary",
  "/api/skill-graph/ontology",
  "/api/teams/roles",
  "/auth/ip-status",
  "/courses/certificates/verify/",
];

export const isPublicCachePath = (path) => {
  if (path.startsWith("/experts/") && path.includes("viewerEmail=")) {
    return false;
  }
  return PUBLIC_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix));
};

export const shouldBypassFastCache = (url = "", config = {}) => {
  if (config?.cache === false) return true;
  if (config?.responseType && config.responseType !== "json") return true;
  const path = normalizeApiPath(url);
  return (
    path.startsWith("/auth/token") ||
    path.startsWith("/payments/") ||
    path.startsWith("/cloudinary/") ||
    path.startsWith("/ai-advisor/stream") ||
    path.startsWith("/api/code/run") ||
    path === "/health" ||
    path === "/server-time"
  );
};

export const buildFastCacheKey = (url, params = null) => {
  const path = normalizeApiPath(url, params);
  const scope = isPublicCachePath(path) ? "pub" : getActiveScope();
  return `${scope}::${path}`;
};

export const resolveFreshTtlMs = (url = "") => {
  const path = normalizeApiPath(url);
  if (
    path.startsWith("/platform-stats") ||
    path.startsWith("/courses/public") ||
    path.startsWith("/find-mentors") ||
    path.startsWith("/notifications") ||
    path.startsWith("/api/skill-graph/ontology") ||
    path.startsWith("/api/teams/roles") ||
    path.startsWith("/experts/")
  ) {
    return 60_000;
  }
  if (
    path.startsWith("/conversations") ||
    path.startsWith("/connections/") ||
    path.includes("/schedules")
  ) {
    return 12_000;
  }
  return 25_000;
};

const readStorageEntry = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number") return null;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
};

const writeStorageEntry = (key, entry) => {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length <= MAX_STORAGE_BYTES) {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
    }
  } catch {
    // ignore storage quota limits cleanly
  }
};

export const getFastCacheEntry = (url, params = null) => {
  const key = buildFastCacheKey(url, params);
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  return readStorageEntry(key);
};

export const getCachedData = (url, maxAgeMs = 15 * 60 * 1000, params = null) => {
  const entry = getFastCacheEntry(url, params);
  if (!entry) return null;
  if (maxAgeMs && Date.now() - entry.ts > maxAgeMs) {
    return null;
  }
  return entry.data;
};

export const setCachedData = (url, data, params = null) => {
  if (data === undefined) return;
  const key = buildFastCacheKey(url, params);
  const entry = { ts: Date.now(), data };
  memoryCache.set(key, entry);
  writeStorageEntry(key, entry);
  notifyCacheSubscribers(normalizeApiPath(url, params), data);
};

export const dedupeInFlight = (key, factory) => {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = Promise.resolve()
    .then(factory)
    .finally(() => {
      inFlightRequests.delete(key);
    });
  inFlightRequests.set(key, promise);
  return promise;
};

export const invalidateCachePrefixes = (prefixes = []) => {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  if (list.length === 0) return;

  for (const key of Array.from(memoryCache.keys())) {
    const pathPart = key.split("::")[1] || "";
    if (list.some((p) => pathPart.startsWith(p))) {
      memoryCache.delete(key);
    }
  }

  if (typeof window !== "undefined") {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const storageKey = sessionStorage.key(i);
        if (storageKey && storageKey.startsWith(STORAGE_PREFIX)) {
          const innerKey = storageKey.slice(STORAGE_PREFIX.length);
          const pathPart = innerKey.split("::")[1] || "";
          if (list.some((p) => pathPart.startsWith(p))) {
            sessionStorage.removeItem(storageKey);
          }
        }
      }
    } catch {
      // ignore
    }
  }
};

export const invalidateCacheForMutation = (rawUrl = "") => {
  const path = normalizeApiPath(rawUrl);
  if (path.startsWith("/courses") || path.startsWith("/lessons") || path.startsWith("/payments")) {
    invalidateCachePrefixes(["/courses", "/studio", "/platform-stats"]);
  } else if (path.startsWith("/studio")) {
    invalidateCachePrefixes(["/studio", "/courses"]);
  } else if (path.startsWith("/connections")) {
    invalidateCachePrefixes(["/connections", "/find-mentors", "/conversations", "/experts", "/platform-stats"]);
  } else if (path.startsWith("/conversations") || path.startsWith("/messages") || path.startsWith("/schedules")) {
    invalidateCachePrefixes(["/conversations", "/schedules"]);
  } else if (path.startsWith("/users")) {
    invalidateCachePrefixes(["/users", "/find-mentors", "/experts", "/studio/access-status", "/courses/eligibility"]);
  } else if (path.startsWith("/ratings")) {
    invalidateCachePrefixes(["/ratings", "/find-mentors", "/experts", "/platform-stats", "/studio/analytics"]);
  } else if (path.startsWith("/api/teams")) {
    invalidateCachePrefixes(["/api/teams", "/conversations"]);
  } else if (path.startsWith("/user-notifications") || path.startsWith("/notifications")) {
    invalidateCachePrefixes(["/user-notifications", "/notifications"]);
  }
};

export const clearAllFastCache = () => {
  memoryCache.clear();
  inFlightRequests.clear();
  if (typeof window !== "undefined") {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const storageKey = sessionStorage.key(i);
        if (storageKey && storageKey.startsWith(STORAGE_PREFIX)) {
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch {
      // ignore
    }
  }
};

export const subscribeCache = (urlPrefix, listener) => {
  if (!subscribers.has(urlPrefix)) {
    subscribers.set(urlPrefix, new Set());
  }
  subscribers.get(urlPrefix).add(listener);
  return () => {
    subscribers.get(urlPrefix)?.delete(listener);
  };
};

const notifyCacheSubscribers = (path, data) => {
  subscribers.forEach((set, prefix) => {
    if (path.startsWith(prefix)) {
      set.forEach((fn) => {
        try {
          fn(data, path);
        } catch {
          // ignore subscriber errors
        }
      });
    }
  });
};
