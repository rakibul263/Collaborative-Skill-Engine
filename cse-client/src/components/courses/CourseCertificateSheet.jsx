import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Printer,
  ShieldCheck,
  Award,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { toast } from "@/components/ui/toast-system";
import { downloadCertificatePng } from "./certificateCanvas";

const GoldRosetteSeal = () => (
  <svg
    viewBox="0 0 180 215"
    className="w-24 h-28 sm:w-28 sm:h-32 mx-auto drop-shadow-md select-none"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="certGoldGrad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fdf3c4" />
        <stop offset="45%" stopColor="#e2b94c" />
        <stop offset="85%" stopColor="#ab7b17" />
        <stop offset="100%" stopColor="#7a5409" />
      </radialGradient>
    </defs>

    {/* Hanging ribbons */}
    <g transform="translate(65,112) rotate(9)">
      <polygon points="-18,0 18,0 18,86 0,68 -18,86" fill="#0f172a" />
      <rect x="-13" y="4" width="26" height="62" fill="none" stroke="#d4af37" strokeWidth="2" />
    </g>
    <g transform="translate(115,112) rotate(-9)">
      <polygon points="-18,0 18,0 18,86 0,68 -18,86" fill="#0f172a" />
      <rect x="-13" y="4" width="26" height="62" fill="none" stroke="#d4af37" strokeWidth="2" />
    </g>

    {/* Multi-point starburst */}
    <polygon
      fill="url(#certGoldGrad)"
      stroke="#785307"
      strokeWidth="2"
      points={Array.from({ length: 48 }, (_, i) => {
        const r = i % 2 === 0 ? 74 : 62;
        const a = (i * Math.PI) / 24;
        return `${90 + Math.cos(a) * r},${78 + Math.sin(a) * r}`;
      }).join(" ")}
    />

    {/* Inner navy shield circle */}
    <circle cx="90" cy="78" r="50" fill="#0f172a" stroke="#f5d97e" strokeWidth="2.5" />
    <circle
      cx="90"
      cy="78"
      r="42"
      fill="none"
      stroke="rgba(245, 217, 126, 0.7)"
      strokeWidth="1.5"
      strokeDasharray="3 4"
    />

    <text
      x="90"
      y="56"
      textAnchor="middle"
      fill="#fde68a"
      fontSize="9.5"
      fontWeight="800"
      letterSpacing="1.6"
    >
      CERTIFIED
    </text>

    <path
      d="M73 79 L84 90 L108 64"
      fill="none"
      stroke="#f5d97e"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <text
      x="90"
      y="108"
      textAnchor="middle"
      fill="#fde68a"
      fontSize="8.5"
      fontWeight="700"
      letterSpacing="1.4"
    >
      OFFICIAL SEAL
    </text>
  </svg>
);

const SignatureSvg = ({ variant = "instructor" }) =>
  variant === "instructor" ? (
    <svg viewBox="0 0 260 66" className="w-40 sm:w-48 h-11 mx-auto text-slate-900" aria-hidden="true">
      <path
        d="M22 44 C36 8, 66 4, 58 44 C70 20, 92 24, 94 44 C104 18, 126 20, 128 40 C142 12, 160 16, 154 42 C176 24, 200 32, 232 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 52 Q128 44 226 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 260 66" className="w-40 sm:w-48 h-11 mx-auto text-slate-900" aria-hidden="true">
      <path
        d="M18 32 C42 4, 78 10, 62 46 C82 22, 108 10, 114 38 C126 16, 152 14, 152 42 C168 18, 192 22, 214 34 C228 26, 240 20, 248 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 50 C105 58, 168 42, 232 49"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );

/**
 * CourseCertificateSheet — Official formatted visual certificate card with instant
 * 2400x1700 PNG download & Print/Save-PDF controls.
 */
const CourseCertificateSheet = ({ certificate, showActions = true }) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!certificate) return null;

  const platformName = certificate.platformName || "Collaborative Skill Engine";
  const recipientName = certificate.recipientName || "Course Graduate";
  const courseTitle = certificate.courseTitle || "Verified Course";
  const courseTopic = certificate.courseTopic || "Skill Mastery";
  const instructorName = certificate.instructorName || "Course Instructor";
  const completionPercent = Math.min(
    100,
    Math.round(Number(certificate.completionPercent || 80))
  );
  const issuedDate = certificate.issuedAt
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

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      const fileName = await downloadCertificatePng(certificate);
      toast.confirmed("Certificate Downloaded", {
        description: `Saved high-resolution diploma (${fileName}).`,
        badge: "PNG SAVED",
      });
    } catch {
      toast.error("Could not generate PNG file. Please try Print / Save PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!certificate.certificateCode) return;
    try {
      await navigator.clipboard.writeText(certificate.certificateCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore clipboard deny */
    }
  };

  const handleCopyHash = async () => {
    const hash = certificate.certHash || certificate.certificateCode;
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1800);
    } catch {
      /* ignore clipboard deny */
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-certificate-sheet,
          .printable-certificate-sheet * {
            visibility: visible !important;
          }
          .printable-certificate-sheet {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            margin: auto !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cert-no-print {
            display: none !important;
          }
        }
      `}</style>

      {showActions && (
        <div className="cert-no-print flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 shrink-0">
              <Award className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  Official Certificate Issued
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-[10px] font-mono text-amber-300 hover:border-amber-400 cursor-pointer"
                  title="Copy Certificate ID"
                >
                  <span>{certificate.certificateCode}</span>
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Recipient: <strong className="text-slate-200">{recipientName}</strong> • {completionPercent}% Course Completion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-60 cursor-pointer"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Certificate (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <Link
              to={`/verify/${certificate.certHash || certificate.certificateCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow cursor-pointer transition-colors"
              title="Verify Credential Authenticity Online"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Online</span>
            </Link>
          </div>
        </div>
      )}

      {/* Visual Diploma Sheet */}
      <div className="printable-certificate-sheet relative rounded-2xl bg-[#fcfaf2] text-slate-900 p-3 sm:p-5 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden select-text">
        {/* Background diagonal subtle text watermark */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] flex flex-wrap items-center justify-around gap-10 -rotate-12 scale-125 font-serif font-bold text-lg tracking-widest text-slate-900 uppercase"
          aria-hidden="true"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i}>{platformName}</span>
          ))}
        </div>

        {/* Outer Dark Navy Frame */}
        <div className="relative border-[6px] border-[#0f172a] p-1.5 sm:p-2.5 bg-[#fcfaf2]">
          {/* Metallic Gold Inner Frame */}
          <div className="relative border-[3px] border-[#c89b3c] p-4 sm:p-7 lg:p-9">
            {/* Corner Art-Deco Accent Marks */}
            <span className="absolute top-1.5 left-1.5 w-6 h-6 border-t-[3px] border-l-[3px] border-[#9a7014]" />
            <span className="absolute top-1.5 right-1.5 w-6 h-6 border-t-[3px] border-r-[3px] border-[#9a7014]" />
            <span className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-[3px] border-l-[3px] border-[#9a7014]" />
            <span className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-[3px] border-r-[3px] border-[#9a7014]" />

            {/* Header Bar: Platform Logo + Brand + Verification ID */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900/[0.04] border border-[#c89b3c]/35 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0f172a] border-2 border-[#d4af37] p-1.5 flex items-center justify-center shrink-0 shadow">
                  <img
                    src="/logo.png"
                    alt={platformName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-black tracking-wider text-[#0f172a] uppercase">
                    {platformName}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-[#8a6412] uppercase">
                    Academic Excellence &amp; Skill Certification Board
                  </p>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37] text-center sm:text-right shrink-0">
                <p className="text-[9px] font-mono font-bold text-emerald-400 tracking-wider uppercase flex items-center justify-center sm:justify-end gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified • 80%+ Mastery
                </p>
                <p className="text-xs font-mono font-black text-white tracking-wide">
                  {certificate.certificateCode}
                </p>
              </div>
            </div>

            {/* Centerpiece Diploma Statement */}
            <div className="text-center space-y-4 sm:space-y-5 max-w-3xl mx-auto">
              <div className="space-y-2.5">
                <h2 className="font-serif text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-[0.06em] text-[#0f172a] uppercase leading-tight">
                  Certificate of Completion
                </h2>
                <div className="flex items-center justify-center gap-3">
                  <span className="h-[2px] w-20 sm:w-36 bg-gradient-to-r from-transparent to-[#c89b3c]" />
                  <span className="w-2.5 h-2.5 rotate-45 bg-[#c89b3c]" />
                  <span className="h-[2px] w-20 sm:w-36 bg-gradient-to-l from-transparent to-[#c89b3c]" />
                </div>
              </div>

              <p className="text-[11px] sm:text-xs font-bold tracking-[0.25em] text-slate-500 uppercase pt-1">
                This certificate is proudly presented to
              </p>

              {/* Recipient Student Name */}
              <div className="py-1">
                <p className="font-serif italic font-bold text-3xl sm:text-5xl text-[#1e1b4b] tracking-tight break-words">
                  {recipientName}
                </p>
                <div className="mx-auto mt-2.5 h-[2px] w-3/4 max-w-md bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent" />
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                for successfully achieving{" "}
                <strong className="text-emerald-700 font-extrabold">
                  {completionPercent}% completion
                </strong>{" "}
                across the structured curriculum, video modules, and study resources in
              </p>

              {/* Course Title Plaque */}
              <div className="mx-auto max-w-2xl rounded-2xl border border-[#c89b3c]/55 bg-gradient-to-r from-slate-900/[0.04] via-[#d4af37]/15 to-slate-900/[0.04] px-5 py-4 sm:px-8 sm:py-5 shadow-inner">
                <h3 className="text-lg sm:text-2xl font-black text-[#0f172a] leading-snug">
                  {courseTitle}
                </h3>
                <p className="mt-1.5 text-[10px] sm:text-[11px] font-mono font-bold text-indigo-700 uppercase tracking-wider">
                  Discipline: {courseTopic} • {platformName}
                </p>
              </div>
            </div>

            {/* Bottom 3-Column Footer: Instructor Sign | Gold Seal | Platform Sign */}
            <div className="mt-8 sm:mt-10 pt-4 grid grid-cols-1 sm:grid-cols-3 items-end gap-6 sm:gap-4 text-center">
              {/* Left Signatory: Course Instructor */}
              <div className="space-y-1">
                {certificate.instructorSignature ? (
                  <div className="h-14 flex items-center justify-center">
                    <img
                      src={certificate.instructorSignature}
                      alt="Course Instructor Signature"
                      className="h-12 max-w-[220px] object-contain mx-auto select-none"
                    />
                  </div>
                ) : (
                  <SignatureSvg variant="instructor" />
                )}
                <div className="h-[1.5px] bg-slate-800 w-44 sm:w-48 mx-auto" />
                <p className="text-xs sm:text-sm font-black text-[#0f172a] pt-1 truncate px-2">
                  {instructorName}
                </p>
                <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">
                  Course Instructor Sign
                </p>
              </div>

              {/* Center Official Rosette Seal */}
              <div className="space-y-1.5 order-first sm:order-none">
                <GoldRosetteSeal />
                <p className="text-[11px] font-bold text-[#0f172a]">
                  Issued on {issuedDate}
                </p>
              </div>

              {/* Right Signatory: Platform Authority */}
              <div className="space-y-1">
                <SignatureSvg variant="director" />
                <div className="h-[1.5px] bg-slate-800 w-44 sm:w-48 mx-auto" />
                <p className="text-xs sm:text-sm font-black text-[#0f172a] pt-1">
                  {platformName}
                </p>
                <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">
                  Authorized Platform Sign
                </p>
              </div>
            </div>

            {/* Cryptographic Proof Verification Block */}
            <div className="mt-6 pt-3.5 border-t border-slate-300/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-700 overflow-hidden">
                <span className="p-1 rounded bg-emerald-500/15 text-emerald-800 font-bold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-slate-800">SHA-256 Proof:</span>
                <span className="text-slate-500 truncate max-w-[200px] sm:max-w-[320px] select-all">
                  {certificate.certHash || certificate.certificateCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Copy SHA-256 Hash"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <Link
                to={`/verify/${certificate.certHash || certificate.certificateCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-400 underline-offset-2 shrink-0 cursor-pointer"
              >
                <span>Verify Credential Online</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>

            {/* Bottom Micro Audit Line */}
            <div className="mt-2 text-center text-[9px] font-mono text-slate-400">
              Credential Code: {certificate.certificateCode} • Progress: {completionPercent}% (
              {certificate.completedVideos || 0}/{certificate.totalVideos || 0} Videos) • {platformName} Trust Network
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCertificateSheet;

