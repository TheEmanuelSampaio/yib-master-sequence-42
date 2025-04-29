
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Edit, Info, MoreHorizontal, Plus, Trash2, User, UserCheck, UserCog, UserPlus } from "lucide-react";
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

export default function Settings() {
  const { users, clients, addUser, updateUser, deleteUser, addClient, updateClient, deleteClient } = useApp();
  const { user: currentUser, isSuper } = useAuth();
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openAddClient, setOpenAddClient] = useState(false);
  
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
