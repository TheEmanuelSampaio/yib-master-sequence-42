
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdvancedCondition, ConditionGroup } from '@/types/conditionTypes';
import { TagCondition } from '@/types';
import { PlusCircle, MinusCircle, X, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface AdvancedConditionBuilderProps {
  condition: AdvancedCondition;
  availableTags: string[];
  onChange: (condition: AdvancedCondition) => void;
  onToggleSimpleMode: () => void;
}

export function AdvancedConditionBuilder({
  condition,
  availableTags,
  onChange,
  onToggleSimpleMode
}: AdvancedConditionBuilderProps) {
  const [newTag, setNewTag] = useState<string>('');
  
  const handleConditionOperatorChange = (value: string) => {
    onChange({
      ...condition,
      conditionOperator: value as 'AND' | 'OR'
    });
  };
  
  const handleGroupOperatorChange = (groupIndex: number, value: string) => {
    const updatedGroups = condition.groups.map((group) => {
      if (group.groupIndex === groupIndex) {
        return {
          ...group,
          groupOperator: value as 'AND' | 'OR'
        };
      }
      return group;
    });
    
    onChange({
      ...condition,
      groups: updatedGroups
    });
  };
  
  const handleAddTag = (groupIndex: number, tag: string) => {
    if (!tag.trim()) return;
    
    const updatedGroups = condition.groups.map((group) => {
      if (group.groupIndex === groupIndex) {
        // Verificar se a tag já existe neste grupo
        if (group.tags.includes(tag)) {
          toast.error(`A tag "${tag}" já existe neste grupo.`);
          return group;
        }
        
        return {
          ...group,
          tags: [...group.tags, tag]
        };
      }
      return group;
    });
    
    onChange({
      ...condition,
      groups: updatedGroups
    });
    
    setNewTag('');
  };
  
  const handleRemoveTag = (groupIndex: number, tag: string) => {
    const updatedGroups = condition.groups.map((group) => {
      if (group.groupIndex === groupIndex) {
        return {
          ...group,
          tags: group.tags.filter((t) => t !== tag)
        };
      }
      return group;
    });
    
    onChange({
      ...condition,
      groups: updatedGroups
    });
  };
  
  const handleAddGroup = () => {
    const maxIndex = condition.groups.length > 0 
      ? Math.max(...condition.groups.map(g => g.groupIndex))
      : -1;
    
    onChange({
      ...condition,
      groups: [
        ...condition.groups,
        {
          groupIndex: maxIndex + 1,
          groupOperator: 'AND', // Padrão para novos grupos
          tags: []
        }
      ]
    });
  };
  
  const handleRemoveGroup = (groupIndex: number) => {
    // Não permite remover o último grupo
    if (condition.groups.length <= 1) {
      toast.error("É necessário manter pelo menos um grupo de condições.");
      return;
    }
    
    // Remove o grupo e reajusta os índices
    const updatedGroups = condition.groups
      .filter((group) => group.groupIndex !== groupIndex)
      .map((group, index) => ({
        ...group,
        groupIndex: index
      }));
    
    onChange({
      ...condition,
      groups: updatedGroups
    });
  };

  return (
    <div className="space-y-6 p-4 border rounded-md bg-muted/30">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Condição Avançada</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onToggleSimpleMode} 
          className="text-xs"
        >
          Mudar para modo simples
        </Button>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Operador entre grupos</Label>
          <Select 
            value={condition.conditionOperator} 
            onValueChange={handleConditionOperatorChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="AND">E (AND)</SelectItem>
                <SelectItem value="OR">OU (OR)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            {condition.conditionOperator === 'AND' ? 
              "Todos os grupos devem ser satisfeitos" : 
              "Pelo menos um grupo deve ser satisfeito"}
          </p>
        </div>
        
        <div className="space-y-4">
          {condition.groups.map((group) => (
            <div 
              key={group.groupIndex} 
              className="p-4 border rounded-md bg-card relative"
            >
              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveGroup(group.groupIndex)}
                >
                  <MinusCircle className="h-4 w-4" />
                  <span className="sr-only">Remover grupo</span>
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Operador dentro do grupo</Label>
                  <Select 
                    value={group.groupOperator} 
                    onValueChange={(value) => handleGroupOperatorChange(group.groupIndex, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecione o operador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="AND">E (AND)</SelectItem>
                        <SelectItem value="OR">OU (OR)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.groupOperator === 'AND' ? 
                      "Todas as tags devem estar presentes" : 
                      "Pelo menos uma tag deve estar presente"}
                  </p>
                </div>
                
                <div>
                  <Label className="mb-2 block">Tags</Label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {group.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 p-0"
                          onClick={() => handleRemoveTag(group.groupIndex, tag)}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remover tag</span>
                        </Button>
                      </Badge>
                    ))}
                    {group.tags.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        Nenhuma tag adicionada
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={newTag} 
                      onValueChange={setNewTag}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {availableTags
                            .filter(tag => !group.tags.includes(tag))
                            .map((tag) => (
                              <SelectItem key={tag} value={tag}>
                                {tag}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleAddTag(group.groupIndex, newTag)}
                      disabled={!newTag}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={handleAddGroup}
            className="w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar grupo de condições
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdvancedConditionBuilder;
