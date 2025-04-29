
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Edit, Trash2, CheckCircle, X, RefreshCcw, User, UserCog, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserWithRoles {
  id: string;
  email: string;
  account_name: string;
  created_at: string;
  roles: string[];
}

export default function UserManagement() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  
  // Dados do formulário
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserAccountName, setNewUserAccountName] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserIsSuperAdmin, setNewUserIsSuperAdmin] = useState(false);
  
  // Dados de edição
  const [editUserAccountName, setEditUserAccountName] = useState("");
  const [editUserIsAdmin, setEditUserIsAdmin] = useState(false);
  const [editUserIsSuperAdmin, setEditUserIsSuperAdmin] = useState(false);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os usuários
      const { data: authUsers, error: authError } = await supabase
        .from("profiles")
        .select("id, account_name, created_at");
      
      if (authError) throw authError;
      
      // Buscar informações adicionais (como email) de cada usuário
      const usersWithDetails = await Promise.all(
        authUsers.map(async (user) => {
          // Buscar os roles do usuário
          const { data: userRoles, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          
          if (rolesError) throw rolesError;
          
          // Obter o email do usuário usando o admin api (não é possível pela API do cliente)
          // Simulamos isso aqui usando o perfil, na vida real precisaria de uma função serverless
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();
          
          if (userError && userError.code !== "PGRST116") throw userError;
          
          // Em uma implementação real, precisaríamos buscar o email através de uma função serverless
          // Por enquanto, vamos usar um mock baseado no id
          const mockEmail = `user-${user.id.substring(0, 8)}@example.com`;
          
          return {
            id: user.id,
            email: mockEmail, // No mundo real, isso viria da serverless function
            account_name: user.account_name,
            created_at: user.created_at,
            roles: userRoles.map(r => r.role)
          };
        })
      );
      
      setUsers(usersWithDetails);
    } catch (error: any) {
      toast.error(`Erro ao buscar usuários: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Criar o usuário
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            account_name: newUserAccountName
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (!authData.user) {
        throw new Error("Falha ao criar usuário");
      }
      
      // 2. Atribuir os roles ao usuário
      if (newUserIsAdmin || newUserIsSuperAdmin) {
        // Se o usuário for super admin, ele terá também o role de admin
        const rolesToAdd = [];
        
        if (newUserIsAdmin || newUserIsSuperAdmin) {
          rolesToAdd.push({ user_id: authData.user.id, role: "admin" });
        }
        
        if (newUserIsSuperAdmin) {
          rolesToAdd.push({ user_id: authData.user.id, role: "super_admin" });
        }
        
        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(rolesToAdd);
        
        if (rolesError) throw rolesError;
      }
      
      toast.success("Usuário criado com sucesso!");
      
      // Resetar o formulário e fechar o diálogo
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserAccountName("");
      setNewUserIsAdmin(false);
      setNewUserIsSuperAdmin(false);
      setIsAddDialogOpen(false);
      
      // Recarregar a lista de usuários
      fetchUsers();
      
    } catch (error: any) {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    }
  };
  
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      // 1. Atualizar o nome da conta
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ account_name: editUserAccountName })
        .eq('id', selectedUser.id);
      
      if (profileError) throw profileError;
      
      // 2. Gerenciar os roles
      const isCurrentlyAdmin = selectedUser.roles.includes('admin');
      const isCurrentlySuperAdmin = selectedUser.roles.includes('super_admin');
      
      // Se houver mudanças nos roles, atualizá-los
      if (editUserIsAdmin !== isCurrentlyAdmin || editUserIsSuperAdmin !== isCurrentlySuperAdmin) {
        // Primeiro remover todos os roles
        const { error: deleteRolesError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id);
        
        if (deleteRolesError) throw deleteRolesError;
        
        // Depois adicionar os novos roles
        const rolesToAdd = [];
        
        if (editUserIsAdmin || editUserIsSuperAdmin) {
          rolesToAdd.push({ user_id: selectedUser.id, role: "admin" });
        }
        
        if (editUserIsSuperAdmin) {
          rolesToAdd.push({ user_id: selectedUser.id, role: "super_admin" });
        }
        
        if (rolesToAdd.length > 0) {
          const { error: addRolesError } = await supabase
            .from('user_roles')
            .insert(rolesToAdd);
          
          if (addRolesError) throw addRolesError;
        }
      }
      
      toast.success("Usuário atualizado com sucesso!");
      
      // Fechar o diálogo e recarregar os usuários
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      
    } catch (error: any) {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) {
      return;
    }
    
    try {
      // Em uma implementação real, você precisaria usar uma serverless function
      // para chamar o admin API para deletar o usuário
      // Por enquanto, vamos apenas deletar os registros relacionados
      
      // 1. Remover os roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (rolesError) throw rolesError;
      
      // 2. Remover o perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      // Na implementação real, você chamaria uma função serverless para deletar o usuário do Auth
      
      toast.success("Usuário excluído com sucesso!");
      fetchUsers();
      
    } catch (error: any) {
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    }
  };
  
  const openEditDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditUserAccountName(user.account_name);
    setEditUserIsAdmin(user.roles.includes('admin'));
    setEditUserIsSuperAdmin(user.roles.includes('super_admin'));
    setIsEditDialogOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e suas permissões no sistema
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchUsers}
            title="Atualizar lista"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          
          {isSuperAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              
              <DialogContent>
                <form onSubmit={handleAddUser}>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Crie um novo usuário e atribua suas permissões
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Nome da Conta</Label>
                      <Input
                        id="accountName"
                        placeholder="Digite o nome da conta"
                        value={newUserAccountName}
                        onChange={(e) => setNewUserAccountName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@exemplo.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Senha forte"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <Label>Permissões</Label>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div>Administrador</div>
                          <p className="text-sm text-muted-foreground">
                            Pode gerenciar clientes e instâncias
                          </p>
                        </div>
                        <Switch
                          checked={newUserIsAdmin || newUserIsSuperAdmin}
                          onCheckedChange={(checked) => {
                            setNewUserIsAdmin(checked);
                            if (!checked) setNewUserIsSuperAdmin(false);
                          }}
                          disabled={newUserIsSuperAdmin}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div>Super Administrador</div>
                          <p className="text-sm text-muted-foreground">
                            Acesso total ao sistema, incluindo gerenciamento de usuários
                          </p>
                        </div>
                        <Switch
                          checked={newUserIsSuperAdmin}
                          onCheckedChange={(checked) => {
                            setNewUserIsSuperAdmin(checked);
                            if (checked) setNewUserIsAdmin(true);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Criar Usuário</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              {users.length} usuários cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Conta</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  {isSuperAdmin && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.account_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.includes("super_admin") ? (
                            <Badge variant="default">Super Admin</Badge>
                          ) : user.roles.includes("admin") ? (
                            <Badge variant="secondary">Admin</Badge>
                          ) : (
                            <Badge variant="outline">Usuário</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Diálogo de edição */}
      {selectedUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleEditUser}>
              <DialogHeader>
                <DialogTitle>Editar Usuário</DialogTitle>
                <DialogDescription>
                  Atualize as informações e permissões do usuário
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editAccountName">Nome da Conta</Label>
                  <Input
                    id="editAccountName"
                    placeholder="Digite o nome da conta"
                    value={editUserAccountName}
                    onChange={(e) => setEditUserAccountName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    value={selectedUser.email}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    O e-mail não pode ser alterado
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Label>Permissões</Label>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div>Administrador</div>
                      <p className="text-sm text-muted-foreground">
                        Pode gerenciar clientes e instâncias
                      </p>
                    </div>
                    <Switch
                      checked={editUserIsAdmin || editUserIsSuperAdmin}
                      onCheckedChange={(checked) => {
                        setEditUserIsAdmin(checked);
                        if (!checked) setEditUserIsSuperAdmin(false);
                      }}
                      disabled={editUserIsSuperAdmin}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div>Super Administrador</div>
                      <p className="text-sm text-muted-foreground">
                        Acesso total ao sistema, incluindo gerenciamento de usuários
                      </p>
                    </div>
                    <Switch
                      checked={editUserIsSuperAdmin}
                      onCheckedChange={(checked) => {
                        setEditUserIsSuperAdmin(checked);
                        if (checked) setEditUserIsAdmin(true);
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
