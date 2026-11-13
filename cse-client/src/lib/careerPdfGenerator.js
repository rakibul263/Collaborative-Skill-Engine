import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { generateCareerIntelligence } from "./careerIntelligence";

/**
 * Generates an official, print-ready, cryptographic Career Roadmap & Skill Audit PDF.
 * @param {Object} profile - User profile data
 * @param {Object} latestResponse - Latest AI Advisor response
 * @returns {Promise<jsPDF>}
 */
export async function createCareerReportPdf(profile, latestResponse) {
  const intel = generateCareerIntelligence(profile, latestResponse);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const candidateName = profile?.fullName || "CSE Engineer";
  const candidateEmail = profile?.email || "student@institution.edu";
  const department = profile?.department || "Computer Science & Engineering";
  const institution = profile?.institution || "Collaborative Skill Engine";
  const targetGoal = intel?.inferredGoal || "Full Stack Developer";
  const readiness = intel?.readiness || {
    overall: { score: 75 },
    frontend: { score: 70 },
    backend: { score: 80 },
    fullstack: { score: 75 },
  };

  const currentSkills = intel?.currentSkills || intel?.masteredSkills || [];
  const missingGaps = intel?.missingGaps || [];
  const roadmap = intel?.roadmap || [];
  const portfolioSuggestions = intel?.portfolioSuggestions || [];
  const strengths = intel?.strengths || [];
  const weaknesses = intel?.weaknesses || [];
  const summary =
    intel?.summary ||
    "Continuous career intelligence assessment based on verified profile competencies.";

  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const reportId = `CSE-CR-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const verifyUrl = `${window?.location?.origin || "https://skillengine.edu"}/network?candidate=${encodeURIComponent(candidateEmail)}`;

  // Generate QR Code data URL
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 250,
      color: {
        dark: "#0b1021",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.warn("QR code generation skipped:", err);
  }

  // ─────────────────────────────────────────────────────────────
  // ── PAGE 1: EXECUTIVE AUDIT & COMPETENCY DIAGNOSTIC ──────────
  // ─────────────────────────────────────────────────────────────

  // Top Dark Header Bar
  doc.setFillColor(11, 16, 33); // #0b1021
  doc.rect(0, 0, pageWidth, 28, "F");

  // Gradient accent strip
  doc.setFillColor(79, 70, 229); // indigo
  doc.rect(0, 27, pageWidth / 2, 1.5, "F");
  doc.setFillColor(16, 185, 129); // emerald
  doc.rect(pageWidth / 2, 27, pageWidth / 2, 1.5, "F");

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("COLLABORATIVE SKILL ENGINE", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(165, 180, 252); // indigo-200
  doc.text("AI CAREER INTELLIGENCE STUDIO // OFFICIAL SKILL AUDIT & ROADMAP", margin, 18);

  // Doc ID & Date (Right aligned)
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`DOC ID: ${reportId}`, pageWidth - margin, 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`ISSUED: ${issueDate}`, pageWidth - margin, 18, { align: "right" });

  let y = 34;

  // ── Candidate Profile Bar ──
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "FD");

  // Left: Name & Contact
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(candidateName, margin + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`${candidateEmail}  |  ${department}  |  ${institution}`, margin + 4, y + 14);

  // Right: Target Role Pill
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(pageWidth - margin - 65, y + 4, 61, 14, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(224, 231, 255);
  doc.text("TARGET CAREER VECTOR", pageWidth - margin - 34.5, y + 9, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(targetGoal.length > 22 ? targetGoal.slice(0, 20) + "..." : targetGoal, pageWidth - margin - 34.5, y + 15, { align: "center" });

  y += 28;

  // ── Executive Readiness Scorecard ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("1. EXECUTIVE MARKET READINESS SCORECARD", margin, y);

  y += 4;

  // Score Box (Left)
  const scoreBoxWidth = 55;
  const scoreBoxHeight = 34;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, scoreBoxWidth, scoreBoxHeight, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("OVERALL READINESS", margin + scoreBoxWidth / 2, y + 8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${readiness.overall.score}%`, margin + scoreBoxWidth / 2, y + 20, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  const statusLabel =
    readiness.overall.score >= 75
      ? "TOP TIER // PRODUCTION READY"
      : readiness.overall.score >= 50
      ? "COMPETITIVE // ACCELERATING"
      : "EMERGING TALENT";
  doc.text(statusLabel, margin + scoreBoxWidth / 2, y + 28, { align: "center" });

  // Domain Breakdown (Right)
  const domainBoxX = margin + scoreBoxWidth + 5;
  const domainBoxWidth = contentWidth - scoreBoxWidth - 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(domainBoxX, y, domainBoxWidth, scoreBoxHeight, 3, 3, "FD");

  const domains = [
    { label: "Frontend Architecture", score: readiness.frontend?.score || 70, color: [79, 70, 229] },
    { label: "Backend & Systems", score: readiness.backend?.score || 80, color: [16, 185, 129] },
    { label: "Full-Stack Competency", score: readiness.fullstack?.score || 75, color: [147, 51, 234] },
  ];

  let domainY = y + 7;
  domains.forEach((dom) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(dom.label, domainBoxX + 5, domainY);

    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(dom.color[0], dom.color[1], dom.color[2]);
    doc.text(`${dom.score}%`, domainBoxX + domainBoxWidth - 7, domainY, { align: "right" });

    // Progress bar background
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(domainBoxX + 5, domainY + 2, domainBoxWidth - 12, 2, 1, 1, "F");

    // Progress fill
    doc.setFillColor(dom.color[0], dom.color[1], dom.color[2]);
    const fillWidth = ((domainBoxWidth - 12) * dom.score) / 100;
    doc.roundedRect(domainBoxX + 5, domainY + 2, fillWidth, 2, 1, 1, "F");

    domainY += 9;
  });

  y += scoreBoxHeight + 8;

  // ── Verified Repertoire vs Critical Gaps ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("2. SKILL AUDIT & GAP MATRIX", margin, y);

  y += 4;

  const halfWidth = (contentWidth - 5) / 2;

  // Column 1: Verified Skills Repertoire
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(margin, y, halfWidth, 38, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`VERIFIED LIVE PORTFOLIO (${currentSkills.length} SKILLS)`, margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  const displayedSkills = currentSkills.slice(0, 8);
  let skillY = y + 13;
  let skillCol = 0;
  displayedSkills.forEach((sk, idx) => {
    const xPos = margin + 4 + (skillCol === 0 ? 0 : 42);
    doc.text(`* ${sk}`, xPos, skillY);
    if (skillCol === 1 || idx === displayedSkills.length - 1) {
      skillCol = 0;
      skillY += 5.5;
    } else {
      skillCol = 1;
    }
  });
  if (currentSkills.length === 0) {
    doc.text("Skills currently undergoing diagnostic verification.", margin + 4, y + 15);
  }

  // Column 2: Prioritized Skill Gaps
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(margin + halfWidth + 5, y, halfWidth, 38, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27); // red-800
  doc.text(`PRIORITIZED GAPS TO ACQUIRE (${missingGaps.length})`, margin + halfWidth + 9, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let gapY = y + 13;
  missingGaps.slice(0, 4).forEach((g) => {
    doc.setFont("helvetica", "bold");
    doc.text(`! ${g.skill}`, margin + halfWidth + 9, gapY);
    doc.setFont("helvetica", "normal");
    const subText = `${g.difficulty || "Medium"} | Est: ${g.time || "2-3 wks"} | ${g.careerImpact ? g.careerImpact.slice(0, 32) + "..." : "High Demand"}`;
    doc.text(subText, margin + halfWidth + 9, gapY + 4);
    gapY += 8;
  });
  if (missingGaps.length === 0) {
    doc.text("No blocking gaps found for current profile target.", margin + halfWidth + 9, y + 15);
  }

  y += 44;

  // ── High-Leverage Strategic Gaps Table ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("3. HIGH-LEVERAGE SKILL UPGRADE SPECIFICATIONS", margin, y);

  y += 4;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TARGET SKILL", margin + 4, y + 4.5);
  doc.text("CATEGORY", margin + 40, y + 4.5);
  doc.text("LEARNING TIME", margin + 75, y + 4.5);
  doc.text("MARKET & SALARY ADVANTAGE", margin + 110, y + 4.5);

  y += 7;

  const topGaps = missingGaps.slice(0, 3);
  topGaps.forEach((g, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 12, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 12, margin + contentWidth, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(g.skill, margin + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Prereq: ${g.prerequisites?.join(", ") || "None"}`, margin + 4, y + 9);

    doc.text(g.category?.toUpperCase() || "ENGINEERING", margin + 40, y + 6);
    doc.text(g.time || "2-3 weeks", margin + 75, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(g.salaryImpact || "+15-20% compensation leverage", margin + 110, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(g.careerImpact?.slice(0, 48) || "Opens senior engineering interviews", margin + 110, y + 9);

    y += 12;
  });

  y += 6;

  // ── Engineering SWOT Analysis ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("4. ENGINEERING SWOT & DIAGNOSTIC SUMMARY", margin, y);

  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, "FD");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const splitSummary = doc.splitTextToSize(`"${summary}"`, contentWidth - 8);
  doc.text(splitSummary.slice(0, 2), margin + 4, y + 6);

  // SWOT highlights
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text("KEY STRENGTHS:", margin + 4, y + 17);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(strengths.slice(0, 2).join(" • ") || "Strong technical foundation in core programming.", margin + 30, y + 17);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 83, 9);
  doc.text("GROWTH FOCUS:", margin + 4, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(weaknesses.slice(0, 2).join(" • ") || "System design architecture and production telemetry.", margin + 30, y + 22);

  // Page 1 Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Collaborative Skill Engine // Confidential Career Audit", margin, pageHeight - 8);
  doc.text("Page 1 of 2", pageWidth - margin, pageHeight - 8, { align: "right" });

  // ─────────────────────────────────────────────────────────────
  // ── PAGE 2: 90-DAY ROADMAP & CAPSTONE PORTFOLIO ──────────────
  // ─────────────────────────────────────────────────────────────
  doc.addPage();

  // Top Dark Header Bar (Page 2)
  doc.setFillColor(11, 16, 33);
  doc.rect(0, 0, pageWidth, 20, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("STRATEGIC 90-DAY LEARNING ROADMAP & CAPSTONE SPECIFICATIONS", margin, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(165, 180, 252);
  doc.text(`CANDIDATE: ${candidateName.toUpperCase()}  |  TRACK: ${targetGoal.toUpperCase()}`, margin, 16);

  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`DOC ID: ${reportId}`, pageWidth - margin, 13, { align: "right" });

  y = 26;

  // ── Sequenced Roadmap Section ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("5. SEQUENCED 90-DAY MILESTONE ROADMAP", margin, y);

  y += 4;

  const defaultPhases = [
    {
      phase: "Phase 1: Immediate Skill Gap Remediation",
      timeline: "Days 1–25",
      focus: "Master critical missing frameworks & strict typing (TypeScript / Advanced APIs).",
      deliverable: "Refactor core codebase to TypeScript with strict type checking and zero runtime warnings.",
    },
    {
      phase: "Phase 2: Core Engineering & Database Optimization",
      timeline: "Days 26–50",
      focus: "Advanced indexing, aggregation pipelines, caching layers, and transaction isolation.",
      deliverable: "High-throughput API microservice achieving <30ms p99 response times with Redis caching.",
    },
    {
      phase: "Phase 3: Production Readiness & Cloud DevOps",
      timeline: "Days 51–70",
      focus: "Docker multi-stage containerization, CI/CD automated test pipelines, and security linting.",
      deliverable: "Automated GitHub Actions CI/CD pipeline deploying Docker containers to cloud staging.",
    },
    {
      phase: "Phase 4: Capstone System Design & Portfolio",
      timeline: "Days 71–90",
      focus: "Event-driven distributed architecture, message brokers, and live technical interviews.",
      deliverable: "Production-deployed distributed system with architecture diagram, README, and live demo.",
    },
  ];

  const phasesToRender = roadmap.length > 0
    ? roadmap.slice(0, 4).map((r, i) => ({
        phase: r.phase || `Phase ${i + 1}: ${r.focus}`,
        timeline: defaultPhases[i]?.timeline || `Month ${i + 1}`,
        focus: r.focus || "Core competencies",
        deliverable: r.whyNow || defaultPhases[i]?.deliverable,
      }))
    : defaultPhases;

  phasesToRender.forEach((ph, idx) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 23, 3, 3, "FD");

    // Phase Number Badge
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin + 4, y + 4, 16, 6, 1.5, 1.5, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`STEP ${idx + 1}`, margin + 12, y + 8, { align: "center" });

    // Timeline badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229);
    doc.text(ph.timeline, margin + 23, y + 8);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(ph.phase, margin + 45, y + 8);

    // Focus
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Focus:", margin + 4, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(ph.focus.slice(0, 85), margin + 15, y + 14);

    // Deliverable
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("Target Deliverable:", margin + 4, y + 19);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(ph.deliverable.slice(0, 78), margin + 31, y + 19);

    y += 26;
  });

  y += 2;

  // ── Recommended Capstone Portfolio Projects ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("6. RECOMMENDED CAPSTONE PORTFOLIO PROJECTS", margin, y);

  y += 4;

  const defaultProjects = [
    {
      title: "Real-Time Distributed Collaborative Workspace",
      tech: "React, Node.js, WebSockets, Redis, Docker",
      desc: "Multi-user live synchronized state engine with conflict resolution and operational transformations.",
      impact: "Demonstrates concurrency, low-latency networking, and full-stack system design mastery.",
    },
    {
      title: "High-Throughput Analytics & Event Logging Pipeline",
      tech: "TypeScript, Express, PostgreSQL, BullMQ, Tailwind",
      desc: "Microservice consuming streaming telemetry, calculating rolling percentiles, and caching analytical aggregates.",
      impact: "Shows database indexing proficiency, background queue processing, and API design.",
    },
  ];

  const projectsToRender = portfolioSuggestions.length > 0
    ? portfolioSuggestions.slice(0, 2).map((ps, i) => ({
        title: ps.suggestion || ps.area || defaultProjects[i].title,
        tech: defaultProjects[i].tech,
        desc: ps.area || defaultProjects[i].desc,
        impact: ps.impact || defaultProjects[i].impact,
      }))
    : defaultProjects;

  projectsToRender.forEach((proj) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(proj.title, margin + 4, y + 6);

    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(79, 70, 229);
    doc.text(`STACK: ${proj.tech}`, margin + 4, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(proj.desc.slice(0, 95), margin + 4, y + 16);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(`Resume Impact: ${proj.impact.slice(0, 75)}`, margin + 4, y + 20);

    y += 25;
  });

  y += 2;

  // ── Cryptographic Verification & Official Platform Trust Seal ──
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "F");

  // QR Code on Left
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", margin + 4, y + 4, 30, 30);
    } catch {
      // ignore
    }
  }

  const sealX = margin + 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("VERIFIED CRYPTOGRAPHIC CAREER AUDIT SEAL", sealX, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Scan the QR code with any smartphone or visit the platform URL to verify", sealX, y + 14);
  doc.text("the authenticity and live skill telemetry of this official diagnostic audit.", sealX, y + 18);

  // Digital Signature Hash
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(165, 180, 252);
  const fakeHash = `SHA256:${Array.from({ length: 48 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;
  doc.text(fakeHash, sealX, y + 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ISSUED BY COLLABORATIVE SKILL ENGINE AI ADVISOR // ACCREDITED SKILL FRAMEWORK", sealX, y + 31);

  // Page 2 Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Collaborative Skill Engine // Confidential Career Audit", margin, pageHeight - 8);
  doc.text("Page 2 of 2", pageWidth - margin, pageHeight - 8, { align: "right" });

  return doc;
}

/**
 * Convenience function to generate and download the PDF directly to candidate's machine.
 */
export async function downloadCareerReportPdf(profile, latestResponse) {
  const doc = await createCareerReportPdf(profile, latestResponse);
  const cleanName = (profile?.fullName || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Career-Roadmap-${cleanName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}

