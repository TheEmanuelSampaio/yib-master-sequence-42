
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BasicInfoSectionProps {
  name: string;
  setName: (name: string) => void;
  status: "active" | "inactive";
  setStatus: (status: "active" | "inactive") => void;
  type: "message" | "pattern" | "typebot";
  setType: (type: "message" | "pattern" | "typebot") => void;
  typebotStageCount: number;
  setTypebotStageCount: (count: number) => void;
  notifyChanges: () => void;
}

export function BasicInfoSection({ 
  name, 
  setName, 
  status, 
  setStatus, 
  type, 
  setType, 
  typebotStageCount, 
  setTypebotStageCount,
  notifyChanges 
}: BasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Básicas</CardTitle>
        <CardDescription>Configure os detalhes principais da sequência</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Sequência</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => {
                setName(e.target.value);
                notifyChanges();
              }} 
              placeholder="Ex: Sequência de Boas-vindas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo da Sequência</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as "message" | "pattern" | "typebot");
                notifyChanges();
              }}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="message">Mensagem</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
                <SelectItem value="typebot">Typebot</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <div className="mt-2">
            <Switch
              id="status"
              checked={status === "active"}
              onCheckedChange={(checked) => {
                setStatus(checked ? "active" : "inactive");
                notifyChanges();
              }}
              className="data-[state=checked]:bg-primary"
            />
            <span className="ml-2 text-sm">
              {status === "active" ? "Sequência ativa" : "Sequência inativa"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
