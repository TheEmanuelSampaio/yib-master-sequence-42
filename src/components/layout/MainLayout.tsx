
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
  const lastRoutePathRef = useRef("");
  
  // Get the main route path (first segment)
  const getMainRoutePath = useCallback(() => {
    return `/${location.pathname.split('/')[1]}`;
  }, [location.pathname]);
  
  // Determine if we should refresh based on route change
  const shouldRefreshOnRouteChange = useCallback((newPath) => {
    if (!isDataInitialized) return true;
    
    // Skip refresh for these routes
    const skipRefreshRoutes = ['/debug'];
    if (skipRefreshRoutes.includes(newPath)) {
      console.log(`[MainLayout] Skipping refresh for ${newPath}`);
      return false;
    }
    
    // Avoid unnecessary refreshes when navigating between tabs on the same page
    if (newPath === lastRoutePathRef.current) {
      console.log(`[MainLayout] Staying on same main route: ${newPath}, no refresh needed`);
      return false;
    }
    
    // If moving to a data-intensive route, refresh
    const dataIntensiveRoutes = ['/contacts', '/sequences', '/messages', '/dashboard'];
    if (dataIntensiveRoutes.includes(newPath)) {
      console.log(`[MainLayout] Moving to data-intensive route: ${newPath}, refresh needed`);
      return true;
    }
    
    return true;
  }, [isDataInitialized]);
  
  // Enhanced safeRefreshData with scope parameter and better throttling
  const safeRefreshData = useCallback(async (scope = "all") => {
    // Prevent concurrent refreshes
    if (refreshInProgressRef.current) {
      console.log(`[MainLayout] Refresh already in progress, skipping... (scope: ${scope})`);
      return false;
    }
    
    const now = Date.now();
    // Implement a more aggressive throttling for repeated calls
    const minDelay = scope === "all" ? 5000 : 3000;
    if (now - lastRefreshTimestampRef.current < minDelay && isDataInitialized) {
      console.log(`[MainLayout] Throttled refresh - too soon since last refresh (${now - lastRefreshTimestampRef.current}ms < ${minDelay}ms)`);
      return false;
    }
    
    try {
      console.log(`[MainLayout] Refresh triggered from route: ${location.pathname} with scope: ${scope}`);
      refreshInProgressRef.current = true;
      lastRefreshTimestampRef.current = now;
      await refreshData(scope);
      return true;
    } catch (error) {
      console.error("[MainLayout] Error refreshing data:", error);
      return false;
    } finally {
      // Add a small delay before allowing another refresh to prevent rapid successive calls
      setTimeout(() => {
        refreshInProgressRef.current = false;
      }, 500);
    }
  }, [refreshData, isDataInitialized, location.pathname]);
  
  // Route-based data loading with smarter route change detection
  useEffect(() => {
    const mainRoutePath = getMainRoutePath();
    
    if (!isDataInitialized) {
      console.log("[MainLayout] Initial data load");
      safeRefreshData("all");
      return;
    }
    
    if (shouldRefreshOnRouteChange(mainRoutePath)) {
      console.log(`[MainLayout] Route changed from ${lastRoutePathRef.current} to ${mainRoutePath}, refreshing`);
      
      // Determine what data to load based on the route
      let scope = "all";
      if (mainRoutePath === "/contacts") scope = "contacts";
      else if (mainRoutePath === "/sequences") scope = "sequences";
      else if (mainRoutePath === "/messages") scope = "messages";
      else if (mainRoutePath === "/settings") scope = "settings";
      
      safeRefreshData(scope);
    }
    
    // Update the last route path
    lastRoutePathRef.current = mainRoutePath;
  }, [getMainRoutePath, safeRefreshData, isDataInitialized, shouldRefreshOnRouteChange]);
  
  // Debug logging with reduced frequency
  useEffect(() => {
    if (currentInstance) {
      console.log("[MainLayout] Current instance:", currentInstance.name);
    }
    
    // Only log detailed app info on initial render
    if (!isDataInitialized) {
      console.log("Application info:", {
        version: "1.0.4",
        mode: process.env.NODE_ENV,
        routePath: location.pathname,
        dataInitialized: isDataInitialized,
        lastBuildTime: new Date().toISOString()
      });
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
