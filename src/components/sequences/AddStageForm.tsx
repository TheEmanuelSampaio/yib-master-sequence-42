
import { useState } from "react";
import { SequenceStage, SequenceStageType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddStageFormProps {
  onAddStage: (stage: Omit<SequenceStage, "id">) => void;
}

export function AddStageForm({ onAddStage }: AddStageFormProps) {
  const [newStage, setNewStage] = useState<Omit<SequenceStage, "id">>({
    name: "",
    type: "message",
    content: "",
    delay: 60,
    delayUnit: "minutes",
  });

  const handleTypebotStageChange = (value: string) => {
    const id = parseInt(value);
    setNewStage({
      ...newStage,
      typebotStage: { id, content: `stg${id}` },
      content: `stg${id}`
    });
  };

  const handleAddStage = () => {
    if (!newStage.name || !newStage.content) return;
    
    onAddStage(newStage);
    
    // Reset form
    setNewStage({
      name: "",
      type: "message",
      content: "",
      delay: 60,
      delayUnit: "minutes",
    });
  };

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
        <div className="space-y-2">
          <Label htmlFor="stage-type">Tipo do Conteúdo</Label>
          <Select
            value={newStage.type}
            onValueChange={(value: SequenceStageType) => 
              setNewStage({ 
                ...newStage, 
                type: value as "message" | "pattern" | "typebot",
                // Reset content when changing type
                content: value === "typebot" ? (newStage.typebotStage?.content || "") : ""
              })
            }
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
      
      {newStage.type === "typebot" ? (
        <div className="space-y-2">
          <Label htmlFor="typebot-stage">Estágio do Typebot</Label>
          <Select
            value={newStage.typebotStage?.id?.toString() || ""}
            onValueChange={handleTypebotStageChange}
          >
            <SelectTrigger id="typebot-stage">
              <SelectValue placeholder="Selecione o estágio" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => i + 1).map((id) => (
                <SelectItem key={`stage-${id}`} value={id.toString()}>
                  Estágio {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="stage-content">
            {newStage.type === "message" ? "Mensagem" : "Pattern"}
          </Label>
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
        onClick={handleAddStage} 
        disabled={!newStage.name || !newStage.content}
        className="mt-2"
      >
        Adicionar Estágio
      </Button>
    </div>
  );
}
