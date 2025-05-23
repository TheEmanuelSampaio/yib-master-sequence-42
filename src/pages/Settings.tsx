
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { UsersTab } from "@/components/settings/UsersTab";
import { ClientsTab } from "@/components/settings/ClientsTab";
import { TimeRestrictionsTab } from "@/components/settings/TimeRestrictionsTab";
import { TagsTab } from "@/components/settings/TagsTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { TokensTab } from "@/components/settings/TokensTab";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/context/AppContext";

export default function Settings() {
  const { isSuper } = useAuth();
  const { isDataInitialized, refreshData } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettingsData = async () => {
      setIsLoading(true);
      try {
        // Only refresh data if not already initialized
        if (!isDataInitialized) {
          await refreshData(["clients", "timeRestrictions", "tags", "users"]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSettingsData();
  }, [refreshData, isDataInitialized]);

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, clientes e configurações gerais do sistema
        </p>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="space-y-8 mt-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : (
        <Tabs defaultValue={isSuper ? "users" : "clients"}>
          <TabsList>
            {/* Mostrar a aba Usuários apenas para super admins */}
            {isSuper && <TabsTrigger value="users">Usuários</TabsTrigger>}
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="time-restrictions">Restrições de Horário</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
          </TabsList>
          
          {/* Visível apenas para super admin */}
          {isSuper && (
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
          )}
          
          {/* Clients Tab */}
          <TabsContent value="clients">
            <ClientsTab />
          </TabsContent>

          {/* Tokens Tab (nova) */}
          <TabsContent value="tokens">
            <TokensTab />
          </TabsContent>
          
          {/* Time Restrictions Tab */}
          <TabsContent value="time-restrictions">
            <TimeRestrictionsTab />
          </TabsContent>
          
          {/* Tags Tab */}
          <TabsContent value="tags">
            <TagsTab />
          </TabsContent>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
