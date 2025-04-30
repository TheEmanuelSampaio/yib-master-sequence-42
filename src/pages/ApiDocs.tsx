
import { ApiTester } from "@/components/api/ApiTester";

const ApiDocs = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Documentação da API</h1>
        <p className="text-muted-foreground mt-2">
          Teste e integre as APIs do Master Sequence
        </p>
      </div>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Visão Geral</h2>
          <p className="mb-4">
            O Master Sequence oferece endpoints para integração com o Chatwoot e o N8N, permitindo
            o processamento de contatos e o gerenciamento de sequências de mensagens.
          </p>
          <div className="bg-secondary/50 p-4 rounded-md">
            <h3 className="font-medium mb-2">Base URL</h3>
            <code className="text-sm font-mono">
              https://mlwcupyfhtxdxcybwbmg.supabase.co/functions/v1/
            </code>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Endpoints</h2>
          
          <div className="space-y-6">
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">POST /tag-change</h3>
              <p className="mb-2 text-muted-foreground">
                Processa mudanças de tags em um contato e verifica se ele deve entrar em alguma sequência.
              </p>
              <div className="bg-secondary/50 p-4 rounded-md mb-4">
                <h4 className="text-sm font-medium mb-1">Payload</h4>
                <pre className="text-sm font-mono whitespace-pre-wrap">
{`{
  "data": {
    "accountId": 1,
    "accountName": "Nome da Conta",
    "contact": {
      "id": 12345,
      "name": "Nome do Contato",
      "phoneNumber": "+5511999999999"
    },
    "conversation": {
      "inboxId": 46,
      "conversationId": 23266,
      "displayId": 1608,
      "labels": "tag1, tag2, tag3"
    }
  }
}`}
                </pre>
              </div>
              <div className="bg-secondary/50 p-4 rounded-md">
                <h4 className="text-sm font-medium mb-1">Resposta (Sucesso)</h4>
                <pre className="text-sm font-mono whitespace-pre-wrap">
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
    "accountName": "Nome da Conta",
    "accountId": 1,
    "requestedAccountId": 1,
    "isExactMatch": true
  },
  "contact": {
    "id": "12345",
    "name": "Nome do Contato",
    "tags": ["tag1", "tag2", "tag3"]
  }
}`}
                </pre>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">POST /pending-messages</h3>
              <p className="mb-2 text-muted-foreground">
                Retorna mensagens pendentes de envio que estão agendadas para serem enviadas.
              </p>
              <div className="bg-secondary/50 p-4 rounded-md mb-4">
                <h4 className="text-sm font-medium mb-1">Payload</h4>
                <pre className="text-sm font-mono whitespace-pre-wrap">
{`{
  "data": {
    // Filtragem opcional
  }
}`}
                </pre>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">POST /delivery-status</h3>
              <p className="mb-2 text-muted-foreground">
                Atualiza o status de entrega de uma mensagem enviada.
              </p>
              <div className="bg-secondary/50 p-4 rounded-md mb-4">
                <h4 className="text-sm font-medium mb-1">Payload</h4>
                <pre className="text-sm font-mono whitespace-pre-wrap">
{`{
  "data": {
    "messageId": "uuid-da-mensagem",
    "status": "delivered" // ou "failed"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
        
        <ApiTester />
      </div>
    </div>
  );
};

export default ApiDocs;
