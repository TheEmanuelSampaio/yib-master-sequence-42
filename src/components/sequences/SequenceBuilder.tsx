import { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { Sequence, SequenceStage, TagCondition, TimeRestriction } from "@/types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { isValidUUID } from "@/integrations/supabase/client";
import { BasicInfoSection } from "./BasicInfoSection";
import { TagConditionSection } from "./TagConditionSection";
import { StagesSection } from "./StagesSection";
import { TimeRestrictionsSection } from "./TimeRestrictionsSection";
import { NewRestrictionDialog } from "./NewRestrictionDialog";
import { Dialog } from "@/components/ui/dialog";

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  onChangesMade?: () => void;
}

export function SequenceBuilder({ sequence, onSave, onCancel, onChangesMade }: SequenceBuilderProps) {
  const { tags, currentInstance, timeRestrictions: globalTimeRestrictions, addTag } = useApp();
  
  const [name, setName] = useState(sequence?.name || "");
  const [type, setType] = useState<"message" | "pattern" | "typebot">(
    sequence?.type || "message"
  );
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
  const [typebotUrl, setTypebotUrl] = useState<string>(
    sequence?.type === "typebot" && stages[0]?.content ? stages[0].content : ""
  );
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(
    sequence?.webhookEnabled || false
  );
  const [webhookId, setWebhookId] = useState<string | undefined>(
    sequence?.webhookId
  );
  
  const [showTagSelector, setShowTagSelector] = useState<"start" | "stop" | null>(null);
  const [newTag, setNewTag] = useState("");
  
  const [newStage, setNewStage] = useState<Omit<SequenceStage, "id">>({
    name: "",
    type: type,
    content: "",
    delay: 60,
    delayUnit: "minutes",
  });
  
  // Update newStage.type when the sequence type changes
  useEffect(() => {
    setNewStage(prev => ({
      ...prev,
      type: type
    }));
    
    // Para typebot, podemos pré-configurar o nome do estágio
    if (type === 'typebot') {
      const nextStageNumber = stages.length + 1;
      setNewStage(prev => ({
        ...prev,
        name: `Estágio ${nextStageNumber}`,
        typebotStage: `stg${nextStageNumber}`,
      }));
    }
  }, [type, stages.length]);
  
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
  const [currentTab, setCurrentTab] = useState("basic");
  
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

  // Função para lidar com a mudança de tipo da sequência
  const handleTypeChange = (newType: "message" | "pattern" | "typebot") => {
    console.log(`Mudando tipo da sequência para: ${newType}`);
    
    // Preservar IDs, mas limpar conteúdos dos estágios
    if (stages.length > 0) {
      const updatedStages = stages.map((stage, index) => {
        // Manter o ID e alguns campos básicos, mas limpar o conteúdo específico
        return {
          id: stage.id,
          name: stage.name,
          type: newType, // Atualizar para o novo tipo
          content: newType === 'typebot' ? typebotUrl : "", // Para typebot, usar a URL do typebot
          delay: stage.delay,
          delayUnit: stage.delayUnit,
          typebotStage: newType === 'typebot' ? `stg${index + 1}` : undefined
        };
      });
      
      // Se mudar para typebot, ajustar alguns campos necessários
      if (newType === 'typebot') {
        // Não vamos mais sobrescrever o array de estágios
        // Apenas garantir que todos os estágios tenham os typebotStage corretos
        const finalStages = updatedStages.map((stage, index) => ({
          ...stage,
          typebotStage: `stg${index + 1}`
        }));
        
        setStages(finalStages);
      } else {
        // Para outros tipos, apenas limpar os conteúdos
        setStages(updatedStages);
      }
      
      console.log("Estágios resetados com sucesso, mantendo IDs.");
      notifyChanges();
    }
    
    // Atualizar novo tipo
    setType(newType);
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
  
  const addStage = () => {
    if (!newStage.name) return;
    
    // Para typebot, não precisamos verificar o conteúdo
    if (type !== 'typebot' && !newStage.content) return;
    
    try {
      // Para typebot, usamos o número do estágio
      const stageToAdd: Omit<SequenceStage, "id"> = {
        ...newStage
      };
      
      if (type === 'typebot') {
        const nextStageNumber = stages.length + 1;
        stageToAdd.typebotStage = `stg${nextStageNumber}`;
        // Não definimos o content aqui - será definido na hora de salvar
      }
      
      const stage: SequenceStage = {
        ...stageToAdd,
        id: uuidv4(),
      };
      
      setStages([...stages, stage]);
      notifyChanges();
      
      // Reset form com valor apropriado para o próximo estágio
      if (type === 'typebot') {
        const nextStageNumber = stages.length + 2;
        setNewStage({
          name: `Estágio ${nextStageNumber}`,
          type: type,
          content: "",
          typebotStage: `stg${nextStageNumber}`,
          delay: 60,
          delayUnit: "minutes",
        });
      } else {
        setNewStage({
          name: "",
          type: type,
          content: "",
          delay: 60,
          delayUnit: "minutes",
        });
      }
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
  
  // Update the handleSubmit function to include webhook fields
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
      
      // Validate webhook ID if webhook is enabled
      if (webhookEnabled && !webhookId) {
        toast.error("Por favor, informe um ID para o webhook.");
        return;
      }
      
      if (webhookEnabled && !isWebhookIdUnique) {
        toast.error("O ID do webhook já está em uso. Por favor, escolha outro ID.");
        return;
      }
      
      // Update all typebot stage content with the current URL before saving
      let finalStages = [...stages];
      if (type === 'typebot' && typebotUrl) {
        finalStages = stages.map((stage, index) => ({
          ...stage,
          content: typebotUrl,
          typebotStage: `stg${index + 1}`
        }));
      }
      
      const newSequence: Omit<Sequence, "id" | "createdAt" | "updatedAt"> = {
        name,
        type,
        instanceId: currentInstance.id,
        startCondition,
        stopCondition,
        stages: finalStages,
        timeRestrictions,
        status,
        createdBy: sequence?.createdBy || "system", // Include createdBy field
        webhookEnabled,
        webhookId: webhookEnabled ? webhookId : undefined
      };
      
      console.log("Dados da sequência sendo enviados:", JSON.stringify(newSequence, null, 2));
      
      onSave(newSequence);
    } catch (error) {
      console.error("Erro ao enviar sequência:", error);
      toast.error("Erro ao criar sequência. Verifique o console para mais detalhes.");
    }
  };
  
  // Separate global and local restrictions
  const globalRestrictions = timeRestrictions.filter(r => r.isGlobal);
  const localRestrictions = timeRestrictions.filter(r => !r.isGlobal);

  // Verify if a global restriction is selected
  const isGlobalRestrictionSelected = (id: string) => {
    return timeRestrictions.some(r => r.id === id && r.isGlobal);
  };
  
  // Check if form has been modified from initial values
  const hasBeenModified = () => {
    if (!sequence) return name !== '' || startCondition.tags.length > 0 || stages.length > 0;
    
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

  const getActiveRestrictionCount = () => {
    return timeRestrictions.filter(r => r.active).length;
  };

  return (
    <div className="space-y-6">
      {/* Header com botões - apenas botão de salvar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Configuração da Sequência</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
          >
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

      <Tabs 
        defaultValue="basic"
        value={currentTab}
        onValueChange={setCurrentTab}
      >
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
            {/* Basic Info with webhook configuration */}
            <BasicInfoSection
              name={name}
              setName={setName}
              status={status}
              setStatus={setStatus}
              type={type}
              setType={setType}
              notifyChanges={notifyChanges}
              onTypeChange={handleTypeChange}
              isEditMode={!!sequence}
              webhookEnabled={webhookEnabled}
              setWebhookEnabled={setWebhookEnabled}
              webhookId={webhookId}
              setWebhookId={setWebhookId}
              instanceId={currentInstance?.id}
            />

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Start Condition */}
              <TagConditionSection
                title="Condição de Início"
                description="Define quando um contato deve entrar nesta sequência"
                badgeColor="bg-green-600"
                condition={startCondition}
                setCondition={setStartCondition}
                availableTags={tags}
                newTag={newTag}
                setNewTag={setNewTag}
                showTagSelector={showTagSelector === "start"}
                setShowTagSelector={() => setShowTagSelector("start")}
                addTagToCondition={(tag) => addTagToCondition("start", tag)}
                removeTag={(tag) => removeTag("start", tag)}
                toggleConditionType={() => toggleConditionType("start")}
                notifyChanges={notifyChanges}
              />
              
              {/* Stop Condition */}
              <TagConditionSection
                title="Condição de Parada"
                description="Define quando um contato deve ser removido desta sequência"
                badgeColor="bg-red-600"
                condition={stopCondition}
                setCondition={setStopCondition}
                availableTags={tags}
                newTag={newTag}
                setNewTag={setNewTag}
                showTagSelector={showTagSelector === "stop"}
                setShowTagSelector={() => setShowTagSelector("stop")}
                addTagToCondition={(tag) => addTagToCondition("stop", tag)}
                removeTag={(tag) => removeTag("stop", tag)}
                toggleConditionType={() => toggleConditionType("stop")}
                notifyChanges={notifyChanges}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="stages" className="pt-6">
          <StagesSection 
            stages={stages}
            editingStageId={editingStageId}
            stageToEdit={stageToEdit}
            sequenceType={type}
            typebotUrl={typebotUrl}
            setTypebotUrl={setTypebotUrl}
            onEdit={startEditingStage}
            onUpdate={updateStage}
            onCancel={() => {
              setEditingStageId(null);
              setStageToEdit(null);
            }}
            onRemove={removeStage}
            onMove={moveStage}
            newStage={newStage}
            setNewStage={setNewStage}
            addStage={addStage}
            notifyChanges={notifyChanges}
          />
        </TabsContent>
        
        <TabsContent value="restrictions" className="pt-6">
          <TimeRestrictionsSection
            localRestrictions={localRestrictions}
            globalRestrictions={globalRestrictions}
            showAddRestrictionDialog={showAddRestrictionDialog}
            setShowAddRestrictionDialog={setShowAddRestrictionDialog}
            showGlobalRestrictionsDialog={showGlobalRestrictionsDialog}
            setShowGlobalRestrictionsDialog={setShowGlobalRestrictionsDialog}
            onRemoveRestriction={removeTimeRestriction}
            onUpdateRestriction={updateLocalRestriction}
            onAddGlobalRestriction={addGlobalRestriction}
            dayNames={dayNames}
            availableGlobalRestrictions={availableGlobalRestrictions}
            NewRestrictionDialog={NewRestrictionDialog}
            isGlobalRestrictionSelected={isGlobalRestrictionSelected}
          />
        </TabsContent>
      </Tabs>
      
      {/* Dialog for adding restriction - Now as a standalone Dialog */}
      <Dialog open={showAddRestrictionDialog} onOpenChange={setShowAddRestrictionDialog}>
        <NewRestrictionDialog 
          open={showAddRestrictionDialog}
          onOpenChange={setShowAddRestrictionDialog}
          newRestriction={newRestriction}
          setNewRestriction={setNewRestriction}
          addLocalRestriction={addLocalRestriction}
          dayNames={dayNames}
        />
      </Dialog>
    </div>
  );
}
