
import { useState } from "react";
import { SequenceStage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, ChevronDown, ChevronUp, MessageCircle, FileCode, Bot, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StageItemProps {
  stage: SequenceStage;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onUpdate: (updated: SequenceStage) => void;
}

export function StageItem({ 
  stage, 
  index, 
  isFirst, 
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdate
}: StageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStage, setEditedStage] = useState<SequenceStage>({...stage});

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

  const handleSave = () => {
    onUpdate(editedStage);
    setIsEditing(false);
  };

  const handleTypebotStageChange = (value: string) => {
    const id = parseInt(value);
    setEditedStage({
      ...editedStage,
      typebotStage: { id, content: `stg${id}` },
      content: `stg${id}`
    });
  };

  return (
    <>
      <div className="border rounded-md p-4 relative">
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
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground flex items-center mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock h-3 w-3 mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 
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
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveUp}
              disabled={isFirst}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveDown}
              disabled={isLast}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
        
        <div className="bg-background/50 p-3 rounded-md border text-sm">
          {stage.type === "typebot" ? (
            <div className="flex items-center">
              <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <span className="text-blue-500">
                  {stage.content}
                </span>
                {stage.typebotStage && (
                  <Badge variant="outline" className="text-xs w-fit">
                    Estágio ID: {stage.typebotStage.id}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-line">{stage.content}</div>
          )}
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Estágio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage-name">Nome do Estágio</Label>
                <Input 
                  id="stage-name" 
                  value={editedStage.name} 
                  onChange={(e) => setEditedStage({ ...editedStage, name: e.target.value })}
                  placeholder="Ex: Boas-vindas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage-type">Tipo do Conteúdo</Label>
                <Select
                  value={editedStage.type}
                  onValueChange={(value: "message" | "pattern" | "typebot") => 
                    setEditedStage({ 
                      ...editedStage, 
                      type: value
                    })
                  }
                  disabled
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
            
            {editedStage.type === "typebot" ? (
              <div className="space-y-2">
                <Label htmlFor="typebot-stage">Estágio do Typebot</Label>
                <Select
                  value={editedStage.typebotStage?.id?.toString() || ""}
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
                  {editedStage.type === "message" ? "Mensagem" : "Pattern"}
                </Label>
                <Textarea 
                  id="stage-content" 
                  value={editedStage.content} 
                  onChange={(e) => setEditedStage({ ...editedStage, content: e.target.value })}
                  rows={4}
                  placeholder={
                    editedStage.type === "message" 
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
                  value={editedStage.delay} 
                  onChange={(e) => setEditedStage({ 
                    ...editedStage, 
                    delay: parseInt(e.target.value) || 60
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage-delay-unit">Unidade</Label>
                <Select
                  value={editedStage.delayUnit}
                  onValueChange={(value: "minutes" | "hours" | "days") => setEditedStage({ 
                    ...editedStage, 
                    delayUnit: value 
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
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="mr-2">
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
