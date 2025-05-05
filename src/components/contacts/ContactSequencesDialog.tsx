
import { Contact, ContactSequence, Sequence } from '@/types';
import { User, Tag, CheckCircle2, Clock, AlertCircle, X, Move, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { MoreVertical } from "lucide-react";
import { createSafeDialogHandler, resetBodyStylesAfterDialog, stopEventPropagation } from "@/utils/dialogHelpers";

interface ContactSequencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  contactSequences: ContactSequence[];
  sequences: Sequence[];
  onPrepareStageChange: (contactSequence: ContactSequence) => void;
  onRemoveFromSequence: (contactSequenceId: string) => Promise<void>;
  isProcessing: boolean;
}

export const ContactSequencesDialog = ({
  open,
  onOpenChange,
  contact,
  contactSequences,
  sequences,
  onPrepareStageChange,
  onRemoveFromSequence,
  isProcessing
}: ContactSequencesDialogProps) => {
  // Criar handler seguro para o diálogo
  const safeOpenChangeHandler = createSafeDialogHandler(onOpenChange);
  
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
  
  const getContactSequences = (contactId: string) => {
    return contactSequences
      .filter(seq => seq.contactId === contactId)
      // Ordenar sequências com as mais recentes primeiro
      .sort((a, b) => {
        // Usar o campo mais recente disponível para cada sequência
        const dateA = a.removedAt || a.completedAt || a.lastMessageAt || a.startedAt;
        const dateB = b.removedAt || b.completedAt || b.lastMessageAt || b.startedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  };
  
  return (
    <Dialog 
      open={open} 
      onOpenChange={safeOpenChangeHandler}
    >
      <DialogContent className="sm:max-w-[600px]" onClick={stopEventPropagation}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            {contact?.name}
          </DialogTitle>
          <DialogDescription>
            Sequências e progresso para este contato
          </DialogDescription>
        </DialogHeader>
        {contact && (
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1 flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Histórico de Sequências</h4>
                {getContactSequences(contact.id).length > 0 ? (
                  <div className="space-y-4">
                    {getContactSequences(contact.id).map((contactSequence: ContactSequence) => {
                      const sequence = sequences.find(s => s.id === contactSequence.sequenceId);
                      if (!sequence) return null;
                      
                      return (
                        <Card key={contactSequence.id} className="overflow-hidden">
                          <CardHeader className="py-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">{sequence.name}</CardTitle>
                              <div className="flex items-center gap-2">
                                {formatContactSequenceStatus(contactSequence.status)}
                                
                                {/* Opções de gestão para sequências ativas */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={() => resetBodyStylesAfterDialog()}>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={stopEventPropagation}>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        resetBodyStylesAfterDialog();
                                        onPrepareStageChange(contactSequence);
                                      }}
                                      disabled={contactSequence.status !== 'active'}
                                    >
                                      <Move className="h-4 w-4 mr-2" />
                                      Alterar estágio
                                    </DropdownMenuItem>
                                    
                                    {contactSequence.status === 'active' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <DropdownMenuItem 
                                              onSelect={(e) => {
                                                e.preventDefault();
                                                resetBodyStylesAfterDialog();
                                              }} 
                                              className="text-red-500"
                                            >
                                              <X className="h-4 w-4 mr-2" />
                                              Remover da sequência
                                            </DropdownMenuItem>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent onClick={stopEventPropagation}>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remover contato da sequência?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                O contato será removido da sequência "{sequence.name}" e não receberá mais mensagens desta sequência.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel onClick={() => resetBodyStylesAfterDialog()}>
                                                Cancelar
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => {
                                                  resetBodyStylesAfterDialog();
                                                  onRemoveFromSequence(contactSequence.id);
                                                }}
                                                className="bg-red-500 hover:bg-red-600"
                                                disabled={isProcessing}
                                              >
                                                Remover
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
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
                                        progress?.status === "removed" && "bg-red-500/10",
                                        contactSequence.currentStageId === stage.id && "bg-blue-500/10 border border-blue-500/30"
                                      )}
                                    >
                                      <div className="mt-0.5">
                                        {progress?.status === "completed" ? (
                                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : progress?.status === "skipped" ? (
                                          <AlertCircle className="h-5 w-5 text-gray-500" />
                                        ) : progress?.status === "removed" ? (
                                          <X className="h-5 w-5 text-red-500" />
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
                                          {contactSequence.currentStageId === stage.id && contactSequence.status === 'active' && (
                                            <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs">
                                              Atual
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {progress?.status === "completed" && progress.completedAt ? (
                                            `Enviado em ${new Date(progress.completedAt).toLocaleString('pt-BR')}`
                                          ) : progress?.status === "skipped" ? (
                                            "Pulado"
                                          ) : progress?.status === "removed" ? (
                                            "Removido"
                                          ) : contactSequence.currentStageId === stage.id && contactSequence.status === 'active' ? (
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
  );
};
