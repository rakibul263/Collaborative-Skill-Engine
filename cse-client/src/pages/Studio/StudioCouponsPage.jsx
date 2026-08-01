import React, { useState, useEffect } from "react";
import { Tag, Plus, Check, RefreshCw, Calendar, Users } from "lucide-react";
import apiClient from "@/lib/apiClient";

const StudioCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [maxUses, setMaxUses] = useState(100);
  const [expiryDate, setExpiryDate] = useState("");

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/studio/coupons");
      setCoupons(res.data || []);
    } catch (err) {
      console.error("Fetch coupons error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) return alert("Coupon code is required.");

    try {
      await apiClient.post("/studio/coupons", {
        code: code.trim().toUpperCase(),
        discountPercent: Number(discountPercent),
        maxUses: Number(maxUses),
        expiryDate: expiryDate || null,
      });

      setCode("");
      fetchCoupons();
    } catch (err) {
      alert("Failed to create coupon.");
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Coupons & Promotional Discounts</h1>
          <p className="text-xs text-slate-400">Generate discount promo codes for marketing campaigns.</p>
        </div>
        <button
          onClick={fetchCoupons}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create Coupon Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            Create Promo Coupon
          </h3>

          <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Coupon Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER50"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Discount Percentage (%)</label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                min="1"
                max="100"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Maximum Redemption Count</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Generate Coupon Code
            </button>
          </form>
        </div>

        {/* Coupons List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">Active Instructor Coupons ({coupons.length})</h3>

          <div className="space-y-3">
            {coupons.map((coupon) => (
              <div key={coupon._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-300 text-sm">{coupon.code}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {coupon.discountPercent}% OFF
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Used: {coupon.usedCount || 0} / {coupon.maxUses || 100} redemptions
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(coupon.createdAt).toLocaleDateString()}</span>
              </div>
            ))}

            {coupons.length === 0 && !loading && (
              <div className="py-12 text-center text-slate-500 text-xs">
                No discount coupons generated yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default StudioCouponsPage;
