
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
  const refreshQueueRef = useRef<Set<string>>(new Set());
  
  // Get the main route path (first segment)
  const getMainRoutePath = useCallback(() => {
    return `/${location.pathname.split('/')[1]}`;
  }, [location.pathname]);
  
  // Cache TTL management - define how long different data types stay fresh
  const dataTTLRef = useRef({
    contacts: 30000,    // 30 seconds
    sequences: 60000,   // 60 seconds
    messages: 15000,    // 15 seconds
    dashboard: 120000,  // 2 minutes
    settings: 300000    // 5 minutes
  });
  
  // Track when each data type was last loaded
  const lastDataLoadTimeRef = useRef({
    contacts: 0,
    sequences: 0, 
    messages: 0,
    dashboard: 0,
    settings: 0,
    all: 0
  });
  
  // Determine if we should refresh based on route change
  const shouldRefreshOnRouteChange = useCallback((newPath) => {
    if (!isDataInitialized) return true;
    
    // Skip refresh for these routes
    const skipRefreshRoutes = ['/debug'];
    if (skipRefreshRoutes.includes(newPath)) {
      console.log(`[MainLayout] Skipping refresh for ${newPath}`);
      return false;
    }
    
    // Check if we're staying on the same route
    if (newPath === lastRoutePathRef.current) {
      console.log(`[MainLayout] Staying on same main route: ${newPath}, checking data freshness`);
      
      // Even on same route, check if data is stale based on TTL
      const now = Date.now();
      const routeType = newPath.substring(1) || 'dashboard'; // Remove leading slash
      const lastLoadTime = lastDataLoadTimeRef.current[routeType] || 0;
      const ttl = dataTTLRef.current[routeType] || 30000;
      
      if (now - lastLoadTime > ttl) {
        console.log(`[MainLayout] ${routeType} data is stale (${now - lastLoadTime}ms), refreshing`);
        return true;
      }
      return false;
    }
    
    // Data-intensive routes check - only load what's needed
    const routeDataMap = {
      '/contacts': ['contacts'],
      '/sequences': ['sequences'],
      '/messages': ['messages'],
      '/dashboard': ['dashboard'],
      '/settings': ['settings']
    };
    
    if (routeDataMap[newPath]) {
      // Check if data for this route is already fresh
      const now = Date.now();
      const dataTypes = routeDataMap[newPath];
      const needsRefresh = dataTypes.some(type => {
        const lastLoadTime = lastDataLoadTimeRef.current[type] || 0;
        const ttl = dataTTLRef.current[type] || 30000;
        return (now - lastLoadTime > ttl);
      });
      
      if (!needsRefresh) {
        console.log(`[MainLayout] Data for ${newPath} is still fresh, skipping refresh`);
        return false;
      }
      
      console.log(`[MainLayout] Moving to ${newPath}, data needs refresh`);
      return true;
    }
    
    return true;
  }, [isDataInitialized]);
  
  // Add a data refresh queue system
  const processRefreshQueue = useCallback(async () => {
    if (refreshInProgressRef.current || refreshQueueRef.current.size === 0) {
      return;
    }
    
    const scope = Array.from(refreshQueueRef.current)[0];
    refreshQueueRef.current.delete(scope);
    
    try {
      refreshInProgressRef.current = true;
      console.log(`[MainLayout] Processing queued refresh: ${scope}`);
      
      // Call the refreshData function (no parameters as per the fix)
      await refreshData();
      
      // Update last load time for appropriate data types
      const now = Date.now();
      if (scope === "all") {
        Object.keys(lastDataLoadTimeRef.current).forEach(key => {
          lastDataLoadTimeRef.current[key] = now;
        });
      } else {
        lastDataLoadTimeRef.current[scope] = now;
      }
      
      console.log(`[MainLayout] Completed refresh for: ${scope}`);
    } catch (error) {
      console.error("[MainLayout] Error in refresh queue processing:", error);
    } finally {
      refreshInProgressRef.current = false;
      
      // Process next item in queue after a small delay
      setTimeout(() => {
        processRefreshQueue();
      }, 100);
    }
  }, [refreshData]);
  
  // Enhanced safeRefreshData with scope parameter and better throttling
  const safeRefreshData = useCallback(async (scope = "all") => {
    // Add to queue instead of executing immediately
    refreshQueueRef.current.add(scope);
    console.log(`[MainLayout] Queued refresh for scope: ${scope}`);
    
    const now = Date.now();
    lastRefreshTimestampRef.current = now;
    
    // Determine if we should start processing the queue
    if (!refreshInProgressRef.current) {
      processRefreshQueue();
    }
    
    return true;
  }, [processRefreshQueue]);
  
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
  
  // Reduced logging - only log on important state changes
  useEffect(() => {
    if (currentInstance && lastRoutePathRef.current !== getMainRoutePath()) {
      console.log("[MainLayout] Current instance:", currentInstance.name);
    }
    
    // Only log detailed app info on initial render
    if (!isDataInitialized) {
      console.log("Application info:", {
        version: "1.0.5",
        mode: process.env.NODE_ENV,
        routePath: location.pathname,
        dataInitialized: isDataInitialized
      });
    }
  }, [currentInstance, location.pathname, isDataInitialized, getMainRoutePath]);
  
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
