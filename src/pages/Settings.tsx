
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Edit, Info, MoreHorizontal, Plus, Tag, Clock, Trash2, User, UserCheck, UserCog, UserPlus } from "lucide-react";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { TimeRestriction } from "@/types";

export default function Settings() {
  const { users, clients, tags, timeRestrictions, addUser, updateUser, deleteUser, addClient, updateClient, deleteClient, addTag, deleteTag, addTimeRestriction, updateTimeRestriction, deleteTimeRestriction } = useApp();
  const { user: currentUser, isSuper } = useAuth();
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openAddClient, setOpenAddClient] = useState(false);
  const [openAddTag, setOpenAddTag] = useState(false);
  const [openAddTimeRestriction, setOpenAddTimeRestriction] = useState(false);
  
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

  const [newTag, setNewTag] = useState({
    name: "",
  });

  const [newTimeRestriction, setNewTimeRestriction] = useState<{
    name: string;
    days: number[];
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    active: boolean;
  }>({
    name: "",
    days: [],
    startHour: "09",
    startMinute: "00",
    endHour: "18",
    endMinute: "00",
    active: true,
  });

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

  const [editTimeRestriction, setEditTimeRestriction] = useState<TimeRestriction | null>(null);

  const daysOfWeek = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda" },
    { value: 2, label: "Terça" },
    { value: 3, label: "Quarta" },
    { value: 4, label: "Quinta" },
    { value: 5, label: "Sexta" },
    { value: 6, label: "Sábado" },
  ];

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
    if (!newTag.name) {
      toast.error("Preencha o nome da tag");
      return;
    }
    
    try {
      await addTag({
        name: newTag.name,
      });
      
      setNewTag({ name: "" });
      setOpenAddTag(false);
      toast.success("Tag adicionada com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar tag");
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id);
      toast.success("Tag removida com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover tag");
    }
  };

  const handleAddTimeRestriction = async () => {
    if (!newTimeRestriction.name || newTimeRestriction.days.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    try {
      await addTimeRestriction({
        name: newTimeRestriction.name,
        days: newTimeRestriction.days,
        startHour: parseInt(newTimeRestriction.startHour),
        startMinute: parseInt(newTimeRestriction.startMinute),
        endHour: parseInt(newTimeRestriction.endHour),
        endMinute: parseInt(newTimeRestriction.endMinute),
        active: newTimeRestriction.active,
      });
      
      setNewTimeRestriction({
        name: "",
        days: [],
        startHour: "09",
        startMinute: "00",
        endHour: "18",
        endMinute: "00",
        active: true,
      });
      
      setOpenAddTimeRestriction(false);
      toast.success("Restrição de horário adicionada com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar restrição de horário");
    }
  };

  const handleEditTimeRestriction = async () => {
    if (!editTimeRestriction) return;
    
    try {
      await updateTimeRestriction(editTimeRestriction.id, {
        name: editTimeRestriction.name,
        days: editTimeRestriction.days,
        startHour: editTimeRestriction.startHour,
        startMinute: editTimeRestriction.startMinute,
        endHour: editTimeRestriction.endHour,
        endMinute: editTimeRestriction.endMinute,
        active: editTimeRestriction.active,
      });
      
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
      
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="time-restrictions">Restrições de Horário</TabsTrigger>
          <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts">
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
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.accountName}</TableCell>
                      <TableCell>{client.accountId}</TableCell>
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
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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

        <TabsContent value="tags">
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Gerencie as tags disponíveis no sistema
                </CardDescription>
              </div>
              <Dialog open={openAddTag} onOpenChange={setOpenAddTag}>
                <DialogTrigger asChild>
                  <Button>
                    <Tag className="h-4 w-4 mr-2" />
                    Nova Tag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Tag</DialogTitle>
                    <DialogDescription>
                      Crie uma nova tag para uso nas sequências
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="tag-name">Nome da Tag</Label>
                      <Input
                        id="tag-name"
                        value={newTag.name}
                        onChange={(e) => setNewTag({ name: e.target.value })}
                        placeholder="Nome da tag"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenAddTag(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddTag}>
                      Adicionar Tag
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
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tags.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                        Nenhuma tag cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="time-restrictions">
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Restrições de Horário</CardTitle>
                <CardDescription>
                  Configure períodos em que as mensagens não devem ser enviadas
                </CardDescription>
              </div>
              <Dialog open={openAddTimeRestriction} onOpenChange={setOpenAddTimeRestriction}>
                <DialogTrigger asChild>
                  <Button>
                    <Clock className="h-4 w-4 mr-2" />
                    Nova Restrição
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Restrição de Horário</DialogTitle>
                    <DialogDescription>
                      Configure períodos em que as mensagens não serão enviadas
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
                      <MultiSelect
                        options={daysOfWeek}
                        value={newTimeRestriction.days}
                        onChange={(values) => setNewTimeRestriction({ ...newTimeRestriction, days: values })}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário Inicial</Label>
                        <div className="flex space-x-2">
                          <Select
                            value={newTimeRestriction.startHour}
                            onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, startHour: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Hora" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                  {i.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={newTimeRestriction.startMinute}
                            onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, startMinute: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i * 5).map(i => (
                                <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                  {i.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Horário Final</Label>
                        <div className="flex space-x-2">
                          <Select
                            value={newTimeRestriction.endHour}
                            onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, endHour: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Hora" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                  {i.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={newTimeRestriction.endMinute}
                            onValueChange={(value) => setNewTimeRestriction({ ...newTimeRestriction, endMinute: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i * 5).map(i => (
                                <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                  {i.toString().padStart(2, '0')}
                                </SelectItem>
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
                      Adicionar Restrição
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
                    <TableHead>Dias</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeRestrictions.map((restriction) => (
                    <TableRow key={restriction.id}>
                      <TableCell className="font-medium">{restriction.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {restriction.days.map((day) => (
                            <span key={day} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                              {daysOfWeek.find(d => d.value === day)?.label.substring(0, 3)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatTime(restriction.startHour, restriction.startMinute)} - {formatTime(restriction.endHour, restriction.endMinute)}
                      </TableCell>
                      <TableCell>
                        {restriction.active ? (
                          <span className="inline-flex items-center text-xs font-medium text-green-500">
                            <CheckCircle className="mr-1 h-3 w-3" /> Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                            Inativa
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTimeRestriction(restriction)}>
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
                      </TableCell>
                    </TableRow>
                  ))}
                  {timeRestrictions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma restrição de horário cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Edit Time Restriction Dialog */}
              {editTimeRestriction && (
                <Dialog 
                  open={!!editTimeRestriction} 
                  onOpenChange={(open) => !open && setEditTimeRestriction(null)}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Editar Restrição de Horário</DialogTitle>
                      <DialogDescription>
                        Atualize as configurações da restrição de horário
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-restriction-name">Nome da Restrição</Label>
                        <Input
                          id="edit-restriction-name"
                          value={editTimeRestriction.name}
                          onChange={(e) => setEditTimeRestriction({ 
                            ...editTimeRestriction, 
                            name: e.target.value 
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Dias da Semana</Label>
                        <MultiSelect
                          options={daysOfWeek}
                          value={editTimeRestriction.days}
                          onChange={(values) => setEditTimeRestriction({ 
                            ...editTimeRestriction, 
                            days: values 
                          })}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Horário Inicial</Label>
                          <div className="flex space-x-2">
                            <Select
                              value={editTimeRestriction.startHour.toString()}
                              onValueChange={(value) => setEditTimeRestriction({ 
                                ...editTimeRestriction, 
                                startHour: parseInt(value) 
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Hora" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={editTimeRestriction.startMinute.toString()}
                              onValueChange={(value) => setEditTimeRestriction({ 
                                ...editTimeRestriction, 
                                startMinute: parseInt(value) 
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Min" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i * 5).map(i => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Horário Final</Label>
                          <div className="flex space-x-2">
                            <Select
                              value={editTimeRestriction.endHour.toString()}
                              onValueChange={(value) => setEditTimeRestriction({ 
                                ...editTimeRestriction, 
                                endHour: parseInt(value) 
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Hora" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={editTimeRestriction.endMinute.toString()}
                              onValueChange={(value) => setEditTimeRestriction({ 
                                ...editTimeRestriction, 
                                endMinute: parseInt(value) 
                              })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Min" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i * 5).map(i => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="edit-active"
                          checked={editTimeRestriction.active}
                          onCheckedChange={(checked) => setEditTimeRestriction({ 
                            ...editTimeRestriction, 
                            active: checked 
                          })}
                        />
                        <Label htmlFor="edit-active">Ativa</Label>
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
        
        <TabsContent value="general">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Ajuste as configurações gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Notificações</Label>
                    <div className="text-sm text-muted-foreground">
                      Receber notificações por email
                    </div>
                  </div>
                  <Switch id="notifications" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="usage-stats">Estatísticas de Uso</Label>
                    <div className="text-sm text-muted-foreground">
                      Compartilhar estatísticas anônimas de uso
                    </div>
                  </div>
                  <Switch id="usage-stats" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Backup Automático</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="never">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border rounded-md p-4 flex items-center space-x-4">
                <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-full">
                  <Info className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Versão do Sistema</h4>
                  <p className="text-sm text-muted-foreground">
                    Master Sequence v1.0.0
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

