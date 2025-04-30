import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X, GripVertical, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react"
import { TimeRestriction } from '@/types';
import { useApp } from '@/context/AppContext';
import { Sequence, SequenceStage } from '@/types';

interface SequenceBuilderProps {
  sequence?: Sequence;
  onSave: (sequence: Omit<Sequence, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  onChangesMade: () => void;
}

export const SequenceBuilder: React.FC<SequenceBuilderProps> = ({ sequence, onSave, onCancel, onChangesMade }) => {
  const { tags, timeRestrictions, addTag } = useApp();
  const [name, setName] = useState(sequence?.name || '');
  const [startConditionType, setStartConditionType] = useState(sequence?.startCondition.type || 'AND');
  const [startConditionTags, setStartConditionTags] = useState(sequence?.startCondition.tags || []);
  const [stopConditionType, setStopConditionType] = useState(sequence?.stopCondition.type || 'AND');
  const [stopConditionTags, setStopConditionTags] = useState(sequence?.stopCondition.tags || []);
  const [stages, setStages] = useState<SequenceStage[]>(sequence?.stages || []);
  const [newTagName, setNewTagName] = useState('');
  const [status, setStatus] = useState(sequence?.status || 'active');
  const [selectedTimeRestrictions, setSelectedTimeRestrictions] = useState<TimeRestriction[]>(sequence?.timeRestrictions || []);
  
  // Local state for time restriction popover
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  
  useEffect(() => {
    onChangesMade();
  }, [name, startConditionType, startConditionTags, stopConditionType, stopConditionTags, stages, status, selectedTimeRestrictions, onChangesMade]);
  
  const handleAddTag = () => {
    if (newTagName && !tags.includes(newTagName)) {
      addTag({ name: newTagName });
      setNewTagName('');
    }
  };
  
  const handleToggleTag = (tag: string, conditionType: 'start' | 'stop') => {
    const addTagToCondition = (tags: string[], setTags: (tags: string[]) => void) => {
      if (tags.includes(tag)) {
        setTags(tags.filter(t => t !== tag));
      } else {
        setTags([...tags, tag]);
      }
    };
    
    if (conditionType === 'start') {
      addTagToCondition(startConditionTags, setStartConditionTags);
    } else {
      addTagToCondition(stopConditionTags, setStopConditionTags);
    }
  };
  
  const handleAddStage = () => {
    const newStage: SequenceStage = {
      id: uuidv4(),
      name: `Estágio ${stages.length + 1}`,
      type: 'message',
      content: '',
      delay: 0,
      delayUnit: 'minutes',
      orderIndex: stages.length,
    };
    setStages([...stages, newStage]);
  };
  
  const handleStageChange = (id: string, field: string, value: any) => {
    setStages(prevStages =>
      prevStages.map(stage =>
        stage.id === id ? { ...stage, [field]: value } : stage
      )
    );
  };
  
  const handleRemoveStage = (id: string) => {
    setStages(prevStages => prevStages.filter(stage => stage.id !== id));
  };
  
  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update orderIndex after reordering
    const updatedItems = items.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
    
    setStages(updatedItems);
  };
  
  const handleSubmit = async () => {
    const sequenceData: Omit<Sequence, "id" | "createdAt" | "updatedAt"> = {
      name,
      instanceId: 'f46747cd-695f-4f79-8940-3b589959e099', // TODO: Remover filtro hardcoded
      startCondition: {
        type: startConditionType,
        tags: startConditionTags,
      },
      stopCondition: {
        type: stopConditionType,
        tags: stopConditionTags,
      },
      stages: stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        type: stage.type,
        content: stage.content,
        typebotStage: stage.typebotStage,
        delay: stage.delay,
        delayUnit: stage.delayUnit,
        orderIndex: stage.orderIndex,
      })),
      timeRestrictions: selectedTimeRestrictions,
      status,
    };
    
    await onSave(sequenceData);
  };
  
  const handleSelectTimeRestriction = (restriction: TimeRestriction) => {
    if (selectedTimeRestrictions.find(r => r.id === restriction.id)) {
      setSelectedTimeRestrictions(prev => prev.filter(r => r.id !== restriction.id));
    } else {
      setSelectedTimeRestrictions(prev => [...prev, restriction]);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Nome da Sequência */}
      <div>
        <Label htmlFor="name">Nome da Sequência</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      
      {/* Condições de Início */}
      <div>
        <Label>Condições de Início</Label>
        <div className="flex items-center space-x-2 mb-2">
          <Select value={startConditionType} onValueChange={value => setStartConditionType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant={startConditionTags.includes(tag) ? "default" : "outline"}
              onClick={() => handleToggleTag(tag, 'start')}
              className="cursor-pointer"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Input
            type="text"
            placeholder="Novo Tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <Button type="button" size="sm" onClick={handleAddTag}>
            Adicionar Tag
          </Button>
        </div>
      </div>
      
      {/* Condições de Parada */}
      <div>
        <Label>Condições de Parada</Label>
        <div className="flex items-center space-x-2 mb-2">
          <Select value={stopConditionType} onValueChange={value => setStopConditionType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant={stopConditionTags.includes(tag) ? "default" : "outline"}
              onClick={() => handleToggleTag(tag, 'stop')}
              className="cursor-pointer"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Estágios da Sequência */}
      <div>
        <Label>Estágios da Sequência</Label>
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="stages">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {stages.map((stage, index) => (
                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-card rounded-md shadow-sm p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div {...provided.dragHandleProps} className="cursor-grab mr-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <h3 className="text-sm font-semibold">{stage.name}</h3>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveStage(stage.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4">
                          <div>
                            <Label htmlFor={`stage-name-${stage.id}`}>Nome do Estágio</Label>
                            <Input
                              type="text"
                              id={`stage-name-${stage.id}`}
                              value={stage.name}
                              onChange={(e) => handleStageChange(stage.id, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`stage-type-${stage.id}`}>Tipo</Label>
                            <Select value={stage.type} onValueChange={value => handleStageChange(stage.id, 'type', value)}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="message">Mensagem</SelectItem>
                                <SelectItem value="pattern">Padrão</SelectItem>
                                <SelectItem value="typebot">Typebot</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {stage.type === 'message' && (
                            <div>
                              <Label htmlFor={`stage-content-${stage.id}`}>Conteúdo</Label>
                              <Textarea
                                id={`stage-content-${stage.id}`}
                                value={stage.content}
                                onChange={(e) => handleStageChange(stage.id, 'content', e.target.value)}
                              />
                            </div>
                          )}
                          {stage.type === 'pattern' && (
                            <div>
                              <Label htmlFor={`stage-content-${stage.id}`}>Padrão</Label>
                              <Input
                                type="text"
                                id={`stage-content-${stage.id}`}
                                value={stage.content}
                                onChange={(e) => handleStageChange(stage.id, 'content', e.target.value)}
                              />
                            </div>
                          )}
                          {stage.type === 'typebot' && (
                            <div>
                              <Label htmlFor={`stage-typebot-${stage.id}`}>ID do Typebot</Label>
                              <Input
                                type="text"
                                id={`stage-typebot-${stage.id}`}
                                value={stage.typebotStage || ''}
                                onChange={(e) => handleStageChange(stage.id, 'typebotStage', e.target.value)}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`stage-delay-${stage.id}`}>Atraso</Label>
                              <Slider
                                id={`stage-delay-${stage.id}`}
                                defaultValue={[stage.delay]}
                                max={100}
                                step={1}
                                onValueChange={(value) => handleStageChange(stage.id, 'delay', value[0])}
                              />
                              <p className="text-sm text-muted-foreground">
                                {stage.delay} {stage.delayUnit}
                              </p>
                            </div>
                            <div>
                              <Label htmlFor={`stage-delay-unit-${stage.id}`}>Unidade de Atraso</Label>
                              <Select value={stage.delayUnit} onValueChange={value => handleStageChange(stage.id, 'delayUnit', value)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Unidade" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="minutes">Minutos</SelectItem>
                                  <SelectItem value="hours">Horas</SelectItem>
                                  <SelectItem value="days">Dias</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <Button type="button" size="sm" variant="outline" onClick={handleAddStage}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Estágio
        </Button>
      </div>
      
      {/* Restrições de Tempo */}
      <div>
        <Label>Restrições de Tempo</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="flex flex-wrap gap-1 mt-2">
          {timeRestrictions.map(restriction => (
            <Badge
              key={restriction.id}
              variant={selectedTimeRestrictions.find(r => r.id === restriction.id) ? "default" : "outline"}
              onClick={() => handleSelectTimeRestriction(restriction)}
              className="cursor-pointer"
            >
              {restriction.name}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Status da Sequência */}
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={value => setStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="inactive">Inativa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Ações */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Salvar
        </Button>
      </div>
    </div>
  );
};
