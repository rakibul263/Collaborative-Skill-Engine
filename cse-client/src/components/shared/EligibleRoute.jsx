import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { FullScreenLoader } from "@/components/shared/loading/LoadingSpinner";

/**
 * EligibleRoute — wraps the /dashboard route.
 * Redirects unauthenticated users → /login
 * Redirects ineligible users (rating < 4.0 or sessions < 1) → /studio
 * Renders children only for eligible instructors.
 */
const EligibleRoute = ({ children }) => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    apiClient
      .get("/studio/access-status")
      .then((res) => {
        setEligible(res.data?.hasStudioAccess === true || res.data?.isEligible === true);
      })
      .catch(() => setEligible(false))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <FullScreenLoader
        message="Verifying Studio Eligibility..."
        subtext="Checking your mentorship standing and credentials"
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!eligible) {
    return <Navigate to="/studio" replace />;
  }

  return children;
};

export default EligibleRoute;
