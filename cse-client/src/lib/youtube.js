/**
 * youtube.js — Helpers for parsing, validating, previewing, and embedding
 * YouTube Unlisted and Listed lesson videos safely.
 */

const YT_ID_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.|studio\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|video\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[/?&#].*)?$/i;

/**
 * Extracts the 11-character YouTube Video ID from standard, short, embed,
 * live, shorts, or YouTube Studio URLs.
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const match = trimmed.match(YT_ID_REGEX);
  if (match && match[1]) return match[1];

  // Fallback URLSearchParams parse for non-standard parameter order
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const studioIdx = parts.indexOf("video");
      if (studioIdx !== -1 && /^[A-Za-z0-9_-]{11}$/.test(parts[studioIdx + 1] || "")) {
        return parts[studioIdx + 1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isValidYouTubeUrl(url) {
  return Boolean(extractYouTubeId(url));
}

export function normalizeYouTubeWatchUrl(url) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : (url || "").trim();
}

export function getYouTubeEmbedUrl(url, { autoplay = false } = {}) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
  });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function getYouTubeThumbnailUrl(url, quality = "hqdefault") {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

/**
 * Fetches video title, channel, and exact duration (in minutes & seconds).
 * Queries the backend YouTube meta extractor first (which parses lengthSeconds & itemprop),
 * falling back to public oEmbed API if the server is unreachable.
 */
export async function fetchYouTubeMeta(url) {
  const id = extractYouTubeId(url);
  if (!id) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const fallback = {
    videoId: id,
    watchUrl,
    embedUrl: getYouTubeEmbedUrl(watchUrl),
    thumbnailUrl: getYouTubeThumbnailUrl(watchUrl, "hqdefault"),
    title: "",
    duration: 15,
    durationMinutes: 15,
    durationSeconds: 900,
    durationFormatted: "15:00",
    authorName: "",
  };

  // 1. Try our backend metadata extractor for exact video duration and title
  try {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const serverRes = await fetch(
      `${API_BASE}/courses/youtube-meta?url=${encodeURIComponent(watchUrl)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData && (serverData.title || serverData.durationMinutes)) {
        return {
          ...fallback,
          title: serverData.title || fallback.title,
          duration: Number(serverData.durationMinutes) || fallback.duration,
          durationMinutes: Number(serverData.durationMinutes) || fallback.durationMinutes,
          durationSeconds: Number(serverData.durationSeconds) || fallback.durationSeconds,
          durationFormatted: serverData.durationFormatted || fallback.durationFormatted,
          authorName: serverData.authorName || fallback.authorName,
          thumbnailUrl: serverData.thumbnailUrl || fallback.thumbnailUrl,
        };
      }
    }
  } catch {
    /* proceed to client-side oEmbed fallback */
  }

  // 2. Client-side oEmbed fallback (extracts title & author)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      ...fallback,
      title: data.title || "",
      authorName: data.author_name || "",
      thumbnailUrl: data.thumbnail_url || fallback.thumbnailUrl,
    };
  } catch {
    return fallback;
  }
}

