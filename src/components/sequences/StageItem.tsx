
import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Trash2, Edit, MessageCircle, FileCode, Bot, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SequenceStage } from "@/types";

interface StageItemProps {
  stage: SequenceStage;
  index: number;
  isEditing: boolean;
  stageToEdit: SequenceStage | null;
  onEdit: (stage: SequenceStage) => void;
  onUpdate: (stage: SequenceStage) => void;
  onCancel: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
}

export function StageItem({
  stage,
  index,
  isEditing,
  stageToEdit,
  onEdit,
  onUpdate,
  onCancel,
  onRemove,
  onMove,
  isFirst,
  isLast
}: StageItemProps) {
  const [localStage, setLocalStage] = useState<SequenceStage>(stageToEdit || stage);
  
  // Update local stage when stageToEdit changes
  useEffect(() => {
    if (stageToEdit) {
      setLocalStage(stageToEdit);
    } else {
      setLocalStage(stage);
    }
  }, [stageToEdit, stage, isEditing]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(localStage);
  };

  const getStageIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4" />;
      case "pattern":
        return <FileCode className="h-4 w-4" />;
      case "typebot":
        return <Bot className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  // Função para gerar o nome do estágio do typebot com base no índice
  const getTypebotStageName = (idx: number) => {
    return `stg${idx + 1}`;
  };

  if (isEditing) {
    return (
      <form className="border rounded-md p-4 space-y-4" onSubmit={handleUpdate}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-lg">Editando estágio</h3>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" type="submit">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-stage-name">Nome do Estágio</Label>
          <Input 
            id="edit-stage-name" 
            value={localStage.name}
            onChange={(e) => setLocalStage({ ...localStage, name: e.target.value })}
            required
          />
        </div>

        {localStage.type !== "typebot" && (
          <div className="space-y-2">
            <Label htmlFor="edit-stage-content">
              {localStage.type === "message" ? "Mensagem" : "Pattern"}
            </Label>
            <Textarea 
              id="edit-stage-content"
              value={localStage.content}
              onChange={(e) => setLocalStage({ ...localStage, content: e.target.value })}
              rows={4}
              required
            />
          </div>
        )}

        {localStage.type === "typebot" && (
          <div className="space-y-2">
            <Label htmlFor="edit-typebot-stage">Estágio do Typebot</Label>
            <Input
              id="edit-typebot-stage"
              value={getTypebotStageName(index)}
              disabled
              className="bg-muted"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-stage-delay">Atraso</Label>
            <Input 
              id="edit-stage-delay"
              type="number"
              min="1"
              value={localStage.delay}
              onChange={(e) => setLocalStage({
                ...localStage,
                delay: parseInt(e.target.value) || 60
              })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-stage-delay-unit">Unidade</Label>
            <Select
              value={localStage.delayUnit}
              onValueChange={(value) => setLocalStage({
                ...localStage,
                delayUnit: value as "minutes" | "hours" | "days"
              })}
            >
              <SelectTrigger id="edit-stage-delay-unit">
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
      </form>
    );
  }

  return (
    <div key={stage.id} className="border rounded-md p-4 relative">
      <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
        {index + 1}
      </div>
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium flex items-center">
            {stage.name}
            <Badge 
              variant="outline" 
              className={cn(
                "ml-2 flex items-center",
                stage.type === "message" && "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
                stage.type === "pattern" && "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
                stage.type === "typebot" && "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
              )}
            >
              {getStageIcon(stage.type)}
              <span className="ml-1 capitalize">{stage.type}</span>
              {stage.type === "typebot" && (
                <span className="ml-1">({getTypebotStageName(index)})</span>
              )}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            Enviar após {stage.delay} {
              stage.delayUnit === "minutes" ? "minutos" :
              stage.delayUnit === "hours" ? "horas" : "dias"
            }
          </p>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(stage.id, "up")}
            disabled={isFirst}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(stage.id, "down")}
            disabled={isLast}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(stage)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(stage.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      
      <div className="bg-background/50 p-3 rounded-md border text-sm">
        {stage.type === "typebot" ? (
          <div className="flex items-center">
            <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="font-medium">Estágio Typebot: {getTypebotStageName(index)}</span>
          </div>
        ) : (
          <div className="whitespace-pre-line">{stage.content}</div>
        )}
      </div>
    </div>
  );
}
