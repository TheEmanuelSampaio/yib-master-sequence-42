
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Clock, Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";
import { TimeRestriction } from "@/types";

export const TimeRestrictionsTab = () => {
  const { timeRestrictions, addTimeRestriction, updateTimeRestriction, deleteTimeRestriction } = useApp();
  const [openAddTimeRestriction, setOpenAddTimeRestriction] = useState(false);
  
  const [newTimeRestriction, setNewTimeRestriction] = useState<Omit<TimeRestriction, "id">>({
    name: "",
    days: [0, 1, 2, 3, 4], // Mon-Fri as numbers (0-6 for days of week)
    startHour: 8,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    active: true,
    isGlobal: true
  });

  const [editTimeRestriction, setEditTimeRestriction] = useState<TimeRestriction | null>(null);

  // Map day number to label
  const getDayLabel = (day: number) => {
    const labels: Record<number, string> = {
      0: "Seg",
      1: "Ter", 
      2: "Qua", 
      3: "Qui", 
      4: "Sex", 
      5: "Sáb", 
      6: "Dom"
    };
    return labels[day] || day.toString();
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleAddTimeRestriction = () => {
    const daysOfWeek = [0, 1, 2, 3, 4]; // Segunda a sexta por padrão
    
    addTimeRestriction({
      name: newTimeRestriction.name || `Restrição ${timeRestrictions.length + 1}`,
      days: daysOfWeek,
      startHour: newTimeRestriction.startHour,
      startMinute: newTimeRestriction.startMinute,
      endHour: newTimeRestriction.endHour,
      endMinute: newTimeRestriction.endMinute,
      active: true,
      isGlobal: true
    });
    
    setOpenAddTimeRestriction(false);
    toast.success("Restrição adicionada com sucesso");
  };

  const handleEditTimeRestriction = async () => {
    if (!editTimeRestriction) return;
    
    try {
      await updateTimeRestriction(editTimeRestriction.id, editTimeRestriction);
      setEditTimeRestriction(null);
      toast.success("Restrição de horário atualizada com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar restrição de horário");
    }
  };

  const handleDeleteTimeRestriction = async (id: string) => {
    try {
      await deleteTimeRestriction(id);
      toast.success("Restrição de horário removida com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover restrição de horário");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Restrições de Horário</CardTitle>
          <CardDescription>
            Configure restrições globais de horário para as sequências
          </CardDescription>
        </div>
        <Dialog open={openAddTimeRestriction} onOpenChange={setOpenAddTimeRestriction}>
          <DialogTrigger asChild>
            <Button className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Nova Restrição
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Restrição de Horário</DialogTitle>
              <DialogDescription>
                Configure os horários em que as mensagens não devem ser enviadas
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="restriction-name">Nome da Restrição</Label>
                <Input
                  id="restriction-name"
                  value={newTimeRestriction.name}
                  onChange={(e) => setNewTimeRestriction({ ...newTimeRestriction, name: e.target.value })}
                  placeholder="Ex: Horário Comercial"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <Badge 
                      key={day} 
                      variant={newTimeRestriction.days.includes(day) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const updatedDays = newTimeRestriction.days.includes(day)
                          ? newTimeRestriction.days.filter(d => d !== day)
                          : [...newTimeRestriction.days, day];
                        setNewTimeRestriction({ ...newTimeRestriction, days: updatedDays });
                      }}
                    >
                      {getDayLabel(day)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário de Início</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={newTimeRestriction.startHour.toString()}
                      onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, startHour: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>:</span>
                    <Select
                      value={newTimeRestriction.startMinute.toString()}
                      onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, startMinute: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((min) => (
                          <SelectItem key={min} value={min.toString()}>{min.toString().padStart(2, '0')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Horário de Término</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={newTimeRestriction.endHour.toString()}
                      onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, endHour: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>:</span>
                    <Select
                      value={newTimeRestriction.endMinute.toString()}
                      onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, endMinute: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((min) => (
                          <SelectItem key={min} value={min.toString()}>{min.toString().padStart(2, '0')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="active"
                  checked={newTimeRestriction.active}
                  onCheckedChange={(checked) => setNewTimeRestriction({ ...newTimeRestriction, active: checked })}
                />
                <Label htmlFor="active">Ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddTimeRestriction(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTimeRestriction}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timeRestrictions.map((restriction) => (
            <Card key={restriction.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 flex flex-row items-center justify-between py-4 px-6">
                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${restriction.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <h3 className="font-semibold">{restriction.name}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setEditTimeRestriction(restriction)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDeleteTimeRestriction(restriction.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Usada em 0 sequência(s)</p>
                  <p className="text-sm font-medium mb-2">Status</p>
                  <Badge variant={restriction.active ? "default" : "outline"} className="mb-4">
                    {restriction.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Dias</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {restriction.days.map((day) => (
                      <Badge key={day} variant="secondary" className="text-xs">
                        {getDayLabel(day)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Horário</p>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {formatTime(restriction.startHour, restriction.startMinute)} às {formatTime(restriction.endHour, restriction.endMinute)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {timeRestrictions.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma restrição de horário</h3>
              <p className="text-center text-muted-foreground mb-6">
                Adicione restrições de horário para controlar quando as mensagens não devem ser enviadas
              </p>
              <Button onClick={() => setOpenAddTimeRestriction(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Restrição
              </Button>
            </div>
          )}
        </div>

        {/* Edit Time Restriction Dialog */}
        {editTimeRestriction && (
          <Dialog open={!!editTimeRestriction} onOpenChange={(open) => !open && setEditTimeRestriction(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Restrição de Horário</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes da restrição de horário
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-restriction-name">Nome da Restrição</Label>
                  <Input
                    id="edit-restriction-name"
                    value={editTimeRestriction.name}
                    onChange={(e) => setEditTimeRestriction({ ...editTimeRestriction, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <Badge 
                        key={day} 
                        variant={editTimeRestriction.days.includes(day) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const updatedDays = editTimeRestriction.days.includes(day)
                            ? editTimeRestriction.days.filter(d => d !== day)
                            : [...editTimeRestriction.days, day];
                          setEditTimeRestriction({ ...editTimeRestriction, days: updatedDays });
                        }}
                      >
                        {getDayLabel(day)}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horário de Início</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={editTimeRestriction.startHour.toString()}
                        onValueChange={(value) => setEditTimeRestriction({ ...editTimeRestriction, startHour: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>:</span>
                      <Select
                        value={editTimeRestriction.startMinute.toString()}
                        onValueChange={(value) => setEditTimeRestriction({ ...editTimeRestriction, startMinute: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Min" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45].map((min) => (
                            <SelectItem key={min} value={min.toString()}>{min.toString().padStart(2, '0')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Horário de Término</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={editTimeRestriction.endHour.toString()}
                        onValueChange={(value) => setEditTimeRestriction({ ...editTimeRestriction, endHour: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>:</span>
                      <Select
                        value={editTimeRestriction.endMinute.toString()}
                        onValueChange={(value) => setEditTimeRestriction({ ...editTimeRestriction, endMinute: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Min" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45].map((min) => (
                            <SelectItem key={min} value={min.toString()}>{min.toString().padStart(2, '0')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="active-edit"
                    checked={editTimeRestriction.active}
                    onCheckedChange={(checked) => setEditTimeRestriction({ ...editTimeRestriction, active: checked })}
                  />
                  <Label htmlFor="active-edit">Ativa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditTimeRestriction(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditTimeRestriction}>
                  Atualizar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};
