import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const ApiTester = () => {
  const [tagChangePayload, setTagChangePayload] = useState(JSON.stringify({
    data: {
      accountId: 1,
      accountName: "Years In Box",
      contact: {
        id: 16087,
        name: "Emanuel Years In Box",
        phoneNumber: "+5511937474703"
      },
      conversation: {
        inboxId: 46,
        conversationId: 23266,
        displayId: 1608,
        labels: "lead, google, produto-xpto, nova-tag"
      }
    }
  }, null, 2));
  
  const [pendingMessagesPayload, setPendingMessagesPayload] = useState(JSON.stringify({
    data: {
      instanceId: "optional-instance-id-here" // Opcional - pode filtrar por instância
    }
  }, null, 2));
  
  const [deliveryStatusPayload, setDeliveryStatusPayload] = useState(JSON.stringify({
    data: {
      messageId: "message-uuid-here",
      status: "success", // ou "failed"
      attempts: 1 // opcional - número de tentativas
    }
  }, null, 2));
  
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const invokeFunction = async (functionName: string, payload: string) => {
    try {
      setLoading(true);
      setResponse("");
      setLogs([]);
      
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (e) {
        toast.error("Payload inválido. Verifique o formato JSON.");
        return;
      }

      console.log(`Chamando função ${functionName} com payload:`, parsedPayload);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: parsedPayload,
      });

      if (error) {
        console.error(`Erro na chamada da função ${functionName}:`, error);
        setResponse(`Erro: ${error.message || JSON.stringify(error)}`);
        toast.error(`Erro ao chamar ${functionName}: ${error.message}`);
        return;
      }

      console.log(`Resposta de ${functionName}:`, data);
      setResponse(JSON.stringify(data, null, 2));
      
      // Extrair logs da resposta, se disponíveis
      if (data && data.logs) {
        setLogs(data.logs);
      }
      
      toast.success(`Chamada para ${functionName} concluída com sucesso!`);
    } catch (err) {
      console.error(`Erro ao invocar ${functionName}:`, err);
      setResponse(`Erro: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Erro ao chamar ${functionName}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Testador de APIs</CardTitle>
        <CardDescription>
          Teste as APIs do sistema diretamente pela interface
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tag-change">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="tag-change">Tag Change</TabsTrigger>
            <TabsTrigger value="pending-messages">Pending Messages</TabsTrigger>
            <TabsTrigger value="delivery-status">Delivery Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tag-change" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              Esta API recebe alterações de tags de um contato do Chatwoot e as processa para o Master Sequence.
            </div>
            <Textarea 
              value={tagChangePayload} 
              onChange={(e) => setTagChangePayload(e.target.value)}
              className="font-mono h-64"
              placeholder="Payload para tag-change"
            />
            <Button 
              onClick={() => invokeFunction('tag-change', tagChangePayload)} 
              disabled={loading}
            >
              {loading ? "Processando..." : "Enviar para tag-change"}
            </Button>
          </TabsContent>
          
          <TabsContent value="pending-messages" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              Esta API retorna as mensagens pendentes para envio (agendadas para antes do horário atual).
              O N8N deve chamar esta API periodicamente para buscar as mensagens a serem enviadas.
            </div>
            <Textarea 
              value={pendingMessagesPayload} 
              onChange={(e) => setPendingMessagesPayload(e.target.value)}
              className="font-mono h-64"
              placeholder="Payload para pending-messages"
            />
            <Button 
              onClick={() => invokeFunction('pending-messages', pendingMessagesPayload)} 
              disabled={loading}
            >
              {loading ? "Processando..." : "Enviar para pending-messages"}
            </Button>
          </TabsContent>
          
          <TabsContent value="delivery-status" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              Esta API recebe o status de entrega de uma mensagem e a processa, avançando o contato na sequência
              se a entrega foi bem-sucedida ou tratando falhas conforme necessário.
            </div>
            <Textarea 
              value={deliveryStatusPayload} 
              onChange={(e) => setDeliveryStatusPayload(e.target.value)}
              className="font-mono h-64"
              placeholder="Payload para delivery-status"
            />
            <Button 
              onClick={() => invokeFunction('delivery-status', deliveryStatusPayload)} 
              disabled={loading}
            >
              {loading ? "Processando..." : "Enviar para delivery-status"}
            </Button>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Resposta:</h3>
          <div className="bg-secondary/50 p-4 rounded-md overflow-auto max-h-64">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {response || "Nenhuma resposta ainda..."}
            </pre>
          </div>
        </div>
        
        {logs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Logs:</h3>
            <div className="bg-secondary/50 p-4 rounded-md overflow-auto max-h-96">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className={`${log.level === 'error' ? 'text-red-500' : ''}`}>
                    {log.message}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
