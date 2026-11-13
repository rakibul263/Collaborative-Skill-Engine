import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, ShieldCheck, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * ProtectedPdfModal — Inline PDF reader modal for Studio previews & Learner study worksheets.
 * Fetches backend-stored PDFs via authenticated apiClient blob so files stream securely.
 */
const ProtectedPdfModal = ({ pdfs = [], initialIndex = 0, lessonTitle = "", onClose }) => {
  const [activeIdx, setActiveIdx] = useState(initialIndex);
  const [blobUrl, setBlobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activePdf = pdfs[activeIdx] || null;

  useEffect(() => {
    if (!activePdf?.fileUrl) return undefined;
    let revokedUrl = "";
    let cancelled = false;

    const loadPdf = async () => {
      setError("");
      const url = activePdf.fileUrl;
      const isLocalApiPdf = url.startsWith("/courses/pdfs/") || url.includes("/courses/pdfs/");

      if (!isLocalApiPdf) {
        setBlobUrl(url);
        return;
      }

      setLoading(true);
      try {
        const relativePath = url.startsWith("http")
          ? url
          : url.startsWith("/")
          ? url
          : `/${url}`;
        const res = await apiClient.get(relativePath, { responseType: "blob" });
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        revokedUrl = nextUrl;
        setBlobUrl(nextUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Could not load protected PDF worksheet.");
          setBlobUrl("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [activePdf?.fileUrl]);

  if (!activePdf || typeof document === "undefined") return null;

  const isExternal = activePdf.fileUrl && !activePdf.fileUrl.includes("/courses/pdfs/");
  const resolvedFallbackUrl = activePdf.fileUrl?.startsWith("/")
    ? `${API}${activePdf.fileUrl}`
    : activePdf.fileUrl;

  return createPortal(
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-[9995] bg-[#02050e]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans select-none"
    >
      <div className="w-full max-w-5xl h-[88vh] rounded-[26px] border border-indigo-500/30 bg-[#0b101f] shadow-2xl overflow-hidden flex flex-col">
        <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-purple-500" />

        {/* Header */}
        <div className="px-5 py-3.5 bg-[#070b16] border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Protected Worksheet Reader
                </span>
                {lessonTitle && (
                  <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                    • {lessonTitle}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white truncate">
                {activePdf.title || `PDF Resource #${activeIdx + 1}`}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isExternal && (
              <a
                href={resolvedFallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open External Link</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multiple PDF Tabs */}
        {pdfs.length > 1 && (
          <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
            {pdfs.map((pdf, idx) => (
              <button
                key={pdf.id || idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeIdx === idx
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>{pdf.title || `PDF #${idx + 1}`}</span>
              </button>
            ))}
          </div>
        )}

        {/* PDF Viewport */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              <span>Decrypting protected PDF worksheet...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs font-semibold text-rose-300 max-w-md">{error}</p>
            </div>
          ) : blobUrl ? (
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title={activePdf.title || "PDF Viewer"}
              className="w-full h-full border-0 bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProtectedPdfModal;

