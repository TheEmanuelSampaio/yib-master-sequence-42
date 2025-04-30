
import { useState } from 'react';
import { Lock, Unlock, Trash2, Edit, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimeRestriction } from '@/types';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface RestrictionItemProps {
  restriction: TimeRestriction;
  onRemove?: (id: string) => void;
  onUpdate?: (restriction: TimeRestriction) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedRestriction, setEditedRestriction] = useState<TimeRestriction>({...restriction});
  
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const getDaysText = (days: number[]) => {
    if (days.length === 7) return "Todos os dias";
    if (days.length === 0) return "Nenhum dia";
    
    if (JSON.stringify(days.sort()) === JSON.stringify([1, 2, 3, 4, 5].sort())) {
      return "Segunda à Sexta";
    }
    
    if (JSON.stringify(days.sort()) === JSON.stringify([0, 6].sort())) {
      return "Fins de semana";
    }
    
    return days.map(day => dayNames[day]).join(", ");
  };
  
  const handleStartEditing = () => {
    setEditedRestriction({...restriction});
    setIsEditing(true);
  };
  
  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedRestriction);
    }
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  if (isEditing) {
    return (
      <div className="bg-muted/20 border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Input 
            value={editedRestriction.name}
            onChange={(e) => setEditedRestriction({
              ...editedRestriction,
              name: e.target.value
            })}
            className="max-w-xs"
          />
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button 
              variant="success"
              size="sm"
              onClick={handleSave}
            >
              <Check className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label className="min-w-24">Status:</Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={editedRestriction.active}
              onCheckedChange={(checked) => setEditedRestriction({
                ...editedRestriction,
                active: checked
              })}
            />
            <span>{editedRestriction.active ? "Ativa" : "Inativa"}</span>
          </div>
        </div>
        
        <div className="space-y-2">
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
    );
  }
  
  return (
    <div className={cn(
      "flex justify-between items-center border rounded-lg p-3",
      !restriction.active && "opacity-70",
      restriction.isGlobal ? "bg-blue-500/5" : "",
      onSelect && selected ? "bg-green-500/10" : ""
    )}>
      <div className="flex items-center">
        {restriction.isGlobal ? (
          <Lock className="h-4 w-4 mr-2 text-blue-600" />
        ) : (
          <Unlock className="h-4 w-4 mr-2 text-gray-600" />
        )}
        <div>
          <div className="font-medium flex items-center">
            {restriction.name}
            {!restriction.active && (
              <Badge variant="outline" className="ml-2 text-xs">
                Inativo
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {getDaysText(restriction.days)} • 
            {formatTime(restriction.startHour, restriction.startMinute)} - 
            {formatTime(restriction.endHour, restriction.endMinute)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        {onUpdate && editable && !restriction.isGlobal && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartEditing}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Button>
        )}
        
        {onSelect ? (
          <Button
            variant={selected ? "success" : "outline"}
            size="sm"
            onClick={onSelect}
            className={cn(
              "text-xs",
              selected ? "text-white" : ""
            )}
          >
            {selected ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Selecionada
              </>
            ) : (
              "Selecionar"
            )}
          </Button>
        ) : (
          onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(restriction.id)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              <span className="sr-only">Remover</span>
            </Button>
          )
        )}
      </div>
    </div>
  );
}
