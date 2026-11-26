import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useLocation } from "react-router";
import { RefreshCw } from "lucide-react";
import apiClient from "@/lib/apiClient";
import useAuth from "@/hooks/useAuth";
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
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const userEmailKey = user?.email ? user.email.toLowerCase().trim() : "";
  const cacheKey = userEmailKey ? `cse_studio_access_${userEmailKey}` : "";

  const [accessStatus, setAccessStatus] = useState(() => {
    try {
      const email = user?.email?.toLowerCase().trim();
      const cached = email ? sessionStorage.getItem(`cse_studio_access_${email}`) : null;
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!accessStatus);
  const [error, setError] = useState("");
  const [unlockedJustNow, setUnlockedJustNow] = useState(false);

  const fetchAccessStatus = useCallback(async (isInitial = false) => {
    if (!userEmailKey) return;
    if (isInitial) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setAccessStatus(JSON.parse(cached));
          setLoading(false);
        } else {
          setLoading(true);
        }
      } catch {
        setLoading(true);
      }
    }
    setError("");

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await apiClient.get("/studio/access-status", { timeout: 45000 });
        setAccessStatus(res.data);
        if (res.data) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
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
              sessionStorage.setItem(cacheKey, JSON.stringify(claimRes.data));
            }
          } catch (claimErr) {
            console.error("Claim access error:", claimErr);
          }
        }
        setLoading(false);
        return;
      } catch (err) {
        const status = err?.response?.status;
        if (attempt < 2 && (!status || status === 502 || status === 503 || status === 504 || status === 401)) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        console.error("Fetch access status error:", err);
        setAccessStatus((prev) => {
          if (!prev) {
            setError("Could not verify studio access status. Please try again.");
          }
          return prev;
        });
        setLoading(false);
        return;
      }
    }
  }, [userEmailKey, cacheKey]);

  useEffect(() => {
    if (authLoading || !userEmailKey) return;
    fetchAccessStatus(true);
  }, [authLoading, userEmailKey, fetchAccessStatus]);

  if (authLoading) {
    return (
      <FullScreenLoader
        message="Loading Creator Studio..."
        subtext="Preparing your workspace tools and data"
      />
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
        replace
      />
    );
  }

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
            onClick={() => fetchAccessStatus(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
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
