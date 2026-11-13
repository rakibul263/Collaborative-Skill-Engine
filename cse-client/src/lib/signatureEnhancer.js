/**
 * signatureEnhancer.js
 * 
 * Free, client-side, zero-dependency engine for:
 * 1. Automatic Paper Background Removal (converting white/gray/cream paper into 100% transparent PNG).
 * 2. AI / Smart Stroke Vectorization & Contrast Enhancement (deepens faded ink, sharpens strokes, removes noise).
 * 3. Auto-cropping / Bounding Box Trimming so the signature fits neatly onto course certificates.
 */

export const INK_PALETTES = {
  midnight: {
    id: "midnight",
    label: "Midnight Slate (Recommended)",
    r: 15,
    g: 23,
    b: 42, // #0f172a
    hex: "#0f172a",
  },
  navy: {
    id: "navy",
    label: "Executive Navy",
    r: 14,
    g: 37,
    b: 85, // #0e2555
    hex: "#0e2555",
  },
  classicBlack: {
    id: "classicBlack",
    label: "Classic Black",
    r: 0,
    g: 0,
    b: 0,
    hex: "#000000",
  },
  royalBlue: {
    id: "royalBlue",
    label: "Royal Blue",
    r: 29,
    g: 78,
    b: 216, // #1d4ed8
    hex: "#1d4ed8",
  },
  original: {
    id: "original",
    label: "Original Pen Tone",
    hex: "transparent",
  },
};

/**
 * Loads a File, Blob, or URL into an HTMLImageElement safely.
 */
export const loadImageElement = (source) =>
  new Promise((resolve, reject) => {
    if (!source) return reject(new Error("No image source provided."));

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error("Failed to load image: " + (err?.message || "unknown")));

    if (source instanceof Blob || source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    } else if (typeof source === "string") {
      img.src = source;
    } else {
      reject(new Error("Unsupported image source type."));
    }
  });

/**
 * Automatically removes background, enhances ink strokes, and trims bounding box.
 * Runs 100% locally on HTML5 Canvas.
 */
export const removeBackgroundAndEnhanceSignature = async (
  source,
  options = {}
) => {
  const {
    threshold = 210, // Luminance threshold for paper (0-255)
    inkColor = "midnight", // 'midnight' | 'navy' | 'classicBlack' | 'royalBlue' | 'original'
    contrast = 1.3,
    trimPadding = 18,
    maxDimension = 1400,
  } = options;

  const img = await loadImageElement(source);

  // Downscale if image is gigantic to keep processing instant
  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imgData.data;
  const totalPixels = targetWidth * targetHeight;

  // 1. Estimate Paper Background Color from border sampling
  let sampleCount = 0;
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;

  const sampleMargin = Math.max(2, Math.floor(Math.min(targetWidth, targetHeight) * 0.05));
  for (let y = 0; y < targetHeight; y += 4) {
    for (let x = 0; x < targetWidth; x += 4) {
      if (
        x < sampleMargin ||
        x > targetWidth - sampleMargin ||
        y < sampleMargin ||
        y > targetHeight - sampleMargin
      ) {
        const idx = (y * targetWidth + x) * 4;
        bgR += pixels[idx];
        bgG += pixels[idx + 1];
        bgB += pixels[idx + 2];
        sampleCount += 1;
      }
    }
  }

  bgR = sampleCount > 0 ? bgR / sampleCount : 255;
  bgG = sampleCount > 0 ? bgG / sampleCount : 255;
  bgB = sampleCount > 0 ? bgB / sampleCount : 255;

  const palette = INK_PALETTES[inkColor] || INK_PALETTES.midnight;
  const isOriginal = inkColor === "original";

  let minX = targetWidth;
  let minY = targetHeight;
  let maxX = 0;
  let maxY = 0;
  let inkPixelCount = 0;

  // 2. Pixel Transformation: Eradicate Background & Compute Anti-Aliased Alpha
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a === 0) continue;

    // Perceived Luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Distance from paper color
    const distFromBg = Math.sqrt(
      Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
    );

    // If pixel is background paper or faint shadow on border
    if (lum >= threshold || distFromBg < 24) {
      pixels[i + 3] = 0; // 100% transparent
      continue;
    }

    // Relative Darkness (0 to 1)
    const darkness = Math.min(1, Math.max(0, (threshold - lum) / threshold));

    // Smooth Alpha Ramp with Contrast Boost
    let newAlpha = Math.round(Math.pow(darkness, 0.7) * 255 * contrast);
    newAlpha = Math.min(255, Math.max(0, newAlpha));

    // Threshold out faint dust / scanner grain
    if (newAlpha < 22) {
      pixels[i + 3] = 0;
      continue;
    }

    pixels[i + 3] = newAlpha;

    // AI Ink Tone Enhancement
    if (!isOriginal) {
      // Blend stroke density towards executive ink palette
      const blend = Math.min(1, newAlpha / 255);
      pixels[i] = Math.round(palette.r * blend + r * (1 - blend) * 0.15);
      pixels[i + 1] = Math.round(palette.g * blend + g * (1 - blend) * 0.15);
      pixels[i + 2] = Math.round(palette.b * blend + b * (1 - blend) * 0.15);
    } else {
      // Deepen original ink contrast
      pixels[i] = Math.max(0, Math.round(r * 0.85));
      pixels[i + 1] = Math.max(0, Math.round(g * 0.85));
      pixels[i + 2] = Math.max(0, Math.round(b * 0.85));
    }

    // Update Bounding Box
    const pxIndex = i / 4;
    const pxX = pxIndex % targetWidth;
    const pxY = Math.floor(pxIndex / targetWidth);

    if (pxX < minX) minX = pxX;
    if (pxX > maxX) maxX = pxX;
    if (pxY < minY) minY = pxY;
    if (pxY > maxY) maxY = pxY;

    inkPixelCount += 1;
  }

  // Put filtered pixels back to offscreen canvas
  ctx.putImageData(imgData, 0, 0);

  // If no ink was found or signature empty
  if (inkPixelCount < 10 || minX > maxX || minY > maxY) {
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: targetWidth,
      height: targetHeight,
      hasInk: false,
    };
  }

  // 3. Auto-trim bounding box with neat padding
  const cropX = Math.max(0, minX - trimPadding);
  const cropY = Math.max(0, minY - trimPadding);
  const cropW = Math.min(targetWidth - cropX, maxX - minX + trimPadding * 2);
  const cropH = Math.min(targetHeight - cropY, maxY - minY + trimPadding * 2);

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext("2d");

  croppedCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  const finalDataUrl = croppedCanvas.toDataURL("image/png");

  return {
    dataUrl: finalDataUrl,
    width: cropW,
    height: cropH,
    originalWidth: targetWidth,
    originalHeight: targetHeight,
    hasInk: true,
    bgRemovedRatio: Number(((totalPixels - inkPixelCount) / totalPixels).toFixed(2)),
  };
};

/**
 * Trims a user-drawn canvas to remove excess transparent padding.
 */
export const trimCanvas = (canvas, trimPadding = 16) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const p = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] > 15) {
      found = true;
      const idx = i / 4;
      const x = idx % w;
      const y = Math.floor(idx / w);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!found) return canvas.toDataURL("image/png");

  const cropX = Math.max(0, minX - trimPadding);
  const cropY = Math.max(0, minY - trimPadding);
  const cropW = Math.min(w - cropX, maxX - minX + trimPadding * 2);
  const cropH = Math.min(h - cropY, maxY - minY + trimPadding * 2);

  const trimmed = document.createElement("canvas");
  trimmed.width = cropW;
  trimmed.height = cropH;
  const tCtx = trimmed.getContext("2d");
  tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return trimmed.toDataURL("image/png");
};

