
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SequenceStage } from "@/types";

interface AddStageFormProps {
  newStage: Omit<SequenceStage, "id">;
  setNewStage: (stage: Omit<SequenceStage, "id">) => void;
  addStage: () => void;
  sequenceType: "message" | "pattern" | "typebot";
  nextStageNumber: number;
}

export function AddStageForm({ newStage, setNewStage, addStage, sequenceType, nextStageNumber }: AddStageFormProps) {
  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    addStage();
  };

  // Validação de conteúdo somente necessária para tipos não-typebot
  const isFormValid = newStage.name && (sequenceType === "typebot" || newStage.content);

  return (
    <form className="space-y-4 pb-4" onSubmit={handleAddStage}>
      <div className="space-y-2">
        <Label htmlFor="stage-name">Nome do Estágio</Label>
        <Input 
          id="stage-name" 
          value={newStage.name} 
          onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
          placeholder={`Ex: Estágio ${nextStageNumber}`}
        />
      </div>
      
      {sequenceType !== "typebot" && (
        <div className="space-y-2">
          <Label htmlFor="stage-content">
            {sequenceType === "message" ? "Mensagem" : "Pattern"}
          </Label>
          <Textarea 
            id="stage-content" 
            value={newStage.content} 
            onChange={(e) => setNewStage({ ...newStage, content: e.target.value })}
            rows={4}
            placeholder={
              sequenceType === "message" 
                ? "Digite sua mensagem. Use ${name} para incluir o nome do contato."
                : "IMAGE::https://example.com/produto-xyz.jpg||TEXT::Confira todos os detalhes!"
            }
          />
        </div>
      )}
      
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
      
      <Button 
        type="submit"
        disabled={!isFormValid}
      >
        Adicionar Estágio
      </Button>
    </form>
  );
}
