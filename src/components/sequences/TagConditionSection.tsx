
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { ConditionGroup, ConditionStructure } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TagConditionSectionProps {
  title: string;
  description: string;
  badgeColor: string;
  condition: ConditionStructure;
  setCondition: (condition: ConditionStructure) => void;
  availableTags: string[];
  newTag: string;
  setNewTag: (tag: string) => void;
  showTagSelector: boolean;
  setShowTagSelector: (show: boolean) => void;
  addTagToCondition: (groupIndex: number, tag: string) => void;
  removeTag: (groupIndex: number, tag: string) => void;
  toggleGroupOperator: (groupIndex: number) => void;
  toggleMainOperator: () => void;
  addGroup: () => void;
  removeGroup: (groupIndex: number) => void;
  notifyChanges: () => void;
}

export function TagConditionSection({
  title,
  description,
  badgeColor,
  condition,
  setCondition,
  availableTags,
  newTag,
  setNewTag,
  showTagSelector,
  setShowTagSelector,
  addTagToCondition,
  removeTag,
  toggleGroupOperator,
  toggleMainOperator,
  addGroup,
  removeGroup,
  notifyChanges
}: TagConditionSectionProps) {
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);
  
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
        {/* Main Operator selector */}
        <div className="flex items-center space-x-2 mb-4">
          <Button 
            variant="outline"
            size="sm"
            onClick={toggleMainOperator}
          >
            <span className="font-mono">{condition.operator}</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            {condition.operator === "AND" 
              ? "Todos os grupos devem ser verdadeiros" 
              : "Pelo menos um grupo deve ser verdadeiro"}
          </span>
        </div>
        
        {/* Groups section */}
        {condition.groups.map((group, groupIndex) => (
          <Card key={groupIndex} className={`border ${activeGroupIndex === groupIndex ? 'border-primary' : 'border-muted'} p-4 mb-4`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => toggleGroupOperator(groupIndex)}
                >
                  <span className="font-mono">{group.operator}</span>
                </Button>
                <span className="text-sm text-muted-foreground">
                  {group.operator === "AND" 
                    ? "Contato precisa ter TODAS as tags" 
                    : "Contato precisa ter QUALQUER UMA das tags"}
                </span>
              </div>
              
              {condition.groups.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGroup(groupIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => (
                  <Badge key={tag} className={badgeColor}>
                    {tag}
                    <button
                      className={`ml-1 hover:${badgeColor === "bg-green-600" ? "bg-green-700" : "bg-red-700"} rounded-full`}
                      onClick={() => removeTag(groupIndex, tag)}
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
                    value={groupIndex === activeGroupIndex ? newTag : ""}
                    onChange={e => {
                      if (groupIndex === activeGroupIndex) {
                        setNewTag(e.target.value);
                      } else {
                        setActiveGroupIndex(groupIndex);
                        setNewTag(e.target.value);
                      }
                    }}
                    onClick={() => {
                      setActiveGroupIndex(groupIndex);
                      setShowTagSelector(true);
                    }}
                    placeholder="Digite ou selecione uma tag"
                    onFocus={() => {
                      setActiveGroupIndex(groupIndex);
                      setShowTagSelector(true);
                    }}
                  />
                  {showTagSelector && activeGroupIndex === groupIndex && (
                    <div className="absolute z-10 w-full max-h-32 overflow-y-auto mt-1 bg-card border rounded-md shadow-lg">
                      {availableTags.filter(tag => !group.tags.includes(tag)).length > 0 ? (
                        availableTags
                          .filter(tag => !group.tags.includes(tag))
                          .map(tag => (
                            <button
                              key={tag}
                              className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                              onClick={() => {
                                addTagToCondition(groupIndex, tag);
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
                    if (newTag) {
                      addTagToCondition(groupIndex, newTag);
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={addGroup}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Grupo de Condição
        </Button>
      </CardContent>
    </Card>
  );
}
