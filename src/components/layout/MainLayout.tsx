
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";
import { Outlet } from "react-router-dom";
import { ContextDebugger } from "../debug/ContextDebugger";
import { cn } from "@/lib/utils";
import { useInstances } from "@/context/InstanceContext";
import { Skeleton } from "../ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentInstance } = useInstances();
  
  // Use React Query to check if the application is initially set up
  const { data: setupData, isLoading: setupLoading } = useQuery({
    queryKey: ["appSetup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_setup")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error checking app setup:", error);
      }
      
      return { isSetup: !!data?.setup_completed };
    }
  });
  
  // Add debounced effect for logging to prevent excessive re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("MainLayout rendering with currentInstance:", 
        currentInstance ? currentInstance.name : "none");
      
      console.log("Application info:", {
        version: "1.0.3",
        mode: process.env.NODE_ENV,
        initialized: setupData?.isSetup || false,
        lastBuildTime: new Date().toISOString()
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentInstance, setupData]);
  
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
          {setupLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
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
