import { useState, useEffect } from "react";
import { Navigate } from "react-router";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";

/**
 * EligibleRoute — wraps the /dashboard route.
 * Redirects unauthenticated users → /login
 * Redirects ineligible users (rating < 4.0 or sessions < 1) → /studio
 * Renders children only for eligible instructors.
 */
const EligibleRoute = ({ children }) => {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!eligible) {
    return <Navigate to="/studio" replace />;
  }

  return children;
};

export default EligibleRoute;
