
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RestrictionItem } from "@/components/sequences/RestrictionItem";
import { TimeRestriction } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

export function GlobalRestrictionsSection() {
  const { timeRestrictions, refreshTimeRestrictions } = useApp();
  const { user } = useAuth();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newRestriction, setNewRestriction] = useState<Omit<TimeRestriction, "id">>({
    name: "Nova restrição global",
    active: true,
    days: [1, 2, 3, 4, 5],
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
    isGlobal: true,
  });
  
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const handleAddRestriction = async () => {
    if (!user) return;
    
    try {
      setIsAdding(true);
      
      const { data, error } = await supabase
        .from('time_restrictions')
        .insert({
          name: newRestriction.name,
          active: newRestriction.active,
          days: newRestriction.days,
          start_hour: newRestriction.startHour,
          start_minute: newRestriction.startMinute,
          end_hour: newRestriction.endHour,
          end_minute: newRestriction.endMinute,
          created_by: user.id,
        })
        .select();
      
      if (error) throw error;
      
      toast.success('Restrição global adicionada com sucesso!');
      setShowAddDialog(false);
      
      // Limpar o formulário
      setNewRestriction({
        name: "Nova restrição global",
        active: true,
        days: [1, 2, 3, 4, 5],
        startHour: 22,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
        isGlobal: true,
      });
      
      // Atualizar a lista de restrições
      refreshTimeRestrictions();
    } catch (error) {
      console.error('Erro ao adicionar restrição global:', error);
      toast.error(`Erro ao adicionar restrição: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleRemoveRestriction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Restrição global removida com sucesso!');
      
      // Atualizar a lista de restrições
      refreshTimeRestrictions();
    } catch (error) {
      console.error('Erro ao remover restrição global:', error);
      toast.error(`Erro ao remover restrição: ${error.message}`);
    }
  };
  
  const handleUpdateRestriction = async (updatedRestriction: TimeRestriction) => {
    try {
      const { error } = await supabase
        .from('time_restrictions')
        .update({
          name: updatedRestriction.name,
          active: updatedRestriction.active,
          days: updatedRestriction.days,
          start_hour: updatedRestriction.startHour,
          start_minute: updatedRestriction.startMinute,
          end_hour: updatedRestriction.endHour,
          end_minute: updatedRestriction.endMinute,
        })
        .eq('id', updatedRestriction.id);
      
      if (error) throw error;
      
      toast.success('Restrição global atualizada com sucesso!');
      
      // Atualizar a lista de restrições
      refreshTimeRestrictions();
    } catch (error) {
      console.error('Erro ao atualizar restrição global:', error);
      toast.error(`Erro ao atualizar restrição: ${error.message}`);
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Restrições Globais de Horário</CardTitle>
          <CardDescription>
            Configure horários em que mensagens não devem ser enviadas
          </CardDescription>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nova Restrição
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Restrição Global</DialogTitle>
              <DialogDescription>
                Restrições globais são aplicadas em todas as sequências
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restriction-name">Nome da Restrição</Label>
                <Input 
                  id="restriction-name" 
                  value={newRestriction.name} 
                  onChange={(e) => setNewRestriction({ ...newRestriction, name: e.target.value })}
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
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
              <Button onClick={handleAddRestriction} disabled={isAdding}>
                {isAdding ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {timeRestrictions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma restrição global configurada
              </div>
            ) : (
              timeRestrictions.map(restriction => (
                <RestrictionItem
                  key={restriction.id}
                  restriction={restriction}
                  onRemove={handleRemoveRestriction}
                  onUpdate={handleUpdateRestriction}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
