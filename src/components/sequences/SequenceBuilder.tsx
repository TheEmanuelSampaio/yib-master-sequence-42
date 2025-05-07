import React, { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, GripVertical, Settings } from "lucide-react";
import { Stage, Sequence, SequenceStage } from "@/types";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TagConditionSection } from "@/components/sequences/TagConditionSection";
import { useAdvancedConditions } from "@/hooks/useAdvancedConditions";
import { TimeRestrictionSelector } from "@/components/sequences/TimeRestrictionSelector";

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  onChangesMade: () => void;
}

export const SequenceBuilder: React.FC<SequenceBuilderProps> = ({ sequence, onSave, onCancel, onChangesMade }) => {
  const { currentInstance, tags: availableTags, timeRestrictions: globalTimeRestrictions } = useApp();
  const [name, setName] = useState(sequence?.name || "");
  const [stages, setStages] = useState<SequenceStage[]>(sequence?.stages || []);
  const [newStageContent, setNewStageContent] = useState("");
  const [newStageType, setNewStageType] = useState<"message" | "pattern" | "typebot">("message");
  const [newStageName, setNewStageName] = useState("");
  const [newStageDelay, setNewStageDelay] = useState(1);
  const [newStageDelayUnit, setNewStageDelayUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [status, setStatus] = useState<"active" | "inactive">(sequence?.status || "active");
  const [saving, setSaving] = useState(false);
  const [selectedTimeRestrictions, setSelectedTimeRestrictions] = useState(sequence?.timeRestrictions || []);
  const [sequenceType, setSequenceType] = useState<"message" | "pattern" | "typebot">(sequence?.type || "message");
  
  // Tag conditions using the custom hook
  const {
    conditionType: startConditionType,
    tags: startTags,
    useAdvancedMode: useAdvancedStartCondition,
    advancedCondition: advancedStartCondition,
    setAdvancedCondition: setAdvancedStartCondition,
    setUseAdvancedMode: setUseAdvancedStartCondition,
    toggleConditionType: toggleStartConditionType,
    addTag: addStartTag,
    removeTag: removeStartTag,
  } = useAdvancedConditions(sequence?.startCondition || { type: "AND", tags: [] });
  
  const {
    conditionType: stopConditionType,
    tags: stopTags,
    useAdvancedMode: useAdvancedStopCondition,
    advancedCondition: advancedStopCondition,
    setAdvancedCondition: setAdvancedStopCondition,
    setUseAdvancedMode: setUseAdvancedStopCondition,
    toggleConditionType: toggleStopConditionType,
    addTag: addStopTag,
    removeTag: removeStopTag,
  } = useAdvancedConditions(sequence?.stopCondition || { type: "OR", tags: [] });
  
  const [newStartTag, setNewStartTag] = useState("");
  const [showStartTagSelector, setShowStartTagSelector] = useState(false);
  const [newStopTag, setNewStopTag] = useState("");
  const [showStopTagSelector, setShowStopTagSelector] = useState(false);
  
  useEffect(() => {
    onChangesMade();
  }, [name, stages, status, startTags, stopTags, selectedTimeRestrictions, onChangesMade]);
  
  const addStage = () => {
    if (!newStageContent.trim() || !newStageName.trim()) {
      toast.error("Conteúdo e nome do estágio são obrigatórios");
      return;
    }
    
    const newStage: SequenceStage = {
      id: uuidv4(),
      name: newStageName.trim(),
      type: newStageType,
      content: newStageContent.trim(),
      delay: newStageDelay,
      delayUnit: newStageDelayUnit
    };
    
    setStages(prev => [...prev, newStage]);
    setNewStageContent("");
    setNewStageName("");
  };
  
  const removeStage = (id: string) => {
    setStages(prev => prev.filter(stage => stage.id !== id));
  };
  
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setStages(items);
  };
  
  const addStartTagToCondition = (tag: string) => {
    if (tag.trim() && !startTags.includes(tag.trim())) {
      addStartTag(tag.trim());
      setNewStartTag("");
      setShowStartTagSelector(false);
    }
  };
  
  const addStopTagToCondition = (tag: string) => {
    if (tag.trim() && !stopTags.includes(tag.trim())) {
      addStopTag(tag.trim());
      setNewStopTag("");
      setShowStopTagSelector(false);
    }
  };
  
  const removeStartTagFromCondition = (tag: string) => {
    removeStartTag(tag);
  };
  
  const removeStopTagFromCondition = (tag: string) => {
    removeStopTag(tag);
  };

  const handleSave = async () => {
    if (saving) return;
    
    if (!name.trim()) {
      toast.error("Nome da sequência é obrigatório");
      return;
    }
    
    if (stages.length === 0) {
      toast.error("Adicione pelo menos um estágio à sequência");
      return;
    }
    
    setSaving(true);
    
    try {
      // Build sequence object
      const sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt"> = {
        instanceId: currentInstance?.id || "",
        name: name.trim(),
        type: sequenceType,
        startCondition: {
          type: startConditionType,
          tags: startTags
        },
        stopCondition: {
          type: stopConditionType,
          tags: stopTags
        },
        status,
        stages: stages.map((stage, index) => ({
          ...stage,
          orderIndex: index
        })),
        timeRestrictions: selectedTimeRestrictions
      };
      
      // Add advanced conditions if enabled
      if (useAdvancedStartCondition) {
        sequenceData.advancedStartCondition = advancedStartCondition;
      }
      
      if (useAdvancedStopCondition) {
        sequenceData.advancedStopCondition = advancedStopCondition;
      }
      
      await onSave(sequenceData);
      toast.success("Sequência salva com sucesso");
    } catch (error) {
      console.error("Error saving sequence:", error);
      toast.error("Erro ao salvar sequência");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Sequência</CardTitle>
          <CardDescription>
            Defina o nome e o tipo da sua sequência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Sequência</Label>
            <Input
              id="name"
              placeholder="Ex: Follow-up de Vendas"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <Label>Tipo de Sequência</Label>
            <Select value={sequenceType} onValueChange={setSequenceType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="message">Mensagem</SelectItem>
                <SelectItem value="pattern">Padrão</SelectItem>
                <SelectItem value="typebot">Typebot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Status</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={status === "active"}
                onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
              />
              <Label htmlFor="active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {status === "active" ? "Ativa" : "Inativa"}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <TagConditionSection
        title="Condição de Início"
        description="Quando o contato deve ser adicionado a esta sequência"
        badgeColor="bg-green-600"
        condition={{ type: startConditionType, tags: startTags }}
        setCondition={() => {}}
        advancedMode={useAdvancedStartCondition}
        setAdvancedMode={setUseAdvancedStartCondition}
        advancedCondition={advancedStartCondition}
        setAdvancedCondition={setAdvancedStartCondition}
        availableTags={availableTags}
        newTag={newStartTag}
        setNewTag={setNewStartTag}
        showTagSelector={showStartTagSelector}
        setShowTagSelector={setShowStartTagSelector}
        addTagToCondition={addStartTagToCondition}
        removeTag={removeStartTagFromCondition}
        toggleConditionType={toggleStartConditionType}
        notifyChanges={onChangesMade}
      />
      
      <TagConditionSection
        title="Condição de Parada"
        description="Quando o contato deve ser removido desta sequência"
        badgeColor="bg-red-600"
        condition={{ type: stopConditionType, tags: stopTags }}
        setCondition={() => {}}
        advancedMode={useAdvancedStopCondition}
        setAdvancedMode={setUseAdvancedStopCondition}
        advancedCondition={advancedStopCondition}
        setAdvancedCondition={setAdvancedStopCondition}
        availableTags={availableTags}
        newTag={newStopTag}
        setNewTag={setNewStopTag}
        showTagSelector={showStopTagSelector}
        setShowTagSelector={setShowStopTagSelector}
        addTagToCondition={addStopTagToCondition}
        removeTag={removeStopTagFromCondition}
        toggleConditionType={toggleStopConditionType}
        notifyChanges={onChangesMade}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Estágios da Sequência</CardTitle>
          <CardDescription>
            Defina os estágios da sua sequência e o conteúdo de cada um
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stages">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {stages.map((stage, index) => (
                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center justify-between p-3 border rounded-md bg-muted/50"
                        >
                          <div className="flex items-center">
                            <div {...provided.dragHandleProps} className="cursor-grab mr-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium">{stage.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="icon" onClick={() => removeStage(stage.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newStageName">Nome do Estágio</Label>
              <Input
                id="newStageName"
                placeholder="Ex: Enviar e-mail de apresentação"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="newStageType">Tipo do Estágio</Label>
              <Select value={newStageType} onValueChange={setNewStageType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Mensagem</SelectItem>
                  <SelectItem value="pattern">Padrão</SelectItem>
                  <SelectItem value="typebot">Typebot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="newStageContent">Conteúdo do Estágio</Label>
            <Textarea
              id="newStageContent"
              placeholder="Digite o conteúdo do estágio"
              value={newStageContent}
              onChange={(e) => setNewStageContent(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="newStageDelay">Atraso</Label>
              <Input
                id="newStageDelay"
                type="number"
                placeholder="Ex: 1"
                value={newStageDelay.toString()}
                onChange={(e) => setNewStageDelay(parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="newStageDelayUnit">Unidade de Atraso</Label>
              <Select value={newStageDelayUnit} onValueChange={setNewStageDelayUnit}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={addStage}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Estágio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <TimeRestrictionSelector
        selectedRestrictions={selectedTimeRestrictions}
        setSelectedRestrictions={setSelectedTimeRestrictions}
        globalRestrictions={globalTimeRestrictions}
      />
      
      <div className="flex justify-end space-x-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Settings className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Sequência"
          )}
        </Button>
      </div>
    </div>
  );
};
