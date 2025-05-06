
import React from "react";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TimeRestriction } from "@/types";

interface NewRestrictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newRestriction: Omit<TimeRestriction, "id">;
  setNewRestriction: (restriction: Omit<TimeRestriction, "id">) => void;
  addLocalRestriction: () => void;
  dayNames: string[];
}

export function NewRestrictionDialog({
  open,
  onOpenChange,
  newRestriction, 
  setNewRestriction,
  addLocalRestriction,
  dayNames
}: NewRestrictionDialogProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Adicionar Restrição Local</DialogTitle>
        <DialogDescription>
          Restrições locais são específicas desta sequência
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="restriction-name">Nome da Restrição</Label>
          <Input 
            id="restriction-name" 
            value={newRestriction.name} 
            onChange={(e) => setNewRestriction({ ...newRestriction, name: e.target.value })}
            placeholder="Ex: Horário noturno"
          />
        </div>
      
        <div className="flex items-center space-x-2">
          <Label htmlFor="restriction-active">Ativa</Label>
          <Switch
            id="restriction-active"
            checked={newRestriction.active}
            onCheckedChange={(checked) => setNewRestriction({
              ...newRestriction,
              active: checked
            })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Dias da Semana</Label>
          <ToggleGroup 
            type="multiple" 
            variant="outline"
            className="justify-start"
            value={newRestriction.days.map(d => d.toString())}
            onValueChange={(value) => {
              if (value.length > 0) {
                setNewRestriction({
                  ...newRestriction,
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
                value={newRestriction.startHour.toString()}
                onValueChange={(value) => 
                  setNewRestriction({
                    ...newRestriction,
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
                value={newRestriction.startMinute.toString()}
                onValueChange={(value) => 
                  setNewRestriction({
                    ...newRestriction,
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
                value={newRestriction.endHour.toString()}
                onValueChange={(value) => 
                  setNewRestriction({
                    ...newRestriction,
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
                value={newRestriction.endMinute.toString()}
                onValueChange={(value) => 
                  setNewRestriction({
                    ...newRestriction,
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
      
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={addLocalRestriction}>Adicionar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
