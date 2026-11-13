import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router";
import { router } from "./router/router.jsx";
import AOS from "aos";
import "aos/dist/aos.css";
import AuthProvider from "./context/AuthContext/AuthProvider.jsx";
import { AppToaster } from "@/components/ui/toast-system";
import { GlobalConfirmProvider } from "@/components/ui/confirm-dialog";

AOS.init();
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <GlobalConfirmProvider>
        <AppToaster />
        <RouterProvider router={router} />
      </GlobalConfirmProvider>
    </AuthProvider>
  </StrictMode>
);
