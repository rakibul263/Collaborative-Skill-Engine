/**
 * Production Environment Validator
 * Validates critical environment variables at startup and warns
 * or halts before runtime errors occur.
 */

function validateEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  // 1. Critical Database & Authentication Secrets
  if (!process.env.MONGODB_URI) {
    errors.push("MONGODB_URI is required to connect to MongoDB Atlas.");
  }

  if (!process.env.JWT_SECRET) {
    if (isProd) {
      errors.push("JWT_SECRET must be defined in production. Fallback secrets are forbidden.");
    } else {
      warnings.push("JWT_SECRET is unset; please set a 256-bit secret for user sessions.");
    }
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    if (isProd) {
      errors.push("ADMIN_JWT_SECRET must be defined in production to protect the Admin Control Center.");
    } else {
      warnings.push("ADMIN_JWT_SECRET is unset; admin authentication may fail or be insecure.");
    }
  }

  // 2. Cryptographic Certificate Secret
  if (!process.env.CERTIFICATE_SECRET) {
    warnings.push("CERTIFICATE_SECRET is not set; certificates will fallback to hashing with JWT_SECRET.");
  }

  // 3. Cloudinary Assets
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    warnings.push("Cloudinary credentials are incomplete; image/PDF cloud uploads will fallback to local storage.");
  }

  // 4. CORS Whitelist
  if (!process.env.ALLOWED_ORIGINS && isProd) {
    warnings.push("ALLOWED_ORIGINS is not specified in production; defaulting to localhost:5173.");
  }

  // Print results
  if (warnings.length > 0) {
    console.warn("\x1b[33m%s\x1b[0m", "⚠️  [ENV WARNINGS]:");
    warnings.forEach((w) => console.warn(`   • ${w}`));
  }

  if (errors.length > 0) {
    console.error("\x1b[31m%s\x1b[0m", "🚨 [FATAL CONFIG ERROR] Server cannot start due to missing environment variables:");
    errors.forEach((e) => console.error(`   ✖ ${e}`));
    if (isProd) {
      process.exit(1);
    }
  } else {
    console.log("\x1b[32m%s\x1b[0m", "✅ [ENV VALIDATION] Environment configuration verified successfully.");
  }
}

module.exports = { validateEnv };

