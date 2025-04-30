
import { useState, useEffect, useCallback, useRef } from "react";
import { PlusCircle, Clock, X, Lock, Save, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Sequence, SequenceStage, TagCondition, TimeRestriction } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestrictionItem } from "./RestrictionItem";
import { StageItem } from "./StageItem";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

export function SequenceBuilder({ sequence, onSave, onCancel }: SequenceBuilderProps) {
  const { tags, addTag: addGlobalTag, currentInstance, timeRestrictions: globalTimeRestrictions } = useApp();
  const { toast } = useToast();
  
  // Estado para controlar alterações não salvas
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const initialData = useRef({
    name: sequence?.name || "",
    startCondition: sequence?.startCondition || { type: "AND", tags: [] },
    stopCondition: sequence?.stopCondition || { type: "OR", tags: [] },
    stages: sequence?.stages || [],
    timeRestrictions: sequence?.timeRestrictions || [],
    status: sequence?.status || "active"
  });
  
  const [name, setName] = useState(initialData.current.name);
  const [startCondition, setStartCondition] = useState<TagCondition>(initialData.current.startCondition);
  const [stopCondition, setStopCondition] = useState<TagCondition>(initialData.current.stopCondition);
  const [stages, setStages] = useState<SequenceStage[]>(initialData.current.stages);
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>(initialData.current.timeRestrictions);
  const [status, setStatus] = useState<"active" | "inactive">(initialData.current.status);
  
  // Refs para controle de clique fora dos seletores de tags
  const startTagSelectorRef = useRef<HTMLDivElement>(null);
  const stopTagSelectorRef = useRef<HTMLDivElement>(null);

  const [showTagSelector, setShowTagSelector] = useState<"start" | "stop" | null>(null);
  const [newTag, setNewTag] = useState("");
  
  const [newStage, setNewStage] = useState<Omit<SequenceStage, "id">>({
    name: "",
    type: "message",
    content: "",
    delay: 60,
    delayUnit: "minutes",
  });
  
  const [newRestriction, setNewRestriction] = useState<Omit<TimeRestriction, "id">>({
    name: "Nova restrição",
    active: true,
    days: [1, 2, 3, 4, 5], // Monday to Friday
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
    isGlobal: false, // Por padrão, novas restrições são locais
  });

  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageToEdit, setStageToEdit] = useState<SequenceStage | null>(null);
  
  // Define dayNames for use throughout the component
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  // Filtra restrições globais disponíveis (que não estão já adicionadas à sequência)
  const availableGlobalRestrictions = globalTimeRestrictions.filter(
    gr => !timeRestrictions.some(tr => tr.id === gr.id && tr.isGlobal)
  );

  // Verificar se há alterações não salvas
  useEffect(() => {
    const currentData = {
      name,
      startCondition,
      stopCondition,
      stages,
      timeRestrictions,
      status
    };

    const hasChanges = 
      name !== initialData.current.name ||
      JSON.stringify(startCondition) !== JSON.stringify(initialData.current.startCondition) ||
      JSON.stringify(stopCondition) !== JSON.stringify(initialData.current.stopCondition) ||
      JSON.stringify(stages) !== JSON.stringify(initialData.current.stages) ||
      JSON.stringify(timeRestrictions) !== JSON.stringify(initialData.current.timeRestrictions) ||
      status !== initialData.current.status;

    setHasUnsavedChanges(hasChanges);
  }, [name, startCondition, stopCondition, stages, timeRestrictions, status]);

  // Handler para clique fora do seletor de tags
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTagSelector === "start" && 
          startTagSelectorRef.current && 
          !startTagSelectorRef.current.contains(event.target as Node)) {
        setShowTagSelector(null);
      }
      
      if (showTagSelector === "stop" && 
          stopTagSelectorRef.current && 
          !stopTagSelectorRef.current.contains(event.target as Node)) {
        setShowTagSelector(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTagSelector]);
  
  const addTag = (target: "start" | "stop", tag: string) => {
    if (!tag) return;
    
    // Adicionar tag à lista global se não existir
    if (!tags.includes(tag)) {
      addGlobalTag(tag);
    }
    
    if (target === "start") {
      if (!startCondition.tags.includes(tag)) {
        setStartCondition({
          ...startCondition,
          tags: [...startCondition.tags, tag],
        });
      }
    } else {
      if (!stopCondition.tags.includes(tag)) {
        setStopCondition({
          ...stopCondition,
          tags: [...stopCondition.tags, tag],
        });
      }
    }
    setNewTag("");
  };
  
  const removeTag = (target: "start" | "stop", tag: string) => {
    if (target === "start") {
      setStartCondition({
        ...startCondition,
        tags: startCondition.tags.filter(t => t !== tag),
      });
    } else {
      setStopCondition({
        ...stopCondition,
        tags: stopCondition.tags.filter(t => t !== tag),
      });
    }
  };
  
  const toggleConditionType = (target: "start" | "stop") => {
    if (target === "start") {
      setStartCondition({
        ...startCondition,
        type: startCondition.type === "AND" ? "OR" : "AND",
      });
    } else {
      setStopCondition({
        ...stopCondition,
        type: stopCondition.type === "AND" ? "OR" : "AND",
      });
    }
  };
  
  const addStage = () => {
    if (!newStage.name || !newStage.content) return;
    
    const stage: SequenceStage = {
      ...newStage,
      id: crypto.randomUUID(),
    };
    
    setStages([...stages, stage]);
    
    // Reset form
    setNewStage({
      name: "",
      type: "message",
      content: "",
      delay: 60,
      delayUnit: "minutes",
    });
  };
  
  const removeStage = (id: string) => {
    setStages(stages.filter(stage => stage.id !== id));
    if (editingStageId === id) {
      setEditingStageId(null);
      setStageToEdit(null);
    }
  };

  const startEditingStage = (stage: SequenceStage) => {
    setEditingStageId(stage.id);
    setStageToEdit({...stage});
  };

  const updateStage = (updatedStage: SequenceStage) => {
    setStages(stages.map(stage => 
      stage.id === updatedStage.id ? updatedStage : stage
    ));
    setEditingStageId(null);
    setStageToEdit(null);
    
    // Mostrar toast de confirmação
    toast({
      title: "Estágio atualizado",
      description: `O estágio "${updatedStage.name}" foi atualizado com sucesso.`,
      duration: 3000,
    });
  };
  
  const moveStage = (id: string, direction: "up" | "down") => {
    const index = stages.findIndex(s => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === stages.length - 1)
    ) {
      return;
    }
    
    const newStages = [...stages];
    const step = direction === "up" ? -1 : 1;
    [newStages[index], newStages[index + step]] = [newStages[index + step], newStages[index]];
    
    setStages(newStages);
  };
  
  const addLocalRestriction = () => {
    const restriction: TimeRestriction = {
      ...newRestriction,
      id: crypto.randomUUID(),
      isGlobal: false, // Sempre marca como restrição local
    };
    
    setTimeRestrictions([...timeRestrictions, restriction]);
    
    // Reset form
    setNewRestriction({
      name: "Nova restrição",
      active: true,
      days: [1, 2, 3, 4, 5],
      startHour: 22,
      startMinute: 0,
      endHour: 8,
      endMinute: 0,
      isGlobal: false,
    });
  };

  const addGlobalRestriction = (restriction: TimeRestriction) => {
    // Verifica se já não existe na lista
    if (timeRestrictions.some(r => r.id === restriction.id)) return;
    
    setTimeRestrictions([...timeRestrictions, { ...restriction, isGlobal: true }]);
    
    // Mostrar toast de confirmação
    toast({
      title: "Restrição global adicionada",
      description: `A restrição global "${restriction.name}" foi adicionada à sequência.`,
      duration: 3000,
    });
  };
  
  const removeTimeRestriction = (id: string) => {
    setTimeRestrictions(timeRestrictions.filter(r => r.id !== id));
  };

  const updateLocalRestriction = (updatedRestriction: TimeRestriction) => {
    // Apenas permite atualizar restrições locais
    if (updatedRestriction.isGlobal) return;
    
    setTimeRestrictions(timeRestrictions.map(r => 
      r.id === updatedRestriction.id ? updatedRestriction : r
    ));
    
    // Mostrar toast de confirmação
    toast({
      title: "Restrição atualizada",
      description: `A restrição "${updatedRestriction.name}" foi atualizada com sucesso.`,
      duration: 3000,
    });
  };
  
  const handleSubmit = () => {
    if (!name) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe um nome para a sequência.",
        variant: "destructive",
      });
      return;
    }
    
    if (startCondition.tags.length === 0) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, adicione pelo menos uma tag para a condição de início.",
        variant: "destructive",
      });
      return;
    }
    
    if (stages.length === 0) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, adicione pelo menos um estágio à sequência.",
        variant: "destructive",
      });
      return;
    }
    
    const newSequence: Omit<Sequence, "id" | "createdAt" | "updatedAt"> = {
      name,
      instanceId: currentInstance?.id || "",
      startCondition,
      stopCondition,
      stages,
      timeRestrictions,
      status,
    };
    
    onSave(newSequence);
  };
  
  const handleAttemptExit = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onCancel();
    }
  };
  
  const getActiveRestrictionCount = () => {
    return timeRestrictions.filter(r => r.active).length;
  };

  // Separar restrições globais e locais
  const globalRestrictions = timeRestrictions.filter(r => r.isGlobal);
  const localRestrictions = timeRestrictions.filter(r => !r.isGlobal);

  // Verifica se uma restrição global está selecionada
  const isGlobalRestrictionSelected = (id: string) => {
    return timeRestrictions.some(r => r.id === id && r.isGlobal);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="w-fit">
            <TabsTrigger value="basic" className="flex-1">Informações Básicas</TabsTrigger>
            <TabsTrigger value="stages" className="flex-1">
              Estágios
              <Badge variant="secondary" className="ml-2">{stages.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="restrictions" className="flex-1">
              Restrições de Horário
              <Badge variant="secondary" className="ml-2">{getActiveRestrictionCount()}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleAttemptExit}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="default"
              disabled={!hasUnsavedChanges}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
        
        <TabsContent value="basic" className="pt-2">
          <div className="grid gap-6 grid-cols-1">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Configure os detalhes principais da sequência</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Sequência</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Ex: Sequência de Boas-vindas"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between bg-muted/50 border rounded-lg p-3">
                    <div className="flex flex-col">
                      <Label htmlFor="status" className="mb-1">Status da Sequência</Label>
                      <span className="text-sm text-muted-foreground">
                        {status === "active" ? "Sequência ativa e pronta para uso" : "Sequência inativa (desabilitada)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        status === "active" ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {status === "active" ? "Ativa" : "Inativa"}
                      </span>
                      <Switch
                        id="status"
                        checked={status === "active"}
                        onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Start Condition */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2 bg-green-600">Início</Badge>
                    Condição de Início
                  </CardTitle>
                  <CardDescription>
                    Define quando um contato deve entrar nesta sequência
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => toggleConditionType("start")}
                    >
                      <span className="font-mono">{startCondition.type}</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {startCondition.type === "AND" 
                        ? "Contato precisa ter TODAS as tags selecionadas" 
                        : "Contato precisa ter QUALQUER UMA das tags selecionadas"}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {startCondition.tags.map((tag) => (
                        <Badge key={tag} className="bg-green-600">
                          {tag}
                          <button
                            className="ml-1 hover:bg-green-700 rounded-full"
                            onClick={() => removeTag("start", tag)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {startCondition.tags.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          Nenhuma tag adicionada
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2" ref={startTagSelectorRef}>
                      <div className="relative flex-1">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Digite ou selecione uma tag"
                          onFocus={() => setShowTagSelector("start")}
                        />
                        {showTagSelector === "start" && (
                          <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                            {tags.filter(tag => !startCondition.tags.includes(tag)).length > 0 ? (
                              tags
                                .filter(tag => !startCondition.tags.includes(tag))
                                .map(tag => (
                                  <button
                                    key={tag}
                                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                    onClick={() => {
                                      addTag("start", tag);
                                      setShowTagSelector(null);
                                    }}
                                  >
                                    {tag}
                                  </button>
                                ))
                            ) : (
                              <div className="px-3 py-1.5 text-sm text-muted-foreground">
                                Sem tags disponíveis
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => {
                          addTag("start", newTag);
                          setShowTagSelector(null);
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Stop Condition */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2 bg-red-600">Parada</Badge>
                    Condição de Parada
                  </CardTitle>
                  <CardDescription>
                    Define quando um contato deve ser removido desta sequência
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => toggleConditionType("stop")}
                    >
                      <span className="font-mono">{stopCondition.type}</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {stopCondition.type === "AND" 
                        ? "Contato será removido se tiver TODAS as tags selecionadas" 
                        : "Contato será removido se tiver QUALQUER UMA das tags selecionadas"}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {stopCondition.tags.map((tag) => (
                        <Badge key={tag} className="bg-red-600">
                          {tag}
                          <button
                            className="ml-1 hover:bg-red-700 rounded-full"
                            onClick={() => removeTag("stop", tag)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {stopCondition.tags.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          Nenhuma tag adicionada
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2" ref={stopTagSelectorRef}>
                      <div className="relative flex-1">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Digite ou selecione uma tag"
                          onFocus={() => setShowTagSelector("stop")}
                        />
                        {showTagSelector === "stop" && (
                          <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                            {tags.filter(tag => !stopCondition.tags.includes(tag)).length > 0 ? (
                              tags
                                .filter(tag => !stopCondition.tags.includes(tag))
                                .map(tag => (
                                  <button
                                    key={tag}
                                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                    onClick={() => {
                                      addTag("stop", tag);
                                      setShowTagSelector(null);
                                    }}
                                  >
                                    {tag}
                                  </button>
                                ))
                            ) : (
                              <div className="px-3 py-1.5 text-sm text-muted-foreground">
                                Sem tags disponíveis
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => {
                          addTag("stop", newTag);
                          setShowTagSelector(null);
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="stages" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle>Estágios da Sequência</CardTitle>
              <CardDescription>
                Defina as mensagens que serão enviadas e quando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Nenhum estágio definido
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione pelo menos um estágio à sua sequência
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stages.map((stage, index) => (
                    <StageItem 
                      key={stage.id}
                      stage={stage}
                      index={index}
                      isEditing={editingStageId === stage.id}
                      stageToEdit={stageToEdit}
                      onEdit={startEditingStage}
                      onUpdate={updateStage}
                      onCancel={() => {
                        setEditingStageId(null);
                        setStageToEdit(null);
                      }}
                      onRemove={removeStage}
                      onMove={moveStage}
                      isFirst={index === 0}
                      isLast={index === stages.length - 1}
                    />
                  ))}
                </div>
              )}
              
              {/* Add Stage */}
              <Accordion type="single" collapsible>
                <AccordionItem value="add-stage">
                  <AccordionTrigger className="py-2">
                    <div className="flex items-center">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      <span>Adicionar Estágio</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stage-name">Nome do Estágio</Label>
                          <Input 
                            id="stage-name" 
                            value={newStage.name} 
                            onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                            placeholder="Ex: Boas-vindas"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stage-type">Tipo do Conteúdo</Label>
                          <Select
                            value={newStage.type}
                            onValueChange={(value) => setNewStage({ 
                              ...newStage, 
                              type: value as "message" | "pattern" | "typebot" 
                            })}
                          >
                            <SelectTrigger id="stage-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="message">Mensagem</SelectItem>
                              <SelectItem value="pattern">Pattern</SelectItem>
                              <SelectItem value="typebot">Typebot</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="stage-content">
                          {newStage.type === "message" ? "Mensagem" : 
                          newStage.type === "pattern" ? "Pattern" : "Link do Typebot"}
                        </Label>
                        {newStage.type === "typebot" ? (
                          <div className="space-y-4">
                            <Input 
                              id="stage-content" 
                              value={newStage.content} 
                              onChange={(e) => setNewStage({ ...newStage, content: e.target.value })}
                              placeholder="https://typebot.io/seu-bot"
                            />
                            <div className="space-y-2">
                              <Label htmlFor="typebot-stage">Estágio do Typebot</Label>
                              <Select
                                value={newStage.typebotStage || "stg1"}
                                onValueChange={(value) => setNewStage({
                                  ...newStage,
                                  typebotStage: value
                                })}
                              >
                                <SelectTrigger id="typebot-stage">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="stg1">Estágio 1</SelectItem>
                                  <SelectItem value="stg2">Estágio 2</SelectItem>
                                  <SelectItem value="stg3">Estágio 3</SelectItem>
                                  <SelectItem value="stg4">Estágio 4</SelectItem>
                                  <SelectItem value="stg5">Estágio 5</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : (
                          <Textarea 
                            id="stage-content" 
                            value={newStage.content} 
                            onChange={(e) => setNewStage({ ...newStage, content: e.target.value })}
                            rows={4}
                            placeholder={
                              newStage.type === "message" 
                                ? "Digite sua mensagem. Use ${name} para incluir o nome do contato."
                                : "IMAGE::https://example.com/produto-xyz.jpg||TEXT::Confira todos os detalhes!"
                            }
                          />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stage-delay">Atraso</Label>
                          <Input 
                            id="stage-delay" 
                            type="number" 
                            min="1"
                            value={newStage.delay} 
                            onChange={(e) => setNewStage({ 
                              ...newStage, 
                              delay: parseInt(e.target.value) || 60
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stage-delay-unit">Unidade</Label>
                          <Select
                            value={newStage.delayUnit}
                            onValueChange={(value) => setNewStage({ 
                              ...newStage, 
                              delayUnit: value as "minutes" | "hours" | "days" 
                            })}
                          >
                            <SelectTrigger id="stage-delay-unit">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutos</SelectItem>
                              <SelectItem value="hours">Horas</SelectItem>
                              <SelectItem value="days">Dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <Button onClick={addStage}>Adicionar Estágio</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="restrictions" className="pt-2">
          <div className="space-y-4">
            {/* Restrições Locais */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Restrições de Horário</CardTitle>
                  <CardDescription>
                    Define quando as mensagens não serão enviadas
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 flex items-center gap-1">
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Nova Restrição
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Restrição Local</DialogTitle>
                      <DialogDescription>
                        Restrições locais são específicas desta sequência
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="restriction-name">Nome da Restrição</Label>
                        <Input 
                          id="restriction-name" 
                          value={newRestriction.name} 
                          onChange={(e) => setNewRestriction({ ...newRestriction, name: e.target.value })}
                          placeholder="Ex: Horário noturno"
                        />
                      </div>
                    
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="restriction-active">Ativa</Label>
                        <Switch
                          id="restriction-active"
                          checked={newRestriction.active}
                          onCheckedChange={(checked) => setNewRestriction({
                            ...newRestriction,
                            active: checked
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Dias da Semana</Label>
                        <ToggleGroup 
                          type="multiple" 
                          variant="outline"
                          className="justify-start"
                          value={newRestriction.days.map(d => d.toString())}
                          onValueChange={(value) => {
                            if (value.length > 0) {
                              setNewRestriction({
                                ...newRestriction,
                                days: value.map(v => parseInt(v))
                              });
                            }
                          }}
                        >
                          {[
                            { value: "0", label: "Dom" },
                            { value: "1", label: "Seg" },
                            { value: "2", label: "Ter" },
                            { value: "3", label: "Qua" },
                            { value: "4", label: "Qui" },
                            { value: "5", label: "Sex" },
                            { value: "6", label: "Sáb" }
                          ].map(day => (
                            <ToggleGroupItem 
                              key={day.value} 
                              value={day.value} 
                              aria-label={dayNames[parseInt(day.value)]}
                              className="px-3"
                            >
                              {day.label}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Horário de Início</Label>
                          <div className="flex space-x-2">
                            <Select
                              value={newRestriction.startHour.toString().padStart(2, '0')}
                              onValueChange={(value) => setNewRestriction({
                                ...newRestriction,
                                startHour: parseInt(value)
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => (
                                  <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={newRestriction.startMinute.toString().padStart(2, '0')}
                              onValueChange={(value) => setNewRestriction({
                                ...newRestriction,
                                startMinute: parseInt(value)
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }).map((_, i) => (
                                  <SelectItem key={i} value={(i * 5).toString().padStart(2, '0')}>
                                    {(i * 5).toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Horário de Término</Label>
                          <div className="flex space-x-2">
                            <Select
                              value={newRestriction.endHour.toString().padStart(2, '0')}
                              onValueChange={(value) => setNewRestriction({
                                ...newRestriction,
                                endHour: parseInt(value)
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => (
                                  <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={newRestriction.endMinute.toString().padStart(2, '0')}
                              onValueChange={(value) => setNewRestriction({
                                ...newRestriction,
                                endMinute: parseInt(value)
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }).map((_, i) => (
                                  <SelectItem key={i} value={(i * 5).toString().padStart(2, '0')}>
                                    {(i * 5).toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit" onClick={addLocalRestriction}>
                        Adicionar Restrição
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Restrições Locais */}
                  <div className="bg-card border rounded-md p-4">
                    <h3 className="font-medium mb-3">Restrições Locais</h3>
                    <div className="space-y-3">
                      {localRestrictions.length > 0 ? (
                        localRestrictions.map((restriction) => (
                          <RestrictionItem
                            key={restriction.id}
                            restriction={restriction}
                            onRemove={removeTimeRestriction}
                            onUpdate={updateLocalRestriction}
                            editable={true}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma restrição local adicionada
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Restrições Globais */}
                  <div className="bg-card border rounded-md p-4">
                    <h3 className="font-medium mb-3">Restrições Globais Disponíveis</h3>
                    <div className="space-y-3">
                      {availableGlobalRestrictions.length > 0 ? (
                        availableGlobalRestrictions.map((restriction) => (
                          <div key={restriction.id} className="flex items-center justify-between p-3 bg-background border rounded-md">
                            <div className="flex-grow">
                              <RestrictionItem
                                restriction={restriction}
                                editable={false}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addGlobalRestriction(restriction)}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Adicionar
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma restrição global disponível
                        </p>
                      )}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <h3 className="font-medium mb-3">Restrições Globais Adicionadas</h3>
                    <div className="space-y-3">
                      {globalRestrictions.length > 0 ? (
                        globalRestrictions.map((restriction) => (
                          <RestrictionItem
                            key={restriction.id}
                            restriction={restriction}
                            onRemove={removeTimeRestriction}
                            editable={false}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma restrição global adicionada
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Dialog para alterações não salvas */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

