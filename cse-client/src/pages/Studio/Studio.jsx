import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import apiClient from "@/lib/apiClient";
import StudioOnboardingView from "@/components/studio/StudioOnboardingView";
import StudioSuccessCelebration from "@/components/studio/StudioSuccessCelebration";
import StudioLayout from "@/components/studio/layout/StudioLayout";
import { FullScreenLoader } from "@/components/shared/loading/LoadingSpinner";

/**
 * Studio Page — Unified Studio Entry Point & Access Control
 * Strict Access Rules:
 * 1. User must fulfill eligibility requirements (at least 1 mentoring session + rating >= 4.0),
 *    OR have database-verified studio access.
 * 2. If NOT eligible -> Strictly blocks entry and renders <StudioOnboardingView /> with locked state.
 * 3. No unauthorized entrance or preview bypass permitted.
 */
const Studio = () => {
  const [accessStatus, setAccessStatus] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cse_studio_access");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!accessStatus);
  const [error, setError] = useState("");
  const [unlockedJustNow, setUnlockedJustNow] = useState(false);

  const fetchAccessStatus = useCallback(async (isInitial = false) => {
    if (isInitial && !accessStatus) setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/studio/access-status");
      setAccessStatus(res.data);
      if (res.data) {
        try {
          sessionStorage.setItem("cse_studio_access", JSON.stringify(res.data));
        } catch {
          /* silent catch */
        }
      }

      // If user is eligible for the first time but hasn't claimed yet, automatically claim
      if (res.data && !res.data.hasStudioAccess && res.data.isEligible) {
        try {
          const claimRes = await apiClient.post("/studio/claim-access", {});
          if (claimRes.data?.hasStudioAccess) {
            setUnlockedJustNow(true);
            setAccessStatus(claimRes.data);
            sessionStorage.setItem("cse_studio_access", JSON.stringify(claimRes.data));
          }
        } catch (claimErr) {
          console.error("Claim access error:", claimErr);
        }
      }
    } catch (err) {
      console.error("Fetch access status error:", err);
      if (!accessStatus) {
        setError("Could not verify studio access status. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [accessStatus]);

  useEffect(() => {
    fetchAccessStatus(true);
  }, []);

  if (loading) {
    return (
      <FullScreenLoader
        message="Loading Creator Studio..."
        subtext="Preparing your workspace tools and data"
      />
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

  // STEP 1: Strict Check: ONLY if user has permanent DB access or fulfilled all requirements -> Render StudioLayout
  if (accessStatus?.hasStudioAccess || (unlockedJustNow === false && accessStatus?.isEligible)) {
    return <StudioLayout />;
  }

  // STEP 2: If user just newly completed eligibility requirements -> Show Celebration Screen
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

  // STEP 3: If user has NOT fulfilled requirements -> Strictly block entrance & render locked requirements checklist
  return (
    <StudioOnboardingView
      accessStatus={accessStatus}
      onRefresh={fetchAccessStatus}
    />
  );
};

export default Studio;
