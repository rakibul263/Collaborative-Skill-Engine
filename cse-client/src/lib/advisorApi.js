import apiClient, { ensureAuthToken } from "./apiClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

export const clearAdvisorHistory = async () => {
  try {
    const res = await apiClient.delete("/ai-advisor/history");
    return res.data;
  } catch (err) {
    throw new Error(parseAdvisorError(err));
  }
};

export const saveAdvisorRoadmap = async ({ goal, roadmap, careerDirection, prioritySteps }) => {
  try {
    const res = await apiClient.post("/ai-advisor/save-roadmap", {
      goal,
      roadmap,
      careerDirection,
      prioritySteps,
    });
    return res.data;
  } catch (err) {
    throw new Error(parseAdvisorError(err));
  }
};

export const streamAdvisorMessage = async ({ goal, message }, onToken, onDone, onError) => {
  try {
    const token = await ensureAuthToken();
    const response = await fetch(`${API_URL}/ai-advisor/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ goal, message }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server responded with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const payload = JSON.parse(trimmed.slice(6));
            if (payload.type === "token") {
              onToken?.(payload.text);
            } else if (payload.type === "done") {
              onDone?.(payload);
            } else if (payload.type === "error") {
              onError?.(new Error(payload.error));
            }
          } catch {
            // ignore partial json
          }
        }
      }
    }
  } catch (err) {
    const parsedErr = new Error(parseAdvisorError(err));
    if (typeof onError === "function") {
      onError(parsedErr);
      return;
    }
    throw parsedErr;
  }
};

export const streamInterviewTurn = async (
  { role, level, action, interviewHistory, candidateAnswer },
  onToken,
  onDone,
  onError
) => {
  try {
    const token = await ensureAuthToken();
    const response = await fetch(`${API_URL}/ai-advisor/interview/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ role, level, action, interviewHistory, candidateAnswer }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server responded with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const payload = JSON.parse(trimmed.slice(6));
            if (payload.type === "token") {
              onToken?.(payload.text);
            } else if (payload.type === "done") {
              onDone?.(payload);
            } else if (payload.type === "error") {
              onError?.(new Error(payload.error));
            }
          } catch {
            // ignore partial json
          }
        }
      }
    }
  } catch (err) {
    const parsedErr = new Error(parseAdvisorError(err));
    if (typeof onError === "function") {
      onError(parsedErr);
      return;
    }
    throw parsedErr;
  }
};
