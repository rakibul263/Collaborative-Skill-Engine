import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Receipt,
  Printer,
  CheckCircle2,
  ShieldCheck,
  User,
  BookOpen,
  Calendar,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { formatBDT } from "@/lib/money";

/**
 * InvoiceModal — Official print-ready BDT Invoice for both Learners (buyers)
 * and Course Owners (instructors / platform admins).
 */
const InvoiceModal = ({ enrollmentId, initialInvoice = null, onClose }) => {
  const [invoiceState, setInvoiceState] = useState({
    forId: enrollmentId || "",
    data: initialInvoice,
    loading: !initialInvoice && Boolean(enrollmentId),
    error: "",
  });

  useEffect(() => {
    if (!enrollmentId) return undefined;
    let cancelled = false;

    const loadInvoice = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setInvoiceState((prev) => ({
        forId: enrollmentId,
        data: prev.forId === enrollmentId ? prev.data : initialInvoice,
        loading: !(prev.forId === enrollmentId && prev.data),
        error: "",
      }));

      try {
        const res = await apiClient.get(`/courses/invoices/${enrollmentId}`);
        if (!cancelled) {
          setInvoiceState({
            forId: enrollmentId,
            data: res.data,
            loading: false,
            error: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setInvoiceState((prev) => ({
            forId: enrollmentId,
            data: prev.data || initialInvoice,
            loading: false,
            error:
              prev.data || initialInvoice
                ? ""
                : err?.response?.data?.message || "Failed to load invoice record.",
          }));
        }
      }
    };

    loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [enrollmentId, initialInvoice]);

  if (typeof document === "undefined") return null;

  const inv = invoiceState.data;
  const isOwnerOrAdmin = inv?.viewerRole === "owner" || inv?.viewerRole === "admin";
  const formattedDate = inv?.issuedAt
    ? new Date(inv.issuedAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9996] bg-[#02050e]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-invoice-sheet,
          .printable-invoice-sheet * {
            visibility: visible !important;
          }
          .printable-invoice-sheet {
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

      <div className="w-full max-w-2xl rounded-[28px] border border-indigo-500/30 bg-[#0b101f] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.95)] overflow-hidden my-auto">
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 no-print" />

        {/* Modal Action Bar */}
        <div className="px-6 py-4 bg-[#070b16] border-b border-slate-800 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">
                {isOwnerOrAdmin ? "Instructor Sales & Payout Invoice" : "Official Course Purchase Invoice"}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {inv?.invoiceNumber || "Verified BDT Ledger"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {inv && (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
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

        {/* Invoice Content */}
        <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {invoiceState.loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              <span>Loading official BDT invoice...</span>
            </div>
          ) : invoiceState.error ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs font-semibold text-rose-300">{invoiceState.error}</p>
            </div>
          ) : inv ? (
            <div className="printable-invoice-sheet rounded-2xl border border-slate-800 bg-slate-950/85 p-6 space-y-6 text-slate-200">
              {/* Brand & Invoice Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Collaborative Skill Engine
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">TAX / PAYMENT INVOICE</h2>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Issued: {formattedDate}
                  </p>
                </div>

                <div className="sm:text-right space-y-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      inv.status === "PAID"
                        ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                        : "bg-rose-500/15 border-rose-500/35 text-rose-300"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {inv.status} • {inv.currency || "BDT"}
                  </span>
                  <div className="font-mono text-xs font-bold text-white">
                    {inv.invoiceNumber}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Ref ID: {inv.enrollmentId}
                  </div>
                </div>
              </div>

              {/* Buyer & Course Owner Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                    <User className="w-3 h-3 text-indigo-400" />
                    Billed To (Learner)
                  </span>
                  <p className="text-sm font-bold text-white">{inv.buyer?.name}</p>
                  <p className="text-xs text-slate-400 break-all">{inv.buyer?.email}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                    <Building2 className="w-3 h-3 text-purple-400" />
                    Course Owner (Instructor)
                  </span>
                  <p className="text-sm font-bold text-white">{inv.seller?.name}</p>
                  <p className="text-xs text-slate-400 break-all">{inv.seller?.email}</p>
                </div>
              </div>

              {/* Line Item Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Course Item</th>
                      <th className="px-4 py-3">Topic</th>
                      <th className="px-4 py-3">Access</th>
                      <th className="px-4 py-3 text-right">Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="px-4 py-3.5 font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{inv.course?.title}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">{inv.course?.topic}</td>
                      <td className="px-4 py-3.5 text-emerald-400 font-semibold">Lifetime Access</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                        {formatBDT(inv.financials?.grossBdt || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown (Whole Integer BDT) */}
              <div className="flex justify-end">
                <div className="w-full sm:w-80 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Course Tuition Paid (Gross):</span>
                    <span className="font-mono font-bold text-white">
                      {formatBDT(inv.financials?.grossBdt || 0)}
                    </span>
                  </div>

                  {isOwnerOrAdmin ? (
                    <>
                      <div className="flex items-center justify-between text-cyan-300">
                        <span>Platform Service Fee ({inv.financials?.platformCommissionPct || 15}%):</span>
                        <span className="font-mono font-bold">
                          -{formatBDT(inv.financials?.platformCommissionBdt || 0)}
                        </span>
                      </div>
                      <div className="pt-2.5 border-t border-slate-700 flex items-center justify-between text-sm font-black text-emerald-400">
                        <span>Net Instructor Earnings (85%):</span>
                        <span className="font-mono">
                          {formatBDT(inv.financials?.instructorNetBdt || 0)} BDT
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Processing &amp; Platform Fee:</span>
                        <span className="font-mono">Included (৳0 extra)</span>
                      </div>
                      <div className="pt-2.5 border-t border-slate-700 flex items-center justify-between text-sm font-black text-emerald-400">
                        <span>Total Paid:</span>
                        <span className="font-mono">
                          {formatBDT(inv.financials?.grossBdt || 0)} BDT
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
                Computer-generated BDT invoice • Verified via whole-Taka integer ledger ({Math.round(inv.financials?.grossBdt || 0)} BDT).
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceModal;

