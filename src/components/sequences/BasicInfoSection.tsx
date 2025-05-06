
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface BasicInfoSectionProps {
  name: string;
  setName: (name: string) => void;
  status: "active" | "inactive";
  setStatus: (status: "active" | "inactive") => void;
  type: "message" | "pattern" | "typebot";
  setType: (type: "message" | "pattern" | "typebot") => void;
  notifyChanges: () => void;
  onTypeChange: (newType: "message" | "pattern" | "typebot") => void;
  isEditMode: boolean;
}

export function BasicInfoSection({ 
  name, 
  setName, 
  status, 
  setStatus, 
  type, 
  setType,
  notifyChanges,
  onTypeChange,
  isEditMode
}: BasicInfoSectionProps) {
  const [showTypeChangeAlert, setShowTypeChangeAlert] = useState(false);
  const [pendingType, setPendingType] = useState<"message" | "pattern" | "typebot" | null>(null);

  const handleTypeChange = (newType: "message" | "pattern" | "typebot") => {
    if (newType !== type) {
      // Só mostrar o alerta se estiver no modo de edição (não para sequências novas)
      if (isEditMode) {
        setPendingType(newType);
        setShowTypeChangeAlert(true);
      } else {
        // Se for uma nova sequência, apenas muda o tipo sem alertas
        onTypeChange(newType);
        setType(newType);
        notifyChanges();
      }
    }
  };

  const confirmTypeChange = () => {
    if (pendingType) {
      onTypeChange(pendingType);
      setType(pendingType);
      notifyChanges();
      setShowTypeChangeAlert(false);
      setPendingType(null);
    }
  };

  const cancelTypeChange = () => {
    setShowTypeChangeAlert(false);
    setPendingType(null);
  };

  return (
    <>
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
                  handleTypeChange(value as "message" | "pattern" | "typebot");
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

      {/* Diálogo de alerta para mudança de tipo - mensagem simplificada */}
      <AlertDialog open={showTypeChangeAlert} onOpenChange={setShowTypeChangeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar o tipo da sequência?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo dos estágios será limpo ao alterar o tipo da sequência.
              Esta ação não pode ser desfeita após salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTypeChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTypeChange}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
