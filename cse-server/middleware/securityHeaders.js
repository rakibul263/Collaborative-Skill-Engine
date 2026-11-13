/**
 * Production Security Headers Middleware
 * Implements OWASP recommended security headers (equivalent to Helmet)
 * without adding third-party runtime bloat.
 */

function securityHeaders(req, res, next) {
  // Hide Express identity
  res.removeHeader("x-powered-by");

  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent Clickjacking attacks
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Force HTTPS via HSTS (1 year) when in production or on TLS
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  if (process.env.NODE_ENV === "production" || isHttps) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Cross-Origin policies tailored for collaborative web apps
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  // Disable browser XSS auditor (modern standard to avoid edge-case vulnerabilities)
  res.setHeader("X-XSS-Protection", "0");

  // Referrer header security
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable DNS prefetching to avoid user data leakage
  res.setHeader("X-DNS-Prefetch-Control", "off");

  // Prevent IE from executing downloads in site's context
  res.setHeader("X-Download-Options", "noopen");

  // Restrict Flash / PDF cross-domain access
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  next();
}

module.exports = { securityHeaders };

