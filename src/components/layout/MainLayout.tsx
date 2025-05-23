
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";
import { Outlet } from "react-router-dom";
import { ContextDebugger } from "../debug/ContextDebugger";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { useRouteData } from "@/hooks/use-route-data";
import { Skeleton } from "../ui/skeleton";

export const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentInstance } = useApp();
  const { isLoading } = useRouteData();
  
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
            <div className="space-y-4 mt-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <div className="mt-8">
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
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
