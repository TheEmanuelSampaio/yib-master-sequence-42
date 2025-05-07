
import React, { useState } from "react";
import { PlusCircle, Trash2, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdvancedConditions } from "@/hooks/useAdvancedConditions";
import { AdvancedCondition, ConditionGroup } from "@/types/conditionTypes";

interface AdvancedConditionBuilderProps {
  title: string;
  description: string;
  badgeColor: string;
  initialCondition: AdvancedCondition;
  availableTags: string[];
  onChange: (condition: AdvancedCondition) => void;
  onChangesMade?: () => void;
  conditionType: "start" | "stop";
}

export function AdvancedConditionBuilder({
  title,
  description,
  badgeColor,
  initialCondition,
  availableTags,
  onChange,
  onChangesMade,
  conditionType
}: AdvancedConditionBuilderProps) {
  const {
    condition,
    addGroup,
    removeGroup,
    toggleGroupOperator,
    toggleConditionOperator,
    addTagToGroup,
    removeTagFromGroup
  } = useAdvancedConditions(initialCondition);

  const [newTag, setNewTag] = useState("");
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);

  // Notifica mudanças para o componente pai
  React.useEffect(() => {
    onChange(condition);
    if (onChangesMade) {
      onChangesMade();
    }
  }, [condition, onChange, onChangesMade]);

  // Gerencia a adição de uma nova tag
  const handleAddTag = (groupIndex: number) => {
    if (!newTag) return;
    
    addTagToGroup(groupIndex, newTag);
    setNewTag("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge className={`${badgeColor} text-white`}>
              {conditionType === "start" ? "Início" : "Parada"}
            </Badge>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="end" className="max-w-sm">
                <p>
                  Use condições avançadas para criar regras complexas usando AND e OR. 
                  Cada grupo é avaliado separadamente e depois combinado com o operador entre grupos.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {condition.groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Adicione um grupo para começar a criar condição avançada
            </div>
          ) : (
            condition.groups.map((group, groupIndex) => (
              <div key={group.id || groupIndex} className="space-y-3 p-3 border rounded-lg">
                {/* Cabeçalho do grupo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">Grupo {groupIndex + 1}</h4>
                    
                    <Select
                      value={group.conditionOperator}
                      onValueChange={(value) => toggleConditionOperator(groupIndex)}
                    >
                      <SelectTrigger className="w-[80px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">E</SelectItem>
                        <SelectItem value="OR">OU</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <span className="text-xs text-muted-foreground">
                      {group.conditionOperator === "AND"
                        ? "Todas as tags devem estar presentes"
                        : "Pelo menos uma tag deve estar presente"}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGroup(groupIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Tags do grupo */}
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 py-1 px-2"
                    >
                      {tag}
                      <button
                        onClick={() => removeTagFromGroup(groupIndex, tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                {/* Input para adicionar tag */}
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Digite ou selecione uma tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag(groupIndex);
                        }
                      }}
                      className="pr-8"
                      list={`available-tags-${groupIndex}`}
                    />
                    <datalist id={`available-tags-${groupIndex}`}>
                      {availableTags.map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddTag(groupIndex)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                
                {/* Operador entre grupos */}
                {groupIndex < condition.groups.length - 1 && (
                  <div className="flex items-center justify-center mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroupOperator(groupIndex)}
                    >
                      {group.groupOperator === "AND" ? "E" : "OU"}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={addGroup}
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Adicionar novo grupo
        </Button>
      </CardFooter>
    </Card>
  );
}

// Componente X para botões de remover
function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
