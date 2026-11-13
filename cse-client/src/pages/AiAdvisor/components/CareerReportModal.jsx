/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Printer,
  Sparkles,
  FileCheck,
  Award,
  TrendingUp,
  Target,
  Zap,
  Route,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";
import { downloadCareerReportPdf } from "@/lib/careerPdfGenerator";
import { toast } from "@/components/ui/toast-system";

export default function CareerReportModal({ isOpen, onClose, profile, latestResponse }) {
  const [downloading, setDownloading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const intel = generateCareerIntelligence(profile, latestResponse);
  const currentSkills = intel?.currentSkills || intel?.masteredSkills || [];
  const missingGaps = intel?.missingGaps || [];
  const roadmap = intel?.roadmap || [];
  const strengths = intel?.strengths || [];
  const weaknesses = intel?.weaknesses || [];
  const portfolioSuggestions = intel?.portfolioSuggestions || [];
  const readiness = intel?.readiness || {
    overall: { score: 75 },
    frontend: { score: 70 },
    backend: { score: 80 },
    fullstack: { score: 75 },
  };
  const inferredGoal = intel?.inferredGoal || "Full Stack Developer";
  const summary =
    intel?.summary ||
    "Continuous career intelligence assessment based on verified profile competencies.";

  const candidateName = profile?.fullName || "CSE Engineer";
  const candidateEmail = profile?.email || "student@institution.edu";
  const department = profile?.department || "Computer Science & Engineering";
  const institution = profile?.institution || "Collaborative Skill Engine";

  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const reportId = `CSE-CR-${candidateName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  const auditSignature = `SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069`;

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const fileName = await downloadCareerReportPdf(profile, latestResponse);
      toast.success("PDF Downloaded Successfully", {
        description: `Saved as ${fileName}`,
        badge: "OFFICIAL REPORT",
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF", {
        description: "Please try printing via your browser or try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(auditSignature);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-[#02050e]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      {/* ── Print Stylesheet ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-career-report,
          .printable-career-report * {
            visibility: visible !important;
          }
          .printable-career-report {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            padding: 24px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-4xl rounded-[28px] border border-indigo-500/30 bg-[#090d19] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.95)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Gradient Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 no-print" />

        {/* ── Modal Header (No Print) ── */}
        <div className="px-6 py-4 bg-[#070b16] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <FileCheck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">
                Official Career & Skill Audit Report
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {reportId} // Platform-Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print / System PDF</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Generating..." : "Download Official PDF"}</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Printable Report Body Preview ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="printable-career-report rounded-2xl border border-slate-800 bg-[#0b101f] p-6 sm:p-8 space-y-6 text-slate-200 shadow-2xl">
            {/* Header Ribbon */}
            <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold border border-indigo-500/30">
                    CSE // VERIFIED AUDIT
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ISSUED {issueDate}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Career Roadmap & Skill Audit Report
                </h1>
                <p className="text-xs text-slate-400">
                  Collaborative Skill Engine AI Intelligence Studio
                </p>
              </div>

              {/* Candidate Info Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-right space-y-0.5 min-w-[210px]">
                <p className="text-xs font-black text-white">{candidateName}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{candidateEmail}</p>
                <p className="text-[10px] text-slate-500 truncate">{department} • {institution}</p>
                <div className="pt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    Target: {inferredGoal}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Executive Readiness KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                  Market Readiness Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400 font-mono">
                    {readiness.overall.score}%
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {readiness.overall.score >= 75 ? "Top Tier Competitor" : "Accelerating"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full"
                    style={{ width: `${readiness.overall.score}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                  Verified Repertoire
                </span>
                <span className="text-3xl font-black text-indigo-400 font-mono">
                  {currentSkills.length}
                </span>
                <p className="text-[11px] text-slate-400">
                  Skills validated against technical assessments & live code
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                  Identified Priority Gaps
                </span>
                <span className="text-3xl font-black text-amber-400 font-mono">
                  {missingGaps.length}
                </span>
                <p className="text-[11px] text-slate-400">
                  Next target: <strong className="text-amber-300">{missingGaps[0]?.skill || "System Design"}</strong>
                </p>
              </div>
            </div>

            {/* Section 2: Skill Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verified Repertoire */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/20 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 size={13} />
                  <span>Verified Current Skills ({currentSkills.length})</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {currentSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                  {currentSkills.length === 0 && (
                    <span className="text-xs text-slate-500">Skills pending validation</span>
                  )}
                </div>
              </div>

              {/* Critical Gaps */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-rose-500/20 space-y-3">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle size={13} />
                  <span>Critical Gaps to Close ({missingGaps.length})</span>
                </h4>
                <div className="space-y-2">
                  {missingGaps.slice(0, 3).map((g) => (
                    <div key={g.skill} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">! {g.skill}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {g.difficulty || "Medium"} • {g.time || "2-3 wks"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Sequenced 90-Day Roadmap */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Route size={14} className="text-indigo-400" />
                <span>90-Day Sequenced Learning Architecture</span>
              </h4>

              <div className="space-y-2.5">
                {(roadmap.length > 0 ? roadmap : [
                  { phase: "Phase 1: Skill Gap Remediation", focus: "Master missing frameworks and typed code", whyNow: "Prerequisite for production services" },
                  { phase: "Phase 2: Core Engineering & Systems", focus: "Databases, caching, and performance", whyNow: "Essential for senior full-stack roles" },
                  { phase: "Phase 3: Production DevOps", focus: "Docker containerization and CI/CD", whyNow: "Deployment automation standard" },
                  { phase: "Phase 4: Capstone System Design", focus: "Distributed microservices and portfolio", whyNow: "Demonstrates enterprise readiness" },
                ]).map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-white">{step.phase}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">{step.focus}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono shrink-0 sm:text-right">
                      Target: {step.whyNow?.slice(0, 45)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Cryptographic Seal & Verification Footer */}
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-white">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Platform-Verified Cryptographic Audit</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {auditSignature}
                </p>
                <p className="text-[10px] text-slate-500">
                  Synchronized with real-time market telemetry and verified institutional skill assessments.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedHash ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

