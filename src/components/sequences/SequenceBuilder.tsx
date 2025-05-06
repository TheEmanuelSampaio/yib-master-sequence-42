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
import { Sequence, SequenceStage, TagCondition, TimeRestriction } from "@/types";
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
  const [sequenceType, setSequenceType] = useState<"message" | "pattern" | "typebot">(sequence?.type || "message");
  const [startCondition, setStartCondition] = useState<TagCondition>(
    sequence?.startCondition || { type: "AND", tags: [] }
  );
  const [stopCondition, setStopCondition] = useState<TagCondition>(
    sequence?.stopCondition || { type: "OR", tags: [] }
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
  
  const [showTagSelector, setShowTagSelector] = useState<"start" | "stop" | null>(null);
  const [newTag, setNewTag] = useState("");
  
  const [newStage, setNewStage] = useState<Omit<SequenceStage, "id">>({
    name: "",
    content: "",
    delay: 60,
    delayUnit: "minutes",
  });

  const [typebotUrl, setTypebotUrl] = useState("");
  const [typebotStagesCount, setTypebotStagesCount] = useState(1);
  
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showGlobalRestrictionsDialog, setShowGlobalRestrictionsDialog] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageToEdit, setStageToEdit] = useState<SequenceStage | null>(null);
  const [showAddRestrictionDialog, setShowAddRestrictionDialog] = useState(false);
  
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
  
  const addTagToCondition = (target: "start" | "stop", tag: string) => {
    if (!tag) return;

    // Save tag to the global tag list for reuse
    if (!tags.includes(tag)) {
      addTag(tag);
    }
    
    if (target === "start") {
      if (!startCondition.tags.includes(tag)) {
        setStartCondition({
          ...startCondition,
          tags: [...startCondition.tags, tag],
        });
        notifyChanges();
      }
    } else {
      if (!stopCondition.tags.includes(tag)) {
        setStopCondition({
          ...stopCondition,
          tags: [...stopCondition.tags, tag],
        });
        notifyChanges();
      }
    }
    setNewTag("");
    setShowTagSelector(null);
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
    notifyChanges();
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
    notifyChanges();
  };
  
  // Função especial para adicionar estágios de typebot
  const addTypebotStages = () => {
    if (!typebotUrl) {
      toast.error("Por favor, informe a URL do typebot");
      return;
    }

    if (typebotStagesCount < 1) {
      toast.error("O número de estágios deve ser pelo menos 1");
      return;
    }

    try {
      // Limpe os estágios existentes se for typebot
      if (stages.length > 0 && stages[0].typebotStage) {
        setStages([]);
      }

      const newStages: SequenceStage[] = [];
      
      for (let i = 0; i < typebotStagesCount; i++) {
        newStages.push({
          id: uuidv4(),
          name: `Estágio ${i + 1}`,
          content: i === 0 ? typebotUrl : "",
          typebotStage: `stg${i + 1}`,
          delay: i === 0 ? 30 : 24,
          delayUnit: i === 0 ? "minutes" : "hours",
        });
      }
      
      setStages(newStages);
      notifyChanges();
      
      // Reset form
      setTypebotUrl("");
      setTypebotStagesCount(1);
      
    } catch (error) {
      console.error("Erro ao adicionar estágio:", error);
      toast.error("Erro ao adicionar estágio. Verifique o console para mais detalhes.");
    }
  };
  
  const addStage = () => {
    // Se for uma sequência do tipo typebot, usamos o método especial
    if (sequenceType === "typebot") {
      addTypebotStages();
      return;
    }
    
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
      
      if (startCondition.tags.length === 0) {
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
        type: sequenceType,
        instanceId: currentInstance.id,
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
    if (!sequence) return name !== '' || startCondition.tags.length > 0 || stages.length > 0;
    
    return (
      name !== sequence.name ||
      sequenceType !== sequence.type ||
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
                    value={sequenceType}
                    onValueChange={(value: "message" | "pattern" | "typebot") => {
                      // Se mudar para typebot e já houver estágios, perguntar se quer limpar
                      if (value === "typebot" && stages.length > 0) {
                        const confirmed = window.confirm("Mudar para o tipo typebot irá limpar os estágios existentes. Deseja continuar?");
                        if (!confirmed) return;
                        setStages([]);
                      }
                      
                      setSequenceType(value);
                      notifyChanges();
                    }}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Mensagem</SelectItem>
                      <SelectItem value="pattern">Pattern</SelectItem>
                      <SelectItem value="typebot">Typebot</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sequenceType === "message" 
                      ? "Envio de mensagens de texto simples"
                      : sequenceType === "pattern"
                      ? "Formato avançado para envio de mídia e mensagens complexas"
                      : "Integração com fluxos do Typebot"}
                  </p>
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
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toggleConditionType("start");
                      }}
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
                    
                    <div className="flex space-x-2 tag-selector">
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
                                      addTagToCondition("start", tag);
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
                          addTagToCondition("start", newTag);
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
                      onClick={() => {
                        toggleConditionType("stop");
                      }}
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
                    
                    <div className="flex space-x-2 tag-selector">
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
                                      addTagToCondition("stop", tag);
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
                          addTagToCondition("stop", newTag);
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
                      key={`${stage.id}-${index}`}
                      stage={stage}
                      index={index}
                      sequenceType={sequenceType}
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
                      {sequenceType === "typebot" ? (
                        /* Interface específica para typebot */
                        <div className="space-y-4">
                          {stages.length === 0 && (
                            <div className="space-y-2">
                              <Label htmlFor="typebot-url">URL do Typebot</Label>
                              <Input 
                                id="typebot-url" 
                                value={typebotUrl} 
                                onChange={(e) => setTypebotUrl(e.target.value)}
                                placeholder="https://typebot.io/seu-bot"
                              />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label htmlFor="typebot-stages">Número de Estágios</Label>
                            <Input 
                              id="typebot-stages" 
                              type="number" 
                              min="1" 
                              value={typebotStagesCount} 
                              onChange={(e) => setTypebotStagesCount(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Cada estágio representa um ponto no fluxo do typebot (stg1, stg2, etc)
                            </p>
                          </div>
                          
                          <Button onClick={addTypebotStages}>
                            {stages.length === 0 ? "Adicionar Estágios" : "Adicionar Mais Estágios"}
                          </Button>
                        </div>
                      ) : (
                        /* Interface para message e pattern */
                        <>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="stage-name">Nome do Estágio</Label>
                              <Input 
                                id="stage-name" 
                                value={newStage.name} 
                                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                                placeholder
