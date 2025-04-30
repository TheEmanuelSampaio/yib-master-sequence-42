
import { useState } from "react";
import { Clock, Trash2, Lock, Unlock, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TimeRestriction } from "@/types";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RestrictionItemProps {
  restriction: TimeRestriction;
  onRemove: (id: string) => void;
  onUpdate?: (restriction: TimeRestriction) => void;
}

export function RestrictionItem({ restriction, onRemove, onUpdate }: RestrictionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRestriction, setEditedRestriction] = useState<TimeRestriction>({...restriction});
  
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const shortDayNames = ["D", "S", "T", "Q", "Q", "S", "S"];
  
  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };
  
  const getDaysLabel = (days: number[]) => {
    if (days.length === 7) return "Todos os dias";
    if (days.length === 0) return "Nenhum dia";
    if (JSON.stringify(days.sort()) === JSON.stringify([1, 2, 3, 4, 5].sort())) return "Segunda a Sexta";
    if (JSON.stringify(days.sort()) === JSON.stringify([0, 6].sort())) return "Finais de semana";
    
    return days.map(day => dayNames[day]).join(", ");
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

  return (
    <Card className={cn(
      "overflow-hidden border",
      !restriction.active && "opacity-60",
      restriction.isGlobal && "border-blue-500 dark:border-blue-700",
    )}>
      <CardContent className="p-3">
        {isEditing && !restriction.isGlobal ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <Label htmlFor={`restriction-name-${restriction.id}`} className="text-xs mb-1">Nome</Label>
                <Input 
                  id={`restriction-name-${restriction.id}`}
                  value={editedRestriction.name}
                  onChange={(e) => setEditedRestriction({...editedRestriction, name: e.target.value})}
                  className="h-8"
                />
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0" 
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0" 
                  onClick={handleSaveChanges}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-xs mb-1">Dias</Label>
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
                {shortDayNames.map((day, index) => (
                  <ToggleGroupItem 
                    key={index} 
                    value={index.toString()} 
                    aria-label={dayNames[index]}
                    title={dayNames[index]}
                    className="w-8 h-8 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {day}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início</Label>
                <div className="flex mt-1 space-x-1">
                  <Select
                    value={editedRestriction.startHour.toString()}
                    onValueChange={(value) => 
                      setEditedRestriction({
                        ...editedRestriction,
                        startHour: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
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
                    <SelectTrigger className="h-8">
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
                <Label className="text-xs">Fim</Label>
                <div className="flex mt-1 space-x-1">
                  <Select
                    value={editedRestriction.endHour.toString()}
                    onValueChange={(value) => 
                      setEditedRestriction({
                        ...editedRestriction,
                        endHour: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
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
                    <SelectTrigger className="h-8">
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
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editedRestriction.active}
                  onCheckedChange={(checked) => 
                    setEditedRestriction({
                      ...editedRestriction,
                      active: checked,
                    })
                  }
                  className="h-4 data-[state=checked]:bg-green-600"
                />
                <span className="text-sm">{editedRestriction.active ? "Ativa" : "Inativa"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {restriction.isGlobal ? (
                  <Lock className="h-4 w-4 mr-1.5 text-blue-500 dark:text-blue-400" />
                ) : (
                  <Unlock className="h-4 w-4 mr-1.5" />
                )}
                <h3 className="font-medium text-sm">
                  {restriction.name}
                  {restriction.isGlobal && (
                    <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] py-0 h-4">
                      Global
                    </Badge>
                  )}
                </h3>
              </div>
              <div className="flex items-center space-x-1">
                {!restriction.isGlobal && onUpdate && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  onClick={() => onRemove(restriction.id)}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Dias:</span>
                <span>{getDaysLabel(restriction.days)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Horário:</span>
                <span>
                  {formatTime(restriction.startHour, restriction.startMinute)} até {formatTime(restriction.endHour, restriction.endMinute)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Status:</span>
                {restriction.active ? (
                  <span className="flex items-center text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3 mr-1" />
                    Ativa
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <X className="h-3 w-3 mr-1" />
                    Inativa
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
