
import { useState } from "react";
import { Edit, Trash2, Lock, Check, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimeRestriction } from "@/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  
  if (isEditing) {
    return (
      <div className="border rounded-md p-4 mb-2 bg-card">
        <div className="space-y-4">
          <div className="flex justify-between">
            <h4 className="font-medium">Editar Restrição</h4>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveChanges}>Salvar</Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input 
                value={editedRestriction.name}
                onChange={(e) => setEditedRestriction({...editedRestriction, name: e.target.value})}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Label>Ativa</Label>
              <Switch 
                checked={editedRestriction.active}
                onCheckedChange={(checked) => setEditedRestriction({...editedRestriction, active: checked})}
              />
            </div>
            
            <div className="space-y-1">
              <Label>Dias da Semana</Label>
              <ToggleGroup 
                type="multiple" 
                variant="outline"
                className="justify-start"
                value={editedRestriction.days.map(d => d.toString())}
                onValueChange={(value) => {
                  if (value.length > 0) {
                    setEditedRestriction({
                      ...editedRestriction,
                      days: value.map(v => parseInt(v))
                    });
                  }
                }}
              >
                {[
                  { value: "0", label: "Dom" },
                  { value: "1", label: "Seg" },
                  { value: "2", label: "Ter" },
                  { value: "3", label: "Qua" },
                  { value: "4", label: "Qui" },
                  { value: "5", label: "Sex" },
                  { value: "6", label: "Sáb" }
                ].map(day => (
                  <ToggleGroupItem 
                    key={day.value} 
                    value={day.value} 
                    aria-label={dayNames[parseInt(day.value)]}
                    className="px-3"
                  >
                    {day.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Horário de Início</Label>
                <div className="flex mt-2 space-x-2">
                  <Select
                    value={editedRestriction.startHour.toString()}
                    onValueChange={(value) => 
                      setEditedRestriction({
                        ...editedRestriction,
                        startHour: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={`start-hour-${i}`} value={i.toString()}>
                          {i.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center">:</span>
                  <Select
                    value={editedRestriction.startMinute.toString()}
                    onValueChange={(value) => 
                      setEditedRestriction({
                        ...editedRestriction,
                        startMinute: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 15, 30, 45].map((minute) => (
                        <SelectItem key={`start-min-${minute}`} value={minute.toString()}>
                          {minute.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Horário de Fim</Label>
                <div className="flex mt-2 space-x-2">
                  <Select
                    value={editedRestriction.endHour.toString()}
                    onValueChange={(value) => 
                      setEditedRestriction({
                        ...editedRestriction,
                        endHour: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={`end-hour-${i}`} value={i.toString()}>
                          {i.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center">:</span>
                  <Select
                    value={editedRestriction.endMinute.toString()}
                    onValueChange={(value) => 
                      setEditedRestriction({
                        ...editedRestriction,
                        endMinute: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 15, 30, 45].map((minute) => (
                        <SelectItem key={`end-min-${minute}`} value={minute.toString()}>
                          {minute.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "border rounded-md mb-2 overflow-hidden",
      restriction.isGlobal ? "border-blue-500/40" : "border-border",
      !restriction.active && "opacity-60"
    )}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            {restriction.isGlobal ? (
              <div className="flex items-center">
                <Lock className="h-4 w-4 mr-2 text-blue-500" />
                <span className="font-medium">{restriction.name}</span>
                <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs py-0">
                  Global
                </Badge>
              </div>
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
        
        <div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Dias:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {activeDays.map((day, i) => (
                <Badge key={i} variant="outline" className="bg-secondary text-secondary-foreground text-xs">
                  {day}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            Horário: {formatTime(restriction.startHour, restriction.startMinute)} até {formatTime(restriction.endHour, restriction.endMinute)}
          </div>
        </div>
        
        {onSelect && (
          <div className="mt-3">
            <Button
              onClick={onSelect}
              variant="outline"
              size="sm"
              className="w-full border border-dashed"
            >
              {selected ? (
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  <span>Selecionada</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  <span>Adicionar</span>
                </div>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
