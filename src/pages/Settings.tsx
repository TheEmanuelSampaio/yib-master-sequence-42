
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { UsersTab } from "@/components/settings/UsersTab";
import { ClientsTab } from "@/components/settings/ClientsTab";
import { TimeRestrictionsTab } from "@/components/settings/TimeRestrictionsTab";
import { TagsTab } from "@/components/settings/TagsTab";
import { GeneralTab } from "@/components/settings/GeneralTab";

export default function Settings() {
  const { isSuper } = useAuth();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, clientes e configurações gerais do sistema
        </p>
      </div>
      
      <Tabs defaultValue={isSuper ? "users" : "clients"}>
        <TabsList>
          {/* Mostrar a aba Usuários apenas para super admins */}
          {isSuper && <TabsTrigger value="users">Usuários</TabsTrigger>}
          <TabsTrigger value="clients">Clientes</TabsTrigger>
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
    </div>
  );
}
