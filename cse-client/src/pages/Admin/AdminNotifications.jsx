import { Navigate } from "react-router";

// Redundant file forwarder: Admin notifications has been unified into AdminBroadcasts.
const AdminNotifications = () => {
  return <Navigate to="/admin/broadcasts" replace />;
};

export default AdminNotifications;
