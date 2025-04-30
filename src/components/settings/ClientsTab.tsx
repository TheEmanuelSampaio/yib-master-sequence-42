
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const ClientsTab = () => {
  const { users, clients, addClient, updateClient, deleteClient } = useApp();
  const { isSuper } = useAuth();
  const [openAddClient, setOpenAddClient] = useState(false);
  const [userFilter, setUserFilter] = useState<string>("");
  
  const [newClient, setNewClient] = useState({
    accountName: "",
    accountId: "",
  });

  const [editClient, setEditClient] = useState<{
    id: string;
    accountName: string;
    accountId: number;
  } | null>(null);

  // Função para obter o nome do criador a partir do ID
  const getCreatorName = (client) => {
    if (client.createdBy && users && users.length > 0) {
      const creator = users.find(user => user.id === client.createdBy);
      if (creator) {
        return creator.accountName;
      }
    }
    
    if (client.creator && client.creator.account_name) {
      return client.creator.account_name;
    }
    
    if (client.creator_account_name) {
      return client.creator_account_name;
    }
    
    return "—";
  };

  // Filtrar clientes por usuário criador (para super admin)
  const filteredClients = isSuper && userFilter 
    ? clients.filter(client => client.createdBy === userFilter)
    : clients;

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
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            Gerencie os clientes do sistema
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {isSuper && users.length > 0 && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>ID da Conta</TableHead>
              {isSuper && <TableHead>Criado por</TableHead>}
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.accountName}</TableCell>
                <TableCell>{client.accountId}</TableCell>
                {isSuper && <TableCell>{getCreatorName(client)}</TableCell>}
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
                <TableCell colSpan={isSuper ? 4 : 3} className="text-center py-8 text-muted-foreground">
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
  );
};
