import { createContext, useContext, useState } from "react";

export const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem("admin_token") || null
  );

  const loginAdmin = (token) => {
    localStorage.setItem("admin_token", token);
    setAdminToken(token);
  };

  const logoutAdmin = () => {
    localStorage.removeItem("admin_token");
    setAdminToken(null);
  };

  const isAdminAuthenticated = !!adminToken;

  return (
    <AdminContext.Provider value={{ adminToken, loginAdmin, logoutAdmin, isAdminAuthenticated }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
