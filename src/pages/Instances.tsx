import { useApp } from '@/context/AppContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function Instances() {
  const { instances, currentInstance, addInstance, updateInstance, deleteInstance, setCurrentInstance } = useApp();
  const [newInstanceForm, setNewInstanceForm] = useState({
    name: '',
    evolutionApiUrl: '',
    apiKey: '',
  });
  const [editInstanceForm, setEditInstanceForm] = useState({
    id: '',
    name: '',
    evolutionApiUrl: '',
    apiKey: '',
    active: true,
  });
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const handleNewInstance = () => {
    if (!newInstanceForm.name || !newInstanceForm.evolutionApiUrl || !newInstanceForm.apiKey) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    addInstance({
      name: newInstanceForm.name,
      evolutionApiUrl: newInstanceForm.evolutionApiUrl,
      apiKey: newInstanceForm.apiKey,
      active: true,
      updatedAt: new Date().toISOString(),
    });
    
    setNewInstanceForm({
      name: '',
      evolutionApiUrl: '',
      apiKey: '',
    });
    
    setIsNewDialogOpen(false);
  };
  
  const openEditDialog = (instance: any) => {
    setEditInstanceForm({
      id: instance.id,
      name: instance.name,
      evolutionApiUrl: instance.evolutionApiUrl,
      apiKey: instance.apiKey,
      active: instance.active,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleEditInstance = () => {
    if (!editInstanceForm.name || !editInstanceForm.evolutionApiUrl || !editInstanceForm.apiKey) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    updateInstance(editInstanceForm.id, {
      name: editInstanceForm.name,
      evolutionApiUrl: editInstanceForm.evolutionApiUrl,
      apiKey: editInstanceForm.apiKey,
      active: editInstanceForm.active,
    });
    
    setIsEditDialogOpen(false);
  };
  
  const handleDeleteInstance = (id: string) => {
    deleteInstance(id);
  };
  
  const handleSetCurrentInstance = (instance: any) => {
    setCurrentInstance(instance);
    toast.success(`Instância "${instance.name}" selecionada`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Instâncias</h1>
        <p className="text-muted-foreground">
          Gerencie suas instâncias da Evolution API
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="w-[400px]">
          <Tabs defaultValue="all">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">Todas ({instances.length})</TabsTrigger>
              <TabsTrigger value="active" className="flex-1">Ativas ({instances.filter(i => i.active).length})</TabsTrigger>
              <TabsTrigger value="inactive" className="flex-1">Inativas ({instances.filter(i => !i.active).length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Instância</DialogTitle>
              <DialogDescription>
                Informe os dados de conexão da sua instância da Evolution API.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Instância</Label>
                <Input
                  id="name"
                  value={newInstanceForm.name}
                  onChange={(e) => setNewInstanceForm({ ...newInstanceForm, name: e.target.value })}
                  placeholder="Minha Instância WhatsApp"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evolutionApiUrl">URL da Evolution API</Label>
                <Input
                  id="evolutionApiUrl"
                  value={newInstanceForm.evolutionApiUrl}
                  onChange={(e) => setNewInstanceForm({ ...newInstanceForm, evolutionApiUrl: e.target.value })}
                  placeholder="https://evolution-api.exemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">Chave da API</Label>
                <Input
                  id="apiKey"
                  value={newInstanceForm.apiKey}
                  onChange={(e) => setNewInstanceForm({ ...newInstanceForm, apiKey: e.target.value })}
                  placeholder="sua-chave-api-aqui"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleNewInstance}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all">
        <TabsContent value="all" className="mt-6">
          {renderInstanceList(instances)}
        </TabsContent>
        
        <TabsContent value="active" className="mt-6">
          {renderInstanceList(instances.filter(i => i.active))}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-6">
          {renderInstanceList(instances.filter(i => !i.active))}
        </TabsContent>
      </Tabs>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Instância</DialogTitle>
            <DialogDescription>
              Atualize os dados da sua instância da Evolution API.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome da Instância</Label>
              <Input
                id="edit-name"
                value={editInstanceForm.name}
                onChange={(e) => setEditInstanceForm({ ...editInstanceForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL da Evolution API</Label>
              <Input
                id="edit-url"
                value={editInstanceForm.evolutionApiUrl}
                onChange={(e) => setEditInstanceForm({ ...editInstanceForm, evolutionApiUrl: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-key">Chave da API</Label>
              <Input
                id="edit-key"
                value={editInstanceForm.apiKey}
                onChange={(e) => setEditInstanceForm({ ...editInstanceForm, apiKey: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={editInstanceForm.active}
                onCheckedChange={(checked) => setEditInstanceForm({ ...editInstanceForm, active: checked })}
              />
              <Label htmlFor="active">Instância Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditInstance}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderInstanceList(instanceList: any[]) {
    if (instanceList.length === 0) {
      return (
        <Card className="p-8 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">
            Nenhuma instância encontrada
          </h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira instância para começar a usar o Master Sequence
          </p>
          <Button onClick={() => setIsNewDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
        </Card>
      );
    }
    
    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
        {instanceList.map(instance => (
          <Card key={instance.id} className={currentInstance?.id === instance.id ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CardTitle className="text-lg">{instance.name}</CardTitle>
                </div>
                {!instance.active && (
                  <Badge variant="outline" className="ml-2 text-xs">Inativa</Badge>
                )}
              </div>
              <CardDescription>
                Criada {formatDistanceToNow(new Date(instance.createdAt), { 
                  addSuffix: true,
                  locale: ptBR
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1.5">
                <div>
                  <Label className="text-xs text-muted-foreground">URL da API</Label>
                  <p className="text-sm truncate">{instance.evolutionApiUrl}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${instance.active ? "bg-green-500" : "bg-red-500"}`} />
                    <p className="text-sm">{instance.active ? "Online" : "Offline"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="flex w-full space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditDialog(instance)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 text-red-500">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá excluir permanentemente a instância "{instance.name}" 
                        e todos os dados relacionados a ela.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteInstance(instance.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              {currentInstance?.id !== instance.id ? (
                <Button variant="outline" className="w-full" onClick={() => handleSetCurrentInstance(instance)}>
                  Selecionar
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  <Check className="h-4 w-4 mr-1" /> Selecionada
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
}
