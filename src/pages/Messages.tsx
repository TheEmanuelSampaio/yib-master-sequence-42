import { useState } from "react";
import { useApp } from '@/context/AppContext';
import { Search, Filter, Calendar, CheckCircle, XCircle, AlertCircle, MessageCircle, FileCode, Bot } from "lucide-react";
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

type MessageStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'persistent_error';

export default function Messages() {
  const { scheduledMessages, contacts, sequences } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<MessageStatus[]>([]);
  const [showMessageContent, setShowMessageContent] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  const messagesWithDetails = scheduledMessages.map(message => {
    const contact = contacts.find(c => c.id === message.contactId);
    const sequence = sequences.find(s => s.id === message.sequenceId);
    const stage = sequence?.stages.find(s => s.id === message.stageId);
    
    return {
      ...message,
      contactName: contact?.name || "Desconhecido",
      contactPhone: contact?.phoneNumber || "",
      sequenceName: sequence?.name || "Desconhecida",
      stageName: stage?.name || "Desconhecido",
      stageType: stage?.type || "message",
      content: stage?.content || "",
    };
  });
  
  const filteredMessages = messagesWithDetails.filter(message => {
    // If we have status filters and the message status is not in the filter list
    if (statusFilters.length > 0 && !statusFilters.includes(message.status as MessageStatus)) {
      return false;
    }
    
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        message.contactName.toLowerCase().includes(searchLower) ||
        message.contactPhone.includes(searchLower) ||
        message.sequenceName.toLowerCase().includes(searchLower) ||
        message.stageName.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
  );
  
  const handleToggleStatusFilter = (status: MessageStatus) => {
    setStatusFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };
  
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
            Pendente
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
            Processando
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
            Enviada
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
            Falhou
          </Badge>
        );
      case 'persistent_error':
        return (
          <Badge variant="outline" className="bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30">
            Erro Persistente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getStageTypeIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4" />;
      case "pattern":
        return <FileCode className="h-4 w-4" />;
      case "typebot":
        return <Bot className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };
  
  const handleViewMessage = (message: any) => {
    setSelectedMessage(message);
    setShowMessageContent(true);
  };
  
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie as mensagens agendadas e enviadas
        </p>
      </div>
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar mensagens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                      id="pending" 
                      checked={statusFilters.includes('pending')} 
                      onCheckedChange={() => handleToggleStatusFilter('pending')}
                    />
                    <label htmlFor="pending" className="text-sm">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                        Pendente
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="processing" 
                      checked={statusFilters.includes('processing')} 
                      onCheckedChange={() => handleToggleStatusFilter('processing')}
                    />
                    <label htmlFor="processing" className="text-sm">
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                        Processando
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sent" 
                      checked={statusFilters.includes('sent')} 
                      onCheckedChange={() => handleToggleStatusFilter('sent')}
                    />
                    <label htmlFor="sent" className="text-sm">
                      <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                        Enviada
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="failed" 
                      checked={statusFilters.includes('failed')} 
                      onCheckedChange={() => handleToggleStatusFilter('failed')}
                    />
                    <label htmlFor="failed" className="text-sm">
                      <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                        Falhou
                      </Badge>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="persistent_error" 
                      checked={statusFilters.includes('persistent_error')} 
                      onCheckedChange={() => handleToggleStatusFilter('persistent_error')}
                    />
                    <label htmlFor="persistent_error" className="text-sm">
                      <Badge variant="outline" className="bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30">
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
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Mensagens</CardTitle>
          <CardDescription>
            {filteredMessages.length} mensagens encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                {sortedMessages.length > 0 ? sortedMessages.map(message => (
                  <TableRow key={message.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{message.contactName}</div>
                        <div className="text-xs text-muted-foreground">{message.contactPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{message.sequenceName}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className={cn(
                          "flex items-center px-1.5 text-xs",
                          message.stageType === "message" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
                          message.stageType === "pattern" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
                          message.stageType === "typebot" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
                        )}>
                          {getStageTypeIcon(message.stageType)}
                        </Badge>
                        <span>{message.stageName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
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
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={message.status} />
                        {message.attempts > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {message.attempts} tentativa{message.attempts > 1 && 's'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMessage(message)}
                      >
                        Ver Conteúdo
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <MessageCircle className="h-6 w-6 text-muted-foreground" />
                        <div className="text-muted-foreground">Nenhuma mensagem encontrada</div>
                        {searchQuery && (
                          <div className="text-sm text-muted-foreground">
                            Tente alterar os filtros ou a busca
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                  {formatDate(selectedMessage?.scheduledTime || "")}
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
                    {selectedMessage?.content.replace(/\$\{name\}/g, selectedMessage?.contactName)}
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
