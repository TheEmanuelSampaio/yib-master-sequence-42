
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
  const { currentInstance, refreshData, isLoading } = useApp();
  const location = useLocation();
  
  // Implement route-based data loading
  useEffect(() => {
    console.log("MainLayout - Route changed to:", location.pathname);
    
    // Initial data load for essential data or route-specific data
    const loadPageData = async () => {
      // Only refresh data if we haven't loaded it yet or when changing major routes
      await refreshData(); // Remove the parameter
    };
    
    loadPageData();
  }, [location.pathname, refreshData]);
  
  // Debug logging
  useEffect(() => {
    console.log("MainLayout rendering with currentInstance:", 
      currentInstance ? currentInstance.name : "none");
    
    // Log application info
    console.log("Application info:", {
      version: "1.0.3", // Updated version number
      mode: process.env.NODE_ENV,
      routePath: location.pathname,
      lastBuildTime: new Date().toISOString()
    });
  }, [currentInstance, location.pathname]);
  
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
          {isLoading ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="space-y-4 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <Toaster />
        <ContextDebugger />
      </div>
    </div>
  );
};
