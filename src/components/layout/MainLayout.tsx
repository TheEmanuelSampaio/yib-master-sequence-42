
import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";
import { Outlet, useLocation } from "react-router-dom";
import { ContextDebugger } from "../debug/ContextDebugger";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentInstance, refreshData, isLoading, isDataInitialized } = useApp();
  const location = useLocation();
  const refreshInProgressRef = useRef(false);
  const lastRefreshTimestampRef = useRef(0);
  
  // Implement a better data loading strategy with debounce mechanism
  const safeRefreshData = useCallback(async () => {
    const now = Date.now();
    // Prevent refresh if one is already in progress
    if (refreshInProgressRef.current) {
      console.log("Refresh already in progress, skipping...");
      return;
    }
    
    // Debounce refreshes (no more than once every 3 seconds)
    if (now - lastRefreshTimestampRef.current < 3000 && isDataInitialized) {
      console.log("Debounced refresh - too soon since last refresh");
      return;
    }
    
    try {
      console.log("MainLayout - Safe refresh triggered from route:", location.pathname);
      refreshInProgressRef.current = true;
      lastRefreshTimestampRef.current = now;
      await refreshData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [refreshData, isDataInitialized, location.pathname]);
  
  // Route-based data loading with reduced dependencies
  useEffect(() => {
    if (!isDataInitialized) {
      console.log("Initial data load on first render");
      safeRefreshData();
      return;
    }
    
    // Only refresh data on major route changes if already initialized
    // We extract the main route path to avoid refreshing on subroute changes
    const mainRoutePath = `/${location.pathname.split('/')[1]}`;
    console.log(`Route changed to ${mainRoutePath}, considering refresh if needed`);
    
    // Skip refresh for debug routes or if we just loaded data recently
    const skipRefreshRoutes = ['/debug'];
    if (skipRefreshRoutes.includes(mainRoutePath)) {
      console.log("Skipping refresh for route:", mainRoutePath);
      return;
    }
    
    safeRefreshData();
  }, [location.pathname, safeRefreshData, isDataInitialized]);
  
  // Debug logging with reduced frequency
  useEffect(() => {
    console.log("MainLayout rendering with currentInstance:", 
      currentInstance ? currentInstance.name : "none");
    
    // Log application info less frequently
    const logAppInfo = () => {
      console.log("Application info:", {
        version: "1.0.3",
        mode: process.env.NODE_ENV,
        routePath: location.pathname,
        dataInitialized: isDataInitialized,
        lastBuildTime: new Date().toISOString()
      });
    };
    
    // Only log detailed app info on initial render
    if (!isDataInitialized) {
      logAppInfo();
    }
  }, [currentInstance, location.pathname, isDataInitialized]);
  
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
