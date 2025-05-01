
import React from "react";
import { 
  Check, Settings, Trash2, Plus, Calendar, Clock 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { TimeRestriction } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface RestrictionItemProps {
  restriction: TimeRestriction;
  onRemove: (id: string) => void;
  onUpdate?: (updatedRestriction: TimeRestriction) => void;
  selected?: boolean;
  onSelect?: () => void;
  editable?: boolean;
}

export function RestrictionItem({ 
  restriction, 
  onRemove, 
  onUpdate, 
  selected = false,
  onSelect,
  editable = true 
}: RestrictionItemProps) {
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleToggleActive = () => {
    if (onUpdate) {
      onUpdate({
        ...restriction,
        active: !restriction.active
      });
    }
  };
  
  // Formata o horário da restrição
  const formatTimeRange = () => {
    return `${formatTime(restriction.startHour, restriction.startMinute)} - ${formatTime(restriction.endHour, restriction.endMinute)}`;
  };
  
  // Formata os dias da semana
  const formatDays = () => {
    // Verifica se são todos os dias
    if (restriction.days.length === 7) {
      return "Todos os dias";
    }
    
    // Verifica se é dias de semana (seg-sex)
    if (restriction.days.length === 5 && 
        [1, 2, 3, 4, 5].every(d => restriction.days.includes(d)) &&
        ![0, 6].some(d => restriction.days.includes(d))) {
      return "Dias úteis (Seg-Sex)";
    }
    
    // Verifica se é final de semana
    if (restriction.days.length === 2 && 
        [0, 6].every(d => restriction.days.includes(d))) {
      return "Fins de semana";
    }
    
    // Caso contrário, lista os dias
    return restriction.days
      .sort((a, b) => a - b)
      .map(day => dayNames[day])
      .join(", ");
  };

  return (
    <Card className={cn(
      "flex flex-col md:flex-row items-start md:items-center justify-between p-3 gap-3",
      selected && "border-blue-500",
      !restriction.active && "opacity-60"
    )}>
      <div className="flex-grow">
        <div className="flex items-center gap-2">
          {restriction.isGlobal && (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/40 bg-blue-500/10">
              Global
            </Badge>
          )}
          <h4 className="font-medium">{restriction.name}</h4>
        </div>
        
        <div className="flex flex-col xs:flex-row gap-x-4 gap-y-1 text-muted-foreground text-sm mt-1">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDays()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimeRange()}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 self-end md:self-center">
        {onUpdate && editable && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {restriction.active ? "Ativo" : "Inativo"}
            </span>
            <Switch 
              checked={restriction.active} 
              onCheckedChange={handleToggleActive} 
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        )}
        
        {onSelect && !selected && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSelect}
            className="h-7 px-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Adicionar</span>
          </Button>
        )}
        
        {selected && (
          <Check className="h-5 w-5 text-blue-500" />
        )}
        
        {onRemove && editable && (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-100 h-8 w-8 p-0"
            onClick={() => onRemove(restriction.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Remover</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
