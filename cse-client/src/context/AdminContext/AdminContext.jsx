import { createContext, useContext, useState, useEffect, useCallback } from "react";
import adminApiClient from "@/lib/adminApiClient";

export const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("admin_token") || null);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem("admin_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Verify active session with backend /me on mount or token change
  const verifySession = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setAdminUser(null);
      setIsLoadingSession(false);
      return;
    }

    try {
      const res = await adminApiClient.get("/me");
      if (res.data?.authenticated && res.data?.admin) {
        setAdminUser(res.data.admin);
        localStorage.setItem("admin_user", JSON.stringify(res.data.admin));
      } else {
        throw new Error("Invalid session");
      }
    } catch {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      setAdminToken(null);
      setAdminUser(null);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const loginAdmin = (token, adminData) => {
    localStorage.setItem("admin_token", token);
    if (adminData) {
      localStorage.setItem("admin_user", JSON.stringify(adminData));
      setAdminUser(adminData);
    }
    setAdminToken(token);
    setIsLoadingSession(false);
  };

  const logoutAdmin = async () => {
    try {
      await adminApiClient.post("/logout");
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      setAdminToken(null);
      setAdminUser(null);
    }
  };

  const isAdminAuthenticated = Boolean(adminToken);

  return (
    <AdminContext.Provider
      value={{
        adminToken,
        adminUser,
        isAdminAuthenticated,
        isLoadingSession,
        loginAdmin,
        logoutAdmin,
        verifySession,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
