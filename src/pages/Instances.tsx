
import { useState } from "react";
import { useApp } from '@/context/AppContext';
import { Pencil, Search, MoreVertical, Power, PowerOff, Trash2, Plus } from "lucide-react";
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

export default function Instances() {
  const { instances, addInstance, updateInstance, deleteInstance, currentInstance, setCurrentInstance } = useApp();
  const [open, setOpen] = useState(false);
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
  
  const resetForm = () => {
    setName("");
    setEvolutionApiUrl("");
    setApiKey("");
    setOpen(false);
  };
  
  const handleToggleInstance = (instance: Instance) => {
    updateInstance(instance.id, { active: !instance.active });
  };

  const handleSelectInstance = (instance: Instance) => {
    setCurrentInstance(instance);
    toast.success(`Instância "${instance.name}" selecionada`);
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instâncias</h1>
        <p className="text-muted-foreground">
          Gerencie as instâncias do Evolution API
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs 
          defaultValue="all" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as "all" | "active" | "inactive")}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="active">Ativas</TabsTrigger>
            <TabsTrigger value="inactive">Inativas</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar instâncias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredInstances.map((instance) => (
          <ContextMenu key={instance.id}>
            <ContextMenuTrigger>
              <Card key={instance.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>{instance.name}</CardTitle>
                    <div className="flex items-center">
                      {instance.active ? 
                        <Power className="h-4 w-4 text-green-500 mr-1" /> : 
                        <PowerOff className="h-4 w-4 text-destructive mr-1" />
                      }
                      <Badge variant={instance.active ? "success" : "destructive"}>
                        {instance.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">URL da API</Label>
                    <CardDescription>{instance.evolutionApiUrl}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">API Key</h4>
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
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => setOpen(true)} className="cursor-pointer">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleToggleInstance(instance)} className="cursor-pointer">
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
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => deleteInstance(instance.id)} 
                className="text-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Card className="border-dashed h-full flex items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors">
              <CardContent className="flex flex-col items-center justify-center space-y-2 p-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Adicionar nova instância</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Instância</DialogTitle>
              <DialogDescription>
                Adicione uma nova instância do Evolution API para gerenciar as sequências.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
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
                <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" onClick={handleAddInstance}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
