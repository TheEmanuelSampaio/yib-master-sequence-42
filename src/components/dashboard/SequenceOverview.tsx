
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sequence } from "@/types";
import { Badge } from '@/components/ui/badge';
import { Clock, Tag } from 'lucide-react';

interface SequenceOverviewProps {
  sequence: Sequence | null;
}

export default function SequenceOverview({ sequence }: SequenceOverviewProps) {
  if (!sequence) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Sequência</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma sequência selecionada</p>
        </CardContent>
      </Card>
    );
  }

  // Função para renderizar tags das condições
  const renderConditionTags = (condition: { groups: { tags: string[], operator: string }[], operator: string }) => {
    if (!condition.groups || condition.groups.length === 0) {
      return <span className="text-muted-foreground">Nenhuma tag configurada</span>;
    }

    // Obter todas as tags de todos os grupos
    const allTags: string[] = [];
    condition.groups.forEach(group => {
      if (group.tags && group.tags.length > 0) {
        allTags.push(...group.tags);
      }
    });

    // Limitar o número de tags mostradas
    const MAX_TAGS = 5;
    const tagsToShow = allTags.slice(0, MAX_TAGS);
    const hasMore = allTags.length > MAX_TAGS;

    return (
      <div className="flex flex-wrap gap-1">
        {tagsToShow.map((tag, index) => (
          <Badge key={index} variant="outline">{tag}</Badge>
        ))}
        {hasMore && (
          <Badge variant="outline" className="bg-muted">+{allTags.length - MAX_TAGS}</Badge>
        )}
      </div>
    );
  };

  // Resumo dos grupos para mostrar na interface
  const getGroupSummary = (condition: { groups: { tags: string[], operator: string }[], operator: string }) => {
    if (!condition.groups || condition.groups.length === 0) {
      return "";
    }
    
    if (condition.groups.length === 1) {
      return `1 grupo (${condition.groups[0].operator})`;
    }
    
    return `${condition.groups.length} grupos (${condition.operator})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhes da Sequência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium flex items-center">
            <Tag className="h-4 w-4 mr-1" /> 
            Condições de Início
            <span className="text-xs ml-2 text-muted-foreground">
              {getGroupSummary(sequence.startCondition)}
            </span>
          </h3>
          <div className="mt-1">
            {renderConditionTags(sequence.startCondition)}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium flex items-center">
            <Tag className="h-4 w-4 mr-1" /> 
            Condições de Parada
            <span className="text-xs ml-2 text-muted-foreground">
              {getGroupSummary(sequence.stopCondition)}
            </span>
          </h3>
          <div className="mt-1">
            {renderConditionTags(sequence.stopCondition)}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-1" /> 
            Estágios
          </h3>
          <p className="text-sm mt-1">
            {sequence.stages.length} estágios configurados
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
