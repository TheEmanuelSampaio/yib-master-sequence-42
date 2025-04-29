
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clipboard, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function ApiDocs() {
  const [copiedTabs, setCopiedTabs] = useState<{ [key: string]: boolean }>({});

  const copyToClipboard = (text: string, tabId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTabs({ ...copiedTabs, [tabId]: true });
    setTimeout(() => {
      setCopiedTabs({ ...copiedTabs, [tabId]: false });
    }, 2000);
  };

  const apiUrl = window.location.origin.includes('localhost') 
    ? 'https://mlwcupyfhtxdxcybwbmg.supabase.co/functions/v1'
    : window.location.origin.includes('vercel') || window.location.origin.includes('netlify')
      ? 'https://mlwcupyfhtxdxcybwbmg.supabase.co/functions/v1'
      : `${window.location.origin}/api`;

  const tagChangePayload = `{
  "data": {
    "accountId": 1,
    "accountName": "Years In Box",
    "contact": {
      "id": 16087,
      "name": "Emanuel Years In Box",
      "phoneNumber": "+5511937474703"
    },
    "conversation": {
      "inboxId": 46,
      "conversationId": 23266,
      "displayId": 1608,
      "labels": "lead, google, produto-xpto"
    }
  }
}`;

  const deliveryStatusPayload = `{
  "messageId": "your-message-id",
  "status": "success"
}`;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Documentação de API</h1>
        <p className="text-muted-foreground">
          Documentação completa dos endpoints disponíveis para integração com o Master Sequence
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
          <CardDescription>URL base para todos os endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-md flex justify-between items-center">
            <code className="text-sm">{apiUrl}</code>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(apiUrl, 'baseurl')}
            >
              {copiedTabs['baseurl'] ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="tag-change">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tag-change">Tag Change</TabsTrigger>
          <TabsTrigger value="pending-messages">Pending Messages</TabsTrigger>
          <TabsTrigger value="delivery-status">Delivery Status</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tag-change" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint: Tag Change</CardTitle>
              <CardDescription>
                Esse endpoint é chamado quando as tags de um contato são alteradas no Chatwoot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">URL</h3>
                <div className="p-4 bg-muted rounded-md flex justify-between items-center">
                  <code className="text-sm">{`${apiUrl}/tag-change`}</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(`${apiUrl}/tag-change`, 'tag-change-url')}
                  >
                    {copiedTabs['tag-change-url'] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Método</h3>
                <div className="p-1 px-3 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-md inline-block">
                  <code>POST</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Payload</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(tagChangePayload, 'tag-change-payload')}
                  >
                    {copiedTabs['tag-change-payload'] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-md overflow-auto text-sm whitespace-pre">
                  {tagChangePayload}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Resposta</h3>
                <pre className="p-4 bg-muted rounded-md overflow-auto text-sm whitespace-pre">
                  {`{
  "success": true,
  "message": "Contact processed successfully",
  "contact": {
    "id": "16087",
    "name": "Emanuel Years In Box",
    "tags": ["lead", "google", "produto-xpto"]
  }
}`}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Descrição</h3>
                <p className="text-muted-foreground">
                  Este endpoint recebe dados do N8N quando tags são editadas no Chatwoot. 
                  Com base nas tags, o sistema verifica se o contato deve ser adicionado a uma ou mais sequências. 
                  Se as condições forem atendidas, o contato será inserido na sequência e a primeira mensagem será agendada.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending-messages" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint: Pending Messages</CardTitle>
              <CardDescription>
                Esse endpoint retorna as mensagens agendadas que estão prontas para serem enviadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">URL</h3>
                <div className="p-4 bg-muted rounded-md flex justify-between items-center">
                  <code className="text-sm">{`${apiUrl}/pending-messages`}</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(`${apiUrl}/pending-messages`, 'pending-messages-url')}
                  >
                    {copiedTabs['pending-messages-url'] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Método</h3>
                <div className="p-1 px-3 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-md inline-block">
                  <code>GET</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Resposta</h3>
                <pre className="p-4 bg-muted rounded-md overflow-auto text-sm whitespace-pre">
                  {`{
  "success": true,
  "messages": [
    {
      "id": "message-uuid",
      "chatwootData": {
        "accountData": {
          "accountId": 1,
          "accountName": "Years In Box"
        },
        "contactData": {
          "id": "16087",
          "name": "Emanuel Years In Box",
          "phoneNumber": "+5511937474703"
        },
        "conversation": {
          "inboxId": 46,
          "conversationId": 23266,
          "displayId": 1608,
          "labels": "lead, google, produto-xpto"
        }
      },
      "instanceData": {
        "id": "instance-uuid",
        "name": "Whatsapp Bot",
        "evolutionApiUrl": "https://api.example.com",
        "apiKey": "your-api-key"
      },
      "sequenceData": {
        "instanceName": "Whatsapp Bot",
        "sequenceName": "Sequência de Boas-vindas",
        "type": "message",
        "stage": {
          "stg1": {
            "id": "stage-uuid",
            "content": "Olá ${name}, seja bem-vindo!",
            "rawScheduledTime": "2025-04-29T22:00:00Z",
            "scheduledTime": "2025-04-29T22:00:00Z"
          }
        }
      }
    }
  ]
}`}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Descrição</h3>
                <p className="text-muted-foreground">
                  Este endpoint é chamado pelo N8N a cada 5 minutos para verificar se existem mensagens pendentes de envio. 
                  Ele retorna todas as mensagens que estão agendadas para o momento atual ou anterior. 
                  Ao receber estas mensagens, o N8N deve processá-las e enviar o resultado para o endpoint de status de entrega.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="delivery-status" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint: Delivery Status</CardTitle>
              <CardDescription>
                Esse endpoint recebe o status de entrega de uma mensagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">URL</h3>
                <div className="p-4 bg-muted rounded-md flex justify-between items-center">
                  <code className="text-sm">{`${apiUrl}/delivery-status`}</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(`${apiUrl}/delivery-status`, 'delivery-status-url')}
                  >
                    {copiedTabs['delivery-status-url'] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Método</h3>
                <div className="p-1 px-3 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-md inline-block">
                  <code>POST</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Payload</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(deliveryStatusPayload, 'delivery-status-payload')}
                  >
                    {copiedTabs['delivery-status-payload'] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-md overflow-auto text-sm whitespace-pre">
                  {deliveryStatusPayload}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Resposta</h3>
                <pre className="p-4 bg-muted rounded-md overflow-auto text-sm whitespace-pre">
                  {`{
  "success": true
}`}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Descrição</h3>
                <p className="text-muted-foreground">
                  Este endpoint recebe o status de entrega de uma mensagem após o N8N processá-la. 
                  Se a entrega for bem-sucedida, o sistema avança o contato para o próximo estágio da sequência e agenda a próxima mensagem. 
                  Em caso de falha, o sistema marca a mensagem para reenvio, até um máximo de 3 tentativas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Configuração do N8N</CardTitle>
          <CardDescription>
            Passos para configurar o N8N para trabalhar com o Master Sequence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Trigger inicial (Chatwoot)</h3>
            <p className="text-muted-foreground">
              Configure um webhook no Chatwoot ou um trigger de banco de dados PostgreSQL para 
              enviar os dados para o endpoint <code>tag-change</code> quando as tags de um contato forem alteradas.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">CRON de verificação de mensagens</h3>
            <p className="text-muted-foreground">
              Configure um CRON para executar a cada 5 minutos que faz uma requisição para o endpoint 
              <code>pending-messages</code> e processa as mensagens retornadas, enviando-as através da 
              Evolution API. Após o envio, notifique o resultado para o endpoint <code>delivery-status</code>.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Tratamento de tipos de mensagem</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                <strong>message:</strong> Enviar o conteúdo diretamente como mensagem de texto.
              </li>
              <li>
                <strong>pattern:</strong> Processar o padrão para determinar o tipo de conteúdo (imagem, documento, etc.).
              </li>
              <li>
                <strong>typebot:</strong> Disparar o fluxo do typebot fornecido no content, passando o valor do estágio (stg1, stg2, etc.) para o switch inicial.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
