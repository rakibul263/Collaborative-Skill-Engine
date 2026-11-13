/**
 * Extracts and normalizes the client IP address from the request.
 */
function parseClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim());
    if (ips[0]) return ips[0].replace(/^::ffff:/, "");
  }
  const realIp = req.headers["x-real-ip"];
  if (realIp) return realIp.replace(/^::ffff:/, "");

  const ip = req.socket?.remoteAddress || req.ip || "127.0.0.1";
  return ip.replace(/^::ffff:/, "");
}

/**
 * Parses a User-Agent header into a clean readable device and browser summary.
 */
function parseUserAgent(ua = "") {
  let browser = "Web Browser";
  let os = "Desktop";
  let deviceType = "Desktop";

  const lower = ua.toLowerCase();

  // Device detection
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    deviceType = "Mobile";
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    deviceType = "Tablet";
  }

  // OS detection
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/cros/i.test(ua)) os = "ChromeOS";

  // Browser detection
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

  return {
    browser,
    os,
    deviceType,
    summary: `${browser} &bull; ${os} (${deviceType})`,
  };
}

module.exports = {
  parseClientIp,
  parseUserAgent,
};

