
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";
import { Outlet, useLocation } from "react-router-dom";
import { ContextDebugger } from "../debug/ContextDebugger";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentInstance, isDataInitialized, isLoading } = useApp();
  const location = useLocation();
  
  // Add debugging log to track when MainLayout renders and what the current instance is
  useEffect(() => {
    console.log("MainLayout rendering with currentInstance:", 
      currentInstance ? currentInstance.name : "none");
    
    // Log application version to help with debugging
    console.log("Application info:", {
      version: "1.0.3", // Updated version number
      mode: process.env.NODE_ENV,
      lastBuildTime: new Date().toISOString()
    });
  }, [currentInstance]);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Determine if any loading is happening based on the current route
  const isLoadingContent = () => {
    const path = location.pathname;
    
    if (path === '/contacts') return isLoading.contacts;
    if (path === '/sequences') return isLoading.sequences;
    if (path === '/messages') return isLoading.messages;
    if (path === '/instances') return isLoading.clients;
    if (path === '/settings') {
      // For settings, any of these could be loading depending on the tab
      return Object.values(isLoading).some(loading => loading);
    }
    
    return false;
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
        <Header sidebarCollapsed={sidebarCollapsed} isLoading={isLoadingContent()} />
        <main className="flex-1 p-4 md:p-8 pt-0 md:pt-0 overflow-y-auto">
          <Outlet />
        </main>
        <Toaster />
        <ContextDebugger />
      </div>
    </div>
  );
};
