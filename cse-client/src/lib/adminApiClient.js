import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const adminApiClient = axios.create({
  baseURL: `${API}/admin-api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach admin token from localStorage
adminApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      config.headers["x-admin-token"] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 unauthorized / expired session
adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized and not already on the login endpoint or /admin/login page
      const isLoginRequest = error.config?.url?.includes("/login");
      const isMeRequest = error.config?.url?.includes("/me");
      
      if (!isLoginRequest && !isMeRequest) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        if (typeof window !== "undefined" && window.location.pathname !== "/admin/login") {
          window.location.href = "/admin/login?session_expired=true";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default adminApiClient;

