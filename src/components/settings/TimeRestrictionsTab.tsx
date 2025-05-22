import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TimeRestriction } from "@/types";

export const TimeRestrictionsTab = () => {
  const { timeRestrictions, addTimeRestriction, updateTimeRestriction, deleteTimeRestriction } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [newRestriction, setNewRestriction] = useState<Omit<TimeRestriction, "id">>({
    name: "",
    days: [1, 2, 3, 4, 5],  // Default to weekdays
    startHour: 9,           // 9 AM
    startMinute: 0,
    endHour: 18,            // 6 PM
    endMinute: 0,
    active: true,
    isGlobal: true
  });
  
  // Map of day numbers to day names
  const dayNames = {
    0: "Domingo",
    1: "Segunda",
    2: "Terça",
    3: "Quarta", 
    4: "Quinta",
    5: "Sexta",
    6: "Sábado"
  };
  
  // Format time as "HH:MM"
  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };
  
  // Format days as readable text
  const formatDays = (days: number[]) => {
    if (days.length === 7) return "Todos os dias";
    if (days.length === 0) return "Nenhum dia";
    
    // Check for weekdays (1-5)
    const isWeekdays = days.length === 5 && 
      days.includes(1) && days.includes(2) && days.includes(3) && 
      days.includes(4) && days.includes(5) && 
      !days.includes(0) && !days.includes(6);
      
    if (isWeekdays) return "Dias úteis";
    
    // Check for weekend (0, 6)
    const isWeekend = days.length === 2 && days.includes(0) && days.includes(6);
    if (isWeekend) return "Fins de semana";
    
    // Otherwise list the days
    return days.map(d => dayNames[d]).join(", ");
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Restrições de Horário</CardTitle>
          <CardDescription>
            Configure as restrições de horário para o sistema
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => setIsAdding(true)} disabled={isAdding}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Restrição
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {timeRestrictions.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma restrição de horário configurada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Restrições de horário impedem o envio de mensagens fora dos horários definidos
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {timeRestrictions.map((restriction) => (
                <Card key={restriction.id} className="p-4 border-muted">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{restriction.name}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Clock className="mr-1 h-4 w-4" />
                        {formatTime(restriction.startHour, restriction.startMinute)} - 
                        {formatTime(restriction.endHour, restriction.endMinute)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDays(restriction.days)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`restriction-${restriction.id}`} className="sr-only">
                          Ativo
                        </Label>
                        <Switch 
                          id={`restriction-${restriction.id}`}
                          checked={restriction.active} 
                          onCheckedChange={(checked) => updateTimeRestriction(restriction.id, { active: checked })}
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Deseja excluir a restrição "${restriction.name}"?`)) {
                            deleteTimeRestriction(restriction.id);
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {isAdding && (
          <div className="bg-muted p-4 rounded-lg mt-4">
            <h3 className="font-medium mb-4">Nova Restrição de Horário</h3>
            {/* Editor form would go here */}
            <p>Implementação do formulário estará disponível em breve.</p>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsAdding(false)}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeRestrictionsTab;
