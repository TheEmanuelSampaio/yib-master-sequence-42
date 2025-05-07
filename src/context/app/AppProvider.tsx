
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

// Import all provider components
import { ClientsProvider, useClients } from "./clients/ClientsContext";
import { InstancesProvider, useInstances } from "./instances/InstancesContext";
import { SequencesProvider, useSequences } from "./sequences/SequencesContext";
import { ContactsProvider, useContacts } from "./contacts/ContactsContext";
import { TimeRestrictionsProvider, useTimeRestrictions } from "./timeRestrictions/TimeRestrictionsContext";
import { UsersProvider, useUsers } from "./users/UsersContext";
import { TagsProvider, useTags } from "./tags/TagsContext";
import { StatsProvider, useStats } from "./stats/StatsContext";
import { MessagesProvider, useMessages } from "./messages/MessagesContext";

// Create context for the core app functionality
interface CoreAppContextType {
  refreshData: () => Promise<void>;
  isDataInitialized: boolean;
  isRefreshing: boolean;
}

export const CoreAppContext = createContext<CoreAppContextType | undefined>(undefined);

const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  // Create instances for accessing context functions
  const clientsInstance = useClients();
  const instancesInstance = useInstances();
  const sequencesInstance = useSequences();
  const contactsInstance = useContacts();
  const timeRestrictionsInstance = useTimeRestrictions();
  const usersInstance = useUsers();
  const tagsInstance = useTags();
  const statsInstance = useStats();
  const messagesInstance = useMessages();

  const refreshData = async () => {
    if (!currentUser || isRefreshing) return;
    
    // Prevent rapid consecutive refreshes (throttle to once every 3 seconds)
    const now = Date.now();
    if (now - lastRefresh < 3000 && isDataInitialized) {
      console.log("Refresh throttled - too soon since last refresh");
      return;
    }
    
    try {
      setIsRefreshing(true);
      setLastRefresh(now);
      console.log("Refreshing data...");
      
      // Use context providers to refresh all data
      await Promise.allSettled([
        clientsInstance.refreshClients(),
        instancesInstance.refreshInstances(),
        sequencesInstance.refreshSequences(),
        contactsInstance.refreshContacts(),
        timeRestrictionsInstance.refreshTimeRestrictions(),
        tagsInstance.refreshTags(),
        statsInstance.refreshStats(),
        messagesInstance.refreshMessages()
      ]);
      
      if (currentUser.role === 'super_admin') {
        await usersInstance.refreshUsers();
      }
      
      // Set initialized state to true after successful data load
      setIsDataInitialized(true);
      console.log("Data refresh completed successfully");
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize data on auth user changes
  useEffect(() => {
    if (currentUser && !isDataInitialized) {
      console.log("Initial data load after authentication");
      refreshData();
    } else if (!currentUser) {
      setIsDataInitialized(false);
    }
  }, [currentUser, isDataInitialized]);

  return (
    <CoreAppContext.Provider value={{
      refreshData,
      isDataInitialized,
      isRefreshing
    }}>
      {children}
    </CoreAppContext.Provider>
  );
};

// Main provider component that wraps all sub-providers
export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ClientsProvider>
      <InstancesProvider>
        <SequencesProvider>
          <ContactsProvider>
            <TimeRestrictionsProvider>
              <UsersProvider>
                <TagsProvider>
                  <StatsProvider>
                    <MessagesProvider>
                      <AppProvider>
                        {children}
                      </AppProvider>
                    </MessagesProvider>
                  </StatsProvider>
                </TagsProvider>
              </UsersProvider>
            </TimeRestrictionsProvider>
          </ContactsProvider>
        </SequencesProvider>
      </InstancesProvider>
    </ClientsProvider>
  );
};

export const useAppCore = () => {
  const context = useContext(CoreAppContext);
  if (context === undefined) {
    throw new Error("useAppCore must be used within an AppProvider");
  }
  return context;
};
