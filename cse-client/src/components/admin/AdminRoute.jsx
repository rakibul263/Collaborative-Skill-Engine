import { Navigate, Outlet } from "react-router";
import { useAdmin } from "@/context/AdminContext/AdminContext";

const AdminRoute = ({ children }) => {
  const { isAdminAuthenticated } = useAdmin();

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children ? children : <Outlet />;
};

export default AdminRoute;
