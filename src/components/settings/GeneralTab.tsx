
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export const GeneralTab = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    requireReview: false,
    emailNotifications: false,
    autoDarkTheme: true,
    safeMode: true
  });

  // Simulate loading settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      
      try {
        // Simulate API request
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // In a real implementation, you would fetch settings from Supabase
        // For now, we'll just use some default values
        setSettings({
          requireReview: false,
          emailNotifications: false,
          autoDarkTheme: true,
          safeMode: true
        });
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as configurações",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [toast]);
  
  const handleSettingChange = (setting: keyof typeof settings) => {
    setSettings(prev => {
      const newSettings = { ...prev, [setting]: !prev[setting] };
      
      // In a real implementation, you would save changes to Supabase here
      toast({
        title: "Configuração alterada",
        description: `${setting} foi ${newSettings[setting] ? "ativado" : "desativado"}.`
      });
      
      return newSettings;
    });
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Configurações Gerais</CardTitle>
        <CardDescription>
          Configure opções gerais do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Revisão de Mensagens</h3>
            <p className="text-sm text-muted-foreground">
              Exigir revisão manual antes de enviar mensagens
            </p>
          </div>
          <Switch 
            id="require-review" 
            checked={settings.requireReview}
            onCheckedChange={() => handleSettingChange('requireReview')}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Notificações</h3>
            <p className="text-sm text-muted-foreground">
              Enviar notificações por email
            </p>
          </div>
          <Switch 
            id="email-notifications" 
            checked={settings.emailNotifications}
            onCheckedChange={() => handleSettingChange('emailNotifications')}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Tema Escuro Automático</h3>
            <p className="text-sm text-muted-foreground">
              Alternar automaticamente para o tema escuro conforme o sistema
            </p>
          </div>
          <Switch 
            id="auto-dark-theme" 
            checked={settings.autoDarkTheme}
            onCheckedChange={() => handleSettingChange('autoDarkTheme')}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Modo Seguro</h3>
            <p className="text-sm text-muted-foreground">
              Pedir confirmação antes de enviar mensagens em massa
            </p>
          </div>
          <Switch 
            id="safe-mode" 
            checked={settings.safeMode}
            onCheckedChange={() => handleSettingChange('safeMode')}
          />
        </div>
      </CardContent>
    </Card>
  );
};
