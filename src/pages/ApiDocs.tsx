
import { ApiTester } from "@/components/api/ApiTester";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ApiDocs = () => {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Documentação da API</h1>
        <p className="text-muted-foreground">
          Esta página fornece documentação e ferramentas para testar a API do Master Sequence.
        </p>
      </div>

      <Tabs defaultValue="docs">
        <TabsList>
          <TabsTrigger value="docs">Documentação</TabsTrigger>
          <TabsTrigger value="tester">Testador</TabsTrigger>
        </TabsList>
        
        <TabsContent value="docs" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>API Tag Change</CardTitle>
              <CardDescription>
                Endpoint para processar mudanças de tags/etiquetas dos contatos no Chatwoot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Endpoint</h3>
                <code className="bg-muted rounded p-1">POST /tag-change</code>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Payload</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
{`{
  "data": {
    "accountData": {
      "accountId": 1,
      "accountName": "Years In Box"
    },
    "contactData": {
      "id": 16087,
      "name": "Emanuel Years In Box",
      "phoneNumber": "+5511937474703"
    },
    "conversationData": {
      "inboxId": 46,
      "conversationId": 23266,
      "displayId": 1608,
      "labels": "lead, google, produto-xpto"
    }
  }
}`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Resposta</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
{`{
  "success": true,
  "message": "Contato processado com sucesso",
  "stats": {
    "tagsAdded": 3,
    "existingTags": 0,
    "tagErrors": 0
  },
  "client": {
    "id": "uuid-do-cliente",
    "accountName": "Years In Box",
    "creatorId": "uuid-do-usuário",
    "creatorName": "Nome do Usuário"
  },
  "contact": {
    "id": "16087",
    "name": "Emanuel Years In Box",
    "tags": ["lead", "google", "produto-xpto"]
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>API Pending Messages</CardTitle>
              <CardDescription>
                Endpoint para recuperar mensagens agendadas com horário de envio pendente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Endpoint</h3>
                <code className="bg-muted rounded p-1">GET /pending-messages</code>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Resposta</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
{`{
  "messages": [
    {
      "id": "uuid-da-mensagem",
      "chatwootData": { ... },
      "instanceData": { ... },
      "sequenceData": {
        "instanceName": "Nome da instância",
        "sequenceName": "Sequência de exemplo",
        "type": "message",
        "stage": {
          "stg1": {
            "id": 998,
            "content": "Mensagem de exemplo",
            "rawScheduledTime": "2023-09-01T10:00:00Z",
            "scheduledTime": "2023-09-01T10:00:00Z"
          }
        }
      }
    }
  ]
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>API Delivery Status</CardTitle>
              <CardDescription>
                Endpoint para atualizar o status de entrega de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Endpoint</h3>
                <code className="bg-muted rounded p-1">POST /delivery-status</code>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Payload</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
{`{
  "messageId": "uuid-da-mensagem",
  "success": true,
  "error": "Erro opcional em caso de falha"
}`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Resposta</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
{`{
  "success": true,
  "message": "Status de entrega atualizado com sucesso"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tester" className="pt-4">
          <ApiTester />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiDocs;
