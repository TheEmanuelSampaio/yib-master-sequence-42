
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/useRealtime";

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Enable realtime updates based on the current route
  const currentPath = location.pathname;

  // Setup realtime subscriptions
  useRealtime({
    // Enable realtime updates for sequences only on sequences page
    enableSequences: currentPath === '/sequences' || currentPath.startsWith('/sequences/'),
    
    // Enable realtime updates for contacts only on contacts page
    enableContacts: currentPath === '/contacts' || currentPath.startsWith('/contacts/'),
    
    // Enable realtime updates for instances always (since they affect current instance selection)
    enableInstances: true,
    
    // Notify user when changes happen
    onNotify: (table, event, payload) => {
      if (event === 'UPDATE') {
        const entityNames = {
          'sequences': 'Sequência',
          'contacts': 'Contato',
          'instances': 'Instância',
        };
        
        const entityName = entityNames[table as keyof typeof entityNames] || 'Item';
        const itemName = payload?.name || '';
        
        // Only show toast for updates in key tables
        if (['sequences', 'instances', 'contacts'].includes(table)) {
          toast.info(`${entityName} atualizado`, {
            description: `${entityName} "${itemName}" foi atualizado por outro usuário.`,
            duration: 3000,
          });
        }
      }
    },
  });
  
  // Close sidebar when navigating to a new page (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex flex-col flex-1">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 py-6 px-6 md:px-8 max-w-screen-2xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
