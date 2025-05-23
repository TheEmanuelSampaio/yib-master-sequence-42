
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/toaster";
import { Outlet } from "react-router-dom";
import { ContextDebugger } from "@/components/debug/ContextDebugger";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentInstance } = useApp();
  
  // Add debugging log to track when MainLayout renders and what the current instance is
  useEffect(() => {
    console.log("MainLayout rendering with currentInstance:", 
      currentInstance ? currentInstance.name : "none");
    
    // Log application version to help with debugging
    console.log("Application info:", {
      version: "1.0.2", // Updated version number
      mode: process.env.NODE_ENV,
      lastBuildTime: new Date().toISOString()
    });
  }, [currentInstance]);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div 
        className={cn(
          "flex flex-col flex-1 transition-margin duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <Header sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 p-4 md:p-8 pt-0 md:pt-0 overflow-y-auto">
          <Outlet />
        </main>
        <Toaster />
        <ContextDebugger />
      </div>
    </div>
  );
};

export default MainLayout;
