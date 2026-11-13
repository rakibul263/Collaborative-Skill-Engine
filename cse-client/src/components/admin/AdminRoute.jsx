import { Navigate, Outlet } from "react-router";
import { useAdmin } from "@/context/AdminContext/AdminContext";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";

const AdminRoute = ({ children }) => {
  const { isAdminAuthenticated, isLoadingSession } = useAdmin();

  if (isLoadingSession) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 bg-[#030712] text-slate-200">
        <LoadingSpinner size="lg" label="Verifying Security Credentials..." />
        <p className="text-xs font-mono text-cyan-400 mt-3 tracking-widest uppercase animate-pulse">
          Admin Gateway Authentication
        </p>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children ? children : <Outlet />;
};

export default AdminRoute;
