
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Code,
  Copy,
  Terminal,
  SquareArrowOutUpRight,
  ArrowRightLeft,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

const apiBaseUrl = "https://mlwcupyfhtxdxcybwbmg.supabase.co/functions/v1";

const endpoints = [
  {
    id: "tag-change",
    name: "Tag Change",
    url: `${apiBaseUrl}/tag-change`,
    method: "POST",
    description: "Endpoint para adicionar um contato quando recebe dados do Chatwoot.",
    requestExample: {
      body: {
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
            labels: "lead, google, produto-xpto"
          }
        }
      }
    },
    responseExample: {
      success: true,
      message: "Contact processed successfully",
      contact: {
        id: "16087",
        name: "Emanuel Years In Box",
        tags: ["lead", "google", "produto-xpto"]
      }
    }
  },
  {
    id: "pending-messages",
    name: "Pending Messages",
    url: `${apiBaseUrl}/pending-messages`,
    method: "GET",
    description: "Recupera mensagens pendentes que estão prontas para serem enviadas.",
    requestExample: {},
    responseExample: {
      message: "Processed 1 pending messages",
      data: [
        {
          id: "b7d8f235-a1c2-4e8b-9c3d-5f6g7h8i9j0k",
          chatwootData: {
            accountData: {
              accountId: "client-uuid",
              accountName: "Instance Name"
            },
            contactData: {
              id: "16087",
              name: "Emanuel Years In Box",
              phoneNumber: "+5511937474703"
            },
            conversation: {
              inboxId: 46,
              conversationId: 23266,
              displayId: 1608,
              labels: "lead, google, produto-xpto"
            }
          },
          instanceData: {
            id: "instance-uuid",
            name: "Instance Name",
            evolutionApiUrl: "https://evolution-api.example.com",
            apiKey: "your-api-key"
          },
          sequenceData: {
            instanceName: "Instance Name",
            sequenceName: "Lead Nurturing",
            type: "message",
            stage: {
              stg1: {
                id: "stage-uuid",
                content: "Olá {name}, como vai?",
                rawScheduledTime: "2023-04-30T10:00:00Z",
                scheduledTime: "2023-04-30T10:00:00Z"
              }
            }
          }
        }
      ]
    }
  },
  {
    id: "delivery-status",
    name: "Delivery Status",
    url: `${apiBaseUrl}/delivery-status`,
    method: "POST",
    description: "Atualiza o status de entrega de uma mensagem.",
    requestExample: {
      messageId: "b7d8f235-a1c2-4e8b-9c3d-5f6g7h8i9j0k",
      status: "success",
      attempts: 1
    },
    responseExample: {
      success: true,
      message: "Message marked as sent successfully",
      messageId: "b7d8f235-a1c2-4e8b-9c3d-5f6g7h8i9j0k"
    }
  }
];

export default function ApiDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0].id);
  const { toast } = useToast();

  const currentEndpoint = endpoints.find(e => e.id === selectedEndpoint);

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${description} foi copiado para a área de transferência.`,
      duration: 3000,
    });
  };

  const handleCopyUrl = () => {
    if (currentEndpoint) {
      copyToClipboard(currentEndpoint.url, "URL da API");
    }
  };

  const handleCopyExample = (type: 'request' | 'response') => {
    if (currentEndpoint) {
      copyToClipboard(
        JSON.stringify(
          type === 'request' 
            ? currentEndpoint.requestExample 
            : currentEndpoint.responseExample, 
          null, 2
        ),
        type === 'request' ? "Exemplo de requisição" : "Exemplo de resposta"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Documentação da API</h1>
        <p className="text-muted-foreground">
          Endpoints disponíveis para integração com serviços externos.
        </p>
      </div>

      <Tabs defaultValue={endpoints[0].id} value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
        <TabsList className="mb-4">
          {endpoints.map(endpoint => (
            <TabsTrigger key={endpoint.id} value={endpoint.id} className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              {endpoint.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {endpoints.map(endpoint => (
          <TabsContent key={endpoint.id} value={endpoint.id} className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <span className={`
                        px-2 py-1 text-xs font-bold rounded
                        ${endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${endpoint.method === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                      `}>
                        {endpoint.method}
                      </span>
                      {endpoint.name}
                    </CardTitle>
                    <CardDescription className="mt-2">{endpoint.description}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar URL
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    URL do Endpoint
                  </div>
                  <div className="relative">
                    <div className="bg-muted rounded-md p-3 text-sm font-mono overflow-auto">
                      {endpoint.url}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-1.5 right-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(endpoint.url, '_blank')}
                    >
                      <SquareArrowOutUpRight className="h-4 w-4" />
                      <span className="sr-only">Abrir em uma nova aba</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Exemplo de Requisição
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyExample('request')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="sr-only">Copiar exemplo</span>
                      </Button>
                    </div>
                    <div className="bg-muted rounded-md p-3 text-sm font-mono overflow-auto max-h-[400px]">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(endpoint.requestExample, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-semibold text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Exemplo de Resposta
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyExample('response')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="sr-only">Copiar exemplo</span>
                      </Button>
                    </div>
                    <div className="bg-muted rounded-md p-3 text-sm font-mono overflow-auto max-h-[400px]">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(endpoint.responseExample, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
