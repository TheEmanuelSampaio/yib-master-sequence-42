
// Substitua o componente SequenceBuilder existente com esta versão atualizada
// que implementa o suporte a condições avançadas

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Sequence, TimeRestriction } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { StageBuilder } from './StageBuilder';
import { TimeRestrictionBuilder } from './TimeRestrictionBuilder';
import { cn } from '@/lib/utils';
import { Tag, Plus, X, ArrowLeftCircle, Clock, MessageCircle, FileCode, Bot } from 'lucide-react';
import { AdvancedCondition, ConditionGroup, simpleToAdvanced, advancedToSimple } from '@/types/conditionTypes';
import { AdvancedConditionBuilder } from './AdvancedConditionBuilder';
import { toast } from 'sonner';

// Esquema de validação do formulário usando zod
const sequenceFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  status: z.enum(["active", "inactive"]),
  type: z.enum(["message", "pattern", "typebot"]),
  instanceId: z.string().min(1, "Selecione uma instância"),
});

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  onChangesMade?: () => void;
}

export function SequenceBuilder({ sequence, onSave, onCancel, onChangesMade }: SequenceBuilderProps) {
  const { currentInstance, tags: availableTags, timeRestrictions: globalRestrictions } = useApp();
  const [stages, setStages] = useState<any[]>(sequence?.stages || []);
  const [startTags, setStartTags] = useState<string[]>(sequence?.startCondition?.tags || []);
  const [stopTags, setStopTags] = useState<string[]>(sequence?.stopCondition?.tags || []);
  const [selectedStartConditionType, setSelectedStartConditionType] = useState<"AND" | "OR">(
    sequence?.startCondition?.type || "AND"
  );
  const [selectedStopConditionType, setSelectedStopConditionType] = useState<"AND" | "OR">(
    sequence?.stopCondition?.type || "AND"
  );
  const [timeRestrictions, setTimeRestrictions] = useState<TimeRestriction[]>(
    sequence?.timeRestrictions || []
  );
  const [newTag, setNewTag] = useState<string>("");
  const [newStartTag, setNewStartTag] = useState<string>("");
  const [newStopTag, setNewStopTag] = useState<string>("");
  
  // Estados para condições avançadas
  const [useAdvancedStartCondition, setUseAdvancedStartCondition] = useState<boolean>(
    sequence?.useAdvancedStartCondition || false
  );
  const [useAdvancedStopCondition, setUseAdvancedStopCondition] = useState<boolean>(
    sequence?.useAdvancedStopCondition || false
  );
  const [advancedStartCondition, setAdvancedStartCondition] = useState<AdvancedCondition>(
    sequence?.advancedStartCondition || simpleToAdvanced(selectedStartConditionType, startTags)
  );
  const [advancedStopCondition, setAdvancedStopCondition] = useState<AdvancedCondition>(
    sequence?.advancedStopCondition || simpleToAdvanced(selectedStopConditionType, stopTags)
  );

  // Criar formulário
  const form = useForm<z.infer<typeof sequenceFormSchema>>({
    resolver: zodResolver(sequenceFormSchema),
    defaultValues: {
      name: sequence?.name || "",
      status: sequence?.status || "active",
      type: sequence?.type || "message",
      instanceId: sequence?.instanceId || currentInstance?.id || "",
    },
  });

  // Efeito para notificar mudanças
  useEffect(() => {
    if (onChangesMade) {
      onChangesMade();
    }
  }, [
    stages, 
    startTags, 
    stopTags, 
    selectedStartConditionType, 
    selectedStopConditionType, 
    timeRestrictions,
    useAdvancedStartCondition,
    useAdvancedStopCondition,
    advancedStartCondition,
    advancedStopCondition,
    form.formState.isDirty
  ]);

  // Atualizar instância selecionada quando currentInstance mudar
  useEffect(() => {
    if (currentInstance && !sequence) {
      form.setValue("instanceId", currentInstance.id);
    }
  }, [currentInstance, form, sequence]);

  // Atualizar condições avançadas quando as condições simples mudarem e não estiver no modo avançado
  useEffect(() => {
    if (!useAdvancedStartCondition) {
      setAdvancedStartCondition(simpleToAdvanced(selectedStartConditionType, startTags));
    }
  }, [selectedStartConditionType, startTags, useAdvancedStartCondition]);

  useEffect(() => {
    if (!useAdvancedStopCondition) {
      setAdvancedStopCondition(simpleToAdvanced(selectedStopConditionType, stopTags));
    }
  }, [selectedStopConditionType, stopTags, useAdvancedStopCondition]);

  // Funções para manipulação de tags
  const addStartTag = (tag: string) => {
    if (!tag) return;
    if (startTags.includes(tag)) {
      alert(`Tag "${tag}" já existe na condição de início`);
      return;
    }
    setStartTags([...startTags, tag]);
    setNewStartTag("");
  };

  const removeStartTag = (tag: string) => {
    setStartTags(startTags.filter((t) => t !== tag));
  };

  const addStopTag = (tag: string) => {
    if (!tag) return;
    if (stopTags.includes(tag)) {
      alert(`Tag "${tag}" já existe na condição de parada`);
      return;
    }
    setStopTags([...stopTags, tag]);
    setNewStopTag("");
  };

  const removeStopTag = (tag: string) => {
    setStopTags(stopTags.filter((t) => t !== tag));
  };

  // Funções para manipular stages
  const handleAddStage = (stage: any) => {
    const newStage = {
      ...stage,
      id: stage.id || uuidv4(), // Garantir que o stage tenha um ID
    };
    setStages([...stages, newStage]);
  };

  const handleUpdateStage = (stageId: string, updatedStage: any) => {
    setStages(stages.map((stage) => (stage.id === stageId ? updatedStage : stage)));
  };

  const handleRemoveStage = (stageId: string) => {
    setStages(stages.filter((stage) => stage.id !== stageId));
  };

  const handleMoveStage = (stageId: string, direction: "up" | "down") => {
    const index = stages.findIndex((stage) => stage.id === stageId);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const newStages = [...stages];
      [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
      setStages(newStages);
    } else if (direction === "down" && index < stages.length - 1) {
      const newStages = [...stages];
      [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
      setStages(newStages);
    }
  };

  // Funções para manipular restrições de tempo
  const handleAddTimeRestriction = (restriction: TimeRestriction) => {
    setTimeRestrictions([...timeRestrictions, restriction]);
  };

  const handleUpdateTimeRestriction = (restrictionId: string, updatedRestriction: Partial<TimeRestriction>) => {
    setTimeRestrictions(
      timeRestrictions.map((r) => (r.id === restrictionId ? { ...r, ...updatedRestriction } : r))
    );
  };

  const handleRemoveTimeRestriction = (restrictionId: string) => {
    setTimeRestrictions(timeRestrictions.filter((r) => r.id !== restrictionId));
  };
  
  // Funções para manipular condições avançadas
  const toggleAdvancedStartCondition = () => {
    if (!useAdvancedStartCondition) {
      // Ao ativar o modo avançado, converter condição simples para avançada
      setAdvancedStartCondition(simpleToAdvanced(selectedStartConditionType, startTags));
    } else {
      // Ao desativar o modo avançado, tentar converter para condição simples
      const simpleCondition = advancedToSimple(advancedStartCondition);
      if (simpleCondition) {
        setSelectedStartConditionType(simpleCondition.type);
        setStartTags(simpleCondition.tags);
      } else {
        // Se não for possível simplificar, mostrar aviso
        const confirmSimplify = window.confirm(
          "A condição avançada não pode ser simplificada automaticamente. Ao mudar para o modo simples, você perderá a configuração avançada. Deseja continuar?"
        );
        if (confirmSimplify) {
          setStartTags([]);
          setSelectedStartConditionType("AND");
        } else {
          return; // Cancelar a mudança
        }
      }
    }
    setUseAdvancedStartCondition(!useAdvancedStartCondition);
  };

  const toggleAdvancedStopCondition = () => {
    if (!useAdvancedStopCondition) {
      setAdvancedStopCondition(simpleToAdvanced(selectedStopConditionType, stopTags));
    } else {
      const simpleCondition = advancedToSimple(advancedStopCondition);
      if (simpleCondition) {
        setSelectedStopConditionType(simpleCondition.type);
        setStopTags(simpleCondition.tags);
      } else {
        const confirmSimplify = window.confirm(
          "A condição avançada não pode ser simplificada automaticamente. Ao mudar para o modo simples, você perderá a configuração avançada. Deseja continuar?"
        );
        if (confirmSimplify) {
          setStopTags([]);
          setSelectedStopConditionType("AND");
        } else {
          return;
        }
      }
    }
    setUseAdvancedStopCondition(!useAdvancedStopCondition);
  };

  const handleUpdateAdvancedStartCondition = (condition: AdvancedCondition) => {
    setAdvancedStartCondition(condition);
  };

  const handleUpdateAdvancedStopCondition = (condition: AdvancedCondition) => {
    setAdvancedStopCondition(condition);
  };

  const onSubmit = (data: z.infer<typeof sequenceFormSchema>) => {
    const sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt"> = {
      name: data.name,
      instanceId: data.instanceId,
      status: data.status,
      type: data.type,
      startCondition: {
        type: selectedStartConditionType,
        tags: startTags,
      },
      stopCondition: {
        type: selectedStopConditionType,
        tags: stopTags,
      },
      stages: stages.map((stage, index) => ({
        ...stage,
        orderIndex: index, // Garantir a ordem correta dos estágios
      })),
      timeRestrictions: timeRestrictions,
      useAdvancedStartCondition,
      useAdvancedStopCondition,
      advancedStartCondition,
      advancedStopCondition
    };

    onSave(sequenceData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Defina as informações básicas da sequência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Sequência</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome da sequência" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Ativa</SelectItem>
                            <SelectItem value="inactive">Inativa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Sequência</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="message">Mensagem</SelectItem>
                            <SelectItem value="pattern">Padrão</SelectItem>
                            <SelectItem value="typebot">Typebot</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Define como o conteúdo da mensagem será processado
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instanceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instância</FormLabel>
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                          {currentInstance?.name || "Selecione uma instância"}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="start-condition">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="start-condition">Condições de Início</TabsTrigger>
                <TabsTrigger value="stop-condition">Condições de Parada</TabsTrigger>
              </TabsList>

              <TabsContent value="start-condition">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Condições de Início</CardTitle>
                        <CardDescription>
                          Defina quando esta sequência deve ser ativada
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="advanced-start-condition"
                          checked={useAdvancedStartCondition}
                          onCheckedChange={toggleAdvancedStartCondition}
                        />
                        <Label htmlFor="advanced-start-condition">Modo Avançado</Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {useAdvancedStartCondition ? (
                      <AdvancedConditionBuilder
                        condition={advancedStartCondition}
                        availableTags={availableTags}
                        onChange={handleUpdateAdvancedStartCondition}
                        onToggleSimpleMode={toggleAdvancedStartCondition}
                      />
                    ) : (
                      <>
                        <div className="mb-4">
                          <Label htmlFor="start-condition-type">Operador</Label>
                          <Select
                            value={selectedStartConditionType}
                            onValueChange={(value) => setSelectedStartConditionType(value as "AND" | "OR")}
                          >
                            <SelectTrigger id="start-condition-type">
                              <SelectValue placeholder="Selecione um operador" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">E (AND)</SelectItem>
                              <SelectItem value="OR">OU (OR)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedStartConditionType === "AND"
                              ? "O contato deve ter TODAS as tags selecionadas"
                              : "O contato deve ter PELO MENOS UMA das tags selecionadas"}
                          </p>
                        </div>

                        <div className="mb-4">
                          <Label>Tags</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {startTags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {tag}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 ml-1 p-0"
                                  onClick={() => removeStartTag(tag)}
                                >
                                  <X className="h-3 w-3" />
                                  <span className="sr-only">Remover tag</span>
                                </Button>
                              </Badge>
                            ))}
                            {startTags.length === 0 && (
                              <div className="text-sm text-muted-foreground">
                                Nenhuma tag adicionada
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Select value={newStartTag} onValueChange={setNewStartTag}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecionar tag" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {availableTags.map((tag) => (
                                    <SelectItem key={tag} value={tag}>
                                      {tag}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => addStartTag(newStartTag)}
                              disabled={!newStartTag}
                            >
                              Adicionar
                            </Button>
                          </div>
                        </div>

                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={toggleAdvancedStartCondition}
                          className="w-full"
                        >
                          Mudar para modo avançado
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stop-condition">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Condições de Parada</CardTitle>
                        <CardDescription>
                          Defina quando esta sequência deve ser interrompida
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="advanced-stop-condition"
                          checked={useAdvancedStopCondition}
                          onCheckedChange={toggleAdvancedStopCondition}
                        />
                        <Label htmlFor="advanced-stop-condition">Modo Avançado</Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {useAdvancedStopCondition ? (
                      <AdvancedConditionBuilder
                        condition={advancedStopCondition}
                        availableTags={availableTags}
                        onChange={handleUpdateAdvancedStopCondition}
                        onToggleSimpleMode={toggleAdvancedStopCondition}
                      />
                    ) : (
                      <>
                        <div className="mb-4">
                          <Label htmlFor="stop-condition-type">Operador</Label>
                          <Select
                            value={selectedStopConditionType}
                            onValueChange={(value) => setSelectedStopConditionType(value as "AND" | "OR")}
                          >
                            <SelectTrigger id="stop-condition-type">
                              <SelectValue placeholder="Selecione um operador" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">E (AND)</SelectItem>
                              <SelectItem value="OR">OU (OR)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedStopConditionType === "AND"
                              ? "O contato deve ter TODAS as tags selecionadas para parar a sequência"
                              : "O contato deve ter PELO MENOS UMA das tags selecionadas para parar a sequência"}
                          </p>
                        </div>

                        <div className="mb-4">
                          <Label>Tags</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {stopTags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {tag}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 ml-1 p-0"
                                  onClick={() => removeStopTag(tag)}
                                >
                                  <X className="h-3 w-3" />
                                  <span className="sr-only">Remover tag</span>
                                </Button>
                              </Badge>
                            ))}
                            {stopTags.length === 0 && (
                              <div className="text-sm text-muted-foreground">
                                Nenhuma tag adicionada
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Select value={newStopTag} onValueChange={setNewStopTag}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecionar tag" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {availableTags.map((tag) => (
                                    <SelectItem key={tag} value={tag}>
                                      {tag}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => addStopTag(newStopTag)}
                              disabled={!newStopTag}
                            >
                              Adicionar
                            </Button>
                          </div>
                        </div>

                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={toggleAdvancedStopCondition}
                          className="w-full"
                        >
                          Mudar para modo avançado
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card>
              <CardHeader>
                <CardTitle>Estágios da Sequência</CardTitle>
                <CardDescription>
                  Defina as mensagens e atrasos de cada estágio da sequência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stages.length === 0 && (
                    <div className="text-center p-8 border rounded-md bg-muted/30">
                      <p className="text-muted-foreground mb-4">
                        Nenhum estágio adicionado à sequência
                      </p>
                      <Button type="button" onClick={() => handleAddStage({
                        name: `Estágio ${stages.length + 1}`,
                        type: form.getValues("type"),
                        content: "",
                        delay: 60,
                        delayUnit: "minutes"
                      })}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar primeiro estágio
                      </Button>
                    </div>
                  )}

                  {stages.map((stage, index) => (
                    <div key={stage.id} className="border rounded-md p-4 bg-card relative">
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveStage(stage.id, "up")}
                          disabled={index === 0}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-arrow-up"
                          >
                            <path d="m5 11 7-7 7 7" />
                            <path d="M12 4v16" />
                          </svg>
                          <span className="sr-only">Mover para cima</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveStage(stage.id, "down")}
                          disabled={index === stages.length - 1}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-arrow-down"
                          >
                            <path d="M12 5v14" />
                            <path d="m19 12-7 7-7-7" />
                          </svg>
                          <span className="sr-only">Mover para baixo</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-full h-6 w-6 bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-medium">
                            {stage.name || `Estágio ${index + 1}`}
                          </h3>
                          <Badge variant="outline" className={cn(
                            "ml-2 flex items-center gap-1",
                            stage.type === "message" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
                            stage.type === "pattern" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
                            stage.type === "typebot" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
                          )}>
                            {stage.type === "message" && <MessageCircle className="h-3 w-3" />}
                            {stage.type === "pattern" && <FileCode className="h-3 w-3" />}
                            {stage.type === "typebot" && <Bot className="h-3 w-3" />}
                            {stage.type === "message" ? "Mensagem" : 
                             stage.type === "pattern" ? "Padrão" : "Typebot"}
                          </Badge>
                        </div>
                        
                        <StageBuilder
                          stage={stage}
                          sequenceType={form.getValues("type")}
                          onSave={(updatedStage) => handleUpdateStage(stage.id, updatedStage)}
                          onRemove={() => handleRemoveStage(stage.id)}
                        />
                      </div>
                    </div>
                  ))}

                  {stages.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleAddStage({
                        name: `Estágio ${stages.length + 1}`,
                        type: form.getValues("type"),
                        content: "",
                        delay: 60,
                        delayUnit: "minutes"
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar estágio
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Restrições de Horário</CardTitle>
                <CardDescription>
                  Defina horários em que as mensagens não serão enviadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeRestrictionBuilder
                  restrictions={timeRestrictions}
                  globalRestrictions={globalRestrictions}
                  onAddRestriction={handleAddTimeRestriction}
                  onUpdateRestriction={handleUpdateTimeRestriction}
                  onRemoveRestriction={handleRemoveTimeRestriction}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={onCancel}>
                <ArrowLeftCircle className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit">Salvar Sequência</Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
