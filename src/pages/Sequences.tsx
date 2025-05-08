
import { useState, useEffect } from "react";
import { useApp } from '@/context/AppContext';
import {
  Activity,
  Ban,
  PlusCircle,
  Search,
  Tag,
  Clock,
  Settings,
  MoreVertical,
  MessageCircle,
  FileCode,
  Bot,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SequenceBuilder } from '@/components/sequences/SequenceBuilder';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sequence } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { isValidUUID } from "@/integrations/supabase/client";

export default function Sequences() {
  const { sequences, currentInstance, addSequence, updateSequence, deleteSequence, refreshData, isDataInitialized } = useApp();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSequence, setCurrentSequence] = useState<Sequence | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Fetch data only if not initialized yet
  useEffect(() => {
    if (!isDataInitialized && currentInstance) {
      console.log("Sequences page - loading initial data");
      refreshData();
    }
  }, [refreshData, currentInstance, isDataInitialized]);
  
  const instanceSequences = sequences
    .filter(seq => seq.instanceId === currentInstance?.id)
    .filter(seq => 
      searchQuery === '' || 
      seq.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
  const activeSequences = instanceSequences.filter(seq => seq.status === 'active');
  const inactiveSequences = instanceSequences.filter(seq => seq.status === 'inactive');
  
  const handleSaveSequence = async (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    // Add debug logging to see what's being sent for update
    if (isEditMode && currentSequence) {
      console.log("Updating sequence:", {
        sequenceId: currentSequence.id,
        webhook: {
          enabled: sequence.webhookEnabled,
          id: sequence.webhookId
        },
        currentInstance
      });
      
      const result = await updateSequence(currentSequence.id, sequence);
      
      if (result.success) {
        setIsEditMode(false);
        setCurrentSequence(null);
        toast.success("Sequência atualizada com sucesso");
        setHasUnsavedChanges(false);
      } else {
        // Exibir mensagem de erro específica
        toast.error(result.error || "Erro ao atualizar sequência");
        // Não fechamos o modo de edição aqui, permitindo que o usuário corrija o problema
      }
    } else {
      console.log("Creating new sequence:", {
        webhook: {
          enabled: sequence.webhookEnabled,
          id: sequence.webhookId
        },
        currentInstance
      });
      
      await addSequence(sequence);
      setIsCreateMode(false);
      toast.success("Sequência criada com sucesso");
      setHasUnsavedChanges(false);
    }
  };
  
  const handleEditSequence = (sequence: Sequence) => {
    console.log("Editing sequence:", {
      id: sequence.id,
      webhook: {
        enabled: sequence.webhookEnabled,
        id: sequence.webhookId
      },
      instanceId: sequence.instanceId
    });
    
    setCurrentSequence(sequence);
    setIsEditMode(true);
    setHasUnsavedChanges(false);
  };
  
  const handleToggleStatus = (sequence: Sequence) => {
    updateSequence(sequence.id, {
      status: sequence.status === 'active' ? 'inactive' : 'active'
    }).then(result => {
      if (result.success) {
        toast.success(
          sequence.status === 'active' 
            ? "Sequência desativada com sucesso" 
            : "Sequência ativada com sucesso"
        );
      } else {
        toast.error(result.error || "Erro ao alterar status da sequência");
      }
    });
  };
  
  const handleDeleteSequence = (id: string) => {
    deleteSequence(id);
    toast.success("Sequência excluída com sucesso");
  };
  
  const getStageIcon = (type: string) => {
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
  
  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("Você tem alterações não salvas. Deseja realmente sair sem salvar?");
      if (!confirmed) return;
    }
    
    if (isCreateMode) {
      setIsCreateMode(false);
    } else if (isEditMode) {
      setIsEditMode(false);
      setCurrentSequence(null);
    }
    
    setHasUnsavedChanges(false);
  };

  if (isCreateMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Nova Sequência</h1>
        </div>
        
        <SequenceBuilder 
          onSave={handleSaveSequence}
          onCancel={() => {
            setIsCreateMode(false);
            setHasUnsavedChanges(false);
          }}
          onChangesMade={() => setHasUnsavedChanges(true)}
        />
      </div>
    );
  }
  
  if (isEditMode && currentSequence) {
    console.log("Rendering edit mode for sequence:", {
      id: currentSequence.id,
      webhookEnabled: currentSequence.webhookEnabled,
      webhookId: currentSequence.webhookId
    });
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Editar Sequência</h1>
        </div>
        
        <SequenceBuilder 
          sequence={currentSequence}
          onSave={handleSaveSequence}
          onCancel={() => {
            setIsEditMode(false);
            setCurrentSequence(null);
            setHasUnsavedChanges(false);
          }}
          onChangesMade={() => setHasUnsavedChanges(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Sequências</h1>
        <p className="text-muted-foreground">
          Gerencie suas sequências de follow-up no WhatsApp
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar sequências..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <Button variant="ghost" className="h-9 px-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <Button onClick={() => setIsCreateMode(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Sequência
        </Button>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas ({instanceSequences.length})</TabsTrigger>
          <TabsTrigger value="active">Ativas ({activeSequences.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inativas ({inactiveSequences.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {renderSequenceList(instanceSequences)}
        </TabsContent>
        
        <TabsContent value="active" className="mt-4">
          {renderSequenceList(activeSequences)}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-4">
          {renderSequenceList(inactiveSequences)}
        </TabsContent>
      </Tabs>
    </div>
  );
  
  function renderSequenceList(sequenceList: Sequence[]) {
    if (sequenceList.length === 0) {
      return (
        <Card className="p-8 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            {searchQuery ? (
              <Search className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Activity className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1">
            {searchQuery ? "Nenhuma sequência encontrada" : "Nenhuma sequência criada"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? "Tente alterar os termos da busca ou remover filtros" 
              : "Crie sua primeira sequência para começar a automatizar seu follow-up"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateMode(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nova Sequência
            </Button>
          )}
        </Card>
      );
    }
    
    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {sequenceList.map(sequence => (
          <Card key={sequence.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span 
                    className={cn(
                      "w-2 h-2 rounded-full mr-2",
                      sequence.status === "active" ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                  <CardTitle className="text-lg">{sequence.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditSequence(sequence)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(sequence)}>
                      {sequence.status === "active" ? (
                        <>
                          <Ban className="h-4 w-4 mr-2" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Activity className="h-4 w-4 mr-2" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className="text-red-500"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir sequência?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a 
                            sequência "{sequence.name}" e removerá todos os dados associados a ela.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteSequence(sequence.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>
                Atualizada {formatDistanceToNow(new Date(sequence.updatedAt), { 
                  addSuffix: true,
                  locale: ptBR
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1 flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    Condições
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Início ({sequence.startCondition.type}):</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sequence.startCondition.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 text-xs py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Parada ({sequence.stopCondition.type}):</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sequence.stopCondition.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 text-xs py-0">
                            {tag}
                          </Badge>
                        ))}
                        {sequence.stopCondition.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">Nenhuma</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Estágios ({sequence.stages.length})
                  </div>
                  <div className="flex items-center mt-1">
                    {sequence.stages.map((stage, idx) => (
                      <div 
                        key={stage.id}
                        className="flex items-center"
                      >
                        <Badge variant="outline" className={cn(
                          "flex items-center px-1.5 text-xs",
                          stage.type === "message" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
                          stage.type === "pattern" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
                          stage.type === "typebot" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
                        )}>
                          {getStageIcon(stage.type)}
                        </Badge>
                        {idx < sequence.stages.length - 1 && (
                          <div className="h-px w-4 bg-border" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm font-medium mb-1 flex items-center">
                      <Activity className="h-4 w-4 mr-1" />
                      Status
                    </div>
                    <Badge variant={sequence.status === "active" ? "default" : "outline"}>
                      {sequence.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  
                  {/* Webhook Badge */}
                  {sequence.webhookEnabled && (
                    <div className="text-right">
                      <div className="text-sm font-medium mb-1 flex items-center justify-end">
                        <Globe className="h-4 w-4 mr-1" />
                        Webhook
                      </div>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                        {sequence.webhookId}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleEditSequence(sequence)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Gerenciar Sequência
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
}
