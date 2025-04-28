
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const tagChangePayload = `{
  "body": {
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
  }
}`;

const tagChangeResponse = `{
  "status": "success",
  "message": "Tag change processed successfully"
}`;

const pendingMessagesResponse = `[
  {
    "messageId": "msg-12345",
    "chatwootData": {
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
    },
    "instanceData": {
      "name": "Instância Principal",
      "evolutionApiUrl": "https://evolution-api.example.com",
      "apiKey": "api-key-12345"
    },
    "sequenceData": {
      "instanceName": "Instância Principal",
      "sequenceName": "Sequência de Boas-vindas",
      "type": "message",
      "stage": {
        "id": "stage-1",
        "content": "Olá, bem-vindo à nossa comunidade! Estamos felizes em te ter aqui.",
        "rawScheduledTime": "2023-04-28T14:30:00.000Z",
        "scheduledTime": "2023-04-28T14:30:00.000Z"
      }
    }
  }
]`;

const deliverySuccessPayload = `{
  "messageId": "msg-12345",
  "success": true
}`;

const deliveryFailPayload = `{
  "messageId": "msg-12345",
  "success": false
}`;

const deliveryResponse = `{
  "status": "success",
  "message": "Message delivery successful"
}`;

export default function ApiDocs() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Documentação da API</h1>
        <p className="text-muted-foreground">
          Referência completa dos endpoints disponíveis no Master Sequence
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
          <CardDescription>
            O Master Sequence oferece os seguintes endpoints para integração com o N8N e outras ferramentas:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Gerenciamento de Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Recebe notificações quando tags são alteradas no Chatwoot e inicia sequências conforme necessário.
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recuperação de Mensagens</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Fornece mensagens agendadas pendentes para serem processadas pelo N8N.
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Confirmação de Entrega</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Recebe confirmações de sucesso ou falha na entrega das mensagens.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="pt-4">
              <h3 className="text-lg font-semibold mb-2">Fluxo de Trabalho</h3>
              <ol className="space-y-2 text-sm">
                <li className="border-l-2 border-primary pl-4 py-1">
                  <span className="font-medium">1.</span> O Chatwoot atualiza tags para um contato
                </li>
                <li className="border-l-2 border-primary pl-4 py-1">
                  <span className="font-medium">2.</span> Um trigger do Postgres notifica o N8N
                </li>
                <li className="border-l-2 border-primary pl-4 py-1">
                  <span className="font-medium">3.</span> O N8N envia um POST para <code className="text-xs px-1 bg-secondary rounded">/api/tag-change</code>
                </li>
                <li className="border-l-2 border-primary pl-4 py-1">
                  <span className="font-medium">4.</span> O Master Sequence processa as condições de tags e agenda mensagens
                </li>
                <li className="border-l-2 border-primary pl-4 py-1">
                  <span className="font-medium">5.</span> O N8N faz polling a cada 5 minutos para <code className="text-xs px-1 bg-secondary rounded">/api/pending-messages</code>
                </li>
                <li className="border-l-2 border-primary pl-4 py-1">
                  <span className="font-medium">6.</span> O N8N envia as mensagens e notifica o resultado através de <code className="text-xs px-1 bg-secondary rounded">/api/delivery-success</code> ou <code className="text-xs px-1 bg-secondary rounded">/api/delivery-fail</code>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <div className="flex items-center">
                <Badge className="mr-2 bg-green-600">POST</Badge>
                <span>/api/tag-change</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="description">
                <TabsList className="mb-4">
                  <TabsTrigger value="description">Descrição</TabsTrigger>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                <TabsContent value="description">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Descrição</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Este endpoint processa alterações de tags provenientes do Chatwoot via N8N. Ele verifica 
                        condições de início e parada para determinar se um contato deve ser adicionado 
                        ou removido de sequências.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Casos de Uso</h4>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1 space-y-1">
                        <li>Iniciar uma sequência para um novo lead</li>
                        <li>Mover um contato para uma sequência de up-sell</li>
                        <li>Remover um contato de uma sequência quando ele se converter</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="request">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Headers</h4>
                      <div className="mt-2 text-sm">
                        <div className="bg-secondary p-3 rounded">
                          <div><span className="font-mono text-xs">Content-Type:</span> application/json</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">Payload</h4>
                      <div className="mt-2 text-sm">
                        <pre className="bg-secondary p-3 rounded overflow-x-auto">
                          <code className="text-xs">{tagChangePayload}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="response">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Resposta de Sucesso (200 OK)</h4>
                      <div className="mt-2 text-sm">
                        <pre className="bg-secondary p-3 rounded overflow-x-auto">
                          <code className="text-xs">{tagChangeResponse}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>
              <div className="flex items-center">
                <Badge className="mr-2 bg-blue-600">GET</Badge>
                <span>/api/pending-messages</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="description">
                <TabsList className="mb-4">
                  <TabsTrigger value="description">Descrição</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                <TabsContent value="description">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Descrição</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Este endpoint recupera todas as mensagens agendadas cujo horário programado já tenha passado.
                        O N8N verifica este endpoint a cada 5 minutos para processar mensagens pendentes.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Notas</h4>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1 space-y-1">
                        <li>O endpoint marca automaticamente as mensagens como "processing"</li>
                        <li>Inclui toda a informação necessária para o N8N enviar a mensagem</li>
                        <li>Dados da instância como URL e API key são incluídos</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="response">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Resposta de Sucesso (200 OK)</h4>
                      <div className="mt-2 text-sm">
                        <pre className="bg-secondary p-3 rounded overflow-x-auto">
                          <code className="text-xs">{pendingMessagesResponse}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>
              <div className="flex items-center">
                <Badge className="mr-2 bg-green-600">POST</Badge>
                <span>/api/delivery-success</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="description">
                <TabsList className="mb-4">
                  <TabsTrigger value="description">Descrição</TabsTrigger>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                <TabsContent value="description">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Descrição</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Este endpoint confirma a entrega bem-sucedida de uma mensagem. Ele marca a mensagem como 
                        enviada e programa o próximo estágio da sequência, se houver.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Ações</h4>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1 space-y-1">
                        <li>Atualiza o status da mensagem para "sent"</li>
                        <li>Registra a data/hora do envio</li>
                        <li>Avança o contato para o próximo estágio da sequência</li>
                        <li>Marca a sequência como concluída quando todos os estágios forem enviados</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="request">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Headers</h4>
                      <div className="mt-2 text-sm">
                        <div className="bg-secondary p-3 rounded">
                          <div><span className="font-mono text-xs">Content-Type:</span> application/json</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">Payload</h4>
                      <div className="mt-2 text-sm">
                        <pre className="bg-secondary p-3 rounded overflow-x-auto">
                          <code className="text-xs">{deliverySuccessPayload}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="response">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Resposta de Sucesso (200 OK)</h4>
                      <div className="mt-2 text-sm">
                        <pre className="bg-secondary p-3 rounded overflow-x-auto">
                          <code className="text-xs">{deliveryResponse}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>
              <div className="flex items-center">
                <Badge className="mr-2 bg-green-600">POST</Badge>
                <span>/api/delivery-fail</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="description">
                <TabsList className="mb-4">
                  <TabsTrigger value="description">Descrição</TabsTrigger>
                  <TabsTrigger value="request">Request</TabsTrigger>
                </TabsList>
                <TabsContent value="description">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Descrição</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Este endpoint registra uma falha na entrega de uma mensagem. Ele marca a mensagem 
                        para nova tentativa até um limite de tentativas ser atingido.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Ações</h4>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1 space-y-1">
                        <li>Incrementa o contador de tentativas</li>
                        <li>Marca a mensagem como "failed" para nova tentativa</li>
                        <li>Após 3 tentativas, marca como "persistent_error"</li>
                        <li>Atualiza estatísticas de falhas</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="request">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Headers</h4>
                      <div className="mt-2 text-sm">
                        <div className="bg-secondary p-3 rounded">
                          <div><span className="font-mono text-xs">Content-Type:</span> application/json</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">Payload</h4>
                      <div className="mt-2 text-sm">
                        <pre className="bg-secondary p-3 rounded overflow-x-auto">
                          <code className="text-xs">{deliveryFailPayload}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
