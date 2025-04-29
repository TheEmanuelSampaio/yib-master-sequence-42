
import { useState, useEffect } from "react";
import { useApp } from '@/context/AppContext';
import { Pencil, Search, MoreVertical, Power, PowerOff, Trash2, Plus, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instance } from "@/types";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Instances() {
  const { instances, addInstance, updateInstance, deleteInstance, currentInstance, setCurrentInstance } = useApp();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [name, setName] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  
  const handleAddInstance = () => {
    if (!name || !evolutionApiUrl || !apiKey) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    addInstance({
      name,
      evolutionApiUrl,
      apiKey,
      active: true,
    });
    
    resetForm();
  };

  const handleEditInstance = () => {
    if (!editingInstance) return;
    
    if (!name || !evolutionApiUrl || !apiKey) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    updateInstance(editingInstance.id, {
      name,
      evolutionApiUrl,
      apiKey,
    });
    
    resetForm();
  };
  
  const resetForm = () => {
    setName("");
    setEvolutionApiUrl("");
    setApiKey("");
    setOpen(false);
    setIsEditing(false);
    setEditingInstance(null);
  };
  
  const handleToggleInstance = (instance: Instance) => {
    updateInstance(instance.id, { active: !instance.active });
  };

  const handleSelectInstance = (instance: Instance) => {
    setCurrentInstance(instance);
    toast.success(`Instância "${instance.name}" selecionada`);
  };

  const openEditDialog = (instance: Instance) => {
    setIsEditing(true);
    setEditingInstance(instance);
    setName(instance.name);
    setEvolutionApiUrl(instance.evolutionApiUrl);
    setApiKey(instance.apiKey);
    setOpen(true);
  };

  const handleDialogClose = () => {
    // Using setTimeout to avoid the React hooks error
    setTimeout(() => {
      resetForm();
    }, 0);
  };

  // Filter instances based on search and active status
  const filteredInstances = instances.filter(instance => {
    // Filter by search term
    const matchesSearch = 
      instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.evolutionApiUrl.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by active status
    if (activeTab === "active" && !instance.active) return false;
    if (activeTab === "inactive" && instance.active) return false;
    
    return matchesSearch;
  });

  // Count instances by status
  const activeInstances = instances.filter(inst => inst.active);
  const inactiveInstances = instances.filter(inst => !inst.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Instâncias</h1>
        <p className="text-muted-foreground">
          Gerencie as instâncias do Evolution API
        </p>
      </div>
      
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar instâncias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex justify-between items-center">
        <Tabs 
          defaultValue="all" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as "all" | "active" | "inactive")}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="all">Todas ({instances.length})</TabsTrigger>
            <TabsTrigger value="active">Ativas ({activeInstances.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inativas ({inactiveInstances.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button onClick={() => { setIsEditing(false); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Instância
        </Button>
      </div>
      
      <TabsContent value={activeTab} className="mt-0 p-0 border-none">
        {renderInstanceList(filteredInstances)}
      </TabsContent>
      
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleDialogClose();
        else setOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar" : "Adicionar"} Instância</DialogTitle>
            <DialogDescription>
              {isEditing ? "Edite os dados da instância do Evolution API." : "Adicione uma nova instância do Evolution API para gerenciar as sequências."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="evolutionApiUrl" className="text-right">
                URL da API
              </Label>
              <Input
                id="evolutionApiUrl"
                value={evolutionApiUrl}
                onChange={(e) => setEvolutionApiUrl(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                API Key
              </Label>
              <Input 
                id="apiKey" 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleDialogClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={isEditing ? handleEditInstance : handleAddInstance}
            >
              {isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderInstanceList(instances: Instance[]) {
    if (instances.length === 0) {
      return (
        <Card className="p-8 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">
            {searchTerm ? "Nenhuma instância encontrada" : "Nenhuma instância criada"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? "Tente alterar os termos da busca ou remover filtros" 
              : "Crie sua primeira instância para começar a automatizar seu follow-up"}
          </p>
          {!searchTerm && (
            <Button onClick={() => { setIsEditing(false); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          )}
        </Card>
      );
    }
    
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {instances.map((instance) => (
          <Card key={instance.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>{instance.name}</CardTitle>
              </div>
              <div className="flex items-center mt-1">
                {instance.active ? 
                  <Power className="h-4 w-4 text-green-500 mr-1" /> : 
                  <PowerOff className="h-4 w-4 text-destructive mr-1" />
                }
                <Badge variant={instance.active ? "default" : "destructive"}>
                  {instance.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">URL da API</Label>
                <p className="text-sm text-muted-foreground break-all">{instance.evolutionApiUrl}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">API Key</Label>
                <p className="text-sm text-muted-foreground">{instance.apiKey}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button 
                variant={currentInstance?.id === instance.id ? "default" : "outline"} 
                onClick={() => handleSelectInstance(instance)}
              >
                {currentInstance?.id === instance.id ? "Selecionada" : "Selecionar"}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(instance)} className="cursor-pointer">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleInstance(instance)} className="cursor-pointer">
                    {instance.active ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-2" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-2" />
                        Ativar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => deleteInstance(instance.id)} 
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
        
        <Card 
          className="border-dashed h-full flex items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => { setIsEditing(false); setOpen(true); }}
        >
          <CardContent className="flex flex-col items-center justify-center space-y-2 p-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Adicionar nova instância</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
