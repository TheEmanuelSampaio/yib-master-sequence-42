
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { TagCondition, ConditionGroup, ConditionStructure } from "@/types";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface TagConditionSectionProps {
  title: string;
  description: string;
  badgeColor: string;
  condition: TagCondition;
  setCondition: (condition: TagCondition) => void;
  // Novos props para condições avançadas
  advancedMode: boolean;
  setAdvancedMode: (mode: boolean) => void;
  advancedCondition?: ConditionStructure;
  setAdvancedCondition?: (condition: ConditionStructure) => void;
  availableTags: string[];
  newTag: string;
  setNewTag: (tag: string) => void;
  showTagSelector: boolean;
  setShowTagSelector: (show: boolean) => void;
  addTagToCondition: (tag: string) => void;
  removeTag: (tag: string) => void;
  toggleConditionType: () => void;
  notifyChanges: () => void;
}

export function TagConditionSection({
  title,
  description,
  badgeColor,
  condition,
  setCondition,
  advancedMode,
  setAdvancedMode,
  advancedCondition,
  setAdvancedCondition,
  availableTags,
  newTag,
  setNewTag,
  showTagSelector,
  setShowTagSelector,
  addTagToCondition,
  removeTag,
  toggleConditionType,
  notifyChanges
}: TagConditionSectionProps) {
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupNewTag, setGroupNewTag] = useState<string>("");
  
  // Gerar um ID único para novos grupos
  const generateGroupId = () => `group_${Math.random().toString(36).substr(2, 9)}`;

  // Adicionar um novo grupo de condições
  const addConditionGroup = () => {
    if (!advancedCondition || !setAdvancedCondition) return;

    const newGroup = {
      id: generateGroupId(),
      operator: "AND" as const,
      tags: []
    };

    setAdvancedCondition({
      ...advancedCondition,
      groups: [...advancedCondition.groups, newGroup]
    });

    setExpandedGroups({...expandedGroups, [newGroup.id]: true});
    setActiveGroupId(newGroup.id);
    notifyChanges();
  };

  // Remover um grupo de condições
  const removeConditionGroup = (groupId: string) => {
    if (!advancedCondition || !setAdvancedCondition) return;

    const updatedGroups = advancedCondition.groups.filter(group => group.id !== groupId);
    setAdvancedCondition({
      ...advancedCondition,
      groups: updatedGroups
    });
    
    if (activeGroupId === groupId) {
      setActiveGroupId(updatedGroups.length > 0 ? updatedGroups[0].id : null);
    }
    
    notifyChanges();
  };

  // Adicionar tag a um grupo específico
  const addTagToGroup = (groupId: string, tag: string) => {
    if (!tag.trim() || !advancedCondition || !setAdvancedCondition) return;

    const updatedGroups = advancedCondition.groups.map(group => {
      if (group.id === groupId && !group.tags.includes(tag)) {
        return {
          ...group,
          tags: [...group.tags, tag]
        };
      }
      return group;
    });

    setAdvancedCondition({
      ...advancedCondition,
      groups: updatedGroups
    });
    
    setGroupNewTag("");
    notifyChanges();
  };

  // Remover tag de um grupo específico
  const removeTagFromGroup = (groupId: string, tag: string) => {
    if (!advancedCondition || !setAdvancedCondition) return;

    const updatedGroups = advancedCondition.groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          tags: group.tags.filter(t => t !== tag)
        };
      }
      return group;
    });

    setAdvancedCondition({
      ...advancedCondition,
      groups: updatedGroups
    });
    
    notifyChanges();
  };

  // Alternar o operador de um grupo (AND/OR)
  const toggleGroupOperator = (groupId: string) => {
    if (!advancedCondition || !setAdvancedCondition) return;

    const updatedGroups = advancedCondition.groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          operator: group.operator === "AND" ? "OR" : "AND"
        };
      }
      return group;
    });

    setAdvancedCondition({
      ...advancedCondition,
      groups: updatedGroups
    });
    
    notifyChanges();
  };

  // Alternar o operador principal que conecta grupos
  const toggleMainOperator = () => {
    if (!advancedCondition || !setAdvancedCondition) return;

    setAdvancedCondition({
      ...advancedCondition,
      mainOperator: advancedCondition.mainOperator === "AND" ? "OR" : "AND"
    });
    
    notifyChanges();
  };

  // Expandir/colapsar um grupo
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupId]: !expandedGroups[groupId]
    });
  };

  // Tornar um grupo ativo para edição
  const setGroupActive = (groupId: string) => {
    setActiveGroupId(groupId);
    setGroupNewTag("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Badge className={`mr-2 ${badgeColor}`}>{title === "Condição de Início" ? "Início" : "Parada"}</Badge>
            {title}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Modo Avançado</span>
            <Switch
              checked={advancedMode}
              onCheckedChange={(checked) => {
                setAdvancedMode(checked);
                notifyChanges();
              }}
            />
          </div>
        </div>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!advancedMode ? (
          // Modo básico - comportamento original
          <>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={toggleConditionType}
              >
                <span className="font-mono">{condition.type}</span>
              </Button>
              <span className="text-sm text-muted-foreground">
                {condition.type === "AND" 
                  ? (title === "Condição de Início" 
                      ? "Contato precisa ter TODAS as tags selecionadas"
                      : "Contato será removido se tiver TODAS as tags selecionadas") 
                  : (title === "Condição de Início"
                      ? "Contato precisa ter QUALQUER UMA das tags selecionadas"
                      : "Contato será removido se tiver QUALQUER UMA das tags selecionadas")}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {condition.tags.map((tag) => (
                  <Badge key={tag} className={badgeColor}>
                    {tag}
                    <button
                      className={`ml-1 hover:${badgeColor === "bg-green-600" ? "bg-green-700" : "bg-red-700"} rounded-full`}
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {condition.tags.length === 0 && (
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
                    onFocus={() => setShowTagSelector(true)}
                  />
                  {showTagSelector && (
                    <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                      {availableTags.filter(tag => !condition.tags.includes(tag)).length > 0 ? (
                        availableTags
                          .filter(tag => !condition.tags.includes(tag))
                          .map(tag => (
                            <button
                              key={tag}
                              className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                              onClick={() => {
                                addTagToCondition(tag);
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
                    addTagToCondition(newTag);
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Modo avançado com grupos de condições
          <>
            {advancedCondition && setAdvancedCondition && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={toggleMainOperator}
                    >
                      <span className="font-mono">{advancedCondition.mainOperator}</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {advancedCondition.mainOperator === "AND" 
                        ? "TODOS os grupos devem ser verdadeiros" 
                        : "PELO MENOS UM grupo deve ser verdadeiro"}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={addConditionGroup}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Grupo
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {advancedCondition.groups.map((group, index) => (
                    <div 
                      key={group.id} 
                      className={cn(
                        "border rounded-md p-3",
                        activeGroupId === group.id ? "border-primary" : "border-border"
                      )}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => toggleGroupOperator(group.id)}
                          >
                            <span className="font-mono">{group.operator}</span>
                          </Button>
                          <span className="text-sm">
                            Grupo {index + 1}
                            {group.tags.length > 0 && ` (${group.tags.length} tag${group.tags.length > 1 ? 's' : ''})`}
                          </span>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleGroupExpansion(group.id)}
                          >
                            {expandedGroups[group.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                            onClick={() => removeConditionGroup(group.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {expandedGroups[group.id] && (
                        <>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {group.tags.map((tag) => (
                              <Badge key={tag} className={badgeColor}>
                                {tag}
                                <button
                                  className={`ml-1 hover:${badgeColor === "bg-green-600" ? "bg-green-700" : "bg-red-700"} rounded-full`}
                                  onClick={() => removeTagFromGroup(group.id, tag)}
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
                          
                          <div className="flex space-x-2">
                            <div className="relative flex-1">
                              <Input
                                value={activeGroupId === group.id ? groupNewTag : ""}
                                onChange={(e) => setGroupNewTag(e.target.value)}
                                placeholder="Digite ou selecione uma tag"
                                onFocus={() => setGroupActive(group.id)}
                              />
                              {activeGroupId === group.id && groupNewTag && (
                                <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                                  {availableTags.filter(tag => !group.tags.includes(tag) && tag.toLowerCase().includes(groupNewTag.toLowerCase())).length > 0 ? (
                                    availableTags
                                      .filter(tag => !group.tags.includes(tag) && tag.toLowerCase().includes(groupNewTag.toLowerCase()))
                                      .map(tag => (
                                        <button
                                          key={tag}
                                          className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                                          onClick={() => {
                                            addTagToGroup(group.id, tag);
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
                                if (activeGroupId === group.id) {
                                  addTagToGroup(group.id, groupNewTag);
                                } else {
                                  setGroupActive(group.id);
                                }
                              }}
                            >
                              Adicionar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                {advancedCondition.groups.length === 0 && (
                  <div className="text-center py-6 border border-dashed rounded-md">
                    <p className="text-muted-foreground mb-2">Nenhum grupo de condições adicionado</p>
                    <Button 
                      variant="outline" 
                      onClick={addConditionGroup}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Grupo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
