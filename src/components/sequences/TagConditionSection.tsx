
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { ConditionStructure, TagGroup } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface TagConditionSectionProps {
  title: string;
  description: string;
  badgeColor: string;
  condition: ConditionStructure;
  setCondition: (condition: ConditionStructure) => void;
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
  const [showTagSelector, setShowTagSelector] = useState<string | null>(null);
  
  // Toggle between AND/OR for the top level operator
  const toggleTopOperator = () => {
    setCondition({
      ...condition,
      operator: condition.operator === "AND" ? "OR" : "AND"
    });
    notifyChanges();
  };
  
  // Toggle between AND/OR for a specific group
  const toggleGroupOperator = (groupId: string) => {
    setCondition({
      ...condition,
      groups: condition.groups.map(group => 
        group.id === groupId 
          ? { ...group, operator: group.operator === "AND" ? "OR" : "AND" } 
          : group
      )
    });
    notifyChanges();
  };
  
  // Add a new empty group
  const addGroup = () => {
    const newGroup: TagGroup = {
      id: uuidv4(),
      tags: [],
      operator: "AND" // Default to AND for new groups
    };
    
    setCondition({
      ...condition,
      groups: [...condition.groups, newGroup]
    });
    notifyChanges();
  };
  
  // Remove a group
  const removeGroup = (groupId: string) => {
    setCondition({
      ...condition,
      groups: condition.groups.filter(group => group.id !== groupId)
    });
    notifyChanges();
  };
  
  // Add a tag to a specific group
  const addTagToGroup = (groupId: string, tag: string) => {
    if (!tag) return;
    
    setCondition({
      ...condition,
      groups: condition.groups.map(group => 
        group.id === groupId && !group.tags.includes(tag)
          ? { ...group, tags: [...group.tags, tag] }
          : group
      )
    });
    
    setNewTag("");
    setShowTagSelector(null);
    notifyChanges();
  };
  
  // Remove a tag from a specific group
  const removeTagFromGroup = (groupId: string, tag: string) => {
    setCondition({
      ...condition,
      groups: condition.groups.map(group => 
        group.id === groupId
          ? { ...group, tags: group.tags.filter(t => t !== tag) }
          : group
      )
    });
    notifyChanges();
  };
  
  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTagSelector && !(event.target as Element).closest('.tag-selector')) {
        setShowTagSelector(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagSelector]);
  
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
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={toggleTopOperator}
          >
            <span className="font-mono">{condition.operator}</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            {condition.operator === "AND" 
              ? "Todos os grupos abaixo devem ser satisfeitos" 
              : "Qualquer um dos grupos abaixo deve ser satisfeito"}
          </span>
        </div>
        
        {condition.groups.length === 0 ? (
          <div className="text-center p-4 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground">Nenhum grupo de tags adicionado</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={addGroup}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Grupo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {condition.groups.map((group) => (
              <div key={group.id} className="border rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroupOperator(group.id)}
                    >
                      <span className="font-mono">{group.operator}</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {group.operator === "AND" 
                        ? "Todas as tags devem estar presentes" 
                        : "Qualquer uma das tags deve estar presente"}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {group.tags.length > 0 ? (
                      group.tags.map((tag) => (
                        <Badge key={tag} className={badgeColor}>
                          {tag}
                          <button
                            className={`ml-1 hover:${badgeColor === "bg-green-600" ? "bg-green-700" : "bg-red-700"} rounded-full`}
                            onClick={() => removeTagFromGroup(group.id, tag)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Nenhuma tag adicionada
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 tag-selector">
                    <div className="relative flex-1">
                      <Input
                        value={showTagSelector === group.id ? newTag : ""}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Digite ou selecione uma tag"
                        onFocus={() => setShowTagSelector(group.id)}
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
                        addTagToGroup(group.id, newTag);
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <Button variant="outline" size="sm" onClick={addGroup} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Grupo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
