import { useState } from "react";
import { useApp } from '@/context/AppContext';
import { Search, User, Tag, CheckCircle2, Clock, AlertCircle, ChevronDown, MoreVertical } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Contact, ContactSequence } from '@/types';
import { cn } from '@/lib/utils';

export default function Contacts() {
  const { contacts, sequences, contactSequences, getContactSequences } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showSequences, setShowSequences] = useState(false);
  
  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery) ||
    contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Active contacts have at least one active sequence
  const activeContacts = filteredContacts.filter(contact => {
    const sequences = getContactSequences(contact.id);
    return sequences.some(seq => seq.status === 'active');
  });
  
  // Function to get contact's sequence data
  const getContactSequenceDetails = (contactId: string) => {
    const sequences = getContactSequences(contactId);
    return {
      active: sequences.filter(seq => seq.status === 'active').length,
      completed: sequences.filter(seq => seq.status === 'completed').length,
      removed: sequences.filter(seq => seq.status === 'removed').length,
      total: sequences.length
    };
  };
  
  // View contact sequences
  const handleViewSequences = (contact: Contact) => {
    setSelectedContact(contact);
    setShowSequences(true);
  };
  
  const formatContactSequenceStatus = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-600">
            <Clock className="h-3 w-3 mr-1" />
            Ativa
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluída
          </Badge>
        );
      case 'removed':
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Removida
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie seus contatos e suas sequências
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar contatos ou tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <Button variant="ghost" className="h-9 px-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({filteredContacts.length})</TabsTrigger>
          <TabsTrigger value="active">Em Sequências ({activeContacts.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Contatos</CardTitle>
              <CardDescription>
                Lista de todos os contatos com suas tags e sequências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Sequências</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length > 0 ? filteredContacts.map(contact => {
                      const seqDetails = getContactSequenceDetails(contact.id);
                      
                      return (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{contact.phoneNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {contact.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {seqDetails.total > 0 ? (
                              <div className="flex items-center space-x-2">
                                {seqDetails.active > 0 && (
                                  <Badge className="bg-green-600">
                                    {seqDetails.active} ativa{seqDetails.active > 1 && 's'}
                                  </Badge>
                                )}
                                {seqDetails.completed > 0 && (
                                  <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                    {seqDetails.completed} concluída{seqDetails.completed > 1 && 's'}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Sem sequências
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSequences(contact)}
                              disabled={seqDetails.total === 0}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhum contato encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Contatos em Sequências Ativas</CardTitle>
              <CardDescription>
                Contatos que estão atualmente em pelo menos uma sequência ativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Sequências</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeContacts.length > 0 ? activeContacts.map(contact => {
                      const seqDetails = getContactSequenceDetails(contact.id);
                      
                      return (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{contact.phoneNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {contact.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-green-600">
                                {seqDetails.active} ativa{seqDetails.active > 1 && 's'}
                              </Badge>
                              {seqDetails.completed > 0 && (
                                <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                  {seqDetails.completed} concluída{seqDetails.completed > 1 && 's'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSequences(contact)}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhum contato em sequências ativas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Contact Sequences Dialog */}
      <Dialog open={showSequences} onOpenChange={setShowSequences}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              {selectedContact?.name}
            </DialogTitle>
            <DialogDescription>
              Sequências e progresso para este contato
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedContact.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">Histórico de Sequências</h4>
                  {getContactSequences(selectedContact.id).length > 0 ? (
                    <div className="space-y-4">
                      {getContactSequences(selectedContact.id).map((contactSequence: ContactSequence) => {
                        const sequence = sequences.find(s => s.id === contactSequence.sequenceId);
                        if (!sequence) return null;
                        
                        return (
                          <Card key={contactSequence.id} className="overflow-hidden">
                            <CardHeader className="py-3">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base">{sequence.name}</CardTitle>
                                {formatContactSequenceStatus(contactSequence.status)}
                              </div>
                              <CardDescription>
                                Iniciada em {new Date(contactSequence.startedAt).toLocaleDateString('pt-BR')}
                                {contactSequence.completedAt && (
                                  <> • Concluída em {new Date(contactSequence.completedAt).toLocaleDateString('pt-BR')}</>
                                )}
                                {contactSequence.removedAt && (
                                  <> • Removida em {new Date(contactSequence.removedAt).toLocaleDateString('pt-BR')}</>
                                )}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="py-3">
                              <div>
                                <h5 className="text-sm font-medium mb-2">Progresso dos Estágios</h5>
                                <div className="space-y-2">
                                  {sequence.stages.map((stage, index) => {
                                    const progress = contactSequence.stageProgress ? 
                                      contactSequence.stageProgress.find(p => p.stageId === stage.id) : undefined;
                                    
                                    return (
                                      <div 
                                        key={stage.id} 
                                        className={cn(
                                          "flex items-start space-x-3 p-2 rounded-md",
                                          progress?.status === "completed" && "bg-green-500/10",
                                          progress?.status === "skipped" && "bg-gray-500/10",
                                          contactSequence.currentStageId === stage.id && "bg-blue-500/10 border border-blue-500/30"
                                        )}
                                      >
                                        <div className="mt-0.5">
                                          {progress?.status === "completed" ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                          ) : progress?.status === "skipped" ? (
                                            <AlertCircle className="h-5 w-5 text-gray-500" />
                                          ) : contactSequence.currentStageId === stage.id ? (
                                            <Clock className="h-5 w-5 text-blue-500" />
                                          ) : (
                                            <div className="h-5 w-5 rounded-full border border-muted flex items-center justify-center">
                                              <span className="text-xs">{index + 1}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center">
                                            <h6 className="font-medium text-sm">{stage.name}</h6>
                                            {contactSequence.currentStageId === stage.id && (
                                              <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs">
                                                Atual
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {progress?.status === "completed" && progress.completedAt ? (
                                              `Enviado em ${new Date(progress.completedAt).toLocaleString('pt-BR')}`
                                            ) : contactSequence.currentStageId === stage.id ? (
                                              "Aguardando envio"
                                            ) : (
                                              "Pendente"
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-4 border rounded-md">
                      <p className="text-muted-foreground">
                        Este contato não está em nenhuma sequência.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
