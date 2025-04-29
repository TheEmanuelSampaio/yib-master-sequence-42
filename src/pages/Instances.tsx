import { useState } from "react";
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, RefreshCw, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Instance } from "@/types";
import { toast } from "sonner";

export default function Instances() {
  const { instances, addInstance, updateInstance, deleteInstance, currentInstance } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Instâncias</h1>
        <p className="text-muted-foreground">
          Gerencie as instâncias do Evolution API
        </p>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {instances.map((instance) => (
          <Card key={instance.id}>
            <CardHeader>
              <CardTitle>{instance.name}</CardTitle>
              <CardDescription>{instance.evolutionApiUrl}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Status</h4>
                <Badge variant={instance.active ? "success" : "destructive"}>
                  {instance.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-medium">API Key</h4>
                <p className="text-sm text-muted-foreground">{instance.apiKey}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Switch id={`instance-${instance.id}`} checked={instance.active} onCheckedChange={() => handleToggleInstance(instance)} />
              
              <div className="flex space-x-2">
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => deleteInstance(instance.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
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
