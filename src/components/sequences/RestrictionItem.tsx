import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit, Check, X, Plus, CheckCircle } from "lucide-react";
import { TimeRestriction } from "@/types";

interface RestrictionItemProps {
  restriction: TimeRestriction;
  readonly?: boolean;
  isSelected?: boolean;
  onUpdate?: (restriction: TimeRestriction) => void;
  onRemove?: (id: string) => void;
  onSelect?: () => void;
}

export function RestrictionItem({ restriction, readonly, isSelected, onUpdate, onRemove, onSelect }: RestrictionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRestriction, setEditedRestriction] = useState<TimeRestriction>(restriction);

  const getDayName = (day: number) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return days[day];
  };

  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedRestriction);
    }
    setIsEditing(false);
  };

  const toggleActive = () => {
    if (onUpdate && !readonly) {
      onUpdate({
        ...restriction,
        active: !restriction.active
      });
    }
  };

  return (
    <Card className={`p-3 ${restriction.active ? "border-primary/40" : "opacity-70"}`}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Input 
              value={editedRestriction.name}
              onChange={(e) => setEditedRestriction({ ...editedRestriction, name: e.target.value })}
              className="text-sm font-medium"
            />
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Dias da semana</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <Badge 
                    key={day} 
                    variant={editedRestriction.days.includes(day) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (editedRestriction.days.includes(day)) {
                        setEditedRestriction({
                          ...editedRestriction,
                          days: editedRestriction.days.filter(d => d !== day)
                        });
                      } else {
                        setEditedRestriction({
                          ...editedRestriction,
                          days: [...editedRestriction.days, day]
                        });
                      }
                    }}
                  >
                    {getDayName(day)}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Horários</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <div className="flex space-x-1">
                    <Select
                      value={editedRestriction.startHour.toString()}
                      onValueChange={(value) => setEditedRestriction({
                        ...editedRestriction,
                        startHour: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                      onValueChange={(value) => setEditedRestriction({
                        ...editedRestriction,
                        startMinute: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                  <div className="flex space-x-1">
                    <Select
                      value={editedRestriction.endHour.toString()}
                      onValueChange={(value) => setEditedRestriction({
                        ...editedRestriction,
                        endHour: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                      onValueChange={(value) => setEditedRestriction({
                        ...editedRestriction,
                        endMinute: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                {readonly ? (
                  isSelected ? (
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                  ) : null
                ) : (
                  <Switch 
                    checked={restriction.active} 
                    onCheckedChange={toggleActive}
                    disabled={readonly}
                  />
                )}
                <h4 className="ml-2 text-sm font-medium">{restriction.name}</h4>
              </div>
              
              <div className="flex space-x-1">
                {readonly ? (
                  <Button variant={isSelected ? "default" : "outline"} size="sm" onClick={onSelect}>
                    {isSelected ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Selecionada
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    {onRemove && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onRemove(restriction.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex flex-col text-sm space-y-1">
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="text-muted-foreground">Dias:</span>
                {restriction.days.map((day) => (
                  <Badge key={day} variant="outline" className="text-xs">
                    {getDayName(day)}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground mr-1">Horário:</span> 
                {formatTime(restriction.startHour, restriction.startMinute)} até {formatTime(restriction.endHour, restriction.endMinute)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
