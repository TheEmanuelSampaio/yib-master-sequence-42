
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export const GeneralTab = () => {
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
          <Switch id="require-review" />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Notificações</h3>
            <p className="text-sm text-muted-foreground">
              Enviar notificações por email
            </p>
          </div>
          <Switch id="email-notifications" />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Tema Escuro Automático</h3>
            <p className="text-sm text-muted-foreground">
              Alternar automaticamente para o tema escuro conforme o sistema
            </p>
          </div>
          <Switch id="auto-dark-theme" defaultChecked />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Modo Seguro</h3>
            <p className="text-sm text-muted-foreground">
              Pedir confirmação antes de enviar mensagens em massa
            </p>
          </div>
          <Switch id="safe-mode" defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
};
