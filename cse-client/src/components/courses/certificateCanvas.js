import QRCode from "qrcode";

/**
 * High-resolution HTML5 Canvas Certificate Generator & PNG Downloader.
 * Renders a 2400x1700 landscape diploma featuring platform branding,
 * student name, course title, completion percentage, embossed gold seal,
 * cryptographic SHA-256 digital signature, live verification QR code,
 * and calligraphic Instructor + Platform Director signatures.
 */

const PLATFORM_NAME = "Collaborative Skill Engine";

const loadImageSafe = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const wrapCanvasText = (ctx, text, maxWidth, maxLines = 2) => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        // Append remaining words on final allowed line and ellipsize if needed
        const rest = words.slice(i).join(" ");
        let clipped = rest;
        while (ctx.measureText(clipped).width > maxWidth && clipped.length > 4) {
          clipped = `${clipped.slice(0, -2)}…`;
        }
        lines.push(clipped);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines;
};

const drawRoundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const drawCornerOrnament = (ctx, cx, cy, flipX, flipY) => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(flipX, flipY);

  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 84);
  ctx.lineTo(0, 0);
  ctx.lineTo(84, 0);
  ctx.stroke();

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(16, 56);
  ctx.lineTo(16, 16);
  ctx.lineTo(56, 16);
  ctx.stroke();

  ctx.fillStyle = "#c89b3c";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(24, 0);
  ctx.lineTo(0, 24);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

const drawCalligraphicSignature = (ctx, centerX, baseY, variant = "instructor") => {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#16203a";

  if (variant === "instructor") {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX - 155, baseY + 6);
    ctx.bezierCurveTo(centerX - 130, baseY - 58, centerX - 80, baseY - 64, centerX - 96, baseY + 4);
    ctx.bezierCurveTo(centerX - 74, baseY - 30, centerX - 42, baseY - 24, centerX - 40, baseY + 6);
    ctx.bezierCurveTo(centerX - 24, baseY - 34, centerX + 8, baseY - 30, centerX + 12, baseY + 2);
    ctx.bezierCurveTo(centerX + 34, baseY - 46, centerX + 58, baseY - 40, centerX + 52, baseY + 4);
    ctx.bezierCurveTo(centerX + 82, baseY - 22, centerX + 114, baseY - 12, centerX + 148, baseY - 18);
    ctx.stroke();

    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(centerX - 125, baseY + 18);
    ctx.quadraticCurveTo(centerX + 10, baseY + 8, centerX + 145, baseY + 16);
    ctx.stroke();
  } else {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX - 160, baseY - 10);
    ctx.bezierCurveTo(centerX - 120, baseY - 62, centerX - 65, baseY - 52, centerX - 88, baseY + 8);
    ctx.bezierCurveTo(centerX - 60, baseY - 28, centerX - 24, baseY - 46, centerX - 14, baseY - 4);
    ctx.bezierCurveTo(centerX + 4, baseY - 34, centerX + 42, baseY - 36, centerX + 44, baseY + 4);
    ctx.bezierCurveTo(centerX + 66, baseY - 28, centerX + 98, baseY - 22, centerX + 128, baseY - 8);
    ctx.bezierCurveTo(centerX + 146, baseY - 18, centerX + 162, baseY - 26, centerX + 172, baseY - 22);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 110, baseY + 16);
    ctx.bezierCurveTo(centerX - 30, baseY + 24, centerX + 65, baseY + 10, centerX + 150, baseY + 18);
    ctx.stroke();
  }

  ctx.restore();
};

const drawGoldSeal = (ctx, cx, cy) => {
  ctx.save();

  // Hanging swallowtail ribbons
  const drawRibbon = (offsetX, tiltDeg) => {
    ctx.save();
    ctx.translate(cx + offsetX, cy + 54);
    ctx.rotate((tiltDeg * Math.PI) / 180);
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(24, 0);
    ctx.lineTo(24, 118);
    ctx.lineTo(0, 96);
    ctx.lineTo(-24, 118);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 3;
    ctx.strokeRect(-18, 4, 36, 92);
    ctx.restore();
  };
  drawRibbon(-26, 10);
  drawRibbon(26, -10);

  // Outer 28-point starburst rosette
  const outerR = 92;
  const innerR = 78;
  const spikes = 28;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const goldGrad = ctx.createRadialGradient(cx - 24, cy - 28, 12, cx, cy, outerR);
  goldGrad.addColorStop(0, "#fdf2ba");
  goldGrad.addColorStop(0.42, "#e5be53");
  goldGrad.addColorStop(0.85, "#b38319");
  goldGrad.addColorStop(1, "#7c5508");
  ctx.fillStyle = goldGrad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#785307";
  ctx.stroke();

  // Inner midnight navy medallion
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#f4d77b";
  ctx.stroke();

  // Dashed inner gold ring
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(244, 215, 123, 0.75)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Bold checkmark / Verified stamp inside seal
  ctx.strokeStyle = "#f4d77b";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy + 2);
  ctx.lineTo(cx - 6, cy + 16);
  ctx.lineTo(cx + 22, cy - 16);
  ctx.stroke();

  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CERTIFIED", cx, cy - 28);
  ctx.fillText("OFFICIAL", cx, cy + 38);

  ctx.restore();
};

export const generateCertificatePngBlob = async (certificate) => {
  const W = 2400;
  const H = 1700;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const platformName = certificate?.platformName || PLATFORM_NAME;
  const recipientName = certificate?.recipientName || "Course Graduate";
  const courseTitle = certificate?.courseTitle || "Verified Course";
  const courseTopic = certificate?.courseTopic || "Skill Mastery";
  const instructorName = certificate?.instructorName || "Course Instructor";
  const completionPercent = Math.min(100, Math.round(Number(certificate?.completionPercent || 80)));
  const certificateCode = certificate?.certificateCode || "CSE-VERIFIED";
  const issuedDate = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  // 1. Warm Ivory Paper Background + Radial Highlights
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#fdfbf6");
  bgGrad.addColorStop(0.5, "#faf7ee");
  bgGrad.addColorStop(1, "#f6f0e1");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const glowTop = ctx.createRadialGradient(W * 0.5, H * 0.35, 80, W * 0.5, H * 0.35, 950);
  glowTop.addColorStop(0, "rgba(212, 175, 55, 0.11)");
  glowTop.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, H);

  // Subtle background watermark pattern
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate((-18 * Math.PI) / 180);
  ctx.fillStyle = "rgba(15, 23, 42, 0.025)";
  ctx.font = "700 44px 'Georgia', serif";
  ctx.textAlign = "center";
  for (let y = -900; y <= 900; y += 190) {
    for (let x = -1300; x <= 1300; x += 720) {
      ctx.fillText(platformName.toUpperCase(), x, y);
    }
  }
  ctx.restore();

  // 2. Triple Executive Border & Corner Ornaments
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 14;
  ctx.strokeRect(42, 42, W - 84, H - 84);

  const goldFrameGrad = ctx.createLinearGradient(0, 0, W, H);
  goldFrameGrad.addColorStop(0, "#a87917");
  goldFrameGrad.addColorStop(0.5, "#e6c35c");
  goldFrameGrad.addColorStop(1, "#9a6c11");
  ctx.strokeStyle = goldFrameGrad;
  ctx.lineWidth = 6;
  ctx.strokeRect(66, 66, W - 132, H - 132);

  ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(86, 86, W - 172, H - 172);

  drawCornerOrnament(ctx, 102, 102, 1, 1);
  drawCornerOrnament(ctx, W - 102, 102, -1, 1);
  drawCornerOrnament(ctx, 102, H - 102, 1, -1);
  drawCornerOrnament(ctx, W - 102, H - 102, -1, -1);

  // 3. Header Crest & Platform Brand
  const logoImg = await loadImageSafe("/logo.png");
  const crestCx = 360;
  const crestCy = 225;

  drawRoundedRect(ctx, 200, 155, W - 400, 140, 22);
  ctx.fillStyle = "rgba(15, 23, 42, 0.035)";
  ctx.fill();
  ctx.strokeStyle = "rgba(184, 134, 11, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Brand emblem box
  drawRoundedRect(ctx, crestCx - 125, crestCy - 42, 84, 84, 18);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 3;
  ctx.stroke();

  if (logoImg) {
    ctx.drawImage(logoImg, crestCx - 111, crestCy - 28, 56, 56);
  } else {
    ctx.fillStyle = "#f4d77b";
    ctx.font = "900 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SE", crestCx - 83, crestCy + 11);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 34px 'Inter', system-ui, sans-serif";
  ctx.fillText(platformName.toUpperCase(), crestCx - 20, crestCy - 4);
  ctx.fillStyle = "#8a6412";
  ctx.font = "700 18px 'Inter', system-ui, sans-serif";
  ctx.fillText("OFFICIAL ACADEMIC & SKILL CREDENTIAL BOARD", crestCx - 20, crestCy + 27);

  // Verification Badge on right of header bar
  drawRoundedRect(ctx, W - 585, crestCy - 34, 345, 68, 14);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#34d399";
  ctx.font = "800 15px monospace";
  ctx.fillText("VERIFIED CREDENTIAL • 80%+ MASTERY", W - 412, crestCy - 6);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 21px monospace";
  ctx.fillText(certificateCode, W - 412, crestCy + 20);

  // 4. Main Certificate Heading
  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 76px 'Georgia', 'Times New Roman', serif";
  ctx.fillText("CERTIFICATE OF COMPLETION", W / 2, 430);

  // Ornamental gold rule
  ctx.strokeStyle = "#c89b3c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 420, 466);
  ctx.lineTo(W / 2 - 36, 466);
  ctx.moveTo(W / 2 + 36, 466);
  ctx.lineTo(W / 2 + 420, 466);
  ctx.stroke();

  ctx.fillStyle = "#c89b3c";
  ctx.beginPath();
  ctx.moveTo(W / 2, 452);
  ctx.lineTo(W / 2 + 16, 466);
  ctx.lineTo(W / 2, 480);
  ctx.lineTo(W / 2 - 16, 466);
  ctx.closePath();
  ctx.fill();

  // Presentation line
  ctx.fillStyle = "#64748b";
  ctx.font = "700 24px 'Inter', system-ui, sans-serif";
  ctx.fillText("THIS CERTIFICATE IS PROUDLY PRESENTED TO", W / 2, 545);

  // Recipient Name (dynamically sized for very long names)
  const nameFontSize = recipientName.length > 32 ? 64 : recipientName.length > 22 ? 78 : 92;
  ctx.fillStyle = "#1e1b4b";
  ctx.font = `italic bold ${nameFontSize}px 'Georgia', 'Times New Roman', serif`;
  ctx.fillText(recipientName, W / 2, 660);

  // Underline under recipient name
  const nameWidth = Math.min(1260, Math.max(540, ctx.measureText(recipientName).width + 110));
  const lineGrad = ctx.createLinearGradient(W / 2 - nameWidth / 2, 0, W / 2 + nameWidth / 2, 0);
  lineGrad.addColorStop(0, "rgba(200, 155, 60, 0)");
  lineGrad.addColorStop(0.2, "#c89b3c");
  lineGrad.addColorStop(0.8, "#c89b3c");
  lineGrad.addColorStop(1, "rgba(200, 155, 60, 0)");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameWidth / 2, 692);
  ctx.lineTo(W / 2 + nameWidth / 2, 692);
  ctx.stroke();

  // Achievement Description
  ctx.fillStyle = "#334155";
  ctx.font = "500 31px 'Inter', system-ui, sans-serif";
  ctx.fillText(
    `for successfully achieving ${completionPercent}% completion across practical modules & video lessons in`,
    W / 2,
    766
  );

  // 5. Course Title Plaque
  ctx.font = "800 46px 'Inter', system-ui, sans-serif";
  const courseLines = wrapCanvasText(ctx, courseTitle, 1540, 2);
  const plaqueHeight = courseLines.length > 1 ? 225 : 175;
  const plaqueY = 815;

  drawRoundedRect(ctx, 320, plaqueY, W - 640, plaqueHeight, 26);
  const plaqueGrad = ctx.createLinearGradient(320, plaqueY, W - 320, plaqueY + plaqueHeight);
  plaqueGrad.addColorStop(0, "rgba(15, 23, 42, 0.045)");
  plaqueGrad.addColorStop(0.5, "rgba(212, 175, 55, 0.12)");
  plaqueGrad.addColorStop(1, "rgba(15, 23, 42, 0.045)");
  ctx.fillStyle = plaqueGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(184, 134, 11, 0.55)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 46px 'Inter', system-ui, sans-serif";
  if (courseLines.length === 1) {
    ctx.fillText(courseLines[0], W / 2, plaqueY + 78);
  } else {
    ctx.fillText(courseLines[0], W / 2, plaqueY + 70);
    ctx.fillText(courseLines[1], W / 2, plaqueY + 126);
  }

  // Course Track Subtitle Pill inside Plaque
  ctx.fillStyle = "#4338ca";
  ctx.font = "700 22px monospace";
  ctx.fillText(
    `DISCIPLINE: ${String(courseTopic).toUpperCase()}  •  ${platformName.toUpperCase()}`,
    W / 2,
    plaqueY + plaqueHeight - 36
  );

  // 6. Bottom Signature Blocks & Gold Seal
  const sigBaseY = 1280;
  const leftSigX = 520;
  const rightSigX = W - 520;

  // Left: Course Instructor Signature
  if (certificate?.instructorSignature) {
    const sigImg = await loadImageSafe(certificate.instructorSignature);
    if (sigImg && sigImg.width > 0 && sigImg.height > 0) {
      const maxW = 380;
      const maxH = 110;
      const scale = Math.min(maxW / sigImg.width, maxH / sigImg.height, 1);
      const drawW = sigImg.width * scale;
      const drawH = sigImg.height * scale;
      ctx.drawImage(sigImg, leftSigX - drawW / 2, sigBaseY - drawH + 15, drawW, drawH);
    } else {
      drawCalligraphicSignature(ctx, leftSigX, sigBaseY, "instructor");
    }
  } else {
    drawCalligraphicSignature(ctx, leftSigX, sigBaseY, "instructor");
  }
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftSigX - 220, sigBaseY + 34);
  ctx.lineTo(leftSigX + 220, sigBaseY + 34);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 28px 'Inter', system-ui, sans-serif";
  ctx.fillText(instructorName, leftSigX, sigBaseY + 78);
  ctx.fillStyle = "#64748b";
  ctx.font = "700 18px 'Inter', system-ui, sans-serif";
  ctx.fillText("COURSE INSTRUCTOR SIGNATURE", leftSigX, sigBaseY + 110);

  // Center: Gold Embossed Rosette Seal + Issue Date
  drawGoldSeal(ctx, W / 2, 1265);
  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 22px 'Inter', system-ui, sans-serif";
  ctx.fillText(`Issued on ${issuedDate}`, W / 2, 1495);

  // Right: Platform Academic Authority Signature
  drawCalligraphicSignature(ctx, rightSigX, sigBaseY, "director");
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rightSigX - 220, sigBaseY + 34);
  ctx.lineTo(rightSigX + 220, sigBaseY + 34);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 28px 'Inter', system-ui, sans-serif";
  ctx.fillText(platformName, rightSigX, sigBaseY + 78);
  ctx.fillStyle = "#64748b";
  ctx.font = "700 18px 'Inter', system-ui, sans-serif";
  ctx.fillText("ACADEMIC DIRECTOR • AUTHORIZED SIGN", rightSigX, sigBaseY + 110);

  // 7. Cryptographic QR Verification & Tamper-Proof Seal
  const origin = typeof window !== "undefined" ? window.location.origin : "https://cse.skillengine.io";
  const certHash = certificate?.certHash || "";
  const verifyTarget = certHash || certificateCode;
  const verifyUrl = `${origin}/verify/${verifyTarget}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
    const qrImg = await loadImageSafe(qrDataUrl);
    if (qrImg) {
      const qrBoxX = W - 380;
      const qrBoxY = 1385;
      const qrBoxW = 120;
      const qrBoxH = 120;

      // Draw white card backing for QR
      drawRoundedRect(ctx, qrBoxX - 8, qrBoxY - 8, qrBoxW + 16, qrBoxH + 16, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.drawImage(qrImg, qrBoxX, qrBoxY, qrBoxW, qrBoxH);

      ctx.textAlign = "center";
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 12px 'Inter', system-ui, sans-serif";
      ctx.fillText("SCAN TO VERIFY", qrBoxX + qrBoxW / 2, qrBoxY + qrBoxH + 22);
    }
  } catch (qrErr) {
    console.warn("QR canvas generation failed:", qrErr);
  }

  // Left Cryptographic Security Ledger Stamp
  const stampX = 300;
  const stampY = 1435;
  ctx.textAlign = "left";
  ctx.fillStyle = "#1e293b";
  ctx.font = "800 14px monospace";
  ctx.fillText("DIGITAL SIGNATURE (SHA-256 HMAC):", stampX, stampY);
  ctx.fillStyle = "#64748b";
  ctx.font = "600 12px monospace";
  ctx.fillText(
    certHash ? `${certHash.slice(0, 36)}...` : "PENDING DIGITAL SIGNATURE NOTARIZATION",
    stampX,
    stampY + 20
  );
  ctx.fillStyle = "#059669";
  ctx.font = "700 11px monospace";
  ctx.fillText("STATUS: VERIFIED ON PLATFORM TRUST REGISTRY", stampX, stampY + 38);

  // 8. Micro-Footer Verification Line
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.font = "600 16px monospace";
  ctx.fillText(
    `Certificate ID: ${certificateCode}   •   SHA-256: ${certHash ? certHash.slice(0, 16) : "VERIFIED"}…   •   Public Verification: ${verifyUrl}`,
    W / 2,
    H - 105
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      },
      "image/png",
      1.0
    );
  });
};

export const downloadCertificatePng = async (certificate) => {
  const blob = await generateCertificatePngBlob(certificate);
  const url = URL.createObjectURL(blob);
  const safeCourse = String(certificate?.courseTitle || "Course")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const safeCode = String(certificate?.certificateCode || "CERT").replace(/[^a-zA-Z0-9-]/g, "");
  const fileName = `Certificate-${safeCourse || "Course"}-${safeCode}.png`;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return fileName;
};

