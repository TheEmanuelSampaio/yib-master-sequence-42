
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { UserProfileSection } from "@/components/settings/UserProfileSection";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { ApiDocsLink } from "@/components/settings/ApiDocsLink";
import { GlobalRestrictionsSection } from "@/components/settings/GlobalRestrictionsSection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";

const Settings = () => {
  return (
    <div className="container max-w-screen-lg py-6 space-y-6">
      <SettingsHeader 
        title="Configurações" 
        description="Gerencie suas preferências e configurações da conta" 
      />
      
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="time-restrictions">Restrições de Horário</TabsTrigger>
          <TabsTrigger value="danger">Zona de Perigo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-6">
          <UserProfileSection />
          <PasswordSection />
          <ApiDocsLink />
        </TabsContent>
        
        <TabsContent value="time-restrictions">
          <GlobalRestrictionsSection />
        </TabsContent>
        
        <TabsContent value="danger">
          <DangerZoneSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
