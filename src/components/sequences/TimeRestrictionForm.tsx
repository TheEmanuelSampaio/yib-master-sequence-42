
import { useState } from "react";
import { TimeRestriction } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface TimeRestrictionFormProps {
  existingRestrictions: TimeRestriction[];
  onAddRestriction: (restriction: Omit<TimeRestriction, "id">) => void;
  onUpdateRestriction: (id: string, changes: Partial<TimeRestriction>) => void;
}

export function TimeRestrictionForm({ 
  existingRestrictions, 
  onAddRestriction,
  onUpdateRestriction
}: TimeRestrictionFormProps) {
  const [useExisting, setUseExisting] = useState(false);
  const [selectedRestrictionId, setSelectedRestrictionId] = useState("");
  
  const [newRestriction, setNewRestriction] = useState<Omit<TimeRestriction, "id">>({
    name: "",
    active: true,
    days: [1, 2, 3, 4, 5], // Monday to Friday
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
  });

  const getDayName = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[day];
  };

  const handleAddRestriction = () => {
    if (useExisting) {
      if (!selectedRestrictionId) {
        toast.error("Por favor, selecione uma restrição");
        return;
      }
      
      const selectedRestriction = existingRestrictions.find(r => r.id === selectedRestrictionId);
      if (selectedRestriction) {
        onUpdateRestriction(selectedRestrictionId, { active: true });
        toast.success("Restrição adicionada com sucesso");
      }
    } else {
      if (!newRestriction.name) {
        toast.error("Por favor, dê um nome à restrição");
        return;
      }
      
      onAddRestriction(newRestriction);
      
      // Reset form
      setNewRestriction({
        name: "",
        active: true,
        days: [1, 2, 3, 4, 5],
        startHour: 22,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
      });
      
      toast.success("Nova restrição adicionada com sucesso");
    }
  };

  return (
    <Card className="border">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant={!useExisting ? "default" : "outline"}
            size="sm"
            onClick={() => setUseExisting(false)}
          >
            Nova Restrição
          </Button>
          <Button
            variant={useExisting ? "default" : "outline"}
            size="sm"
            onClick={() => setUseExisting(true)}
            disabled={existingRestrictions.length === 0}
          >
            Usar Existente
          </Button>
        </div>

        {useExisting ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione uma restrição</Label>
              <Select
                value={selectedRestrictionId}
                onValueChange={setSelectedRestrictionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma restrição" />
                </SelectTrigger>
                <SelectContent>
                  {existingRestrictions.map((restriction) => (
                    <SelectItem key={restriction.id} value={restriction.id}>
                      {restriction.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleAddRestriction}>
              Adicionar Restrição Existente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Restrição</Label>
              <Input
                placeholder="Ex: Horário Noturno"
                value={newRestriction.name}
                onChange={(e) => setNewRestriction({ ...newRestriction, name: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="restriction-active"
                checked={newRestriction.active}
                onCheckedChange={(checked) => setNewRestriction({ ...newRestriction, active: checked })}
              />
              <Label htmlFor="restriction-active">Restrição Ativa</Label>
            </div>

            <div>
              <Label>Dias da Semana</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`day-${day}`}
                      checked={newRestriction.days.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRestriction({
                            ...newRestriction,
                            days: [...newRestriction.days, day],
                          });
                        } else {
                          setNewRestriction({
                            ...newRestriction,
                            days: newRestriction.days.filter(d => d !== day),
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={`day-${day}`} className="text-sm">
                      {getDayName(day)}
                    </Label>
                  </div>
                ))}
              </div>
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
                <Label>Horário de Término</Label>
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

            <Button className="w-full" onClick={handleAddRestriction}>
              Adicionar Nova Restrição
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
