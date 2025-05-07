
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit2, Trash2, UserPlus } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApp } from "@/context/AppContext";
import { toast } from 'sonner';

export function ClientsTab() {
  const { clients, addClient } = useApp();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState<number>(0);
  
  const handleAddClient = async () => {
    if (!accountName || !accountId) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    try {
      const result = await addClient({
        accountName,
        accountId,
        createdBy: '' // Este valor será preenchido pelo servidor
      });
      
      if (result.success) {
        toast.success("Cliente adicionado com sucesso!");
        setShowAddDialog(false);
        setAccountName("");
        setAccountId(0);
      } else {
        toast.error(result.error || "Erro ao adicionar cliente");
      }
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast.error("Erro ao adicionar cliente");
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome da Conta</TableHead>
            <TableHead>ID da Conta</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                Nenhum cliente encontrado. Adicione seu primeiro cliente.
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.accountName}</TableCell>
                <TableCell>{client.accountId}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label htmlFor="account-name" className="block text-sm font-medium mb-1">
                Nome da Conta
              </label>
              <Input
                id="account-name"
                placeholder="Nome da Conta"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="account-id" className="block text-sm font-medium mb-1">
                ID da Conta
              </label>
              <Input
                id="account-id"
                placeholder="ID da Conta"
                type="number"
                value={accountId || ""}
                onChange={(e) => setAccountId(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddClient}>
              <PlusCircle className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
