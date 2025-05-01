import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, PlusCircle, Trash2, Edit, Check, X, RefreshCw, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Instance } from "@/types";

export default function InstancesPage() {
  const { instances, addInstance, updateInstance, deleteInstance, clients = [] } = useApp();
  const { user } = useAuth();
  
  const [isAddingInstance, setIsAddingInstance] = useState(false);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  
  const resetForm = () => {
    setName("");
    setEvolutionApiUrl("");
    setApiKey("");
    setClientId("");
  };
  
  const handleAddInstance = async () => {
    if (!name || !evolutionApiUrl || !apiKey || !clientId) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    
    try {
      const { success, error } = await addInstance({
        name,
        evolutionApiUrl,
        apiKey,
        active: true,
        clientId,
        createdBy: user?.id || "system" // Include createdBy property
      });
      
      if (success) {
        toast.success("Instância adicionada com sucesso");
        resetForm();
        setIsAddingInstance(false);
      } else {
        toast.error(`Erro ao adicionar instância: ${error}`);
      }
    } catch (error) {
      console.error("Erro ao adicionar instância:", error);
      toast.error("Erro ao adicionar instância");
    }
  };
  
  const handleUpdateInstance = async (id: string) => {
    if (!name || !evolutionApiUrl || !apiKey || !clientId) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    
    try {
      const { success, error } = await updateInstance(id, {
        name,
        evolutionApiUrl,
        apiKey,
        clientId
      });
      
      if (success) {
        toast.success("Instância atualizada com sucesso");
        resetForm();
        setEditingInstanceId(null);
      } else {
        toast.error(`Erro ao atualizar instância: ${error}`);
      }
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      toast.error("Erro ao atualizar instância");
    }
  };
  
  const handleDeleteInstance = async (id: string) => {
    try {
      const { success, error } = await deleteInstance(id);
      
      if (success) {
        toast.success("Instância excluída com sucesso");
      } else {
        toast.error(`Erro ao excluir instância: ${error}`);
      }
    } catch (error) {
      console.error("Erro ao excluir instância:", error);
      toast.error("Erro ao excluir instância");
    }
  };
  
  const startEditing = (instance: Instance) => {
    setName(instance.name);
    setEvolutionApiUrl(instance.evolutionApiUrl);
    setApiKey(instance.apiKey);
    setClientId(instance.clientId);
    setEditingInstanceId(instance.id);
  };
  
  const cancelEditing = () => {
    resetForm();
    setEditingInstanceId(null);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Instâncias</h1>
        <Button onClick={() => setIsAddingInstance(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Instância
        </Button>
      </div>

      <Sheet open={isAddingInstance} onOpenChange={setIsAddingInstance}>
        <SheetTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Instância
          </Button>
        </SheetTrigger>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Adicionar Instância</SheetTitle>
            <SheetDescription>
              Adicione uma nova instância para conectar um novo cliente.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="evolutionApiUrl" className="text-right">
                URL da API Evolution
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
              <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientId" className="text-right">
                Client ID
              </Label>
              <Input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <SheetFooter>
            <Button type="submit" onClick={handleAddInstance}>
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {instances && instances.length > 0 ? (
          instances.map((instance) => (
            <Card key={instance.id}>
              <CardHeader>
                <CardTitle>{instance.name}</CardTitle>
                <CardDescription>
                  {instance.evolutionApiUrl}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Badge variant="secondary">ID: {instance.id}</Badge>
                </div>
                <p>
                  <strong>API Key:</strong> {instance.apiKey}
                </p>
                <p>
                  <strong>Client ID:</strong> {instance.clientId}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(instance)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação é irreversível. Tem certeza de que deseja excluir esta instância?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteInstance(instance.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {instance.active ? (
                  <Badge variant="success">Ativa</Badge>
                ) : (
                  <Badge variant="destructive">Inativa</Badge>
                )}
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <AlertCircle className="h-6 w-6 inline-block mr-2" />
            Nenhuma instância encontrada.
          </div>
        )}
      </div>

      {editingInstanceId && (
        <Sheet open={!!editingInstanceId} onOpenChange={() => setEditingInstanceId(null)}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Editar Instância</SheetTitle>
              <SheetDescription>
                Edite os detalhes da instância selecionada.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="evolutionApiUrl" className="text-right">
                  URL da API Evolution
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
                <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clientId" className="text-right">
                  Client ID
                </Label>
                <Input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <SheetFooter>
              <Button type="submit" onClick={() => handleUpdateInstance(editingInstanceId)}>
                Atualizar
              </Button>
              <Button variant="ghost" onClick={cancelEditing}>
                Cancelar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
