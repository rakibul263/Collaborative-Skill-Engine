import React, { useState, useEffect } from "react";
import { Tag, Plus, Check, RefreshCw, Calendar, Users, Copy, Sparkles, Percent, Ticket } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";

const StudioCouponsPage = () => {
  const [coupons, setCoupons] = useState(() => getCachedData("/studio/coupons") || []);
  const [loading, setLoading] = useState(() => !getCachedData("/studio/coupons"));

  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [maxUses, setMaxUses] = useState(100);
  const [copiedId, setCopiedId] = useState(null);

  const fetchCoupons = async (forceRefresh = false) => {
    if (!getCachedData("/studio/coupons") && !forceRefresh) setLoading(true);
    try {
      const res = await apiClient.get("/studio/coupons", { forceRefresh });
      setCoupons(res.data || []);
    } catch (err) {
      console.error("Fetch coupons error:", err);
      if (!getCachedData("/studio/coupons")) toast.error("Could not fetch coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      return toast.error("Coupon promo code is required.");
    }

    try {
      await apiClient.post("/studio/coupons", {
        code: code.trim().toUpperCase(),
        discountPercent: Number(discountPercent),
        maxUses: Number(maxUses),
      });

      setCode("");
      toast.success(`Coupon ${code.toUpperCase()} generated successfully!`);
      fetchCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create coupon.");
    }
  };

  const handleCopyCode = (couponCode, id) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedId(id);
    toast.success(`Coupon code ${couponCode} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
              <Ticket className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">Coupons & Promotional Engine</h1>
          </div>
          <p className="text-xs text-slate-400">
            Create custom promo discount codes for marketing launches and student incentives.
          </p>
        </div>

        <button
          onClick={fetchCoupons}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── CREATE FORM ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Tag className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Generate Promo Coupon</h3>
          </div>

          <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Coupon Code</label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FLASH30, DEV50"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-mono font-bold tracking-wider"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Codes are automatically capitalized.</p>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Discount Percentage (%)</label>
              <div className="relative">
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  min="5"
                  max="100"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Maximum Redemptions</label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Coupon Code
            </button>
          </form>
        </div>

        {/* ── COUPONS LIST ── */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-purple-400" />
              Active Coupons ({coupons.length})
            </h3>
            <span className="text-xs text-slate-400 font-medium">Ready for checkout redemption</span>
          </div>

          <div className="grid gap-3.5">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className="p-4 sm:p-5 bg-slate-950/80 border border-slate-800 hover:border-purple-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-indigo-300 text-sm tracking-wider px-2.5 py-1 bg-indigo-950/60 border border-indigo-500/30 rounded-lg">
                      {coupon.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      {coupon.discountPercent}% OFF
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      Usage: <strong className="text-white">{coupon.usedCount || 0}</strong> of {coupon.maxUses || 100} redemptions
                    </span>
                    <span>•</span>
                    <span className="text-[11px] text-slate-500">
                      Created {new Date(coupon.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleCopyCode(coupon.code, coupon._id)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 shrink-0"
                >
                  {copiedId === coupon._id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            ))}

            {coupons.length === 0 && !loading && (
              <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                <Ticket className="w-8 h-8 mx-auto text-slate-600" />
                <p>No promotional discount coupons generated yet.</p>
                <p className="text-[11px] text-slate-600">Use the form on the left to create your first coupon.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default StudioCouponsPage;