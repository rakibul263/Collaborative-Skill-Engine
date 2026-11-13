import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Check,
  Copy,
  ExternalLink,
  Award,
  QrCode,
  Calendar,
  User,
  BookOpen,
  ArrowRight,
  Hash,
  Loader2,
  FileCheck2,
} from "lucide-react";
import axios from "axios";
import QRCode from "qrcode";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const VerifyCertificatePage = () => {
  const { certHash: paramHash } = useParams();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(paramHash || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const verifyCertificate = useCallback(async (codeToVerify) => {
    const clean = String(codeToVerify || "").trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setQrDataUrl("");

    try {
      const res = await axios.get(`${API_BASE}/courses/certificates/verify/${encodeURIComponent(clean)}`);
      setResult(res.data);

      const targetIdentifier = res.data.certHash || res.data.certificateCode || clean;
      const verifyUrl = `${window.location.origin}/verify/${targetIdentifier}`;

      try {
        const qrUrl = await QRCode.toDataURL(verifyUrl, {
          margin: 1,
          width: 180,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        setQrDataUrl(qrUrl);
      } catch (qrErr) {
        console.warn("Failed to generate QR data URL:", qrErr);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "This certificate credential could not be verified. It may be altered, invalid, or never issued."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (paramHash) {
      setInputCode(paramHash);
      verifyCertificate(paramHash);
    }
  }, [paramHash, verifyCertificate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputCode.trim()) {
      navigate(`/verify/${encodeURIComponent(inputCode.trim())}`);
    }
  };

  const handleCopyLink = async () => {
    const currentUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleCopyHash = async (hash) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const cert = result?.certificate;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background glowing effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-emerald-600/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto space-y-8">
        {/* Header Trust Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider uppercase shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Verifiable Credential Registry</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Certificate Authenticity Verifier
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Verify the cryptographic SHA-256 digital signature of any course completion certificate
            issued on Collaborative Skill Engine. Tamper-proof, immutable, and employer-grade.
          </p>
        </div>

        {/* Search / Verification Input Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Paste Certificate Code (e.g. CSE-2026-...) or 64-char SHA-256 hash"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer transition-all shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  <span>Verify Credential</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 sm:p-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto" />
            <p className="text-sm font-mono text-slate-400">
              Querying platform cryptographic ledger &amp; recomputing SHA-256 HMAC digital signature...
            </p>
          </div>
        )}

        {/* Error / Fraud Detection Banner */}
        {!loading && error && (
          <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wide">
                  Credential Verification Failed
                </h3>
                <p className="text-xs text-rose-300/80">Tamper Alert or Invalid Identifier</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
            <div className="pt-2 text-xs font-mono text-slate-400">
              If you believe this is in error, please reach out to academic support at{" "}
              <a
                href="mailto:collaborativeskillengine@gmail.com"
                className="text-rose-400 underline"
              >
                collaborativeskillengine@gmail.com
              </a>
              .
            </div>
          </div>
        )}

        {/* Verified Credential Result Card */}
        {!loading && result?.valid && cert && (
          <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-500/10 space-y-8">
            {/* Top Verification Status Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 shrink-0">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                      Official Verified Credential
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                      100% Genuine
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Verified Digital Certificate
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Link Copied" : "Share Verification Link"}</span>
                </button>
              </div>
            </div>

            {/* Recipient & Course Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Graduate Recipient
                  </p>
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide mt-1">
                    {cert.recipientName}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Course / Practical Program
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-indigo-300 mt-1">
                    {cert.courseTitle}
                  </p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Discipline: {cert.courseTopic}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Curriculum Progress</p>
                    <p className="text-lg font-black text-emerald-400 mt-0.5">
                      {cert.completionPercent}%
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {cert.completedVideos}/{cert.totalVideos} Lessons
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Issue Date</p>
                    <p className="text-xs font-bold text-slate-200 mt-1">
                      {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : "Verified"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">Permanent Record</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Instructor</p>
                    <p className="text-xs font-bold text-slate-200 mt-1 truncate">
                      {cert.instructorName}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-mono">Verified Signer</p>
                  </div>
                </div>
              </div>

              {/* QR Code & Authority Card */}
              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
                {qrDataUrl ? (
                  <div className="p-2 rounded-xl bg-white shadow-md">
                    <img
                      src={qrDataUrl}
                      alt="Verification QR Code"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                    <QrCode className="w-12 h-12" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-black text-white tracking-wide">
                    {result.certificateCode || cert.certificateCode}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Scan to Verify Instantly
                  </p>
                </div>
              </div>
            </div>

            {/* Cryptographic Ledger & Hash Proof */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SHA-256 Cryptographic Digital Signature</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                  HMAC-SHA256 • Verified
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs">
                <span className="text-emerald-400 truncate select-all">
                  {result.certHash || cert.certHash}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyHash(result.certHash || cert.certHash)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copy SHA-256 Hash"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                <span>Issued Authority: Collaborative Skill Engine Academic Board</span>
                <span>Verified At: {new Date(result.verifiedAt || Date.now()).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Course Link Footer */}
            {cert.courseId && (
              <div className="flex items-center justify-between pt-2">
                <Link
                  to={`/courses/${cert.courseId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>Explore Course Curriculum</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-500">
                  Platform Verifiable Credential Protocol v2.4
                </span>
              </div>
            )}
          </div>
        )}

        {/* How It Works Explainer (When No Search Yet) */}
        {!result && !error && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                <Hash className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">SHA-256 Cryptography</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each certificate carries a unique cryptographic signature calculated from the student's
                identity, course progress, and issue timestamp.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">QR Code Validation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recruiters and employers can point any smartphone camera at the printed certificate
                QR code to instantly open this real-time authenticity record.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Anti-Forgery Protection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Any altered student name, forged completion grade, or manipulated certificate code
                causes an instant hash mismatch and is flagged as unauthorized.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificatePage;

