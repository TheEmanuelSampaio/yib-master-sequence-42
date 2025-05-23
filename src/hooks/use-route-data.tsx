
import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useLocation } from "react-router-dom";

// Renamed to RouteDataType to avoid type conflicts
export type RouteDataType = 
  | "clients" 
  | "instances" 
  | "sequences" 
  | "contacts" 
  | "tags" 
  | "timeRestrictions" 
  | "users" 
  | "all";

interface RouteDataConfig {
  path: string;
  dataTypes: RouteDataType[];
}

// Define which data types should be loaded for each route
const routeConfigs: RouteDataConfig[] = [
  { path: "/", dataTypes: ["instances", "sequences", "contacts", "tags"] },
  { path: "/dashboard", dataTypes: ["instances", "sequences", "contacts", "tags"] },
  { path: "/instances", dataTypes: ["clients", "instances"] },
  { path: "/sequences", dataTypes: ["instances", "sequences", "tags", "timeRestrictions"] },
  { path: "/contacts", dataTypes: ["clients", "contacts", "tags"] },
  { path: "/messages", dataTypes: ["contacts", "sequences"] },
  { path: "/settings", dataTypes: ["clients", "timeRestrictions", "tags", "users"] }
];

export function useRouteData() {
  const { pathname } = useLocation();
  const { refreshData, isDataInitialized } = useApp();
  const [isLoading, setIsLoading] = useState(!isDataInitialized);
  const [loadingType, setLoadingType] = useState<RouteDataType | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Find the config for the current route
      const config = routeConfigs.find(conf => pathname.startsWith(conf.path)) || 
                    { path: pathname, dataTypes: ["all"] as RouteDataType[] };
      
      setIsLoading(true);
      setLoadingType(config.dataTypes.includes("all") ? "all" : config.dataTypes[0]);
      
      // Load the required data for this route
      try {
        // Map RouteDataType to the expected DataType from AppContext
        // If "all" is included, pass undefined to refresh all data
        if (config.dataTypes.includes("all")) {
          await refreshData();
        } else {
          // Convert our route data types to match what AppContext expects
          const typesToRefresh = config.dataTypes.filter(t => t !== "all");
          await refreshData(typesToRefresh);
        }
      } finally {
        setIsLoading(false);
        setLoadingType(null);
      }
    };

    // Only load data if it hasn't been initialized yet or when route changes
    if (!isDataInitialized || pathname) {
      loadData();
    }
  }, [pathname, isDataInitialized, refreshData]);

  return { 
    isLoading, 
    loadingType,
    isDataInitialized
  };
}
