import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import apiClient from "@/lib/apiClient";
import StudioOnboardingView from "@/components/studio/StudioOnboardingView";
import StudioSuccessCelebration from "@/components/studio/StudioSuccessCelebration";
import StudioLayout from "@/components/studio/layout/StudioLayout";

/**
 * Studio Page — Unified Studio Entry Point & Access System
 * Handles Creator Access state machine:
 * 1. Database-verified studio access -> Renders standalone <StudioLayout />.
 * 2. Newly completed eligibility requirements -> Renders <StudioSuccessCelebration />.
 * 3. Incomplete eligibility requirements -> Renders <StudioOnboardingView /> checklist.
 */
const Studio = () => {
  const [accessStatus, setAccessStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unlockedJustNow, setUnlockedJustNow] = useState(false);

  const fetchAccessStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/studio/access-status");
      setAccessStatus(res.data);

      // If user is eligible for the first time but hasn't claimed yet, automatically claim
      if (res.data && !res.data.hasStudioAccess && res.data.isEligible) {
        try {
          const claimRes = await apiClient.post("/studio/claim-access", {});
          if (claimRes.data?.hasStudioAccess) {
            setUnlockedJustNow(true);
          }
        } catch (claimErr) {
          console.error("Claim access error:", claimErr);
        }
      }
    } catch (err) {
      console.error("Fetch access status error:", err);
      setError("Could not verify studio access status. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccessStatus();
  }, [fetchAccessStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest animate-pulse">
          Verifying Creator Access...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <p className="text-red-400 font-bold text-sm">{error}</p>
          <button
            onClick={fetchAccessStatus}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // STEP 1: If user already has permanent access in DB or entered after celebration -> Show Standalone Studio Layout
  if (accessStatus?.hasStudioAccess || (unlockedJustNow === false && accessStatus?.isEligible)) {
    return <StudioLayout />;
  }

  // STEP 2: If user just newly completed eligibility requirements -> Show Success Celebration
  if (unlockedJustNow) {
    return (
      <StudioSuccessCelebration
        onEnterStudio={async () => {
          setUnlockedJustNow(false);
          await fetchAccessStatus();
        }}
      />
    );
  }

  // STEP 3: If user is not yet eligible -> Show Onboarding Checklist Screen
  return (
    <StudioOnboardingView
      accessStatus={accessStatus}
      onRefresh={fetchAccessStatus}
    />
  );
};

export default Studio;
