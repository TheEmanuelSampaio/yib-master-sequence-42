
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { tagChange, getPendingMessages } from "@/utils/supabaseEdgeFunctions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

export const ApiTester = () => {
  const [tagChangePayload, setTagChangePayload] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleTagChange = async () => {
    try {
      setLoading(true);
      let payload: any;
      
      try {
        payload = JSON.parse(tagChangePayload);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro de formato",
          description: "O payload fornecido não é um JSON válido."
        });
        return;
      }

      const { data, error } = await tagChange(payload);
      
      if (error) {
        setResult(JSON.stringify({ error: error.message }, null, 2));
        toast({
          variant: "destructive",
          title: "Erro na API",
          description: error.message
        });
      } else {
        setResult(JSON.stringify(data, null, 2));
        toast({
          title: "Sucesso",
          description: "Chamada à API concluída com sucesso."
        });
      }
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2));
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetPendingMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await getPendingMessages();
      
      if (error) {
        setResult(JSON.stringify({ error: error.message }, null, 2));
        toast({
          variant: "destructive",
          title: "Erro na API",
          description: error.message
        });
      } else {
        setResult(JSON.stringify(data, null, 2));
        toast({
          title: "Sucesso",
          description: "Mensagens pendentes recuperadas com sucesso."
        });
      }
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2));
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const examplePayload = {
    accountData: { accountId: 1, accountName: "Years In Box" },
    contactData: { id: 16087, name: "Emanuel Years In Box", phoneNumber: "+5511937474703" },
    conversationData: { inboxId: 46, conversationId: 23266, displayId: 1608, labels: "lead, google, produto-xpto" }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Testador de API</CardTitle>
        <CardDescription>
          Teste as chamadas à API do Master Sequence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tag-change">
          <TabsList className="mb-4">
            <TabsTrigger value="tag-change">Tag Change</TabsTrigger>
            <TabsTrigger value="pending-messages">Mensagens Pendentes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tag-change">
            <div className="space-y-4">
              <div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTagChangePayload(JSON.stringify(examplePayload, null, 2))}
                  className="mb-2"
                >
                  Carregar exemplo
                </Button>
                <Textarea
                  placeholder="Cole o payload JSON aqui para testar a API tag-change..."
                  className="min-h-[200px] font-mono text-sm"
                  value={tagChangePayload}
                  onChange={(e) => setTagChangePayload(e.target.value)}
                />
              </div>
              <Button onClick={handleTagChange} disabled={loading}>
                {loading ? "Enviando..." : "Testar Tag Change"}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="pending-messages">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique no botão para buscar as mensagens pendentes.
              </p>
              <Button onClick={handleGetPendingMessages} disabled={loading}>
                {loading ? "Buscando..." : "Buscar Mensagens Pendentes"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {result && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Resultado:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs max-h-[300px]">
              {result}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Nota: É necessário estar autenticado para usar essas APIs.
        </p>
      </CardFooter>
    </Card>
  );
};
