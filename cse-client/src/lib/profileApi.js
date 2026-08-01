/**
 * profileApi.js — Production-level profile API utilities
 *
 * All PATCH requests go through `apiClient` which automatically:
 *  - Attaches the JWT Bearer token
 *  - Refreshes the token if it's expired (401 retry)
 *
 * Profile image flow:
 *  1. File is validated & compressed client-side (Canvas API → ≤800px JPEG)
 *  2. Compressed file is uploaded directly to Cloudinary (unsigned preset)
 *  3. Cloudinary returns { secure_url, public_id }
 *  4. Both are sent to the server PATCH endpoint
 *  5. Server saves them to MongoDB and deletes the old Cloudinary image
 */

import apiClient from "./apiClient";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_IMAGE_DIMENSION = 800;   // px — longest side
const IMAGE_QUALITY       = 0.8;   // JPEG quality (0-1)

// ─── Image Validation ─────────────────────────────────────────────────────────

/**
 * Validates an image file before processing.
 * Throws a human-readable Error if validation fails.
 *
 * @param {File} file
 */
export const validateImageFile = (file) => {
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_SIZE_MB = 5;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Unsupported format. Please select a JPG, PNG, or WEBP image.");
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image exceeds ${MAX_SIZE_MB} MB. Please choose a smaller file.`);
  }
};

// ─── Image Compression (Canvas → File) ───────────────────────────────────────

/**
 * Compresses an image File using the browser Canvas API.
 * Returns a new File object (JPEG) resized to ≤800px on the longest side.
 * Used for Cloudinary uploads (FormData requires a File/Blob).
 *
 * @param {File} file - The raw image File from <input type="file">
 * @returns {Promise<File>} - Compressed File object
 */
export const compressImageToFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image."));
    };

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_IMAGE_DIMENSION);
          width  = MAX_IMAGE_DIMENSION;
        } else {
          width  = Math.round((width / height) * MAX_IMAGE_DIMENSION);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas context unavailable."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed."));
            return;
          }
          const compressedName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          resolve(new File([blob], compressedName, { type: "image/jpeg", lastModified: Date.now() }));
        },
        "image/jpeg",
        IMAGE_QUALITY
      );
    };

    img.src = objectUrl;
  });

/**
 * Compresses an image File and returns a base64 data URL.
 * Kept for any legacy consumers that still expect a string.
 *
 * @param {File} file
 * @returns {Promise<string>} base64 data URL
 */
export const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round((height / width) * MAX_IMAGE_DIMENSION);
            width  = MAX_IMAGE_DIMENSION;
          } else {
            width  = Math.round((width / height) * MAX_IMAGE_DIMENSION);
            height = MAX_IMAGE_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// ─── Cloudinary Upload ────────────────────────────────────────────────────────

/**
 * Compresses and uploads a profile image to Cloudinary using server-side signing.
 *
 * Flow:
 *  1. Compress file client-side (Canvas → JPEG ≤800px)
 *  2. POST /cloudinary/sign  — server returns { signature, apiKey, timestamp, cloudName, folder }
 *  3. Upload FormData to Cloudinary using the signed params (no upload preset needed)
 *
 * @param {File} file - Raw image file from <input type="file">
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 * @throws {Error} if signing or upload fails
 */
export const uploadProfileImageToCloudinary = async (file) => {
  // Step 1: Compress the image to a File object
  const compressed = await compressImageToFile(file);

  // Step 2: Get a server-side signature (JWT-protected endpoint)
  const signRes = await apiClient.post(`/cloudinary/sign`);
  if (!signRes.data?.success) {
    throw new Error(signRes.data?.message || "Could not obtain upload signature from server.");
  }
  const { signature, apiKey, timestamp, cloudName, folder } = signRes.data;

  // Step 3: Build signed FormData
  const formData = new FormData();
  formData.append("file",      compressed);
  formData.append("api_key",   apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder",    folder);

  // Step 4: Upload directly to Cloudinary CDN
  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    formData
  );

  const { secure_url, public_id } = res.data;
  if (!secure_url || !public_id) {
    throw new Error("Cloudinary upload returned an unexpected response.");
  }

  return { secure_url, public_id };
};

/**
 * Uploads a certificate file (Image or PDF) to Cloudinary using signed authentication.
 *
 * @param {File} file - Raw File from input
 * @returns {Promise<{ secure_url: string, public_id: string, fileType: string }>}
 */
export const uploadCertificateFileToCloudinary = async (file) => {
  if (!file) throw new Error("No file provided for upload.");

  const MAX_SIZE_MB = 5;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Certificate file exceeds ${MAX_SIZE_MB}MB.`);
  }

  let fileToUpload = file;
  if (file.type && file.type.startsWith("image/")) {
    try {
      fileToUpload = await compressImageToFile(file);
    } catch (e) {
      fileToUpload = file;
    }
  }

  // Get server-side signature for certificates folder
  const signRes = await apiClient.post(`/cloudinary/sign`, { folder: "certificates" });
  if (!signRes.data?.success) {
    throw new Error(signRes.data?.message || "Could not obtain upload signature from server.");
  }
  const { signature, apiKey, timestamp, cloudName, folder } = signRes.data;

  const formData = new FormData();
  formData.append("file", fileToUpload);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);

  const endpoint = file.type && file.type.startsWith("image/") ? "image/upload" : "auto/upload";

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${endpoint}`,
    formData
  );

  const { secure_url, public_id } = res.data;
  if (!secure_url || !public_id) {
    throw new Error("Cloudinary upload returned an invalid response.");
  }

  return {
    secure_url,
    public_id,
    fileType: file.type || (file.name?.endsWith(".pdf") ? "application/pdf" : "image/png"),
  };
};

// ─── Cache Busting ────────────────────────────────────────────────────────────

/**
 * Appends a cache-busting query parameter to a Cloudinary image URL.
 * Non-Cloudinary URLs (e.g. Google OAuth photos) are returned unchanged.
 *
 * Uses `updatedAt` timestamp as the version token so the URL changes only when
 * the profile is actually updated — not on every render.
 *
 * @param {string} url        - The image URL
 * @param {string} [updatedAt] - ISO date string from the user's updatedAt field
 * @returns {string}
 */
export const withCacheBust = (url, updatedAt) => {
  if (!url || typeof url !== "string") return url || "";

  // Only bust cache for Cloudinary-hosted images
  if (!url.includes("res.cloudinary.com")) return url;

  // Derive a stable numeric version from updatedAt, falling back to now
  const version = updatedAt
    ? new Date(updatedAt).getTime()
    : Date.now();

  // Avoid double-appending
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
};

// ─── Profile Fetch ────────────────────────────────────────────────────────────

/**
 * Fetches the current user's profile data from the backend.
 *
 * Returns null when the user is not yet in the database (new account) so the
 * profile page can render gracefully with defaults instead of crashing.
 *
 * @param {string} email
 * @returns {Promise<object|null>} - User document or null if not found
 */
export const fetchProfile = async (email) => {
  try {
    const res = await apiClient.get(
      `/users?email=${encodeURIComponent(email)}`
    );
    return res.data;
  } catch (err) {
    // 404 = user not yet created in MongoDB (new registration) — return null so
    // the profile page renders with default empty state instead of throwing.
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
};

// ─── Profile Update ───────────────────────────────────────────────────────────

/**
 * Sends a PATCH request to update the authenticated user's profile.
 * Only the fields in `changedFields` are sent (true partial update).
 * Automatically attaches the JWT via apiClient interceptor.
 *
 * @param {string}  userId        - MongoDB _id or email of the user
 * @param {object}  changedFields - Only the fields that changed
 * @param {AbortSignal} [signal]  - Optional AbortController signal
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export const updateProfile = async (userId, changedFields, signal) => {
  const res = await apiClient.patch(
    `/users/${encodeURIComponent(userId)}`,
    changedFields,
    { signal }
  );
  return res.data;
};

// ─── Diff Builder ─────────────────────────────────────────────────────────────

/**
 * Builds a payload containing only the fields that differ between
 * `original` (fetched from DB) and `updated` (form values).
 * Arrays (projects, certificates) are always included in full.
 * profileImagePublicId is always included if profileImage changed.
 *
 * @param {object} original          - The saved user document
 * @param {object} updated           - The new form values
 * @param {Array}  projects          - Current projects array state
 * @param {Array}  certificates      - Current certificates array state
 * @param {string} [newPublicId]     - New Cloudinary public_id (if image changed)
 * @returns {object}                 - Only changed / necessary fields
 */
export const buildDiffPayload = (original, updated, projects, certificates, newPublicId) => {
  const ALWAYS_INCLUDE = new Set(["projects", "certificates"]);
  const diff = {};

  for (const [key, newValue] of Object.entries(updated)) {
    if (ALWAYS_INCLUDE.has(key)) continue;
    const oldValue = original?.[key];
    const normalize = (v) => (v === null || v === undefined ? "" : String(v));
    if (normalize(newValue) !== normalize(oldValue)) {
      diff[key] = newValue;
    }
  }

  // If the profile image changed, always include both URL and public_id together
  if (diff.profileImage && newPublicId !== undefined) {
    diff.profileImagePublicId = newPublicId;
  }

  diff.projects     = projects;
  diff.certificates = certificates;

  return diff;
};

// ─── Certificate Sanitizer ────────────────────────────────────────────────────

/**
 * Strips base64 fileUrl from certificate objects before sending to the API.
 * Only real HTTP(S) URLs are preserved — binary data must not reach MongoDB.
 *
 * @param {Array} certs
 * @returns {Array}
 */
export const sanitizeCertificates = (certs = []) =>
  certs.map(({ fileUrl, public_id, fileType, ...rest }) => {
    const isRealUrl =
      typeof fileUrl === "string" &&
      (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"));
    return isRealUrl
      ? { ...rest, fileUrl, public_id: public_id || null, fileType: fileType || null }
      : { ...rest };
  });
