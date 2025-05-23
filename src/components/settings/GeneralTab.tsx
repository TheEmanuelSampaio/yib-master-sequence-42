
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export const GeneralTab = () => {
  const { toast } = useToast();
  const [requireReview, setRequireReview] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [autoDarkTheme, setAutoDarkTheme] = useState(true);
  const [safeMode, setSafeMode] = useState(true);
  
  const handleRequireReviewChange = (checked: boolean) => {
    setRequireReview(checked);
    toast({
      title: "Configuração atualizada",
      description: `Revisão de mensagens ${checked ? 'ativada' : 'desativada'}.`,
      variant: "default"
    });
  };
  
  const handleNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked);
    toast({
      title: "Configuração atualizada",
      description: `Notificações por email ${checked ? 'ativadas' : 'desativadas'}.`,
      variant: "default"
    });
  };
  
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
            checked={requireReview}
            onCheckedChange={handleRequireReviewChange}
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
            checked={emailNotifications}
            onCheckedChange={handleNotificationsChange}
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
            defaultChecked={autoDarkTheme}
            onCheckedChange={setAutoDarkTheme}
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
            defaultChecked={safeMode}
            onCheckedChange={setSafeMode}
          />
        </div>
      </CardContent>
    </Card>
  );
};
