
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, PlusCircle } from "lucide-react";
import { SequenceStage } from "@/types";
import { StageItem } from "./StageItem";
import { AddStageForm } from "./AddStageForm";

interface StagesSectionProps {
  stages: SequenceStage[];
  editingStageId: string | null;
  stageToEdit: SequenceStage | null;
  sequenceType: "message" | "pattern" | "typebot";
  typebotUrl: string;
  onEdit: (stage: SequenceStage) => void;
  onUpdate: (stage: SequenceStage) => void;
  onCancel: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  newStage: Omit<SequenceStage, "id">;
  setNewStage: (stage: Omit<SequenceStage, "id">) => void;
  addStage: () => void;
}

export function StagesSection({ 
  stages, 
  editingStageId, 
  stageToEdit,
  sequenceType,
  typebotUrl,
  onEdit, 
  onUpdate, 
  onCancel, 
  onRemove, 
  onMove,
  newStage,
  setNewStage,
  addStage
}: StagesSectionProps) {
  return (
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
            {sequenceType === "typebot" && typebotUrl && (
              <div className="p-3 border rounded-md mb-4 bg-muted/20">
                <p className="font-medium">Link do Typebot:</p>
                <a 
                  href={typebotUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 break-all hover:underline"
                >
                  {typebotUrl}
                </a>
              </div>
            )}
            
            {stages.map((stage, index) => (
              <StageItem 
                key={stage.id}
                stage={stage}
                index={index}
                isEditing={editingStageId === stage.id}
                stageToEdit={stageToEdit}
                onEdit={onEdit}
                onUpdate={onUpdate}
                onCancel={onCancel}
                onRemove={onRemove}
                onMove={onMove}
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
              <AddStageForm 
                newStage={newStage}
                setNewStage={setNewStage}
                addStage={addStage}
                sequenceType={sequenceType}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
