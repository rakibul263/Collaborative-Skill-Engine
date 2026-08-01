import apiClient from "./apiClient";

const parseAdvisorError = (err) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl || apiUrl === "undefined") {
    return "API URL missing. Set VITE_API_URL=http://localhost:3000 in cse-client/.env";
  }
  if (err.code === "ERR_NETWORK") {
    return "Cannot reach server. Start cse-server (npm run dev) on port 3000.";
  }
  if (err.response?.status === 401) {
    return "Session expired. Please log out and sign in again.";
  }
  if (err.response?.status === 503) {
    return err.response?.data?.message || "AI service is not configured on the server.";
  }
  return (
    err.response?.data?.message ||
    err.message ||
    "Failed to get AI advice. Please try again."
  );
};

export const postAdvisorMessage = async ({ goal, message }) => {
  try {
    const res = await apiClient.post(
      "/ai-advisor",
      { goal, message },
      { timeout: 120000 },
    );
    return res.data;
  } catch (err) {
    throw new Error(parseAdvisorError(err));
  }
};

export const fetchAdvisorHistory = async () => {
  try {
    const res = await apiClient.get("/ai-advisor/history", {
      timeout: 30000,
    });
    return res.data?.history || [];
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 503) {
      throw new Error(parseAdvisorError(err));
    }
    return [];
  }
};
