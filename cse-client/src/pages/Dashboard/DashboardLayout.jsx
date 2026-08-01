import { Outlet } from "react-router";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
    </div>
  );
};

export default DashboardLayout;
