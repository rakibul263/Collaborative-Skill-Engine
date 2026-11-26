import axios from "axios";
import { getJWT, setJWT, clearJWT, isTokenExpired } from "./jwt";
import { auth } from "@/firebase/firebase.init";
import {
  buildFastCacheKey,
  dedupeInFlight,
  getFastCacheEntry,
  invalidateCacheForMutation,
  normalizeApiPath,
  resolveFreshTtlMs,
  setCachedData,
  shouldBypassFastCache,
} from "./fastCache";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

let exchanging = null;

const PUBLIC_NO_AUTH_PREFIXES = [
  "/platform-stats",
  "/courses/public",
  "/notifications",
  "/ratings/summary",
  "/api/skill-graph/ontology",
  "/api/teams/roles",
  "/courses/certificates/verify",
  "/auth/ip-status",
  "/health",
  "/users",
  "/find-mentors",
  "/experts/",
];

const isPublicNoBlockPath = (url = "") => {
  const path = normalizeApiPath(url);
  return PUBLIC_NO_AUTH_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const getSettledFirebaseUser = async () => {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  if (typeof auth.authStateReady === "function") {
    try {
      await Promise.race([
        auth.authStateReady(),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
    } catch {
      // ignore
    }
  }
  return auth.currentUser || null;
};

export const exchangeToken = async () => {
  if (exchanging) return exchanging;

  exchanging = (async () => {
    let firebaseToken = null;
    try {
      const currentUser = await getSettledFirebaseUser();
      if (!currentUser) return null;

      // Use Firebase's cached valid ID token instead of forcing a network refresh every time
      firebaseToken = await currentUser.getIdToken();
      let res = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await axios.post(`${API_URL}/auth/token`, { firebaseToken }, { timeout: 30000 });
          break;
        } catch (err) {
          const status = err?.response?.status;
          const isTransient = !status || status === 404 || status === 429 || status === 502 || status === 503 || status === 504;
          if (isTransient && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1800));
            continue;
          }
          throw err;
        }
      }

      if (res?.data?.token) {
        setJWT(res.data.token);
        return res.data.token;
      }
      return firebaseToken;
    } catch (error) {
      console.error("[apiClient] Token exchange failed:", error);
      clearJWT();
      // Fall back to the Firebase ID token directly so verifyJWT can validate it seamlessly
      return firebaseToken || null;
    } finally {
      exchanging = null;
    }
  })();

  return exchanging;
};

export const ensureAuthToken = async () => {
  let token = getJWT();

  if (token && !isTokenExpired(token)) {
    return token;
  }

  if (token && isTokenExpired(token)) {
    clearJWT();
    token = null;
  }

  const currentUser = await getSettledFirebaseUser();
  if (!currentUser) {
    throw new Error("You must be signed in to continue.");
  }

  token = await exchangeToken();
  if (!token) {
    token = await currentUser.getIdToken(true).catch(() => null);
  }
  if (!token) {
    throw new Error(
      "Could not authenticate with the server. Please log out and sign in again.",
    );
  }

  return token;
};

apiClient.interceptors.request.use(async (config) => {
  if (config.url?.includes("/auth/token")) {
    return config;
  }

  let token = getJWT();
  if (!token || isTokenExpired(token)) {
    if (token && isTokenExpired(token)) clearJWT();
    token = null;

    if (isPublicNoBlockPath(config.url)) {
      if (auth?.currentUser) void exchangeToken();
    } else {
      const currentUser = await getSettledFirebaseUser();
      if (currentUser) {
        token = await exchangeToken();
        if (!token) {
          token = await currentUser.getIdToken().catch(() => null);
        }
      }
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axios.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || "get").toLowerCase();
    if (method !== "get" && response.config?.url) {
      invalidateCacheForMutation(response.config.url);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.blocked) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("platform:ip_blocked", { detail: error.response.data })
        );
      }
    }
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || "get").toLowerCase();
    if (method !== "get" && response.config?.url) {
      invalidateCacheForMutation(response.config.url);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.blocked) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("platform:ip_blocked", { detail: error.response.data })
        );
      }
      return Promise.reject(error);
    }

    const original = error.config;
    const method = (original?.method || "get").toLowerCase();
    const status = error.response?.status;
    const isColdStartTransient =
      !error.response || status === 404 || status === 429 || status === 502 || status === 503 || status === 504;

    if (original && method === "get" && isColdStartTransient) {
      original._coldRetryCount = original._coldRetryCount || 0;
      if (original._coldRetryCount < 3) {
        original._coldRetryCount += 1;
        await new Promise((r) => setTimeout(r, 2000));
        return apiClient(original);
      }
    }

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/token")
    ) {
      original._retry = true;
      clearJWT();
      let token = await exchangeToken();
      if (!token) {
        const fbUser = await getSettledFirebaseUser();
        token = fbUser ? await fbUser.getIdToken(true).catch(() => null) : null;
      }
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

// ── Transparent Stale-While-Revalidate + In-Flight Deduplication on apiClient.get ──
const rawGet = apiClient.get.bind(apiClient);
const STALE_MAX_AGE_MS = 10 * 60 * 1000;

apiClient.get = (url, config = {}) => {
  if (shouldBypassFastCache(url, config)) {
    return rawGet(url, config);
  }

  const {
    forceRefresh = false,
    swr = true,
    freshMs,
    onUpdate,
    cache: _cacheFlag,
    ...axiosConfig
  } = config;

  const cacheKey = buildFastCacheKey(url, axiosConfig.params);
  const effectiveFreshMs = typeof freshMs === "number" ? freshMs : resolveFreshTtlMs(url);

  const fetchAndCache = () =>
    dedupeInFlight(cacheKey, async () => {
      const response = await rawGet(url, axiosConfig);
      if (response && response.data !== undefined) {
        setCachedData(url, response.data, axiosConfig.params);
      }
      return response;
    });

  if (!forceRefresh) {
    const entry = getFastCacheEntry(url, axiosConfig.params);
    if (entry) {
      const age = Date.now() - entry.ts;
      if (age <= effectiveFreshMs) {
        return Promise.resolve({
          data: entry.data,
          status: 200,
          statusText: "OK (Cached)",
          headers: {},
          config: axiosConfig,
          fromCache: true,
        });
      }
      if (swr && age <= STALE_MAX_AGE_MS) {
        // Return cached snapshot instantly (0ms), then silently update in background
        void fetchAndCache()
          .then((freshRes) => {
            if (typeof onUpdate === "function" && freshRes?.data !== undefined) {
              onUpdate(freshRes.data);
            }
          })
          .catch(() => {});

        return Promise.resolve({
          data: entry.data,
          status: 200,
          statusText: "OK (Stale-While-Revalidate)",
          headers: {},
          config: axiosConfig,
          fromCache: true,
          stale: true,
        });
      }
    }
  }

  return fetchAndCache();
};

export default apiClient;
