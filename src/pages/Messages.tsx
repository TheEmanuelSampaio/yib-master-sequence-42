import { useState, useMemo } from "react";
import { useApp } from '@/context/AppContext';
import { Search, Filter, Calendar, CheckCircle, XCircle, AlertCircle, MessageCircle, FileCode, Bot, Clock, Hourglass, XOctagon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type MessageStatus = 'waiting' | 'pending' | 'processing' | 'sent' | 'failed' | 'persistent_error';

// Function to get the message status icon and color
function getMessageStatusInfo(status: string) {
  switch (status) {
    case 'waiting':
      return {
        icon: <Hourglass className="h-4 w-4" />,
        color: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30"
      };
    case 'pending':
      return {
        icon: <Clock className="h-4 w-4" />,
        color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
      };
    case 'processing':
      return {
        icon: <Clock className="h-4 w-4" />,
        color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
      };
    case 'sent':
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        color: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
      };
    case 'failed':
      return {
        icon: <Hourglass className="h-4 w-4" />,
        color: "bg-neutral-500/20 text-neutral-700 dark:text-neutral-400 border-neutral-500/30"
      };
    case 'persistent_error':
      return {
        icon: <XOctagon className="h-4 w-4" />,
        color: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
      };
    default:
      return {
        icon: <MessageCircle className="h-4 w-4" />,
        color: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30"
      };
  }
}

export default function Messages() {
  const { scheduledMessages, contacts, sequences, contactSequences } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    const messagesWithDetails = scheduledMessages.map(message => {
      const contact = contacts.find(c => c.id === message.contactId);
      const sequence = sequences.find(s => s.id === message.sequenceId);
      const stage = sequence?.stages.find(s => s.id === message.stageId);
      
      // Add waiting status if the scheduled time is in the future
      let status = message.status;
      if (status === 'pending') {
        if (new Date(message.scheduledTime) > new Date()) {
          status = 'waiting';
        }
      }
      
      return {
        ...message,
        status,
        contactName: contact?.name || "Desconhecido",
        contactPhone: contact?.phoneNumber || "",
        sequenceName: sequence?.name || "Desconhecida",
        stageName: stage?.name || "Desconhecido",
        stageType: stage?.type || "message",
        content: stage?.content || "",
      };
    });
    
    return messagesWithDetails.filter(message => {
      // If we have status filters and the message status is not in the filter list
      if (statusFilter && !statusFilter.includes(message.status as MessageStatus)) {
        return false;
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          message.contactName.toLowerCase().includes(searchLower) ||
          message.contactPhone.includes(searchLower) ||
          message.sequenceName.toLowerCase().includes(searchLower) ||
          message.stageName.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [scheduledMessages, contacts, searchTerm, statusFilter]);
  
  // Pagination
  const pageCount = Math.ceil(filteredMessages.length / itemsPerPage);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSequenceTypeForStage = (sequenceId: string): "message" | "pattern" | "typebot" => {
    const sequence = sequences.find(seq => seq.id === sequenceId);
    return sequence?.type || "message";
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Mensagens Agendadas</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie as mensagens agendadas e enviadas
        </p>
      </div>
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
          <Button variant="ghost" className="h-9 px-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex space-x-1">
                <Filter className="h-4 w-4" />
                <span>Filtrar por Status</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Status da Mensagem</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="waiting" 
                      checked={statusFilter === 'waiting'} 
                      onCheckedChange={() => setStatusFilter('waiting')}
                    />
                    <label htmlFor="waiting" className="text-sm">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                        <Hourglass className="h-3 w-3 mr-1" />
                        Aguardando
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pending" 
                      checked={statusFilter === 'pending'} 
                      onCheckedChange={() => setStatusFilter('pending')}
                    />
                    <label htmlFor="pending" className="text-sm">
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="processing" 
                      checked={statusFilter === 'processing'} 
                      onCheckedChange={() => setStatusFilter('processing')}
                    />
                    <label htmlFor="processing" className="text-sm">
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Processando
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sent" 
                      checked={statusFilter === 'sent'} 
                      onCheckedChange={() => setStatusFilter('sent')}
                    />
                    <label htmlFor="sent" className="text-sm">
                      <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enviada
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="failed" 
                      checked={statusFilter === 'failed'} 
                      onCheckedChange={() => setStatusFilter('failed')}
                    />
                    <label htmlFor="failed" className="text-sm">
                      <Badge variant="outline" className="bg-neutral-500/20 text-neutral-700 dark:text-neutral-400 border-neutral-500/30">
                        <Hourglass className="h-3 w-3 mr-1" />
                        Falhou
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="persistent_error" 
                      checked={statusFilter === 'persistent_error'} 
                      onCheckedChange={() => setStatusFilter('persistent_error')}
                    />
                    <label htmlFor="persistent_error" className="text-sm">
                      <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                        <XOctagon className="h-3 w-3 mr-1" />
                        Erro Persistente
                      </Badge>
                    </label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle>Mensagens Agendadas</CardTitle>
          <CardDescription>
            Total: {filteredMessages.length} mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter
                  ? "Nenhuma mensagem encontrada com os filtros aplicados"
                  : "Nenhuma mensagem agendada no momento"}
              </p>
              {(searchTerm || statusFilter) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter(null);
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Contato</TableHead>
                    <TableHead>Sequência</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Agendada para</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMessages.map((message) => {
                    const contact = contacts.find(c => c.id === message.contactId);
                    const sequence = sequences.find(s => s.id === message.sequenceId);
                    const stage = sequence?.stages.find(s => s.id === message.stageId);
                    const sequenceType = getSequenceTypeForStage(message.sequenceId);
                    const { icon: StatusIcon, color } = getMessageStatusInfo(message.status);
                    
                    return (
                      <TableRow key={message.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <StatusIcon className={`h-4 w-4 ${color}`} />
                            <span>
                              {contact?.name || "Contato desconhecido"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {sequenceType === "message" ? (
                              <MessageCircle className="h-4 w-4 inline-block mr-1" />
                            ) : sequenceType === "pattern" ? (
                              <FileCode className="h-4 w-4 inline-block mr-1" />
                            ) : (
                              <Bot className="h-4 w-4 inline-block mr-1" />
                            )}
                            <span>{sequence?.name || "Sequência desconhecida"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{stage?.name || "Estágio desconhecido"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex flex-col">
                            <span>
                              {formatDistanceToNow(new Date(message.scheduledTime), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(message.scheduledTime)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              message.status === "sent" && "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
                              message.status === "pending" && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
                              message.status === "waiting" && "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
                              message.status === "processing" && "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
                              message.status === "failed" && "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
                              message.status === "persistent_error" && "bg-red-700/20 text-red-900 dark:text-red-300 border-red-700/30"
                            )}
                          >
                            {message.status === "pending"
                              ? "Pendente"
                              : message.status === "sent"
                              ? "Enviada"
                              : message.status === "waiting"
                              ? "Aguardando"
                              : message.status === "processing"
                              ? "Processando"
                              : message.status === "failed"
                              ? "Falha"
                              : message.status === "persistent_error"
                              ? "Erro persistente"
                              : message.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {message.attempts > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {message.attempts} tentativa{message.attempts > 1 && 's'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewMessage(message)}
                          >
                            Ver Conteúdo
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm">
                Página {currentPage} de {pageCount}
              </span>
              <Button
                variant="ghost"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pageCount}
              >
                Próximo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showMessageContent} onOpenChange={setShowMessageContent}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedMessage?.stageType === "message" && <MessageCircle className="h-5 w-5 mr-2" />}
              {selectedMessage?.stageType === "pattern" && <FileCode className="h-5 w-5 mr-2" />}
              {selectedMessage?.stageType === "typebot" && <Bot className="h-5 w-5 mr-2" />}
              {selectedMessage?.stageName}
            </DialogTitle>
            <DialogDescription>
              {selectedMessage?.sequenceName} para {selectedMessage?.contactName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Status</h4>
                <StatusBadge status={selectedMessage?.status || ""} />
                {selectedMessage?.attempts > 0 && (
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">
                      {selectedMessage?.attempts} tentativa{selectedMessage?.attempts > 1 && 's'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Agendada para</h4>
                <div className="text-sm">
                  {selectedMessage?.scheduledTime ? formatDate(selectedMessage?.scheduledTime) : ""}
                </div>
                {selectedMessage?.sentAt && (
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">
                      Enviada em: {formatDate(selectedMessage?.sentAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Tipo de Conteúdo</h4>
              <Badge variant="outline" className={cn(
                "flex items-center px-1.5 text-xs",
                selectedMessage?.stageType === "message" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
                selectedMessage?.stageType === "pattern" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
                selectedMessage?.stageType === "typebot" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
              )}>
                {getStageTypeIcon(selectedMessage?.stageType || "message")}
                <span className="ml-1 capitalize">{selectedMessage?.stageType}</span>
              </Badge>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Conteúdo</h4>
              <div className="bg-muted/50 p-3 rounded-md border text-sm overflow-x-auto">
                {selectedMessage?.stageType === "typebot" ? (
                  <div className="flex items-center">
                    <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                    <a 
                      href={selectedMessage?.content} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {selectedMessage?.content}
                    </a>
                  </div>
                ) : (
                  <div className="whitespace-pre-line">
                    {selectedMessage?.content?.replace(/\$\{name\}/g, selectedMessage?.contactName)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
