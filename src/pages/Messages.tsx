
import { useState, useMemo, useCallback } from "react";
import { useApp } from '@/context/AppContext';
import { Search, Filter } from "lucide-react";
import {
  Table,
  TableBody,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import MessageTableRow from "@/components/messages/MessageTableRow";
import { EmptyMessageState } from "@/components/messages/EmptyMessageState";
import { MessageDetailsDialog } from "@/components/messages/MessageDetailsDialog";
import { MessageStatusBadge } from "@/components/messages/MessageStatusBadge";

type MessageStatus = 'waiting' | 'pending' | 'processing' | 'sent' | 'failed' | 'persistent_error' | 'removed' | 'stopped';

export default function Messages() {
  const { scheduledMessages, contacts, sequences, isLoading: globalLoading } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<MessageStatus[]>([]);
  const [showMessageContent, setShowMessageContent] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  // Process messages data - memoize to prevent recalculation on each render
  const messagesWithDetails = useMemo(() => {
    console.log("[Messages] Processing messages data");
    
    return scheduledMessages.map(message => {
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
  }, [scheduledMessages, contacts, sequences]);
  
  // Apply filters - memoize to prevent recalculation on each render
  const filteredMessages = useMemo(() => {
    return messagesWithDetails.filter(message => {
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
  }, [messagesWithDetails, statusFilters, searchQuery]);
  
  // Sort messages - memoize to prevent recalculation on each render
  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort(
      (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
    );
  }, [filteredMessages]);
  
  const handleToggleStatusFilter = useCallback((status: MessageStatus) => {
    setStatusFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  }, []);
  
  const handleViewMessage = useCallback((message: any) => {
    setSelectedMessage(message);
    setShowMessageContent(true);
  }, []);
  
  const isLoading = globalLoading || localLoading;

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
                      id="waiting" 
                      checked={statusFilters.includes('waiting')} 
                      onCheckedChange={() => handleToggleStatusFilter('waiting')}
                    />
                    <label htmlFor="waiting" className="text-sm">
                      <MessageStatusBadge status="waiting" />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pending" 
                      checked={statusFilters.includes('pending')} 
                      onCheckedChange={() => handleToggleStatusFilter('pending')}
                    />
                    <label htmlFor="pending" className="text-sm">
                      <MessageStatusBadge status="pending" />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="processing" 
                      checked={statusFilters.includes('processing')} 
                      onCheckedChange={() => handleToggleStatusFilter('processing')}
                    />
                    <label htmlFor="processing" className="text-sm">
                      <MessageStatusBadge status="processing" />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sent" 
                      checked={statusFilters.includes('sent')} 
                      onCheckedChange={() => handleToggleStatusFilter('sent')}
                    />
                    <label htmlFor="sent" className="text-sm">
                      <MessageStatusBadge status="sent" />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="failed" 
                      checked={statusFilters.includes('failed')} 
                      onCheckedChange={() => handleToggleStatusFilter('failed')}
                    />
                    <label htmlFor="failed" className="text-sm">
                      <MessageStatusBadge status="failed" />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="persistent_error" 
                      checked={statusFilters.includes('persistent_error')} 
                      onCheckedChange={() => handleToggleStatusFilter('persistent_error')}
                    />
                    <label htmlFor="persistent_error" className="text-sm">
                      <MessageStatusBadge status="persistent_error" />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="removed" 
                      checked={statusFilters.includes('removed')} 
                      onCheckedChange={() => handleToggleStatusFilter('removed')}
                    />
                    <label htmlFor="removed" className="text-sm">
                      <MessageStatusBadge status="removed" />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="stopped" 
                      checked={statusFilters.includes('stopped')} 
                      onCheckedChange={() => handleToggleStatusFilter('stopped')}
                    />
                    <label htmlFor="stopped" className="text-sm">
                      <MessageStatusBadge status="stopped" />
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
                {sortedMessages.length > 0 ? (
                  sortedMessages.map(message => (
                    <MessageTableRow 
                      key={message.id} 
                      message={message} 
                      onViewMessage={handleViewMessage}
                    />
                  ))
                ) : (
                  <EmptyMessageState searchQuery={searchQuery} />
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <MessageDetailsDialog
        open={showMessageContent}
        onOpenChange={setShowMessageContent}
        selectedMessage={selectedMessage}
      />
    </div>
  );
}
