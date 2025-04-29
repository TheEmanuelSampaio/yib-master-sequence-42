import { useState } from "react";
import { PlusCircle, Clock, Trash2, ChevronDown, ChevronUp, MessageCircle, FileCode, Bot, X, Edit, Save } from "lucide-react";
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

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

export function SequenceBuilder({ sequence, onSave, onCancel }: SequenceBuilderProps) {
  const { tags, currentInstance, timeRestrictions: globalTimeRestrictions } = useApp();
  
  const [name, setName] = useState(sequence?.name || "");
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
  });

  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageToEdit, setStageToEdit] = useState<SequenceStage | null>(null);
  
  const addTag = (target: "start" | "stop", tag: string) => {
    if (!tag) return;
    
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
  
  const addTimeRestriction = () => {
    const restriction: TimeRestriction = {
      ...newRestriction,
      id: crypto.randomUUID(),
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
    });
  };
  
  const removeTimeRestriction = (id: string) => {
    setTimeRestrictions(timeRestrictions.filter(r => r.id !== id));
  };

  const updateTimeRestriction = (updatedRestriction: TimeRestriction) => {
    setTimeRestrictions(timeRestrictions.map(r => 
      r.id === updatedRestriction.id ? updatedRestriction : r
    ));
  };
  
  const handleSubmit = () => {
    if (!name) {
      alert("Por favor, informe um nome para a sequência.");
      return;
    }
    
    if (startCondition.tags.length === 0) {
      alert("Por favor, adicione pelo menos uma tag para a condição de início.");
      return;
    }
    
    if (stages.length === 0) {
      alert("Por favor, adicione pelo menos um estágio à sequência.");
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

  return (
    <div className="space-y-6">
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
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Ex: Sequência de Boas-vindas"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="status">Status</Label>
                    <Switch
                      id="status"
                      checked={status === "active"}
                      onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {status === "active" ? "Sequência ativa" : "Sequência inativa"}
                  </p>
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
                    
                    <div className="flex space-x-2">
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
                    
                    <div className="flex space-x-2">
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
        
        <TabsContent value="restrictions" className="pt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Restrições de Horário</CardTitle>
                  <CardDescription>Define quando as mensagens não serão enviadas</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Nova Restrição
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Restrição de Horário</DialogTitle>
                      <DialogDescription>
                        Mensagens não serão enviadas nos dias e horários selecionados.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="restriction-name">Nome da Restrição</Label>
                        <Input 
                          id="restriction-name" 
                          value={newRestriction.name} 
                          onChange={(e) => setNewRestriction({ ...newRestriction, name: e.target.value })}
                          placeholder="Ex: Horário comercial"
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
                            { value: "0", label: "D" },
                            { value: "1", label: "S" },
                            { value: "2", label: "T" },
                            { value: "3", label: "Q" },
                            { value: "4", label: "Q" },
                            { value: "5", label: "S" },
                            { value: "6", label: "S" }
                          ].map(day => (
                            <ToggleGroupItem 
                              key={day.value} 
                              value={day.value} 
                              aria-label={getDayName(parseInt(day.value))}
                              title={getDayName(parseInt(day.value))}
                              className="w-9 h-9 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                          <Label>Horário de Término</Label>
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
                      <Button onClick={addTimeRestriction}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {timeRestrictions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Sem restrições de horário definidas
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As mensagens serão enviadas em qualquer horário
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {timeRestrictions.map((restriction) => (
                      <RestrictionItem
                        key={restriction.id}
                        restriction={restriction}
                        onUpdate={updateTimeRestriction}
                        onRemove={removeTimeRestriction}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          {globalTimeRestrictions.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Restrições Globais</CardTitle>
                <CardDescription>Restrições de horário disponíveis para todas as sequências</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {globalTimeRestrictions.map((restriction) => (
                      <RestrictionItem
                        key={restriction.id}
                        restriction={restriction}
                        readonly
                        onSelect={() => {
                          if (!timeRestrictions.some(r => r.id === restriction.id)) {
                            setTimeRestrictions([...timeRestrictions, restriction]);
                          }
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end space-x-4 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          {sequence ? "Atualizar Sequência" : "Criar Sequência"}
        </Button>
      </div>
    </div>
  );
}
