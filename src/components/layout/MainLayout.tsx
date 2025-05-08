import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";
import { Outlet } from "react-router-dom";
import { ContextDebugger } from "../debug/ContextDebugger";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { useCurrentInstance } from "@/hooks/use-current-instance";

export const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentInstance, refreshData } = useApp();
  
  // Use the React Query-based hook for instance management
  const { currentInstance: queryInstance } = useCurrentInstance();
  
  // Initial data load - using the AppContext refreshData for backwards compatibility
  useEffect(() => {
    console.log("MainLayout - Initial load with optimized approach");
    refreshData();
    // We're keeping the refreshData call because AppContext 
    // still uses it, but we're also using React Query hooks
    // for better data fetching performance
  }, []);
  
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
