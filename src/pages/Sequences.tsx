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
  Save,
  X
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
import { supabase } from "@/lib/supabase";
import { isValidUUID } from "@/lib/utils";

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
    if (isEditMode && currentSequence) {
      await updateSequence(currentSequence.id, sequence);
      setIsEditMode(false);
      setCurrentSequence(null);
      toast.success("Sequência atualizada com sucesso");
      setHasUnsavedChanges(false);
    } else {
      await addSequence(sequence);
      setIsCreateMode(false);
      toast.success("Sequência criada com sucesso");
      setHasUnsavedChanges(false);
    }
  };
  
  const handleEditSequence = (sequence: Sequence) => {
    setCurrentSequence(sequence);
    setIsEditMode(true);
    setHasUnsavedChanges(false);
  };
  
  const handleToggleStatus = (sequence: Sequence) => {
    updateSequence(sequence.id, {
      status: sequence.status === 'active' ? 'inactive' : 'active'
    });
    
    toast.success(
      sequence.status === 'active' 
        ? "Sequência desativada com sucesso" 
        : "Sequência ativada com sucesso"
    );
  };
  
  const handleDeleteSequence = (id: string) => {
    deleteSequence(id);
    toast.success("Sequência excluída com sucesso");
  };
  
  const handleUpdateSequence = async (sequenceId: string, updatedData: Partial<Sequence>) => {
    try {
      // Verificar se há contactos ativos usando esta sequência
      const { data: activeContacts, error: contactsError } = await supabase
        .from("contact_sequences")
        .select("id, current_stage_id")
        .eq("sequence_id", sequenceId)
        .in("status", ["active", "paused"]);
      
      if (contactsError) {
        throw new Error(`Failed to check active contacts: ${contactsError.message}`);
      }
      
      // Se houver estágios para atualizar e contatos ativos, precisamos fazer uma migração cuidadosa
      if (updatedData.stages && activeContacts && activeContacts.length > 0) {
        // Buscar os estágios existentes
        const { data: existingStages, error: stagesError } = await supabase
          .from("sequence_stages")
          .select("*")
          .eq("sequence_id", sequenceId)
          .order("order_index", { ascending: true });
        
        if (stagesError) {
          throw new Error(`Failed to fetch existing stages: ${stagesError.message}`);
        }
        
        // Criar um mapeamento de estágios antigos para novos com base em nome e posição
        const stageMapping = new Map();
        const stageIdsToUpdate = [];
        
        // Identificar quais estágios antigos estão em uso e precisam ser preservados/mapeados
        const usedStageIds = new Set(activeContacts.map(contact => contact.current_stage_id));
        
        for (const oldStage of existingStages) {
          if (usedStageIds.has(oldStage.id)) {
            // Encontre o estágio correspondente nos novos estágios com base no nome e ordem
            const matchingStage = updatedData.stages.find(
              (s, idx) => s.name === oldStage.name && Math.abs(idx - oldStage.order_index) <= 1
            );
            
            if (matchingStage) {
              stageMapping.set(oldStage.id, matchingStage);
              stageIdsToUpdate.push(oldStage.id);
            }
          }
        }
        
        // Atualizar a sequência no banco de dados (exceto estágios)
        const { stages, ...sequenceData } = updatedData;
        const { error: updateError } = await supabase
          .from("sequences")
          .update(sequenceData)
          .eq("id", sequenceId);
        
        if (updateError) {
          throw new Error(`Failed to update sequence: ${updateError.message}`);
        }
        
        // Tratar os estágios separadamente para evitar violação da restrição de chave estrangeira
        
        // 1. Criar novos estágios com IDs temporários
        const newStages = [];
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const { data: newStage, error: createStageError } = await supabase
            .from("sequence_stages")
            .insert({
              sequence_id: sequenceId,
              name: stage.name,
              type: stage.type,
              content: stage.content,
              typebot_stage: stage.typebotStage,
              delay: stage.delay,
              delay_unit: stage.delayUnit,
              order_index: i
            })
            .select()
            .single();
            
          if (createStageError) {
            throw new Error(`Failed to create new stage: ${createStageError.message}`);
          }
          
          newStages.push(newStage);
        }
        
        // 2. Para cada contato ativo, atualizar para o novo estágio correspondente
        for (const contact of activeContacts) {
          const oldStageId = contact.current_stage_id;
          const mappedStage = stageMapping.get(oldStageId);
          
          if (mappedStage) {
            // Encontrar o novo ID de estágio correspondente
            const newStageIndex = stages.findIndex(s => 
              s.name === mappedStage.name && 
              s.type === mappedStage.type && 
              s.content === mappedStage.content
            );
            
            if (newStageIndex !== -1) {
              const newStageId = newStages[newStageIndex].id;
              
              // Atualizar o contato para usar o novo ID de estágio
              const { error: updateContactError } = await supabase
                .from("contact_sequences")
                .update({
                  current_stage_id: newStageId,
                  current_stage_index: newStageIndex
                })
                .eq("id", contact.id);
                
              if (updateContactError) {
                console.error(`Failed to update contact stage: ${updateContactError.message}`);
              }
              
              // Atualizar os registros de progresso
              const { error: updateProgressError } = await supabase
                .from("stage_progress")
                .update({
                  stage_id: newStageId
                })
                .eq("contact_sequence_id", contact.id)
                .eq("stage_id", oldStageId);
                
              if (updateProgressError) {
                console.error(`Failed to update stage progress: ${updateProgressError.message}`);
              }
              
              // Atualizar mensagens agendadas
              const { error: updateScheduledError } = await supabase
                .from("scheduled_messages")
                .update({
                  stage_id: newStageId
                })
                .eq("contact_id", contact.id)
                .eq("sequence_id", sequenceId)
                .eq("stage_id", oldStageId)
                .in("status", ["pending", "processing"]);
                
              if (updateScheduledError) {
                console.error(`Failed to update scheduled messages: ${updateScheduledError.message}`);
              }
            }
          }
        }
        
        // 3. Remover os estágios antigos quando for seguro
        if (stageIdsToUpdate.length > 0) {
          // Garantir que os IDs sejam válidos para evitar erro no filtro SQL
          const validIds = stageIdsToUpdate.filter(id => isValidUUID(id));
          
          if (validIds.length > 0) {
            const { error: deleteStagesError } = await supabase
              .from("sequence_stages")
              .delete()
              .eq("sequence_id", sequenceId)
              .not("id", "in", validIds);
            
            if (deleteStagesError) {
              console.error(`Erro ao excluir estágios antigos: ${deleteStagesError.message}`);
            }
          }
        } else {
          // Se nenhum estágio está sendo usado, podemos excluir os estágios antigos com segurança
          const { error: deleteAllStagesError } = await supabase
            .from("sequence_stages")
            .delete()
            .neq("id", newStages[0].id) // Mantém pelo menos um estágio para evitar deleção completa
            .eq("sequence_id", sequenceId);
          
          if (deleteAllStagesError) {
            console.error(`Erro ao excluir todos os estágios antigos: ${deleteAllStagesError.message}`);
          }
        }
        
        return;
      }
      
      // Caminho simples: atualizar a sequência diretamente se não houver estágios para atualizar 
      // ou não houver contatos ativos
      await updateSequence(sequenceId, updatedData);
      
    } catch (error) {
      console.error("Erro ao atualizar sequência:", error);
      toast.error(`Erro ao atualizar sequência: ${error.message}`);
    }
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGoBack}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
        
        <SequenceBuilder 
          onSave={handleSaveSequence}
          onCancel={handleGoBack}
          onChangesMade={() => setHasUnsavedChanges(true)}
        />
      </div>
    );
  }
  
  if (isEditMode && currentSequence) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Editar Sequência</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGoBack}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
        
        <SequenceBuilder 
          sequence={currentSequence}
          onSave={handleSaveSequence}
          onCancel={handleGoBack}
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
                
                <div>
                  <div className="text-sm font-medium mb-1 flex items-center">
                    <Activity className="h-4 w-4 mr-1" />
                    Status
                  </div>
                  <Badge variant={sequence.status === "active" ? "default" : "outline"}>
                    {sequence.status === "active" ? "Ativa" : "Inativa"}
                  </Badge>
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
