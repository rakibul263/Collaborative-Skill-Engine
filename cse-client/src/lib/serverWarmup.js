const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");

let started = false;
let lastPingAt = 0;

const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes (< 15m Render free sleep)
const COLD_START_RETRY_DELAY_MS = 3000;
const MAX_WAKEUP_ATTEMPTS = 20;

const pingHealthOnce = async () => {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
  try {
    const res = await fetch(`${API_URL}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller?.signal,
    });
    lastPingAt = Date.now();
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.status === "ok");
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const wakeUntilReady = async () => {
  for (let attempt = 0; attempt < MAX_WAKEUP_ATTEMPTS; attempt++) {
    const ready = await pingHealthOnce();
    if (ready) return true;
    await new Promise((resolve) => setTimeout(resolve, COLD_START_RETRY_DELAY_MS));
  }
  return false;
};

/**
 * Immediately pings the backend on client startup so sleeping Render instances
 * start booting right away, and keeps the server warm while the tab is active.
 */
export const initServerWarmup = () => {
  if (typeof window === "undefined" || started) return;
  started = true;

  // 1. Immediate wake-up hit as soon as the app loads
  void wakeUntilReady();

  // 2. Keep backend warm while tab stays visible (skips rate limiter via /health)
  setInterval(() => {
    if (document.visibilityState === "visible") {
      void pingHealthOnce();
    }
  }, KEEP_ALIVE_INTERVAL_MS);

  // 3. Re-warm immediately if user returns to an idle tab after > 4 minutes
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      Date.now() - lastPingAt >= KEEP_ALIVE_INTERVAL_MS
    ) {
      void wakeUntilReady();
    }
  });
};
