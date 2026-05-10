import React from "react";
import { Navigate, useLocation } from "react-router";
import useAuth from "@/hooks/useAuth";
import EngineLoadingComponent from "@/components/shared/loading/EngineLoadingComponent";

/**
 * PrivateRoute — wraps any route that requires authentication.
 *
 * Behaviour:
 *   • While Firebase auth is still resolving  → shows the full-screen loader
 *   • User is logged in                        → renders the child page normally
 *   • User is NOT logged in                    → redirects to /login,
 *     saving the attempted path so the user is
 *     sent back there after a successful login.
 */
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still waiting for Firebase onAuthStateChanged to fire
  if (loading) {
    return <EngineLoadingComponent />;
  }

  // Not authenticated — send to login and remember where they were going
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
