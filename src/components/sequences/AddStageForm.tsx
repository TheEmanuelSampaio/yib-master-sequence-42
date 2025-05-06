
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
}

export function AddStageForm({ newStage, setNewStage, addStage, sequenceType }: AddStageFormProps) {
  return (
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
        {sequenceType === "typebot" && (
          <div className="space-y-2">
            <Label htmlFor="typebot-stage">Estágio do Typebot</Label>
            <Select
              value={newStage.typebotStage || "stg1"}
              onValueChange={(value) => setNewStage({
                ...newStage,
                typebotStage: value,
                content: value
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
        )}
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
      
      <Button onClick={addStage}>Adicionar Estágio</Button>
    </div>
  );
}
