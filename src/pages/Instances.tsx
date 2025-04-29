import { useState } from "react";
import { useApp } from '@/context/AppContext';
import {
  PlusCircle,
  Settings,
  Copy,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function Instances() {
  const { instances, currentInstance, addInstance, updateInstance, deleteInstance, setCurrentInstance } = useApp();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    evolutionApiUrl: "",
    apiKey: ""
  });
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // When adding a new instance
  const handleAddInstance = () => {
    if (!formState.name || !formState.evolutionApiUrl || !formState.apiKey) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    addInstance({
      name: formState.name,
      evolutionApiUrl: formState.evolutionApiUrl,
      apiKey: formState.apiKey,
      active: true
    });
    
    setFormState({
      name: "",
      evolutionApiUrl: "",
      apiKey: ""
    });
    
    setShowAddDialog(false);
  };

  // When updating an instance
  const handleUpdateInstance = (id: string, data: Partial<Omit<Instance, "id" | "createdAt" | "updatedAt">>) => {
    updateInstance(id, data);
  };

  // When deleting an instance
  const handleDeleteInstance = (id: string) => {
    deleteInstance(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Instâncias</h1>
        <p className="text-muted-foreground">
          Gerencie suas instâncias da Evolution API
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Instância Ativa</CardTitle>
          <CardDescription>
            Informações da instância ativa no momento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentInstance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Nome</p>
                  <p className="text-muted-foreground">{currentInstance.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={currentInstance.active ? "default" : "outline"}>
                    {currentInstance.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Evolution API URL</p>
                  <div className="flex items-center">
                    <p className="text-muted-foreground break-all">{currentInstance.evolutionApiUrl}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="ml-2"
                      onClick={() => handleCopyToClipboard(currentInstance.evolutionApiUrl)}
                      disabled={isCopied}
                    >
                      {isCopied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">API Key</p>
                  <div className="flex items-center">
                    <p className="text-muted-foreground break-all">{currentInstance.apiKey}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="ml-2"
                      onClick={() => handleCopyToClipboard(currentInstance.apiKey)}
                      disabled={isCopied}
                    >
                      {isCopied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma instância ativa selecionada
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={() => setShowAddDialog(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Instância
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Instâncias</CardTitle>
          <CardDescription>
            Lista de instâncias cadastradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {instances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma instância cadastrada
                </div>
              ) : (
                instances.map(instance => (
                  <div key={instance.id} className="flex items-center justify-between border-b pb-3">
                    <div className="space-y-1">
                      <p className="font-medium">{instance.name}</p>
                      <p className="text-sm text-muted-foreground">{instance.evolutionApiUrl}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentInstance(instance)}
                      >
                        Selecionar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-500">
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza de que deseja excluir esta instância? Esta ação não pode ser desfeita.
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
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Add Instance Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Adicionar Nova Instância</CardTitle>
              <CardDescription>
                Preencha os campos abaixo para adicionar uma nova instância
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input 
                  id="name" 
                  placeholder="Nome da Instância" 
                  value={formState.name}
                  onChange={(e) => setFormState({...formState, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evolutionApiUrl">Evolution API URL</Label>
                <Input 
                  id="evolutionApiUrl" 
                  placeholder="URL da Evolution API" 
                  value={formState.evolutionApiUrl}
                  onChange={(e) => setFormState({...formState, evolutionApiUrl: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input 
                  id="apiKey" 
                  placeholder="Chave de API" 
                  value={formState.apiKey}
                  onChange={(e) => setFormState({...formState, apiKey: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddInstance}>Adicionar</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
