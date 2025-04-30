
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Edit, MoreHorizontal, Trash2, User, UserCog, UserPlus } from "lucide-react";

export const UsersTab = () => {
  const { users, addUser, updateUser, deleteUser } = useApp();
  const { user: currentUser, isSuper } = useAuth();
  const [openAddUser, setOpenAddUser] = useState(false);
  
  const [newUser, setNewUser] = useState({
    accountName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [editUser, setEditUser] = useState<{
    id: string;
    accountName: string;
    role: "super_admin" | "admin";
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

  // Visível apenas para super admin
  if (!isSuper) {
    return null;
  }

  return (
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
  );
};
