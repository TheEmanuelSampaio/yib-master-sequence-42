
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2, MoveVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedCondition, TagGroup } from "@/types/conditionTypes";
import { v4 as uuidv4 } from "uuid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AdvancedTagConditionSectionProps {
  title: string;
  description: string;
  badgeColor: string;
  condition: AdvancedCondition;
  setCondition: (condition: AdvancedCondition) => void;
  availableTags: string[];
  notifyChanges: () => void;
}

export function AdvancedTagConditionSection({
  title,
  description,
  badgeColor,
  condition,
  setCondition,
  availableTags,
  notifyChanges
}: AdvancedTagConditionSectionProps) {
  const [newTag, setNewTag] = useState("");
  const [showTagSelector, setShowTagSelector] = useState<string | null>(null);

  const addGroup = () => {
    const newGroup: TagGroup = {
      id: uuidv4(),
      operator: "AND",
      tags: []
    };
    setCondition({
      ...condition,
      groups: [...condition.groups, newGroup]
    });
    notifyChanges();
  };

  const removeGroup = (groupId: string) => {
    setCondition({
      ...condition,
      groups: condition.groups.filter(g => g.id !== groupId)
    });
    notifyChanges();
  };

  const updateGroupOperator = (groupId: string, operator: "AND" | "OR") => {
    setCondition({
      ...condition,
      groups: condition.groups.map(g => 
        g.id === groupId ? { ...g, operator } : g
      )
    });
    notifyChanges();
  };

  const addTagToGroup = (groupId: string, tag: string) => {
    if (!tag) return;
    
    setCondition({
      ...condition,
      groups: condition.groups.map(g => {
        if (g.id === groupId && !g.tags.includes(tag)) {
          return { ...g, tags: [...g.tags, tag] };
        }
        return g;
      })
    });
    setNewTag("");
    setShowTagSelector(null);
    notifyChanges();
  };

  const removeTagFromGroup = (groupId: string, tag: string) => {
    setCondition({
      ...condition,
      groups: condition.groups.map(g => {
        if (g.id === groupId) {
          return { ...g, tags: g.tags.filter(t => t !== tag) };
        }
        return g;
      })
    });
    notifyChanges();
  };

  const updateConditionOperator = (operator: "AND" | "OR") => {
    setCondition({
      ...condition,
      operator
    });
    notifyChanges();
  };

  const moveGroup = (groupId: string, direction: "up" | "down") => {
    const groupIndex = condition.groups.findIndex(g => g.id === groupId);
    if (
      (direction === "up" && groupIndex === 0) ||
      (direction === "down" && groupIndex === condition.groups.length - 1)
    ) {
      return;
    }
    
    const newGroups = [...condition.groups];
    const moveIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    const temp = newGroups[groupIndex];
    newGroups[groupIndex] = newGroups[moveIndex];
    newGroups[moveIndex] = temp;
    
    setCondition({
      ...condition,
      groups: newGroups
    });
    notifyChanges();
  };

  const getOperatorLabel = (type: "condition" | "group", operator: string) => {
    if (type === "condition") {
      return operator === "AND" 
        ? "TODOS os grupos abaixo devem ser verdadeiros" 
        : "QUALQUER UM dos grupos abaixo deve ser verdadeiro";
    } else {
      return operator === "AND" 
        ? "TODAS as tags abaixo devem estar presentes" 
        : "QUALQUER UMA das tags abaixo deve estar presente";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Badge className={`mr-2 ${badgeColor}`}>{title === "Condição de Início" ? "Início" : "Parada"}</Badge>
          {title} - Modo Avançado
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Select
            value={condition.operator}
            onValueChange={(value) => updateConditionOperator(value as "AND" | "OR")}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {getOperatorLabel("condition", condition.operator)}
          </span>
        </div>
        
        {condition.groups.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {condition.groups.map((group, index) => (
              <AccordionItem key={group.id} value={group.id || `group-${index}`}>
                <AccordionTrigger className="hover:bg-accent hover:text-accent-foreground px-3 rounded-md">
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center">
                      <Badge variant="outline" className={`mr-2 ${badgeColor.replace('bg-', 'border-')}`}>
                        Grupo {index + 1}
                      </Badge>
                      <span className="font-mono text-sm">{group.operator}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {group.tags.length > 0 
                        ? `${group.tags.length} ${group.tags.length === 1 ? 'tag' : 'tags'}`
                        : 'Sem tags'}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <Select
                        value={group.operator}
                        onValueChange={(value) => updateGroupOperator(group.id!, value as "AND" | "OR")}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Operador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        {getOperatorLabel("group", group.operator)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {group.tags.map(tag => (
                          <Badge key={tag} className={badgeColor}>
                            {tag}
                            <button
                              className={`ml-1 hover:${badgeColor === "bg-green-600" ? "bg-green-700" : "bg-red-700"} rounded-full`}
                              onClick={() => removeTagFromGroup(group.id!, tag)}
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
                            onFocus={() => setShowTagSelector(group.id!)}
                          />
                          {showTagSelector === group.id && (
                            <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                              {availableTags.filter(tag => !group.tags.includes(tag)).length > 0 ? (
                                availableTags
                                  .filter(tag => !group.tags.includes(tag))
                                  .map(tag => (
                                    <button
                                      key={tag}
                                      className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                      onClick={() => {
                                        addTagToGroup(group.id!, tag);
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
                            addTagToGroup(group.id!, newTag);
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => moveGroup(group.id!, "up")}
                        disabled={index === 0}
                      >
                        <MoveVertical className="h-4 w-4 mr-1 rotate-180" />
                        Subir
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => moveGroup(group.id!, "down")}
                        disabled={index === condition.groups.length - 1}
                      >
                        <MoveVertical className="h-4 w-4 mr-1" />
                        Descer
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => removeGroup(group.id!)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover Grupo
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="border rounded-md p-6 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum grupo de condição adicionado. Adicione pelo menos um grupo para começar.
            </p>
          </div>
        )}

        <Button
          variant="outline"
          onClick={addGroup}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Grupo de Condição
        </Button>
      </CardContent>
    </Card>
  );
}
