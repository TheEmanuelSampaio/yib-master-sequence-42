
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X, Plus, Trash2, ArrowRightLeft } from "lucide-react";
import { useAdvancedConditions } from "@/hooks/useAdvancedConditions";
import { AdvancedCondition, ConditionGroup } from "@/types/conditionTypes";

interface AdvancedConditionBuilderProps {
  title: string;
  description?: string;
  badgeColor: string;
  initialCondition?: AdvancedCondition;
  availableTags: string[];
  onChange: (condition: AdvancedCondition) => void;
  onChangesMade: () => void;
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
  const initialAdvCondition = initialCondition || { type: conditionType, groups: [] };
  
  const {
    condition,
    addGroup,
    removeGroup,
    toggleGroupOperator,
    toggleConditionOperator,
    addTagToGroup,
    removeTagFromGroup
  } = useAdvancedConditions(initialAdvCondition);
  
  const [newTag, setNewTag] = useState("");
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  
  // Notifica o componente pai quando a condição muda
  React.useEffect(() => {
    onChange(condition);
    onChangesMade();
  }, [condition, onChange, onChangesMade]);
  
  const handleAddGroup = () => {
    addGroup();
  };
  
  const handleAddTag = (groupIndex: number) => {
    if (newTag) {
      addTagToGroup(groupIndex, newTag);
      setNewTag("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Badge className={`mr-2 ${badgeColor}`}>
            {conditionType === "start" ? "Início" : "Parada"}
          </Badge>
          {title} (Modo Avançado)
        </CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {condition.groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">Nenhum grupo de condições criado</p>
            <Button onClick={handleAddGroup}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Grupo de Condições
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {condition.groups.map((group, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2 text-xs">
                        Grupo {index + 1}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleConditionOperator(index)}
                      >
                        <span className="font-mono">{group.conditionOperator}</span>
                      </Button>
                      
                      <span className="text-sm text-muted-foreground ml-2">
                        {group.conditionOperator === "AND" 
                          ? "Contato precisa ter TODAS as tags selecionadas" 
                          : "Contato precisa ter QUALQUER UMA das tags selecionadas"}
                      </span>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeGroup(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 min-h-10">
                    {group.tags.map((tag) => (
                      <Badge key={tag} className={badgeColor}>
                        {tag}
                        <button
                          className={`ml-1 hover:${badgeColor === "bg-green-600" ? "bg-green-700" : "bg-red-700"} rounded-full`}
                          onClick={() => removeTagFromGroup(index, tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {group.tags.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        Nenhuma tag adicionada
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 tag-selector">
                    <div className="relative flex-1">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Digite ou selecione uma tag"
                        onFocus={() => setActiveGroupIndex(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(index);
                          }
                        }}
                      />
                      {activeGroupIndex === index && (
                        <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                          {availableTags.length > 0 ? (
                            availableTags
                              .filter(tag => !group.tags.includes(tag))
                              .map(tag => (
                                <button
                                  key={tag}
                                  className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                  onClick={() => {
                                    addTagToGroup(index, tag);
                                    setActiveGroupIndex(null);
                                  }}
                                >
                                  {tag}
                                </button>
                              ))
                          ) : (
                            <div className="px-3 py-1.5 text-sm text-muted-foreground">
                              Sem tags disponíveis
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button onClick={() => handleAddTag(index)}>
                      Adicionar
                    </Button>
                  </div>
                  
                  {/* Operador entre grupos (exceto para o último grupo) */}
                  {index < condition.groups.length - 1 && (
                    <div className="flex justify-center py-2">
                      <Button
                        variant="outline"
                        className="text-center"
                        size="sm"
                        onClick={() => toggleGroupOperator(index)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        {group.groupOperator}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center"
              onClick={handleAddGroup}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Outro Grupo
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
