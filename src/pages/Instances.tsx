
import { useState, useEffect } from "react";
import { useApp } from '@/context/AppContext';
import { Pencil, Search, MoreVertical, Power, PowerOff, Trash2, Plus, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instance, Client } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Instances() {
  const { instances, clients, addInstance, updateInstance, deleteInstance, currentInstance, setCurrentInstance } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [editInstance, setEditInstance] = useState<Instance | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Clean up any body styles when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.removeProperty('pointer-events');
    };
  }, []);
  
  // Fix for pointer-events issue when dialog closes
  useEffect(() => {
    if (!open) {
      // Use setTimeout to ensure this happens after dialog animation completes
      const timer = setTimeout(() => {
        document.body.style.removeProperty('pointer-events');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);
  
  const handleAddInstance = () => {
    if (!name || !evolutionApiUrl || !apiKey || !clientId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    addInstance({
      name,
      evolutionApiUrl,
      apiKey,
      active: true,
      clientId
    });
    
    resetForm();
  };
  
  const resetForm = () => {
    setName("");
    setEvolutionApiUrl("");
    setApiKey("");
    setClientId("");
    setOpen(false);
    setIsEditing(false);
    setEditInstance(null);
    // Ensure pointer-events are enabled
    document.body.style.removeProperty('pointer-events');
  };

  const startEditing = (instance: Instance) => {
    setEditInstance(instance);
    setName(instance.name);
    setEvolutionApiUrl(instance.evolutionApiUrl);
    setApiKey(instance.apiKey);
    setClientId(instance.clientId);
    setIsEditing(true);
    setOpen(true);
  };
  
  const handleUpdateInstance = () => {
    if (!editInstance) return;
    
    if (!name || !evolutionApiUrl || !apiKey || !clientId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    updateInstance(editInstance.id, {
      name,
      evolutionApiUrl,
      apiKey,
      active: editInstance.active,
      clientId
    });
    
    toast.success(`Instância "${name}" atualizada com sucesso`);
    resetForm();
  };
  
  const handleToggleInstance = (instance: Instance) => {
    updateInstance(instance.id, { active: !instance.active });
  };

  const handleSelectInstance = (instance: Instance) => {
    setCurrentInstance(instance);
    toast.success(`Instância "${instance.name}" selecionada`);
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
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex w-full sm:max-w-sm items-center">
          <div className="relative w-full">
            <Input
              placeholder="Buscar instâncias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10"
            />
          </div>
          <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <Button onClick={() => {
          resetForm();
          setOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Instância
        </Button>
      </div>
      
      <Tabs 
        defaultValue="all" 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "all" | "active" | "inactive")}
      >
        <TabsList>
          <TabsTrigger value="all">Todas ({instances.length})</TabsTrigger>
          <TabsTrigger value="active">Ativas ({activeInstances.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inativas ({inactiveInstances.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {renderInstanceList(filteredInstances)}
        </TabsContent>
        
        <TabsContent value="active" className="mt-4">
          {renderInstanceList(filteredInstances)}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-4">
          {renderInstanceList(filteredInstances)}
        </TabsContent>
      </Tabs>
      
      {/* Dialog handling with special focus on fixing pointer-events issue */}
      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            // Force pointer-events back to normal on close
            // Use setTimeout to ensure this happens after dialog animation completes
            setTimeout(() => {
              document.body.style.removeProperty('pointer-events');
              resetForm();
            }, 300);
          }
        }}
      >
        <DialogContent 
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => {
            // Prevent any weird interaction issues
            e.preventDefault();
          }}
          onEscapeKeyDown={() => {
            // Ensure proper cleanup on escape key
            setTimeout(() => {
              document.body.style.removeProperty('pointer-events');
            }, 300);
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Instância' : 'Adicionar Instância'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize os dados da instância do Evolution API.'
                : 'Adicione uma nova instância do Evolution API para gerenciar as sequências.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-sm">
                Nome
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right text-sm">
                Cliente
              </Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.accountName} (ID: {client.accountId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="evolutionApiUrl" className="text-right text-sm">
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
              <Label htmlFor="apiKey" className="text-right text-sm">
                API Key
              </Label>
              <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => {
              setOpen(false);
              // Force pointer-events back to normal
              setTimeout(() => {
                document.body.style.removeProperty('pointer-events');
              }, 300);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button type="submit" onClick={isEditing ? handleUpdateInstance : handleAddInstance}>
              {isEditing ? 'Atualizar' : 'Adicionar'}
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
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          )}
        </Card>
      );
    }
    
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {instances.map((instance) => {
          const clientName = clients.find(c => c.id === instance.clientId)?.accountName || "Cliente desconhecido";
          
          return (
            <Card key={instance.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-1">
                <CardTitle className="mb-3">{instance.name}</CardTitle>
                <CardDescription className="flex items-center">
                  {instance.active ? 
                    <Power className="h-4 w-4 text-green-500 mr-2" /> : 
                    <PowerOff className="h-4 w-4 text-destructive mr-2" />
                  }
                  <Badge variant={instance.active ? "default" : "destructive"}>
                    {instance.active ? "Ativa" : "Inativa"}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm text-muted-foreground">{clientName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">URL da API</Label>
                  <p className="text-sm text-muted-foreground break-all">{instance.evolutionApiUrl}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">API Key</Label>
                  <p className="text-sm text-muted-foreground break-all">{instance.apiKey}</p>
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
                    <DropdownMenuItem onClick={() => startEditing(instance)} className="cursor-pointer">
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
          );
        })}
        
        <Card 
          className="border-dashed h-full flex items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
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
