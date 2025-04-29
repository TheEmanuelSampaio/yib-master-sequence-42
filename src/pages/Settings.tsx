
import { useState } from "react";
import { useApp } from '@/context/AppContext';
import { Tag, PlusCircle, Trash2, AlertCircle, Laptop, Edit, MoreVertical, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from '@/components/theme/ThemeProvider';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Settings() {
  const { tags, addTag, removeTag, timeRestrictions, removeTimeRestriction, sequences, updateTimeRestriction } = useApp();
  const { theme, setTheme } = useTheme();
  
  const [newTag, setNewTag] = useState("");
  const [showSequences, setShowSequences] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState<any>(null);
  
  const handleAddTag = () => {
    if (newTag.trim() !== "") {
      addTag(newTag.trim());
      setNewTag("");
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    removeTag(tag);
  };

  const getRestrictionUsage = (restrictionId: string) => {
    const usedIn = sequences.filter(sequence => 
      sequence.timeRestrictions.some(r => r.id === restrictionId)
    );
    return {
      count: usedIn.length,
      sequences: usedIn
    };
  };

  const handleShowSequences = (restriction: any) => {
    setSelectedRestriction(restriction);
    setShowSequences(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do Master Sequence
        </p>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="restrictions">Restrições</TabsTrigger>
          <TabsTrigger value="about">Sobre</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Personalize a aparência do Master Sequence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Tema</h3>
                <div className="flex space-x-4">
                  <div
                    className={`border rounded-md p-4 cursor-pointer flex flex-col items-center ${
                      theme === "light" ? "border-primary bg-primary/10" : ""
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="w-10 h-10 bg-white rounded-full mb-2 shadow-sm"></div>
                    <span className="text-sm">Claro</span>
                  </div>
                  <div
                    className={`border rounded-md p-4 cursor-pointer flex flex-col items-center ${
                      theme === "dark" ? "border-primary bg-primary/10" : ""
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="w-10 h-10 bg-gray-900 rounded-full mb-2 shadow-sm"></div>
                    <span className="text-sm">Escuro</span>
                  </div>
                  <div
                    className={`border rounded-md p-4 cursor-pointer flex flex-col items-center ${
                      theme === "system" ? "border-primary bg-primary/10" : ""
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-white to-gray-900 rounded-full mb-2 shadow-sm"></div>
                    <span className="text-sm">Sistema</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Gerenciamento de Tags</CardTitle>
              <CardDescription>
                Adicione e remova tags disponíveis para uso nas sequências
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Digite o nome da tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddTag();
                    }
                  }}
                />
                <Button onClick={handleAddTag}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Tags Disponíveis ({tags.length})
                </h3>
                
                <ScrollArea className="h-[200px]">
                  <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="py-1 flex items-center"
                        >
                          {tag}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 hover:bg-transparent hover:text-red-500"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full py-4 text-center">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Nenhuma tag disponível</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adicione tags para utilizar nas condições de sequência
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="restrictions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Gerenciamento de Restrições</CardTitle>
              <CardDescription>
                Visualize e gerencie as restrições utilizadas nas sequências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[100px]">Uso</TableHead>
                      <TableHead className="w-[80px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeRestrictions && timeRestrictions.length > 0 ? timeRestrictions.map((restriction) => {
                      const usage = getRestrictionUsage(restriction.id);
                      
                      return (
                        <TableRow key={restriction.id}>
                          <TableCell className="font-medium">{restriction.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {restriction.days.map(day => {
                              const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                              return dayNames[day];
                            }).join(", ")} {restriction.startHour}:{restriction.startMinute.toString().padStart(2, '0')} - {restriction.endHour}:{restriction.endMinute.toString().padStart(2, '0')}
                          </TableCell>
                          <TableCell>
                            {usage.count > 0 ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-500 p-0 h-auto"
                                onClick={() => handleShowSequences(restriction)}
                              >
                                {usage.count} sequência{usage.count > 1 ? 's' : ''}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">Não utilizada</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                  onClick={() => removeTimeRestriction(restriction.id)}
                                  disabled={usage.count > 0}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <AlertCircle className="h-6 w-6 text-muted-foreground" />
                            <p className="text-muted-foreground">Nenhuma restrição encontrada</p>
                            <p className="text-xs text-muted-foreground">
                              As restrições são criadas ao configurar sequências
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sobre o Master Sequence</CardTitle>
              <CardDescription>
                Informações sobre o aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Versão</h3>
                <p className="text-muted-foreground">1.0.0</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Descrição</h3>
                <p className="text-muted-foreground">
                  Master Sequence é uma aplicação para setup e gerenciamento de sequências de follow-up
                  no WhatsApp. Integra-se com a Evolution API, N8N e Chatwoot para criar fluxos de mensagens
                  automatizados baseados em tags.
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Documentação de API</h3>
                <p className="text-muted-foreground">
                  Acesse a documentação completa da API na seção de documentação.
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Desenvolvido por</h3>
                <p className="text-muted-foreground">Years In Box</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" asChild>
                <a href="/api-docs">Ver Documentação da API</a>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={showSequences} onOpenChange={setShowSequences}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              Sequências que utilizam esta restrição
            </DialogTitle>
            <DialogDescription>
              {selectedRestriction?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Sequência</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRestriction && getRestrictionUsage(selectedRestriction.id).sequences.map((sequence) => (
                    <TableRow key={sequence.id}>
                      <TableCell>{sequence.name}</TableCell>
                      <TableCell>
                        <Badge variant={sequence.status === "active" ? "success" : "destructive"}>
                          {sequence.status === "active" ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
