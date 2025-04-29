
import { useState } from "react";
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
  Plus
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
import { Switch } from "@/components/ui/switch";
import { SequenceBuilder } from '@/components/sequences/SequenceBuilder';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sequence, SequenceStage, TimeRestriction } from "@/types";
import { StageItem } from "@/components/sequences/StageItem";
import { AddStageForm } from "@/components/sequences/AddStageForm";
import { TimeRestrictionForm } from "@/components/sequences/TimeRestrictionForm";
import { RestrictionItem } from "@/components/sequences/RestrictionItem";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Sequences() {
  const { sequences, currentInstance, addSequence, updateSequence, deleteSequence } = useApp();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSequence, setCurrentSequence] = useState<Sequence | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>("sequences");
  
  // Estados para edição direta de sequência
  const [editSequence, setEditSequence] = useState<Sequence | null>(null);
  const [activeTabSection, setActiveTabSection] = useState<string>("info");
  
  const instanceSequences = sequences
    .filter(seq => seq.instanceId === currentInstance?.id)
    .filter(seq => 
      searchQuery === '' || 
      seq.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
  const activeSequences = instanceSequences.filter(seq => seq.status === 'active');
  const inactiveSequences = instanceSequences.filter(seq => seq.status === 'inactive');
  
  const handleSaveSequence = (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => {
    if (isEditMode && currentSequence) {
      updateSequence(currentSequence.id, sequence);
      setIsEditMode(false);
      setCurrentSequence(null);
    } else {
      addSequence(sequence);
      setIsCreateMode(false);
    }
  };
  
  const handleEditSequence = (sequence: Sequence) => {
    setEditSequence({ ...sequence });
    setSelectedTab("edit");
    setActiveTabSection("info");
  };
  
  const handleToggleStatus = (sequence: Sequence) => {
    updateSequence(sequence.id, {
      status: sequence.status === 'active' ? 'inactive' : 'active'
    });
  };
  
  const handleDeleteSequence = (id: string) => {
    deleteSequence(id);
    if (editSequence?.id === id) {
      setEditSequence(null);
      setSelectedTab("sequences");
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

  // Funções para manipular estágios da sequência
  const handleAddStage = (stage: Omit<SequenceStage, "id">) => {
    if (!editSequence) return;
    
    const newStage = {
      ...stage,
      id: crypto.randomUUID()
    };
    
    const updatedStages = [...editSequence.stages, newStage];
    setEditSequence({ ...editSequence, stages: updatedStages });
    updateSequence(editSequence.id, { stages: updatedStages });
  };
  
  const handleUpdateStage = (stageId: string, updatedStage: SequenceStage) => {
    if (!editSequence) return;
    
    const updatedStages = editSequence.stages.map(stage => 
      stage.id === stageId ? { ...updatedStage } : stage
    );
    
    setEditSequence({ ...editSequence, stages: updatedStages });
    updateSequence(editSequence.id, { stages: updatedStages });
  };
  
  const handleDeleteStage = (stageId: string) => {
    if (!editSequence) return;
    
    const updatedStages = editSequence.stages.filter(stage => stage.id !== stageId);
    setEditSequence({ ...editSequence, stages: updatedStages });
    updateSequence(editSequence.id, { stages: updatedStages });
  };
  
  const handleMoveStage = (stageId: string, direction: "up" | "down") => {
    if (!editSequence) return;
    
    const stageIndex = editSequence.stages.findIndex(stage => stage.id === stageId);
    if (
      (direction === "up" && stageIndex === 0) ||
      (direction === "down" && stageIndex === editSequence.stages.length - 1)
    ) {
      return;
    }
    
    const updatedStages = [...editSequence.stages];
    const step = direction === "up" ? -1 : 1;
    [updatedStages[stageIndex], updatedStages[stageIndex + step]] = 
      [updatedStages[stageIndex + step], updatedStages[stageIndex]];
    
    setEditSequence({ ...editSequence, stages: updatedStages });
    updateSequence(editSequence.id, { stages: updatedStages });
  };

  // Funções para manipular restrições de horário
  const handleAddRestriction = (restriction: Omit<TimeRestriction, "id">) => {
    if (!editSequence) return;
    
    const newRestriction = {
      ...restriction,
      id: crypto.randomUUID()
    };
    
    const updatedRestrictions = [...editSequence.timeRestrictions, newRestriction];
    setEditSequence({ ...editSequence, timeRestrictions: updatedRestrictions });
    updateSequence(editSequence.id, { timeRestrictions: updatedRestrictions });
  };
  
  const handleUpdateRestriction = (restrictionId: string, changes: Partial<TimeRestriction>) => {
    if (!editSequence) return;
    
    const updatedRestrictions = editSequence.timeRestrictions.map(restriction => 
      restriction.id === restrictionId ? { ...restriction, ...changes } : restriction
    );
    
    setEditSequence({ ...editSequence, timeRestrictions: updatedRestrictions });
    updateSequence(editSequence.id, { timeRestrictions: updatedRestrictions });
  };
  
  const handleDeleteRestriction = (restrictionId: string) => {
    if (!editSequence) return;
    
    const updatedRestrictions = editSequence.timeRestrictions.filter(
      restriction => restriction.id !== restrictionId
    );
    
    setEditSequence({ ...editSequence, timeRestrictions: updatedRestrictions });
    updateSequence(editSequence.id, { timeRestrictions: updatedRestrictions });
  };

  // Contar restrições ativas
  const countActiveRestrictions = (restrictions: TimeRestriction[]) => {
    return restrictions.filter(r => r.active).length;
  };

  if (isCreateMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Nova Sequência</h1>
          <Button variant="ghost" onClick={() => setIsCreateMode(false)}>
            Voltar
          </Button>
        </div>
        
        <SequenceBuilder 
          onSave={handleSaveSequence}
          onCancel={() => setIsCreateMode(false)}
        />
      </div>
    );
  }
  
  if (isEditMode && currentSequence) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Editar Sequência</h1>
          <Button variant="ghost" onClick={() => {
            setIsEditMode(false);
            setCurrentSequence(null);
          }}>
            Voltar
          </Button>
        </div>
        
        <SequenceBuilder 
          sequence={currentSequence}
          onSave={handleSaveSequence}
          onCancel={() => {
            setIsEditMode(false);
            setCurrentSequence(null);
          }}
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
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="flex items-center justify-between pb-3">
          <TabsList>
            <TabsTrigger value="sequences">Sequências</TabsTrigger>
            {editSequence && (
              <TabsTrigger value="edit">Editar: {editSequence.name}</TabsTrigger>
            )}
          </TabsList>
          
          {selectedTab === "sequences" && (
            <div className="flex items-center space-x-2">
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
          )}
        </div>
        
        <TabsContent value="sequences" className="mt-0 space-y-4">
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
        </TabsContent>
        
        <TabsContent value="edit" className="mt-0">
          {editSequence && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Tabs value={activeTabSection} onValueChange={setActiveTabSection} className="w-full">
                  <TabsList>
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="stages">
                      Estágios ({editSequence.stages.length})
                    </TabsTrigger>
                    <TabsTrigger value="restrictions">
                      Restrições 
                      {countActiveRestrictions(editSequence.timeRestrictions) > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {countActiveRestrictions(editSequence.timeRestrictions)}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <TabsContent value="info" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                    <CardDescription>Configure os detalhes principais da sequência</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Nome da Sequência</label>
                        <Input
                          id="name"
                          value={editSequence.name}
                          onChange={(e) => {
                            setEditSequence({ ...editSequence, name: e.target.value });
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editSequence.status === 'active'}
                            onCheckedChange={(checked) => {
                              const status = checked ? 'active' : 'inactive';
                              setEditSequence({ ...editSequence, status });
                              updateSequence(editSequence.id, { status });
                            }}
                          />
                          <span>
                            {editSequence.status === 'active' ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium mb-3">Condições de Tags</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center">
                            <Badge className="mr-2 bg-green-600">Início</Badge>
                            Condição ({editSequence.startCondition.type})
                          </label>
                          <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-10">
                            {editSequence.startCondition.tags.map(tag => (
                              <Badge key={tag} className="bg-green-600">
                                {tag}
                              </Badge>
                            ))}
                            {editSequence.startCondition.tags.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                Nenhuma tag definida
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center">
                            <Badge className="mr-2 bg-red-600">Parada</Badge>
                            Condição ({editSequence.stopCondition.type})
                          </label>
                          <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-10">
                            {editSequence.stopCondition.tags.map(tag => (
                              <Badge key={tag} className="bg-red-600">
                                {tag}
                              </Badge>
                            ))}
                            {editSequence.stopCondition.tags.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                Nenhuma tag definida
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditSequence(null);
                          setSelectedTab("sequences");
                        }}
                        className="mr-2"
                      >
                        Voltar
                      </Button>
                      <Button
                        onClick={() => {
                          updateSequence(editSequence.id, editSequence);
                          setEditSequence(null);
                          setSelectedTab("sequences");
                        }}
                      >
                        Salvar Alterações
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="stages" className="mt-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Estágios da Sequência</CardTitle>
                      <CardDescription>Adicione e gerencie as mensagens da sequência</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-6">
                      {editSequence.stages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            Nenhum estágio definido
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {editSequence.stages.map((stage, index) => (
                            <StageItem
                              key={stage.id}
                              stage={stage}
                              index={index}
                              isFirst={index === 0}
                              isLast={index === editSequence.stages.length - 1}
                              onMoveUp={() => handleMoveStage(stage.id, "up")}
                              onMoveDown={() => handleMoveStage(stage.id, "down")}
                              onDelete={() => handleDeleteStage(stage.id)}
                              onUpdate={(updated) => handleUpdateStage(stage.id, updated)}
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium mb-3 flex items-center">
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Adicionar Novo Estágio
                        </h3>
                        <AddStageForm onAddStage={handleAddStage} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="restrictions" className="mt-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Restrições de Horário</CardTitle>
                      <CardDescription>Defina quando as mensagens não devem ser enviadas</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-6">
                      {editSequence.timeRestrictions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            Nenhuma restrição de horário definida
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            As mensagens serão enviadas em qualquer horário
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editSequence.timeRestrictions.map((restriction) => (
                            <RestrictionItem
                              key={restriction.id}
                              restriction={restriction}
                              onDelete={() => handleDeleteRestriction(restriction.id)}
                              onUpdate={(changes) => handleUpdateRestriction(restriction.id, changes)}
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium mb-3 flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Restrição de Horário
                        </h3>
                        <TimeRestrictionForm
                          existingRestrictions={editSequence.timeRestrictions}
                          onAddRestriction={handleAddRestriction}
                          onUpdateRestriction={handleUpdateRestriction}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          )}
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
                  <CardTitle className="text-lg">{sequence.name}</CardTitle>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center mr-2">
                    <Switch
                      checked={sequence.status === 'active'}
                      onCheckedChange={() => handleToggleStatus(sequence)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {sequence.status === "active" ? "Ativa" : "Inativa"}
                    </span>
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
                    <Clock className="h-4 w-4 mr-1" />
                    Restrições
                  </div>
                  <div>
                    {countActiveRestrictions(sequence.timeRestrictions) > 0 ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        {countActiveRestrictions(sequence.timeRestrictions)} {countActiveRestrictions(sequence.timeRestrictions) === 1 ? 'restrição ativa' : 'restrições ativas'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Sem restrições ativas
                      </span>
                    )}
                  </div>
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
