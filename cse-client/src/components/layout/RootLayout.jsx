import React from "react";
import Navbar from "../shared/navbar/Navbar";
import Footer from "../shared/footer/Footer";
import { Outlet } from "react-router";
import FloatingChatWidget from "../shared/chat/FloatingChatWidget";
import { ToastProvider } from "@/components/ui/toast-system";

const RootLayout = () => {
  return (
    <ToastProvider>
      <div className="animated-bg min-h-screen flex flex-col">
        <Navbar />

        <main className="relative z-10 flex-1 flex flex-col">
          <Outlet />
        </main>

        <Footer />
        <FloatingChatWidget />
      </div>
    </ToastProvider>
  );
};

export default RootLayout;
