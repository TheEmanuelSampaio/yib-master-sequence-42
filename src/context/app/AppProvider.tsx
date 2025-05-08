
import React, { createContext, useContext, useState } from "react";

interface CoreAppContextType {
  isDataInitialized: boolean;
  setIsDataInitialized: (value: boolean) => void;
  refreshData: () => Promise<void>;
}

// Create and export the context
export const CoreAppContext = createContext<CoreAppContextType | undefined>(undefined);

export const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  
  const refreshData = async () => {
    try {
      // Implementation will be handled by the consumer components
      console.log("Core refreshData called - will be implemented by consumers");
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };
  
  return (
    <CoreAppContext.Provider 
      value={{ 
        isDataInitialized, 
        setIsDataInitialized, 
        refreshData 
      }}
    >
      {children}
    </CoreAppContext.Provider>
  );
};

// Export the hook for consumers
export const useAppCore = () => {
  const context = useContext(CoreAppContext);
  if (context === undefined) {
    throw new Error("useAppCore must be used within an AppContextProvider");
  }
  return context;
};
