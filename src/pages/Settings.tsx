
import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Lazy load tab components
const UsersTab = lazy(() => import("@/components/settings/UsersTab"));
const ClientsTab = lazy(() => import("@/components/settings/ClientsTab"));
const TimeRestrictionsTab = lazy(() => import("@/components/settings/TimeRestrictionsTab"));
const TagsTab = lazy(() => import("@/components/settings/TagsTab"));
const GeneralTab = lazy(() => import("@/components/settings/GeneralTab"));
const TokensTab = lazy(() => import("@/components/settings/TokensTab"));

// Loading component for Suspense fallback
const TabLoading = () => (
  <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
    <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary" />
    <p className="text-muted-foreground text-sm">Carregando...</p>
  </div>
);

export default function Settings() {
  const { isSuper } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(isSuper ? "users" : "clients");

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, clientes e configurações gerais do sistema
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <Suspense fallback={<TabLoading />}>
              <UsersTab />
            </Suspense>
          </TabsContent>
        )}
        
        {/* Clients Tab */}
        <TabsContent value="clients">
          <Suspense fallback={<TabLoading />}>
            <ClientsTab />
          </Suspense>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens">
          <Suspense fallback={<TabLoading />}>
            <TokensTab />
          </Suspense>
        </TabsContent>
        
        {/* Time Restrictions Tab */}
        <TabsContent value="time-restrictions">
          <Suspense fallback={<TabLoading />}>
            <TimeRestrictionsTab />
          </Suspense>
        </TabsContent>
        
        {/* Tags Tab */}
        <TabsContent value="tags">
          <Suspense fallback={<TabLoading />}>
            <TagsTab />
          </Suspense>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Suspense fallback={<TabLoading />}>
            <GeneralTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
