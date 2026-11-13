import axios from "axios";
import { getJWT, setJWT, clearJWT, isTokenExpired } from "./jwt";
import { auth } from "@/firebase/firebase.init";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

let exchanging = null;

export const exchangeToken = async () => {
  if (exchanging) return exchanging;

  exchanging = (async () => {
    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) return null;

      const firebaseToken = await currentUser.getIdToken(true);
      const res = await axios.post(`${API_URL}/auth/token`, { firebaseToken });

      if (res.data?.token) {
        setJWT(res.data.token);
        return res.data.token;
      }
      return null;
    } catch (error) {
      console.error("[apiClient] Token exchange failed:", error);
      clearJWT();
      return null;
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

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to continue.");
  }

  token = await exchangeToken();
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
  if ((!token || isTokenExpired(token)) && auth?.currentUser) {
    if (token && isTokenExpired(token)) clearJWT();
    token = await exchangeToken();
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axios.interceptors.response.use(
  (response) => response,
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
  (response) => response,
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
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/token")
    ) {
      original._retry = true;
      clearJWT();
      const token = await exchangeToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
