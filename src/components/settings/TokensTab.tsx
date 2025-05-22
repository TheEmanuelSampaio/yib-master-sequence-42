import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TokensTab = () => {
  const { user, updateUser } = useAuth();
  const [showToken, setShowToken] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Token copiado para a área de transferência");
    } catch (error) {
      console.error("Erro ao copiar para a área de transferência:", error);
      toast.error("Não foi possível copiar o token");
    }
  };

  const generateNewToken = async () => {
    try {
      setIsGenerating(true);
      
      // Generate a random token - 48 hex characters (24 bytes)
      const randomBytes = new Uint8Array(24);
      crypto.getRandomValues(randomBytes);
      const newToken = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Update token in database
      await updateUser({ authToken: newToken });
      
      toast.success("Token global gerado com sucesso!");
      
    } catch (error) {
      console.error("Erro ao gerar token global:", error);
      toast.error("Erro ao gerar token global");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Tokens de Autenticação</CardTitle>
        <CardDescription>
          Gerencie os tokens globais para integração com sistemas externos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Informação Importante</AlertTitle>
          <AlertDescription>
            Os tokens globais possuem acesso privilegiado ao sistema. Proteja-os adequadamente e não os compartilhe.
            Utilize-os em ferramentas de automação como N8N ou integrações personalizadas.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="global-token">Token Global ({user?.role === 'super_admin' ? 'Super Admin' : 'Admin'})</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
          <div className="flex space-x-2">
            <Input
              id="global-token"
              type={showToken ? "text" : "password"}
              value={user?.authToken || ""}
              readOnly
              className="font-mono"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => user?.authToken && copyToClipboard(user.authToken)}
              title="Copiar token"
              type="button"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={generateNewToken}
              disabled={isGenerating}
              title="Gerar novo token"
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Este token global permite acesso a todos os clientes vinculados ao seu usuário.
            A regeneração invalidará o token atual.
          </p>
        </div>

        {user?.role === 'super_admin' && (
          <div className="mt-6">
            <h3 className="text-lg font-medium">Informações para integração</h3>
            <div className="mt-2 space-y-4">
              <div>
                <h4 className="text-sm font-medium">URL para Tag Change Webhook</h4>
                <code className="block p-2 mt-1 bg-muted rounded-md text-xs">
                  https://mlwcupyfhtxdxcybwbmg.functions.supabase.co/tag-change
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilize esta URL no Chatwoot para enviar dados de alteração de tags.
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Formato do payload</h4>
                <pre className="block p-2 mt-1 bg-muted rounded-md text-xs whitespace-pre overflow-x-auto">
{`{
  "accountData": {
    "accountId": 1,
    "accountName": "Nome da Conta"
  },
  "contactData": {
    "id": 12345,
    "name": "Nome do Cliente",
    "phoneNumber": "+5511999999999"
  },
  "conversationData": {
    "inboxId": 1,
    "conversationId": 123,
    "displayId": 123,
    "labels": "tag1, tag2, tag3"
  },
  "variables": {
    "nome": "Valor personalizado",
    "outroParam": "Outro valor"
  },
  "authToken": "seu_token_global_aqui"
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokensTab;
