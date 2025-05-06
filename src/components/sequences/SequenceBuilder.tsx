import { useState, useEffect } from "react";
import { PlusCircle, Clock, Trash2, ChevronDown, ChevronUp, MessageCircle, FileCode, Bot, X, Edit, Save, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Sequence, SequenceStage, ComplexTagCondition, TagCondition, TimeRestriction } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestrictionItem } from "./RestrictionItem";
import { StageItem } from "./StageItem";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { isValidUUID } from "@/integrations/supabase/client";

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  onChangesMade?: () => void;
}

export function SequenceBuilder({ sequence, onSave, onCancel, onChangesMade }: SequenceBuilderProps) {
  const { tags, currentInstance, timeRestrictions: globalTimeRestrictions, addTag } = useApp();
  
  const [name, setName] = useState(sequence?.name || "");
  const [startCondition, setStartCondition] = useState<ComplexTagCondition>(
    sequence?.startCondition || { groups: [{ type: "AND", tags: [] }] }
  );
  const [stopCondition, setStopCondition] = useState<ComplexTagCondition>(
    sequence?.stopCondition || { groups: [{ type: "OR", tags: [] }] }
  );
  const [stages, setStages] = useState<SequenceStage[]>(
    sequence?.stages || []
  );
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>(
    sequence?.timeRestrictions || []
  );
  const [status, setStatus] = useState<"active" | "inactive">(
    sequence?.status || "active"
  );
  const [type, setType] = useState<"message" | "pattern" | "typebot">(
    sequence?.type || "message"
  );
  
  const [showTagSelector, setShowTagSelector] = useState<{ 
    type: "start" | "stop",
    groupIndex: number 
  } | null>(null);
  const [newTag, setNewTag] = useState("");
  
  const [newStage, setNewStage] = useState<Omit<SequenceStage, "id">>({
    name: "",
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

  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showGlobalRestrictionsDialog, setShowGlobalRestrictionsDialog] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageToEdit, setStageToEdit] = useState<SequenceStage | null>(null);
  const [showAddRestrictionDialog, setShowAddRestrictionDialog] = useState(false);
  const [addingConditionGroup, setAddingConditionGroup] = useState<"start" | "stop" | null>(null);
  
  // Define dayNames for use throughout the component
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  // Filtra restrições globais disponíveis (que não estão já adicionadas à sequência)
  const availableGlobalRestrictions = globalTimeRestrictions.filter(
    gr => !timeRestrictions.some(tr => tr.id === gr.id && tr.isGlobal)
  );

  // Notify parent component when changes are made
  const notifyChanges = () => {
    if (onChangesMade) {
      onChangesMade();
    }
  };
  
  const addTagToCondition = (conditionType: "start" | "stop", groupIndex: number, tag: string) => {
    if (!tag) return;

    // Save tag to the global tag list for reuse
    if (!tags.includes(tag)) {
      addTag(tag);
    }
    
    if (conditionType === "start") {
      const updatedGroups = [...startCondition.groups];
      if (!updatedGroups[groupIndex].tags.includes(tag)) {
        updatedGroups[groupIndex] = {
          ...updatedGroups[groupIndex],
          tags: [...updatedGroups[groupIndex].tags, tag]
        };
        setStartCondition({
          groups: updatedGroups
        });
        notifyChanges();
      }
    } else {
      const updatedGroups = [...stopCondition.groups];
      if (!updatedGroups[groupIndex].tags.includes(tag)) {
        updatedGroups[groupIndex] = {
          ...updatedGroups[groupIndex],
          tags: [...updatedGroups[groupIndex].tags, tag]
        };
        setStopCondition({
          groups: updatedGroups
        });
        notifyChanges();
      }
    }
    
    setNewTag("");
    setShowTagSelector(null);
  };
  
  const removeTag = (conditionType: "start" | "stop", groupIndex: number, tag: string) => {
    if (conditionType === "start") {
      const updatedGroups = [...startCondition.groups];
      updatedGroups[groupIndex] = {
        ...updatedGroups[groupIndex],
        tags: updatedGroups[groupIndex].tags.filter(t => t !== tag)
      };
      setStartCondition({
        groups: updatedGroups
      });
    } else {
      const updatedGroups = [...stopCondition.groups];
      updatedGroups[groupIndex] = {
        ...updatedGroups[groupIndex],
        tags: updatedGroups[groupIndex].tags.filter(t => t !== tag)
      };
      setStopCondition({
        groups: updatedGroups
      });
    }
    notifyChanges();
  };
  
  const toggleConditionType = (conditionType: "start" | "stop", groupIndex: number) => {
    if (conditionType === "start") {
      const updatedGroups = [...startCondition.groups];
      updatedGroups[groupIndex] = {
        ...updatedGroups[groupIndex],
        type: updatedGroups[groupIndex].type === "AND" ? "OR" : "AND"
      };
      setStartCondition({
        groups: updatedGroups
      });
    } else {
      const updatedGroups = [...stopCondition.groups];
      updatedGroups[groupIndex] = {
        ...updatedGroups[groupIndex],
        type: updatedGroups[groupIndex].type === "AND" ? "OR" : "AND"
      };
      setStopCondition({
        groups: updatedGroups
      });
    }
    notifyChanges();
  };

  const addConditionGroup = (conditionType: "start" | "stop") => {
    const newGroup: TagCondition = {
      type: conditionType === "start" ? "AND" : "OR",
      tags: []
    };

    if (conditionType === "start") {
      setStartCondition({
        groups: [...startCondition.groups, newGroup]
      });
    } else {
      setStopCondition({
        groups: [...stopCondition.groups, newGroup]
      });
    }

    setAddingConditionGroup(null);
    notifyChanges();
  };

  const removeConditionGroup = (conditionType: "start" | "stop", groupIndex: number) => {
    if (conditionType === "start" && startCondition.groups.length <= 1) {
      toast.error("Deve haver pelo menos um grupo de condição de início");
      return;
    }

    if (conditionType === "stop" && stopCondition.groups.length <= 1) {
      toast.error("Deve haver pelo menos um grupo de condição de parada");
      return;
    }

    if (conditionType === "start") {
      setStartCondition({
        groups: startCondition.groups.filter((_, idx) => idx !== groupIndex)
      });
    } else {
      setStopCondition({
        groups: stopCondition.groups.filter((_, idx) => idx !== groupIndex)
      });
    }
    notifyChanges();
  };
  
  const addStage = () => {
    if (!newStage.name || !newStage.content) return;
    
    try {
      const stage: SequenceStage = {
        ...newStage,
        id: uuidv4(),
      };
      
      setStages([...stages, stage]);
      notifyChanges();
      
      // Reset form
      setNewStage({
        name: "",
        content: "",
        delay: 60,
        delayUnit: "minutes",
      });
    } catch (error) {
      console.error("Erro ao adicionar estágio:", error);
      toast.error("Erro ao adicionar estágio. Verifique o console para mais detalhes.");
    }
  };
  
  const removeStage = (id: string) => {
    try {
      if (!id || !isValidUUID(id)) {
        console.error("ID de estágio inválido:", id);
        toast.error("ID de estágio inválido");
        return;
      }
      
      setStages(stages.filter(stage => stage.id !== id));
      if (editingStageId === id) {
        setEditingStageId(null);
        setStageToEdit(null);
      }
      notifyChanges();
    } catch (error) {
      console.error("Erro ao remover estágio:", error);
      toast.error("Erro ao remover estágio. Verifique o console para mais detalhes.");
    }
  };

  const startEditingStage = (stage: SequenceStage) => {
    try {
      if (!stage.id || !isValidUUID(stage.id)) {
        console.error("ID de estágio inválido:", stage.id);
        toast.error("ID de estágio inválido");
        return;
      }
      
      setEditingStageId(stage.id);
      setStageToEdit({...stage});
    } catch (error) {
      console.error("Erro ao editar estágio:", error);
      toast.error("Erro ao editar estágio. Verifique o console para mais detalhes.");
    }
  };

  const updateStage = (updatedStage: SequenceStage) => {
    try {
      if (!updatedStage.id || !isValidUUID(updatedStage.id)) {
        console.error("ID de estágio inválido:", updatedStage.id);
        toast.error("ID de estágio inválido");
        return;
      }
      
      setStages(stages.map(stage => 
        stage.id === updatedStage.id ? updatedStage : stage
      ));
      setEditingStageId(null);
      setStageToEdit(null);
      toast.success("Estágio atualizado com sucesso");
      notifyChanges();
    } catch (error) {
      console.error("Erro ao atualizar estágio:", error);
      toast.error("Erro ao atualizar estágio. Verifique o console para mais detalhes.");
    }
  };
  
  const moveStage = (id: string, direction: "up" | "down") => {
    try {
      if (!id || !isValidUUID(id)) {
        console.error("ID de estágio inválido:", id);
        toast.error("ID de estágio inválido");
        return;
      }
      
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
      notifyChanges();
    } catch (error) {
      console.error("Erro ao mover estágio:", error);
      toast.error("Erro ao mover estágio. Verifique o console para mais detalhes.");
    }
  };
  
  const addLocalRestriction = () => {
    try {
      const restriction: TimeRestriction = {
        ...newRestriction,
        id: uuidv4(),
        isGlobal: false, // Sempre marca como restrição local
      };
      
      setTimeRestrictions([...timeRestrictions, restriction]);
      notifyChanges();
      setShowAddRestrictionDialog(false);
      
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
    } catch (error) {
      console.error("Erro ao adicionar restrição local:", error);
      toast.error("Erro ao adicionar restrição local. Verifique o console para mais detalhes.");
    }
  };

  const addGlobalRestriction = (restriction: TimeRestriction) => {
    try {
      // Verifica se já não existe na lista
      if (timeRestrictions.some(r => r.id === restriction.id)) return;
      
      if (!restriction.id || !isValidUUID(restriction.id)) {
        console.error("ID de restrição inválido:", restriction.id);
        toast.error("ID de restrição inválido");
        return;
      }
      
      setTimeRestrictions([...timeRestrictions, { ...restriction, isGlobal: true }]);
      notifyChanges();
    } catch (error) {
      console.error("Erro ao adicionar restrição global:", error);
      toast.error("Erro ao adicionar restrição global. Verifique o console para mais detalhes.");
    }
  };
  
  const removeTimeRestriction = (id: string) => {
    try {
      if (!id || !isValidUUID(id)) {
        console.error("ID de restrição inválido:", id);
        toast.error("ID de restrição inválido");
        return;
      }
      
      setTimeRestrictions(timeRestrictions.filter(r => r.id !== id));
      notifyChanges();
    } catch (error) {
      console.error("Erro ao remover restrição de tempo:", error);
      toast.error("Erro ao remover restrição de tempo. Verifique o console para mais detalhes.");
    }
  };

  const updateLocalRestriction = (updatedRestriction: TimeRestriction) => {
    try {
      // Apenas permite atualizar restrições locais
      if (updatedRestriction.isGlobal) return;
      
      if (!updatedRestriction.id || !isValidUUID(updatedRestriction.id)) {
        console.error("ID de restrição inválido:", updatedRestriction.id);
        toast.error("ID de restrição inválido");
        return;
      }
      
      setTimeRestrictions(timeRestrictions.map(r => 
        r.id === updatedRestriction.id ? updatedRestriction : r
      ));
      notifyChanges();
    } catch (error) {
      console.error("Erro ao atualizar restrição local:", error);
      toast.error("Erro ao atualizar restrição local. Verifique o console para mais detalhes.");
    }
  };
  
  const handleSubmit = () => {
    try {
      if (!name) {
        toast.error("Por favor, informe um nome para a sequência.");
        return;
      }
      
      // Verificar se pelo menos um grupo de condição de início tem tags
      const hasStartTags = startCondition.groups.some(group => group.tags.length > 0);
      if (!hasStartTags) {
        toast.error("Por favor, adicione pelo menos uma tag para a condição de início.");
        return;
      }
      
      if (stages.length === 0) {
        toast.error("Por favor, adicione pelo menos um estágio à sequência.");
        return;
      }
      
      if (!currentInstance || !currentInstance.id) {
        toast.error("Nenhuma instância selecionada.");
        return;
      }
      
      // Validar a instanceId
      if (!isValidUUID(currentInstance.id)) {
        console.error("ID de instância inválido:", currentInstance.id);
        toast.error("ID de instância inválido");
        return;
      }
      
      const newSequence: Omit<Sequence, "id" | "createdAt" | "updatedAt"> = {
        name,
        instanceId: currentInstance.id,
        type,
        startCondition,
        stopCondition,
        stages,
        timeRestrictions,
        status,
      };
      
      console.log("Dados da sequência sendo enviados:", JSON.stringify(newSequence, null, 2));
      
      onSave(newSequence);
    } catch (error) {
      console.error("Erro ao enviar sequência:", error);
      toast.error("Erro ao criar sequência. Verifique o console para mais detalhes.");
    }
  };
  
  const getDayName = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[day];
  };
  
  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };
  
  const getActiveRestrictionCount = () => {
    return timeRestrictions.filter(r => r.active).length;
  };

  // Verify if a global restriction is selected
  const isGlobalRestrictionSelected = (id: string) => {
    return timeRestrictions.some(r => r.id === id && r.isGlobal);
  };

  // Separate global and local restrictions
  const globalRestrictions = timeRestrictions.filter(r => r.isGlobal);
  const localRestrictions = timeRestrictions.filter(r => !r.isGlobal);
  
  // Check if form has been modified from initial values
  const hasBeenModified = () => {
    if (!sequence) return name !== '' || startCondition.groups.some(g => g.tags.length > 0) || stages.length > 0;
    
    return (
      name !== sequence.name ||
      type !== sequence.type ||
      JSON.stringify(startCondition) !== JSON.stringify(sequence.startCondition) ||
      JSON.stringify(stopCondition) !== JSON.stringify(sequence.stopCondition) ||
      JSON.stringify(stages) !== JSON.stringify(sequence.stages) ||
      JSON.stringify(timeRestrictions) !== JSON.stringify(sequence.timeRestrictions) ||
      status !== sequence.status
    );
  };
  
  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTagSelector && !(event.target as Element).closest('.tag-selector')) {
        setShowTagSelector(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagSelector]);

  const handleCancel = () => {
    if (hasBeenModified()) {
      toast.warning("Atenção! Você tem alterações não salvas. Deseja mesmo sair?", {
        action: {
          label: "Sim, sair",
          onClick: () => onCancel()
        },
        cancel: {
          label: "Não, continuar editando",
          onClick: () => {}
        }
      });
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with buttons - moved to the top */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Configuração da Sequência</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            disabled={!hasBeenModified()}
            className={!hasBeenModified() ? "opacity-50" : ""}
          >
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList className="w-full">
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
        
        <TabsContent value="basic" className="pt-6">
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
                    onChange={(e) => {
                      setName(e.target.value);
                      notifyChanges();
                    }} 
                    placeholder="Ex: Sequência de Boas-vindas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo da Sequência</Label>
                  <Select
                    value={type}
                    onValueChange={(value) => {
                      setType(value as "message" | "pattern" | "typebot");
                      notifyChanges();
                    }}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">
                        <div className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          <span>Mensagem</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pattern">
                        <div className="flex items-center">
                          <FileCode className="h-4 w-4 mr-2" />
                          <span>Pattern</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="typebot">
                        <div className="flex items-center">
                          <Bot className="h-4 w-4 mr-2" />
                          <span>Typebot</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="mt-2">
                    <Switch
                      id="status"
                      checked={status === "active"}
                      onCheckedChange={(checked) => {
                        setStatus(checked ? "active" : "inactive");
                        notifyChanges();
                      }}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="ml-2 text-sm">
                      {status === "active" ? "Sequência ativa" : "Sequência inativa"}
                    </span>
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
                  {startCondition.groups.map((group, groupIndex) => (
                    <div key={`start-group-${groupIndex}`} className="border rounded-md p-3 relative">
                      {groupIndex > 0 && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-background px-2 text-sm text-muted-foreground">
                          OU
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => toggleConditionType("start", groupIndex)}
                          >
                            <span className="font-mono">{group.type}</span>
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {group.type === "AND" 
                              ? "Contato precisa ter TODAS as tags selecionadas" 
                              : "Contato precisa ter QUALQUER UMA das tags selecionadas"}
                          </span>
                        </div>
                        
                        {startCondition.groups.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeConditionGroup("start", groupIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 min-h-8">
                          {group.tags.map((tag) => (
                            <Badge key={tag} className="bg-green-600">
                              {tag}
                              <button
                                className="ml-1 hover:bg-green-700 rounded-full"
                                onClick={() => removeTag("start", groupIndex, tag)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {group.tags.length === 0 && (
                            <span className="text-sm text-muted-foreground">
                              Nenhuma tag adicionada
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 tag-selector">
                          <div className="relative flex-1">
                            <Input
                              value={showTagSelector?.type === "start" && showTagSelector?.groupIndex === groupIndex ? newTag : ""}
                              onChange={(e) => setNewTag(e.target.value)}
                              placeholder="Digite ou selecione uma tag"
                              onFocus={() => setShowTagSelector({ type: "start", groupIndex })}
                            />
                            {showTagSelector?.type === "start" && showTagSelector?.groupIndex === groupIndex && (
                              <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                                {tags.filter(tag => !group.tags.includes(tag)).length > 0 ? (
                                  tags
                                    .filter(tag => !group.tags.includes(tag))
                                    .map(tag => (
                                      <button
                                        key={tag}
                                        className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                        onClick={() => {
                                          addTagToCondition("start", groupIndex, tag);
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
                              addTagToCondition("start", groupIndex, newTag);
                            }}
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => addConditionGroup("start")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Adicionar Grupo OU
                  </Button>
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
                  {stopCondition.groups.map((group, groupIndex) => (
                    <div key={`stop-group-${groupIndex}`} className="border rounded-md p-3 relative">
                      {groupIndex > 0 && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-background px-2 text-sm text-muted-foreground">
                          OU
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => toggleConditionType("stop", groupIndex)}
                          >
                            <span className="font-mono">{group.type}</span>
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {group.type === "AND" 
                              ? "Contato será removido se tiver TODAS as tags selecionadas" 
                              : "Contato será removido se tiver QUALQUER UMA das tags selecionadas"}
                          </span>
                        </div>
                        
                        {stopCondition.groups.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeConditionGroup("stop", groupIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 min-h-8">
                          {group.tags.map((tag) => (
                            <Badge key={tag} className="bg-red-600">
                              {tag}
                              <button
                                className="ml-1 hover:bg-red-700 rounded-full"
                                onClick={() => removeTag("stop", groupIndex, tag)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {group.tags.length === 0 && (
                            <span className="text-sm text-muted-foreground">
                              Nenhuma tag adicionada
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 tag-selector">
                          <div className="relative flex-1">
                            <Input
                              value={showTagSelector?.type === "stop" && showTagSelector?.groupIndex === groupIndex ? newTag : ""}
                              onChange={(e) => setNewTag(e.target.value)}
                              placeholder="Digite ou selecione uma tag"
                              onFocus={() => setShowTagSelector({ type: "stop", groupIndex })}
                            />
                            {showTagSelector?.type === "stop" && showTagSelector?.groupIndex === groupIndex && (
                              <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                                {tags.filter(tag => !group.tags.includes(tag)).length > 0 ? (
                                  tags
                                    .filter(tag => !group.tags.includes(tag))
                                    .map(tag => (
                                      <button
                                        key={tag}
                                        className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                        onClick={() => {
                                          addTagToCondition("stop", groupIndex, tag);
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
                              addTagToCondition("stop", groupIndex, newTag);
                            }}
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => addConditionGroup("stop")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Adicionar Grupo OU
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="stages" className="pt-6">
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
                      sequenceType={type}
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
                        <Label htmlFor="stage-content">
                          {type === "message" ? "Mensagem" : 
                          type === "pattern" ? "Pattern" : "Link do Typebot"}
                        </Label>
                        {type === "typebot" ? (
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
                              type === "message" 
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
        
        <TabsContent value="restrictions" className="pt-6">
          <div className="space-y-8">
            {/* Restrições Locais */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Restrições de Horário</CardTitle>
                  <CardDescription>
                    Define quando as mensagens não serão enviadas
                  </CardDescription>
                </div>
                <Dialog open={showAddRestrictionDialog} onOpenChange={setShowAddRestrictionDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
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
                        <div>
                          <Label>Horário de Início</Label>
                          <div className="flex mt-2 space-x-2">
                            <Select
                              value={newRestriction.startHour.toString()}
                              onValueChange={(value) => 
                                setNewRestriction({
                                  ...newRestriction,
                                  startHour: parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={`start-hour-${i}`} value={i.toString()}>
                                    {i.toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={newRestriction.startMinute.toString()}
                              onValueChange={(value) => 
                                setNewRestriction({
                                  ...newRestriction,
                                  startMinute: parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 15, 30, 45].map((minute) => (
                                  <SelectItem key={`start-min-${minute}`} value={minute.toString()}>
                                    {minute.toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Horário de Fim</Label>
                          <div className="flex mt-2 space-x-2">
                            <Select
                              value={newRestriction.endHour.toString()}
                              onValueChange={(value) => 
                                setNewRestriction({
                                  ...newRestriction,
                                  endHour: parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={`end-hour-${i}`} value={i.toString()}>
                                    {i.toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={newRestriction.endMinute.toString()}
                              onValueChange={(value) => 
                                setNewRestriction({
                                  ...newRestriction,
                                  endMinute: parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 15, 30, 45].map((minute) => (
                                  <SelectItem key={`end-min-${minute}`} value={minute.toString()}>
                                    {minute.toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddRestrictionDialog(false)}>Cancelar</Button>
                      <Button onClick={addLocalRestriction}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Restrições locais e globais selecionadas */}
                  {timeRestrictions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      Nenhuma restrição configurada
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeRestrictions.map(restriction => (
                        <RestrictionItem
                          key={restriction.id}
                          restriction={restriction}
                          onRemove={removeTimeRestriction}
                          onUpdate={!restriction.isGlobal ? updateLocalRestriction : undefined}
                          selected={restriction.isGlobal}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Restrições Globais */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-blue-500" />
                  <CardTitle>Restrições Globais</CardTitle>
                </div>
                <CardDescription>
                  Restrições de horário disponíveis para todas as sequências
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableGlobalRestrictions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      Não há restrições globais disponíveis
                    </div>
                  ) : (
                    availableGlobalRestrictions.map(restriction => (
                      <RestrictionItem
                        key={restriction.id}
                        restriction={restriction}
                        onRemove={() => {}}
                        selected={isGlobalRestrictionSelected(restriction.id)}
                        onSelect={() => addGlobalRestriction(restriction)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
