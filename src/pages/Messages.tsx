
import { useState, useMemo, useEffect } from "react";
import { useApp } from '@/context/AppContext';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScheduledMessage, Sequence, Contact } from "@/types";
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertCircle, 
  MoreVertical, 
  RefreshCw, 
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  MessageSquare
} from "lucide-react";

export default function Messages() {
  const { currentInstance, scheduledMessages, contacts, sequences, refreshData } = useApp();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (currentInstance) {
      refreshData();
    }
  }, [currentInstance, refreshData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData().then(() => {
      setIsRefreshing(false);
    });
  };

  const filteredMessages = useMemo(() => {
    if (!scheduledMessages || !currentInstance) return [];
    
    // Get sequences for current instance
    const instanceSequenceIds = sequences
      .filter(seq => seq.instanceId === currentInstance.id)
      .map(seq => seq.id);
    
    // Filter messages by current instance and status
    let filtered = scheduledMessages.filter(msg => 
      instanceSequenceIds.includes(msg.sequenceId)
    );
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(msg => msg.status === filter);
    }
    
    // Apply search filter (by contact name or phone)
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      filtered = filtered.filter(msg => {
        const contact = contacts.find(c => c.id === msg.contactId);
        return contact && (
          contact.name.toLowerCase().includes(lowerSearch) ||
          contact.phoneNumber.toLowerCase().includes(lowerSearch)
        );
      });
    }
    
    return filtered;
  }, [scheduledMessages, currentInstance, filter, searchQuery, sequences, contacts]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30"><Clock className="mr-1 h-3 w-3" />Aguardando</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30"><RefreshCw className="mr-1 h-3 w-3 animate-spin" />Processando</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle className="mr-1 h-3 w-3" />Enviado</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"><XCircle className="mr-1 h-3 w-3" />Falhou</Badge>;
      case 'persistent_error':
        return <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"><AlertTriangle className="mr-1 h-3 w-3" />Erro Persistente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : 'Contato desconhecido';
  };
  
  const getSequenceName = (sequenceId: string) => {
    const sequence = sequences.find(s => s.id === sequenceId);
    return sequence ? sequence.name : 'Sequência desconhecida';
  };
  
  const getStageName = (sequenceId: string, stageId: string) => {
    const sequence = sequences.find(s => s.id === sequenceId);
    if (!sequence) return 'Estágio desconhecido';
    
    const stage = sequence.stages.find(s => s.id === stageId);
    return stage ? stage.name : 'Estágio desconhecido';
  };
  
  if (!currentInstance) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Selecione uma instância para visualizar as mensagens
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-muted-foreground">
          Gerencie as mensagens agendadas para envio
        </p>
      </div>
      
      <div className="flex justify-between items-center gap-4 flex-col sm:flex-row">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar por contato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="waiting">Aguardando</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="persistent_error">Erro Persistente</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Mensagens Agendadas</CardTitle>
          <CardDescription>
            {filteredMessages.length} mensagens encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">Nenhuma mensagem encontrada</h3>
              <p className="text-muted-foreground mt-1">
                {filter !== 'all' 
                  ? "Tente alterar os filtros aplicados."
                  : "Não existem mensagens agendadas para esta instância."}
              </p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Sequência</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Agendado para</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                      <TableCell>{getContactName(message.contactId)}</TableCell>
                      <TableCell>{getSequenceName(message.sequenceId)}</TableCell>
                      <TableCell>{getStageName(message.sequenceId, message.stageId)}</TableCell>
                      <TableCell>
                        {message.scheduledTime 
                          ? formatDistanceToNow(new Date(message.scheduledTime), { 
                              addSuffix: true,
                              locale: ptBR
                            })
                          : 'Não agendado'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                              Ver detalhes
                            </DropdownMenuItem>
                            {(message.status === 'waiting' || message.status === 'pending') && (
                              <DropdownMenuItem className="cursor-pointer text-red-600">
                                Cancelar envio
                              </DropdownMenuItem>
                            )}
                            {(message.status === 'failed') && (
                              <DropdownMenuItem className="cursor-pointer">
                                Tentar novamente
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
