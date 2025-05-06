
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, PlusCircle } from "lucide-react";
import { ComplexCondition, ConditionGroup } from "@/types";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface TagConditionSectionProps {
  title: string;
  description: string;
  badgeColor: string;
  condition: ComplexCondition;
  setCondition: (condition: ComplexCondition) => void;
  availableTags: string[];
  notifyChanges: () => void;
}

export function TagConditionSection({
  title,
  description,
  badgeColor,
  condition,
  setCondition,
  availableTags,
  notifyChanges
}: TagConditionSectionProps) {
  const [newTag, setNewTag] = useState("");
  const [showTagSelector, setShowTagSelector] = useState<number | null>(null);

  // Função para alternar o operador principal entre grupos
  const toggleMainOperator = () => {
    setCondition({
      ...condition,
      operator: condition.operator === "AND" ? "OR" : "AND"
    });
    notifyChanges();
  };

  // Função para alternar o operador de um grupo específico
  const toggleGroupOperator = (groupIndex: number) => {
    const updatedGroups = [...condition.groups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      operator: updatedGroups[groupIndex].operator === "AND" ? "OR" : "AND"
    };
    
    setCondition({
      ...condition,
      groups: updatedGroups
    });
    notifyChanges();
  };

  // Adicionar tag a um grupo específico
  const addTagToGroup = (groupIndex: number, tag: string) => {
    if (!tag.trim() || condition.groups[groupIndex].tags.includes(tag)) {
      return;
    }

    const updatedGroups = [...condition.groups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      tags: [...updatedGroups[groupIndex].tags, tag]
    };

    setCondition({
      ...condition,
      groups: updatedGroups
    });
    setNewTag("");
    setShowTagSelector(null);
    notifyChanges();
  };

  // Remover tag de um grupo específico
  const removeTagFromGroup = (groupIndex: number, tag: string) => {
    const updatedGroups = [...condition.groups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      tags: updatedGroups[groupIndex].tags.filter(t => t !== tag)
    };

    setCondition({
      ...condition,
      groups: updatedGroups
    });
    notifyChanges();
  };

  // Adicionar um novo grupo de condições
  const addNewGroup = () => {
    setCondition({
      ...condition,
      groups: [...condition.groups, { operator: "AND", tags: [] }]
    });
    notifyChanges();
  };

  // Remover um grupo de condições
  const removeGroup = (groupIndex: number) => {
    if (condition.groups.length <= 1) {
      return; // Manter pelo menos um grupo
    }

    const updatedGroups = [...condition.groups];
    updatedGroups.splice(groupIndex, 1);

    setCondition({
      ...condition,
      groups: updatedGroups
    });
    notifyChanges();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Badge className={`mr-2 ${badgeColor}`}>{title === "Condição de Início" ? "Início" : "Parada"}</Badge>
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Operador principal entre grupos */}
        {condition.groups.length > 1 && (
          <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
            <span className="text-sm font-medium">Relacionar grupos com:</span>
            <Button 
              variant="outline"
              size="sm"
              onClick={toggleMainOperator}
            >
              <span className="font-mono">{condition.operator}</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              {condition.operator === "AND" 
                ? "Todos os grupos devem corresponder" 
                : "Qualquer grupo pode corresponder"}
            </span>
          </div>
        )}

        {/* Lista de grupos de condições */}
        <div className="space-y-4">
          {condition.groups.map((group, groupIndex) => (
            <div 
              key={groupIndex} 
              className={`border rounded-md p-3 ${groupIndex > 0 ? 'mt-4' : ''}`}
            >
              {/* Cabeçalho do grupo com operador */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Grupo {groupIndex + 1}</span>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => toggleGroupOperator(groupIndex)}
                  >
                    <span className="font-mono">{group.operator}</span>
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {group.operator === "AND" 
                      ? "Todas as tags são necessárias" 
                      : "Qualquer uma das tags é suficiente"}
                  </span>
                </div>
                
                {condition.groups.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() => removeGroup(groupIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Tags do grupo */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <Badge key={tag} className={badgeColor}>
                      {tag}
                      <button
                        className={`ml-1 hover:${badgeColor === "bg-green-600" ? "bg-green-700" : "bg-red-700"} rounded-full`}
                        onClick={() => removeTagFromGroup(groupIndex, tag)}
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
                
                {/* Seletor de tags */}
                <div className="flex space-x-2 tag-selector">
                  <div className="relative flex-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Digite ou selecione uma tag"
                      onFocus={() => setShowTagSelector(groupIndex)}
                    />
                    {showTagSelector === groupIndex && (
                      <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                        {availableTags.filter(tag => !group.tags.includes(tag)).length > 0 ? (
                          availableTags
                            .filter(tag => !group.tags.includes(tag))
                            .map(tag => (
                              <button
                                key={tag}
                                className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                onClick={() => {
                                  addTagToGroup(groupIndex, tag);
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
                  <Button 
                    onClick={() => {
                      addTagToGroup(groupIndex, newTag);
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Botão para adicionar novo grupo */}
        <Button 
          variant="outline" 
          className="w-full mt-2" 
          onClick={addNewGroup}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Novo Grupo de Condições
        </Button>
      </CardContent>
    </Card>
  );
}
