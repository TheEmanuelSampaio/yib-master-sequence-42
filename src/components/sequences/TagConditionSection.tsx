
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { TagCondition } from "@/types";
import { AdvancedCondition } from "@/types/conditionTypes";

interface TagConditionSectionProps {
  title: string;
  description: string;
  badgeColor: string;
  condition: TagCondition;
  setCondition: (condition: TagCondition) => void;
  availableTags: string[];
  newTag: string;
  setNewTag: (tag: string) => void;
  showTagSelector: boolean;
  setShowTagSelector: (show: boolean) => void;
  addTagToCondition: (tag: string) => void;
  removeTag: (tag: string) => void;
  toggleConditionType: () => void;
  notifyChanges: () => void;
  // Novos props para condições avançadas
  useAdvancedCondition?: boolean;
  toggleAdvancedCondition?: () => void;
  advancedCondition?: AdvancedCondition;
  setAdvancedCondition?: (condition: AdvancedCondition) => void;
  conditionType?: "start" | "stop";
  renderAdvancedBuilder?: boolean;
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
  toggleConditionType,
  notifyChanges,
  // Novos props
  useAdvancedCondition,
  toggleAdvancedCondition,
  renderAdvancedBuilder,
  conditionType = "start"
}: TagConditionSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center">
            <Badge className={`mr-2 ${badgeColor}`}>{title === "Condição de Início" ? "Início" : "Parada"}</Badge>
            {title}
          </CardTitle>
          
          {toggleAdvancedCondition && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Modo Avançado</span>
              <Switch 
                checked={useAdvancedCondition}
                onCheckedChange={toggleAdvancedCondition}
              />
            </div>
          )}
        </div>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      
      {!useAdvancedCondition && (
        <CardContent className="space-y-4">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTagToCondition(newTag);
                      setNewTag('');
                    }
                  }}
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
                  if (newTag) {
                    addTagToCondition(newTag);
                    setNewTag('');
                  }
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      )}
      
      {/* Aqui o componente AdvancedConditionBuilder será renderizado se necessário */}
      {useAdvancedCondition && renderAdvancedBuilder && (
        <div>{/* Este espaço será preenchido pelo componente AdvancedConditionBuilder */}</div>
      )}
    </Card>
  );
}
