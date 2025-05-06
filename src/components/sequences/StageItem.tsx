
import { useState } from "react";
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

  const handleUpdate = () => {
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

  if (isEditing) {
    return (
      <div className="border rounded-md p-4 space-y-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-lg">Editando estágio</h3>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleUpdate}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-stage-name">Nome do Estágio</Label>
            <Input 
              id="edit-stage-name" 
              value={localStage.name}
              onChange={(e) => setLocalStage({ ...localStage, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-stage-type">Tipo do Conteúdo</Label>
            <Select
              value={localStage.type}
              onValueChange={(value) => setLocalStage({ 
                ...localStage, 
                type: value as "message" | "pattern" | "typebot" 
              })}
            >
              <SelectTrigger id="edit-stage-type">
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
          <Label htmlFor="edit-stage-content">
            {localStage.type === "message" ? "Mensagem" : 
            localStage.type === "pattern" ? "Pattern" : "Link do Typebot"}
          </Label>
          {localStage.type === "typebot" ? (
            <div className="space-y-4">
              <Input 
                id="edit-stage-content"
                value={localStage.content}
                onChange={(e) => setLocalStage({ ...localStage, content: e.target.value })}
              />
              <div className="space-y-2">
                <Label htmlFor="edit-typebot-stage">Estágio do Typebot</Label>
                <Select
                  value={localStage.typebotStage || "stg1"}
                  onValueChange={(value) => setLocalStage({
                    ...localStage,
                    typebotStage: value
                  })}
                >
                  <SelectTrigger id="edit-typebot-stage">
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
              id="edit-stage-content"
              value={localStage.content}
              onChange={(e) => setLocalStage({ ...localStage, content: e.target.value })}
              rows={4}
            />
          )}
        </div>

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
      </div>
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
              {stage.type === "typebot" && stage.typebotStage && (
                <span className="ml-1">({stage.typebotStage})</span>
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
            <a 
              href={stage.content} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {stage.content}
            </a>
          </div>
        ) : (
          <div className="whitespace-pre-line">{stage.content}</div>
        )}
      </div>
    </div>
  );
}
