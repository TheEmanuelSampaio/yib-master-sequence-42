
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Edit, Info, MoreHorizontal, Plus, Tag, Trash2, User, UserCheck, UserCog, UserPlus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimeRestriction } from "@/types";

export default function Settings() {
  const { users, clients, tags, timeRestrictions, addUser, updateUser, deleteUser, addClient, updateClient, deleteClient, addTag, deleteTag, addTimeRestriction, updateTimeRestriction, deleteTimeRestriction } = useApp();
  const { user: currentUser, isSuper } = useAuth();
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openAddClient, setOpenAddClient] = useState(false);
  const [openAddTimeRestriction, setOpenAddTimeRestriction] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  
  // Filtrar os dados que o usuário atual pode ver
  const [filteredClients, setFilteredClients] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [filteredTimeRestrictions, setFilteredTimeRestrictions] = useState([]);

  // Filtrar dados com base no usuário atual
  useEffect(() => {
    // Se for super admin, vê tudo. Caso contrário, filtra
    if (isSuper) {
      setFilteredClients(clients);
      setFilteredTags(tags);
      setFilteredTimeRestrictions(timeRestrictions);
    } else if (currentUser) {
      // Filtra clientes criados pelo usuário
      setFilteredClients(clients.filter(client => client.created_by === currentUser.id));
      
      // Filtra tags criadas pelo usuário
      setFilteredTags(tags.filter(tag => tag.created_by === currentUser.id));
      
      // Filtra restrições de horário criadas pelo usuário
      setFilteredTimeRestrictions(timeRestrictions.filter(restriction => restriction.created_by === currentUser.id));
    }
  }, [clients, tags, timeRestrictions, currentUser, isSuper]);

  const [newUser, setNewUser] = useState({
    accountName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [newClient, setNewClient] = useState({
    accountName: "",
    accountId: "",
  });

  const [newTimeRestriction, setNewTimeRestriction] = useState<Omit<TimeRestriction, "id">>({
    name: "",
    days: [0, 1, 2, 3, 4], // Mon-Fri as numbers (0-6 for days of week)
    startHour: 8,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    active: true,
    isGlobal: true // Adicionando a propriedade isGlobal que estava faltando
  });

  const [editTimeRestriction, setEditTimeRestriction] = useState<TimeRestriction | null>(null);

  const [editUser, setEditUser] = useState<{
    id: string;
    accountName: string;
    role: "super_admin" | "admin";
  } | null>(null);

  const [editClient, setEditClient] = useState<{
    id: string;
    accountName: string;
    accountId: number;
  } | null>(null);

  const handleAddUser = async () => {
    if (!newUser.accountName || !newUser.email || !newUser.password || !newUser.confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    try {
      await addUser({
        accountName: newUser.accountName,
        email: newUser.email,
        password: newUser.password,
        isAdmin: true,
      });
      
      setNewUser({
        accountName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      
      setOpenAddUser(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    
    try {
      await updateUser(editUser.id, {
        accountName: editUser.accountName,
        role: editUser.role,
      });
      
      setEditUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.accountName || !newClient.accountId) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    try {
      await addClient({
        accountName: newClient.accountName,
        accountId: parseInt(newClient.accountId),
      });
      
      setNewClient({
        accountName: "",
        accountId: "",
      });
      
      setOpenAddClient(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClient = async () => {
    if (!editClient) return;
    
    try {
      await updateClient(editClient.id, {
        accountName: editClient.accountName,
        accountId: editClient.accountId,
      });
      
      setEditClient(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteClient(id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Digite o nome da tag");
      return;
    }
    
    try {
      await addTag(newTagName.trim());
      setNewTagName("");
      toast.success("Tag adicionada com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar tag");
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    try {
      await deleteTag(tagName);
      toast.success("Tag removida com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover tag");
    }
  };

  const handleAddTimeRestriction = () => {
    const daysOfWeek = [1, 2, 3, 4, 5]; // Segunda a sexta por padrão
    
    addTimeRestriction({
      name: `Restrição ${timeRestrictions.length + 1}`,
      days: daysOfWeek,
      startHour: 8,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      active: true,
      isGlobal: true // Adicionando a propriedade isGlobal
    });
    
    toast.success("Restrição adicionada. Você pode editá-la na lista.");
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

  // Map day label to number
  const getDayNumber = (day: string) => {
    const numbers: Record<string, number> = {
      "Seg": 0,
      "Ter": 1, 
      "Qua": 2, 
      "Qui": 3, 
      "Sex": 4, 
      "Sáb": 5, 
      "Dom": 6
    };
    return numbers[day] || 0;
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, clientes e configurações gerais do sistema
        </p>
      </div>
      
      <Tabs defaultValue={isSuper ? "users" : "clients"}>
        <TabsList>
          {/* Modificação 3: Mostrar a aba Usuários apenas para super admins e renomeá-la */}
          {isSuper && <TabsTrigger value="users">Usuários</TabsTrigger>}
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="time-restrictions">Restrições de Horário</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
        </TabsList>
        
        {/* Renomeado de "accounts" para "users" e visível apenas para super admin */}
        {isSuper && (
          <TabsContent value="users">
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>
                    Gerencie os usuários que podem acessar o sistema
                  </CardDescription>
                </div>
                {isSuper && (
                  <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                        <DialogDescription>
                          Crie uma nova conta de usuário para acesso ao sistema
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="account-name">Nome da Conta</Label>
                          <Input
                            id="account-name"
                            value={newUser.accountName}
                            onChange={(e) => setNewUser({ ...newUser, accountName: e.target.value })}
                            placeholder="Nome da conta"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Senha</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirmar Senha</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={newUser.confirmPassword}
                            onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenAddUser(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddUser}>
                          Adicionar Usuário
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.accountName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role === 'super_admin' ? (
                            <div className="flex items-center">
                              <UserCog className="h-4 w-4 mr-2 text-orange-500" />
                              <span>Super Admin</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-blue-500" />
                              <span>Admin</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSuper && currentUser?.id !== user.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setEditUser({
                                    id: user.id,
                                    accountName: user.accountName,
                                    role: user.role
                                  })}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Edit User Dialog */}
                {editUser && (
                  <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                          Atualize as informações do usuário
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-account-name">Nome da Conta</Label>
                          <Input
                            id="edit-account-name"
                            value={editUser.accountName}
                            onChange={(e) => setEditUser({ ...editUser, accountName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-role">Função</Label>
                          <Select
                            value={editUser.role}
                            onValueChange={(value) => setEditUser({ 
                              ...editUser, 
                              role: value as "super_admin" | "admin" 
                            })}
                          >
                            <SelectTrigger id="edit-role">
                              <SelectValue placeholder="Selecione uma função" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditUser(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleEditUser}>
                          Atualizar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                  Gerencie os clientes do sistema
                </CardDescription>
              </div>
              <Dialog open={openAddClient} onOpenChange={setOpenAddClient}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                    <DialogDescription>
                      Cadastre um novo cliente para receber webhooks do Chatwoot
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-name">Nome do Cliente</Label>
                      <Input
                        id="client-name"
                        value={newClient.accountName}
                        onChange={(e) => setNewClient({ ...newClient, accountName: e.target.value })}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-id">ID da Conta</Label>
                      <Input
                        id="client-id"
                        type="number"
                        min="1"
                        value={newClient.accountId}
                        onChange={(e) => setNewClient({ ...newClient, accountId: e.target.value })}
                        placeholder="ID da conta no Chatwoot"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenAddClient(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddClient}>
                      Adicionar Cliente
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>ID da Conta</TableHead>
                    {/* Modificação 1: Adicionar coluna para o criador do cliente */}
                    <TableHead>Criado por</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.accountName}</TableCell>
                      <TableCell>{client.accountId}</TableCell>
                      {/* Exibindo o nome do criador do cliente */}
                      <TableCell>{client.creator ? client.creator.account_name : client.creator_account_name}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => setEditClient({
                                id: client.id,
                                accountName: client.accountName,
                                accountId: client.accountId
                              })}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteClient(client.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredClients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Edit Client Dialog */}
              {editClient && (
                <Dialog open={!!editClient} onOpenChange={(open) => !open && setEditClient(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Cliente</DialogTitle>
                      <DialogDescription>
                        Atualize as informações do cliente
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-client-name">Nome do Cliente</Label>
                        <Input
                          id="edit-client-name"
                          value={editClient.accountName}
                          onChange={(e) => setEditClient({ ...editClient, accountName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-client-id">ID da Conta</Label>
                        <Input
                          id="edit-client-id"
                          type="number"
                          min="1"
                          value={editClient.accountId}
                          onChange={(e) => setEditClient({ 
                            ...editClient, 
                            accountId: parseInt(e.target.value) 
                          })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditClient(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleEditClient}>
                        Atualizar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Time Restrictions Tab */}
        <TabsContent value="time-restrictions">
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
                {filteredTimeRestrictions.map((restriction) => (
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
                
                {filteredTimeRestrictions.length === 0 && (
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
        </TabsContent>
        
        {/* Tags Tab */}
        <TabsContent value="tags">
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Gerencie as tags usadas em sequências e contatos
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <div className="flex">
                  <Input
                    placeholder="Nome da tag"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="w-[200px]"
                  />
                  <Button 
                    className="ml-2" 
                    onClick={handleAddTag}
                    disabled={!newTagName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* Usando as tags filtradas por usuário */}
                {filteredTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm">
                    <span className="mr-1">{tag}</span>
                    <button 
                      onClick={() => handleDeleteTag(tag)}
                      className="text-muted-foreground hover:text-red-500 transition-colors ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                
                {filteredTags.length === 0 && (
                  <div className="w-full flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg">
                    <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma tag cadastrada</h3>
                    <p className="text-center text-muted-foreground mb-4">
                      Adicione tags para usar em sequências e contatos
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure opções gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Revisão de Mensagens</h3>
                  <p className="text-sm text-muted-foreground">
                    Exigir revisão manual antes de enviar mensagens
                  </p>
                </div>
                <Switch id="require-review" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Notificações</h3>
                  <p className="text-sm text-muted-foreground">
                    Enviar notificações por email
                  </p>
                </div>
                <Switch id="email-notifications" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Tema Escuro Automático</h3>
                  <p className="text-sm text-muted-foreground">
                    Alternar automaticamente para o tema escuro conforme o sistema
                  </p>
                </div>
                <Switch id="auto-dark-theme" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Modo Seguro</h3>
                  <p className="text-sm text-muted-foreground">
                    Pedir confirmação antes de enviar mensagens em massa
                  </p>
                </div>
                <Switch id="safe-mode" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
