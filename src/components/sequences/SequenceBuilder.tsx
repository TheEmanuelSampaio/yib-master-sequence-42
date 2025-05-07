import React, { useState, useCallback } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BasicInfoSection } from "@/components/sequences/BasicInfoSection";
import { StartStopConditionsSection } from "@/components/sequences/StartStopConditionsSection";
import { StagesSection } from "@/components/sequences/StagesSection";
import { Sequence, SequenceStage } from "@/types";
import { useApp } from "@/context/AppContext";

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<any>;
  onCancel: () => void;
  onChangesMade: () => void;
}

export function SequenceBuilder({ sequence, onSave, onCancel, onChangesMade }: SequenceBuilderProps) {
  const { currentInstance } = useApp();
  const [name, setName] = useState(sequence?.name || "");
  const [status, setStatus] = useState<"active" | "inactive">(sequence?.status || "inactive");
  const [type, setType] = useState<"message" | "pattern" | "typebot">(sequence?.type || "message");
  const [startConditionType, setStartConditionType] = useState(sequence?.startCondition.type || "AND");
  const [startConditionTags, setStartConditionTags] = useState(sequence?.startCondition.tags || []);
  const [stopConditionType, setStopConditionType] = useState(sequence?.stopCondition.type || "AND");
  const [stopConditionTags, setStopConditionTags] = useState(sequence?.stopCondition.tags || []);
  const [stages, setStages] = useState<SequenceStage[]>(sequence?.stages || []);
  const [webhookEnabled, setWebhookEnabled] = useState(sequence?.webhookEnabled || false);
  const [webhookId, setWebhookId] = useState(sequence?.webhookId || "");

  const instanceId = currentInstance?.id;

  const handleTypeChange = (newType: "message" | "pattern" | "typebot") => {
    // Limpar o conteúdo dos estágios ao mudar o tipo da sequência
    setStages([]);
  };

  const handleSave = async () => {
    if (!currentInstance) {
      alert("Selecione uma instância antes de salvar a sequência.");
      return;
    }

    const sequenceData = {
      name,
      status,
      type,
      instanceId: currentInstance.id,
      startCondition: {
        type: startConditionType,
        tags: startConditionTags,
      },
      stopCondition: {
        type: stopConditionType,
        tags: stopConditionTags,
      },
      stages,
      timeRestrictions: [],
      webhookEnabled,
      webhookId
    };

    await onSave(sequenceData);
  };

  const addStage = () => {
    const newStage: SequenceStage = {
      id: crypto.randomUUID(),
      type: "message",
      orderIndex: stages.length,
      content: "",
      delay: 0,
      delayUnit: "minutes",
      sequenceId: sequence?.id || "",
      variables: [],
      conditions: [],
      active: true,
    };
    setStages([...stages, newStage]);
    onChangesMade();
  };

  const updateStage = (id: string, updatedFields: Partial<SequenceStage>) => {
    const updatedStages = stages.map((stage) =>
      stage.id === id ? { ...stage, ...updatedFields } : stage
    );
    setStages(updatedStages);
    onChangesMade();
  };

  const deleteStage = (id: string) => {
    const updatedStages = stages.filter((stage) => stage.id !== id);
    setStages(updatedStages);
    onChangesMade();
  };

  const moveStage = (id: string, direction: "up" | "down") => {
    const currentIndex = stages.findIndex((stage) => stage.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[currentIndex];
    newStages[currentIndex] = newStages[newIndex];
    newStages[newIndex] = temp;

    // Update orderIndex for all stages
    newStages.forEach((stage, index) => {
      stage.orderIndex = index;
    });

    setStages(newStages);
    onChangesMade();
  };

  const transformTags = (tags: string[]): string[] => {
    return tags.map(tag => tag.toLowerCase().replace(/\s+/g, '-'));
  };

  const isValid = (): boolean => {
    if (!name) return false;
    if (stages.length === 0) return false;
    return true;
  };

  const hasBeenModified = (): boolean => {
    if (sequence) {
      return (
        name !== sequence.name ||
        status !== sequence.status ||
        type !== sequence.type ||
        startConditionType !== sequence.startCondition.type ||
        JSON.stringify(startConditionTags) !== JSON.stringify(sequence.startCondition.tags) ||
        stopConditionType !== sequence.stopCondition.type ||
        JSON.stringify(stopConditionTags) !== JSON.stringify(sequence.stopCondition.tags) ||
        JSON.stringify(stages) !== JSON.stringify(sequence.stages) ||
        webhookEnabled !== sequence.webhookEnabled ||
        webhookId !== sequence.webhookId
      );
    } else {
      return (
        name !== "" ||
        status !== "inactive" ||
        type !== "message" ||
        startConditionType !== "AND" ||
        startConditionTags.length > 0 ||
        stopConditionType !== "AND" ||
        stopConditionTags.length > 0 ||
        stages.length > 0 ||
        webhookEnabled ||
        webhookId !== ""
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-3 flex justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid() || !hasBeenModified()}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Sequência
          </Button>
        </div>
      </div>

      <div className="md:col-span-1 space-y-6">
        <BasicInfoSection
          name={name}
          setName={setName}
          status={status}
          setStatus={setStatus}
          type={type}
          setType={setType}
          notifyChanges={onChangesMade}
          onTypeChange={handleTypeChange}
          isEditMode={!!sequence}
          webhookEnabled={webhookEnabled}
          setWebhookEnabled={setWebhookEnabled}
          webhookId={webhookId}
          setWebhookId={setWebhookId}
          instanceId={instanceId}
          sequenceId={sequence?.id} // Passando o ID da sequência para BasicInfoSection
        />

        <StartStopConditionsSection
          startConditionType={startConditionType}
          setStartConditionType={setStartConditionType}
          startConditionTags={startConditionTags}
          setStartConditionTags={setStartConditionTags}
          stopConditionType={stopConditionType}
          setStopConditionType={setStopConditionType}
          stopConditionTags={stopConditionTags}
          setStopConditionTags={setStopConditionTags}
          notifyChanges={onChangesMade}
        />
      </div>

      <div className="md:col-span-2">
        <StagesSection
          stages={stages}
          addStage={addStage}
          updateStage={updateStage}
          deleteStage={deleteStage}
          moveStage={moveStage}
        />
      </div>
    </div>
  );
}
