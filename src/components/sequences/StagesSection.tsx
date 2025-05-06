import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, PlusCircle } from "lucide-react";
import { SequenceStage } from "@/types";
import { StageItem } from "./StageItem";
import { AddStageForm } from "./AddStageForm";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
interface StagesSectionProps {
  stages: SequenceStage[];
  editingStageId: string | null;
  stageToEdit: SequenceStage | null;
  sequenceType: "message" | "pattern" | "typebot";
  typebotUrl: string;
  setTypebotUrl: (url: string) => void;
  onEdit: (stage: SequenceStage) => void;
  onUpdate: (stage: SequenceStage) => void;
  onCancel: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  newStage: Omit<SequenceStage, "id">;
  setNewStage: (stage: Omit<SequenceStage, "id">) => void;
  addStage: () => void;
  notifyChanges: () => void;
}
export function StagesSection({
  stages,
  editingStageId,
  stageToEdit,
  sequenceType,
  typebotUrl,
  setTypebotUrl,
  onEdit,
  onUpdate,
  onCancel,
  onRemove,
  onMove,
  newStage,
  setNewStage,
  addStage,
  notifyChanges
}: StagesSectionProps) {
  return <Card>
      <CardHeader>
        <CardTitle>Estágios da Sequência</CardTitle>
        <CardDescription>
          Defina as mensagens que serão enviadas e quando
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campo URL do Typebot, movido para esta aba */}
        {sequenceType === "typebot" && <div className="space-y-2">
            <Label htmlFor="typebot-url">URL do Typebot</Label>
            <Input id="typebot-url" type="url" value={typebotUrl} onChange={e => {
          setTypebotUrl(e.target.value);
          notifyChanges();
        }} placeholder="https://typebot.io/your-bot" className="w-full" />
          </div>}

        {stages.length === 0 ? <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Nenhum estágio definido
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione pelo menos um estágio à sua sequência
            </p>
          </div> : <div className="space-y-4">
            {sequenceType === "typebot" && typebotUrl}
            
            {stages.map((stage, index) => <StageItem key={stage.id} stage={stage} index={index} isEditing={editingStageId === stage.id} stageToEdit={stageToEdit} onEdit={onEdit} onUpdate={onUpdate} onCancel={onCancel} onRemove={onRemove} onMove={onMove} isFirst={index === 0} isLast={index === stages.length - 1} />)}
          </div>}
        
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
              <AddStageForm newStage={newStage} setNewStage={setNewStage} addStage={addStage} sequenceType={sequenceType} nextStageNumber={stages.length + 1} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>;
}