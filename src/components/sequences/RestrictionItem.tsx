
import { useState } from "react";
import { Edit, Trash2, Lock, Unlock, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimeRestriction } from "@/types";
import { cn } from "@/lib/utils";

interface RestrictionItemProps {
  restriction: TimeRestriction;
  onRemove: (id: string) => void;
  onUpdate?: (restriction: TimeRestriction) => void;
  selected?: boolean;
  onSelect?: () => void;
}

export function RestrictionItem({ restriction, onRemove, onUpdate, selected, onSelect }: RestrictionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRestriction, setEditedRestriction] = useState<TimeRestriction>({...restriction});
  
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };
  
  const handleSaveChanges = () => {
    if (onUpdate) {
      onUpdate(editedRestriction);
    }
    setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
    setEditedRestriction({...restriction});
    setIsEditing(false);
  };

  const activeDays = restriction.days.map(dayIndex => dayNames[dayIndex]);
  
  return (
    <div className={cn(
      "border rounded-md mb-2 overflow-hidden",
      restriction.isGlobal ? "border-blue-500/40" : "border-border",
      !restriction.active && "opacity-60"
    )}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            {restriction.isGlobal ? (
              <Lock className="h-4 w-4 mr-2 text-blue-500" />
            ) : (
              <div className="flex items-center">
                <Switch
                  checked={restriction.active}
                  onCheckedChange={(checked) => 
                    onUpdate && onUpdate({
                      ...restriction,
                      active: checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium">{restriction.name}</span>
              </div>
            )}
            {restriction.isGlobal && (
              <span className="font-medium">{restriction.name}</span>
            )}
            {restriction.isGlobal && (
              <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs py-0">
                Global
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {!restriction.isGlobal && onUpdate && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={() => onRemove(restriction.id)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Dias:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {activeDays.map((day, i) => (
                <Badge key={i} variant="outline" className="bg-secondary text-secondary-foreground">
                  {day}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Horário: {formatTime(restriction.startHour, restriction.startMinute)} até {formatTime(restriction.endHour, restriction.endMinute)}
          </div>
        </div>
        
        {selected && (
          <div className="mt-2 flex justify-end">
            <Check className="h-5 w-5 text-green-500" />
          </div>
        )}
        
        {onSelect && (
          <Button
            onClick={onSelect}
            variant="ghost"
            className="mt-2 w-full border border-dashed"
          >
            {selected ? "Selecionada" : "Adicionar"}
          </Button>
        )}
      </div>
    </div>
  );
}
