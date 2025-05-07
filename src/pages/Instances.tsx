import { useState, useEffect } from "react";
import { useApp } from '@/context/AppContext';
import {
  Activity,
  PlusCircle,
  Search,
  Settings,
  MoreVertical,
  Edit,
  Trash2
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
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isValidUUID } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  evolutionApiUrl: z.string().url({
    message: "Por favor, entre com uma URL válida.",
  }),
  apiKey: z.string().min(10, {
    message: "A chave da API deve ter pelo menos 10 caracteres.",
  }),
});

export default function Instances() {
  const { instances, currentClient, addInstance, updateInstance, deleteInstance, refreshData, isDataInitialized } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Fetch data only if not initialized yet
  useEffect(() => {
    if (!isDataInitialized && currentClient) {
      console.log("Instances page - loading initial data");
      refreshData();
    }
  }, [refreshData, currentClient, isDataInitialized]);
  
  const filteredInstances = instances
    .filter(instance => instance.clientId === currentClient?.id)
    .filter(instance =>
      searchQuery === '' ||
      instance.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
  const formAddInstance = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      evolutionApiUrl: "",
      apiKey: "",
    },
  });
  
  const formEditInstance = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      evolutionApiUrl: "",
      apiKey: "",
    },
  });
  
  useEffect(() => {
    if (selectedInstance) {
      formEditInstance.reset({
        name: selectedInstance.name,
        evolutionApiUrl: selectedInstance.evolutionApiUrl,
        apiKey: selectedInstance.apiKey,
      });
    }
  }, [selectedInstance, formEditInstance]);
  
  const handleOpenAddModal = () => {
    setAddModalOpen(true);
  };
  
  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    formAddInstance.reset();
  };
  
  const handleOpenEditModal = (instance) => {
    setSelectedInstance(instance);
    setEditModalOpen(true);
  };
  
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedInstance(null);
    formEditInstance.reset();
  };
  
  const handleSubmit = async (values: any) => {
    // Formatando os valores
    const instance = {
      name: values.name,
      evolutionApiUrl: values.evolutionApiUrl,
      apiKey: values.apiKey,
      active: true,
      clientId: currentClient?.id || ''
    };
    
    // Adicionando a nova instância
    if (currentClient) {
      setIsSubmitting(true);
      
      try {
        const result = await addInstance(instance);
        
        if (result.success) {
          toast.success("Instância criada com sucesso!");
          setAddModalOpen(false);
          formAddInstance.reset();
        } else {
          toast.error(result.error || "Erro ao criar instância");
        }
      } catch (error) {
        console.error("Erro ao criar instância:", error);
        toast.error("Erro ao criar instância");
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  const handleUpdate = async (values: any) => {
    if (!selectedInstance) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await updateInstance(selectedInstance.id, {
        name: values.name,
        evolutionApiUrl: values.evolutionApiUrl,
        apiKey: values.apiKey,
      });
      
      if (result.success) {
        toast.success("Instância atualizada com sucesso!");
        setEditModalOpen(false);
        setSelectedInstance(null);
        formEditInstance.reset();
      } else {
        toast.error(result.error || "Erro ao atualizar instância");
      }
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      toast.error("Erro ao atualizar instância");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      const result = await deleteInstance(id);
      
      if (result.success) {
        toast.success("Instância excluída com sucesso!");
      } else {
        toast.error(result.error || "Erro ao excluir instância");
      }
    } catch (error) {
      console.error("Erro ao excluir instância:", error);
      toast.error("Erro ao excluir instância");
    }
  };
  
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const result = await updateInstance(id, { active: !active });
      
      if (result.success) {
        toast.success(`Instância ${active ? 'desativada' : 'ativada'} com sucesso!`);
      } else {
        toast.error(result.error || "Erro ao alterar status da instância");
      }
    } catch (error) {
      console.error("Erro ao alterar status da instância:", error);
      toast.error("Erro ao alterar status da instância");
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Instâncias</h1>
        <p className="text-muted-foreground">
          Gerencie suas instâncias do Evolution API
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar instâncias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <Button variant="ghost" className="h-9 px-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleOpenAddModal}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Instância
        </Button>
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredInstances.length === 0 ? (
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              {searchQuery ? (
                <Search className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Activity className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {searchQuery ? "Nenhuma instância encontrada" : "Nenhuma instância criada"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Tente alterar os termos da busca ou remover filtros"
                : "Crie sua primeira instância para começar"}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenAddModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            )}
          </Card>
        ) : (
          filteredInstances.map(instance => (
            <Card key={instance.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{instance.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEditModal(instance)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(instance.id, instance.active)}>
                        {instance.active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza de que deseja excluir esta instância?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(instance.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>
                  Atualizada {formatDistanceToNow(new Date(instance.updatedAt), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant={instance.active ? "default" : "outline"}>
                    {instance.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Modal de Adicionar Instância */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Instância</DialogTitle>
            <DialogDescription>
              Adicione uma nova instância do Evolution API para o cliente atual.
            </DialogDescription>
          </DialogHeader>
          <Form {...formAddInstance}>
            <form onSubmit={formAddInstance.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={formAddInstance.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Minha Instância" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formAddInstance.control}
                name="evolutionApiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da API Evolution</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.evolution.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formAddInstance.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave da API</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua Chave da API" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      Criando...
                      <Icons.spinner className="animate-spin ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "Criar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Editar Instância */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Instância</DialogTitle>
            <DialogDescription>
              Edite os detalhes da instância selecionada.
            </DialogDescription>
          </DialogHeader>
          <Form {...formEditInstance}>
            <form onSubmit={formEditInstance.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={formEditInstance.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Minha Instância" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formEditInstance.control}
                name="evolutionApiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da API Evolution</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.evolution.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formEditInstance.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave da API</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua Chave da API" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      Atualizando...
                      <Icons.spinner className="animate-spin ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "Atualizar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"

import { Icons } from "@/components/ui/icons"
