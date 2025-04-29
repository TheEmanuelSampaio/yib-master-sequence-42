
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Clock, PlusCircle, MoreVertical, Edit, Trash2, CheckCircle, Save, X } from "lucide-react";
import { TimeRestriction } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Settings() {
  const { timeRestrictions, sequences, addTimeRestriction, updateTimeRestriction, removeTimeRestriction } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [editingRestrictionId, setEditingRestrictionId] = useState<string | null>(null);
  
  const [newRestriction, setNewRestriction] = useState<Omit<TimeRestriction, "id">>({
    name: "",
    active: true,
    days: [1, 2, 3, 4, 5], // Monday to Friday
    startHour: 20,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
  });
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Store editing restrictions in a map outside of the render loop
  const [editingRestrictions, setEditingRestrictions] = useState<Record<string, TimeRestriction>>({});
  
  // Helper functions
  const getDayName = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[day];
  };
  
  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const getSequencesUsingRestriction = (restrictionId: string) => {
    return sequences.filter(seq => 
      seq.timeRestrictions.some(r => r.id === restrictionId)
    );
  };

  const handleAddRestriction = () => {
    if (!newRestriction.name) {
      toast({
        title: "Erro",
        description: "Nome da restrição é obrigatório",
        variant: "destructive"
      });
      return;
    }
    
    addTimeRestriction(newRestriction);
    setIsAddDialogOpen(false);
    resetNewRestriction();
    
    toast({
      title: "Sucesso",
      description: "Restrição de horário adicionada com sucesso",
    });
  };

  const handleUpdateRestriction = (restriction: TimeRestriction) => {
    updateTimeRestriction(restriction.id, restriction);
    setEditingRestrictionId(null);
    
    toast({
      title: "Sucesso",
      description: "Restrição de horário atualizada com sucesso",
    });
  };

  const handleRemoveRestriction = (id: string) => {
    const usedInSequences = getSequencesUsingRestriction(id).length > 0;
    
    if (usedInSequences) {
      toast({
        title: "Erro",
        description: "Esta restrição está sendo utilizada em sequências e não pode ser removida",
        variant: "destructive"
      });
      return;
    }
    
    removeTimeRestriction(id);
    toast({
      title: "Sucesso",
      description: "Restrição de horário removida com sucesso",
    });
  };
  
  const resetNewRestriction = () => {
    setNewRestriction({
      name: "",
      active: true,
      days: [1, 2, 3, 4, 5],
      startHour: 20,
      startMinute: 0,
      endHour: 8,
      endMinute: 0,
    });
  };

  // Initialize or update editing restriction when starting to edit
  const startEditing = (restriction: TimeRestriction) => {
    setEditingRestrictionId(restriction.id);
    setEditingRestrictions(prev => ({
      ...prev,
      [restriction.id]: { ...restriction }
    }));
  };
  
  const cancelEditing = () => {
    setEditingRestrictionId(null);
  };

  // Update an editing restriction
  const updateEditingRestriction = (id: string, updates: Partial<TimeRestriction>) => {
    setEditingRestrictions(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações globais do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="time-restrictions">Restrições de Horário</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-6">
          {/* General settings content */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure as opções gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-name">Nome do Sistema</Label>
                <Input id="system-name" defaultValue="Master Sequence" />
                <p className="text-sm text-muted-foreground">
                  Nome que aparece no cabeçalho e no título da página
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dark-mode">Modo Escuro</Label>
                  <Switch id="dark-mode" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ativar tema escuro por padrão
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="time-restrictions" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Restrições de Horário</h2>
              <p className="text-sm text-muted-foreground">
                Configure restrições globais de horário para as sequências
              </p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nova Restrição
                </Button>
              </DialogTrigger>
              
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Restrição de Horário</DialogTitle>
                  <DialogDescription>
                    Mensagens não serão enviadas nos dias e horários selecionados.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restriction-name">Nome da Restrição</Label>
                    <Input 
                      id="restriction-name" 
                      value={newRestriction.name} 
                      onChange={(e) => setNewRestriction({ ...newRestriction, name: e.target.value })}
                      placeholder="Ex: Horário comercial"
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
                        { value: "0", label: "D" },
                        { value: "1", label: "S" },
                        { value: "2", label: "T" },
                        { value: "3", label: "Q" },
                        { value: "4", label: "Q" },
                        { value: "5", label: "S" },
                        { value: "6", label: "S" }
                      ].map(day => (
                        <ToggleGroupItem 
                          key={day.value} 
                          value={day.value} 
                          aria-label={getDayName(parseInt(day.value))}
                          title={getDayName(parseInt(day.value))}
                          className="w-9 h-9 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddRestriction}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {timeRestrictions.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Nenhuma restrição de horário</h3>
              <p className="text-muted-foreground mb-4">
                Adicione restrições de horário para controlar quando as mensagens não serão enviadas
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Restrição
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {timeRestrictions.map((restriction) => {
                const sequencesUsingThis = getSequencesUsingRestriction(restriction.id);
                const isEditing = editingRestrictionId === restriction.id;
                const editingRestriction = editingRestrictions[restriction.id] || { ...restriction };
                
                return (
                  <Card key={restriction.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span 
                            className={cn(
                              "w-2 h-2 rounded-full mr-2",
                              restriction.active ? "bg-green-500" : "bg-gray-400"
                            )}
                          />
                          {isEditing ? (
                            <Input
                              value={editingRestriction.name}
                              onChange={(e) => updateEditingRestriction(restriction.id, {
                                name: e.target.value
                              })}
                              className="max-w-[200px]"
                            />
                          ) : (
                            <CardTitle className="text-lg">{restriction.name}</CardTitle>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={cancelEditing}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleUpdateRestriction(editingRestriction)}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Salvar
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(restriction)} className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRemoveRestriction(restriction.id)} className="text-red-500 cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <CardDescription>
                        Usada em {sequencesUsingThis.length} sequência(s)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`restriction-active-${restriction.id}`}>Ativa</Label>
                            <Switch
                              id={`restriction-active-${restriction.id}`}
                              checked={editingRestriction.active}
                              onCheckedChange={(checked) => updateEditingRestriction(restriction.id, {
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
                              value={editingRestriction.days.map(d => d.toString())}
                              onValueChange={(value) => {
                                if (value.length > 0) {
                                  updateEditingRestriction(restriction.id, {
                                    days: value.map(v => parseInt(v))
                                  });
                                }
                              }}
                            >
                              {[
                                { value: "0", label: "D" },
                                { value: "1", label: "S" },
                                { value: "2", label: "T" },
                                { value: "3", label: "Q" },
                                { value: "4", label: "Q" },
                                { value: "5", label: "S" },
                                { value: "6", label: "S" }
                              ].map(day => (
                                <ToggleGroupItem 
                                  key={day.value} 
                                  value={day.value} 
                                  aria-label={getDayName(parseInt(day.value))}
                                  title={getDayName(parseInt(day.value))}
                                  className="w-9 h-9 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                >
                                  {day.label}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Início</Label>
                              <div className="flex mt-2 space-x-2">
                                <Select
                                  value={editingRestriction.startHour.toString()}
                                  onValueChange={(value) => 
                                    updateEditingRestriction(restriction.id, {
                                      startHour: parseInt(value)
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <SelectItem key={`edit-start-hour-${i}`} value={i.toString()}>
                                        {i.toString().padStart(2, "0")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="flex items-center">:</span>
                                <Select
                                  value={editingRestriction.startMinute.toString()}
                                  onValueChange={(value) => 
                                    updateEditingRestriction(restriction.id, {
                                      startMinute: parseInt(value)
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 15, 30, 45].map((minute) => (
                                      <SelectItem key={`edit-start-min-${minute}`} value={minute.toString()}>
                                        {minute.toString().padStart(2, "0")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label>Término</Label>
                              <div className="flex mt-2 space-x-2">
                                <Select
                                  value={editingRestriction.endHour.toString()}
                                  onValueChange={(value) => 
                                    updateEditingRestriction(restriction.id, {
                                      endHour: parseInt(value)
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <SelectItem key={`edit-end-hour-${i}`} value={i.toString()}>
                                        {i.toString().padStart(2, "0")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="flex items-center">:</span>
                                <Select
                                  value={editingRestriction.endMinute.toString()}
                                  onValueChange={(value) => 
                                    updateEditingRestriction(restriction.id, {
                                      endMinute: parseInt(value)
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 15, 30, 45].map((minute) => (
                                      <SelectItem key={`edit-end-min-${minute}`} value={minute.toString()}>
                                        {minute.toString().padStart(2, "0")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium mb-1">Status</div>
                            <Badge variant={restriction.active ? "default" : "outline"}>
                              {restriction.active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium mb-1">Dias</div>
                            <div className="flex flex-wrap gap-1">
                              {restriction.days.map((day) => (
                                <Badge key={day} variant="secondary" className="text-xs">
                                  {getDayName(day).substring(0, 3)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium mb-1">Horário</div>
                            <span className="text-sm">
                              {formatTime(restriction.startHour, restriction.startMinute)} às {formatTime(restriction.endHour, restriction.endMinute)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tags" className="space-y-4 mt-6">
          {/* Tags content */}
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Tags</CardTitle>
              <CardDescription>
                Configure as tags disponíveis no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Adicionar Nova Tag</Label>
                  <div className="flex space-x-2">
                    <Input placeholder="Digite o nome da tag" />
                    <Button>Adicionar</Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Tags Disponíveis</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="px-2 py-1">
                      cliente-novo
                      <button className="ml-1 hover:bg-primary-foreground/20 rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                    <Badge className="px-2 py-1">
                      interessado
                      <button className="ml-1 hover:bg-primary-foreground/20 rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                    <Badge className="px-2 py-1">
                      lead-quente
                      <button className="ml-1 hover:bg-primary-foreground/20 rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4 mt-6">
          {/* Accounts content */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários e Permissões</CardTitle>
              <CardDescription>
                Gerencie os usuários e suas permissões no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Lista de Usuários</Label>
                <p className="text-sm text-muted-foreground">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Adicionar Usuário</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
