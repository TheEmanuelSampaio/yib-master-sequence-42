
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  webhookEnabled: boolean;
  setWebhookEnabled: (enabled: boolean) => void;
  webhookId?: string;
  setWebhookId: (id: string) => void;
  instanceId?: string;
  sequenceId?: string;
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
  isEditMode,
  webhookEnabled,
  setWebhookEnabled,
  webhookId,
  setWebhookId,
  instanceId,
  sequenceId
}: BasicInfoSectionProps) {
  const [showTypeChangeAlert, setShowTypeChangeAlert] = useState(false);
  const [pendingType, setPendingType] = useState<"message" | "pattern" | "typebot" | null>(null);
  const [isValidatingWebhookId, setIsValidatingWebhookId] = useState(false);
  const [isWebhookIdUnique, setIsWebhookIdUnique] = useState(true);
  const [generatedWebhookId, setGeneratedWebhookId] = useState("");
  
  // Generate webhook ID from name
  const generateWebhookId = (name: string) => {
    if (!name) return "";
    
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with a single one
      .trim();
  };

  // Set initial webhook ID when name changes or webhook is enabled
  useEffect(() => {
    if (webhookEnabled && !webhookId && name) {
      const newWebhookId = generateWebhookId(name);
      setGeneratedWebhookId(newWebhookId);
      setWebhookId(newWebhookId);
      notifyChanges(); // Notify changes when webhook ID is automatically set
    }
  }, [webhookEnabled, name, webhookId, setWebhookId, notifyChanges]);

  useEffect(() => {
    if (generatedWebhookId !== webhookId) {
      setGeneratedWebhookId(generateWebhookId(name));
    }
  }, [name, webhookId]);

  // Validate webhook ID uniqueness - Improved to use the correct function when in edit mode
  const validateWebhookId = async (id: string) => {
    if (!id || !instanceId) return;
    
    setIsValidatingWebhookId(true);
    console.log("Validating webhook ID:", { 
      id, 
      instanceId, 
      isEditMode, 
      sequenceId,
      currentTime: new Date().toISOString() 
    });
    
    try {
      // Use different RPC function based on whether we're in edit mode
      let data, error;
      
      if (isEditMode && sequenceId) {
        console.log("Using is_webhook_id_unique_for_client_except_self with params:", {
          p_webhook_id: id,
          p_instance_id: instanceId,
          p_sequence_id: sequenceId
        });
        
        ({ data, error } = await supabase.rpc('is_webhook_id_unique_for_client_except_self', {
          p_webhook_id: id,
          p_instance_id: instanceId,
          p_sequence_id: sequenceId
        }));
      } else {
        console.log("Using is_webhook_id_unique_for_client with params:", {
          p_webhook_id: id,
          p_instance_id: instanceId
        });
        
        ({ data, error } = await supabase.rpc('is_webhook_id_unique_for_client', {
          p_webhook_id: id,
          p_instance_id: instanceId
        }));
      }

      if (error) {
        console.error('Error validating webhook ID:', error);
        setIsWebhookIdUnique(true); // Assume unique in case of error
      } else {
        console.log("Webhook ID validation result:", data);
        setIsWebhookIdUnique(!!data);
      }
    } catch (error) {
      console.error('Error validating webhook ID:', error);
      setIsWebhookIdUnique(true); // Assume unique in case of error
    } finally {
      setIsValidatingWebhookId(false);
    }
  };

  // Debounce webhook ID validation - but only validate while typing, not on initial load
  useEffect(() => {
    if (webhookEnabled && webhookId && !isValidatingWebhookId) {
      const timeoutId = setTimeout(() => {
        validateWebhookId(webhookId);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [webhookId, webhookEnabled, instanceId, sequenceId]);

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

  const handleWebhookEnabledChange = (enabled: boolean) => {
    console.log("Webhook enabled changed to:", enabled);
    setWebhookEnabled(enabled);
    if (enabled && !webhookId && name) {
      const newWebhookId = generateWebhookId(name);
      setWebhookId(newWebhookId);
    }
    notifyChanges(); // Make sure to notify changes when enabling/disabling webhook
  };

  const handleWebhookIdChange = (id: string) => {
    // Replace spaces and special chars in real time
    const sanitizedId = id
      .toLowerCase()
      .replace(/[^\w-]/g, ""); // Only allow alphanumeric and hyphens
      
    setWebhookId(sanitizedId);
    notifyChanges();
    console.log("Webhook ID changed to:", sanitizedId);
  };

  const handleUseGeneratedId = () => {
    setWebhookId(generatedWebhookId);
    notifyChanges();
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
          
          {/* Webhook Configuration Section - Movido para ANTES do toggle de status */}
          <div className="border-t pt-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-enabled">Webhook de Disparo</Label>
              <div className="mt-2">
                <Switch
                  id="webhook-enabled"
                  checked={webhookEnabled}
                  onCheckedChange={handleWebhookEnabledChange}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="ml-2 text-sm">
                  {webhookEnabled ? "Permitir disparo via webhook" : "Desabilitar webhook"}
                </span>
              </div>
            </div>

            {webhookEnabled && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="webhook-id" className="flex items-center justify-between">
                  <span>ID do Webhook</span>
                  {generatedWebhookId !== webhookId && webhookId && (
                    <button 
                      type="button" 
                      onClick={handleUseGeneratedId}
                      className="text-xs text-primary hover:underline"
                    >
                      Usar sugerido: {generatedWebhookId}
                    </button>
                  )}
                </Label>
                <div className="relative">
                  <Input 
                    id="webhook-id" 
                    value={webhookId || ''} 
                    onChange={(e) => handleWebhookIdChange(e.target.value)}
                    placeholder="id-do-webhook"
                    className={!isWebhookIdUnique ? "border-red-500" : ""}
                    disabled={isValidatingWebhookId}
                  />
                  {!isWebhookIdUnique && webhookId && (
                    <p className="text-red-500 text-xs mt-1">
                      Este ID já está em uso por outra sequência neste cliente
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use apenas letras, números e hífens. Esse ID será usado na URL do webhook.
                </p>
              </div>
            )}
          </div>

          {/* Status Toggle - Movido para DEPOIS do webhook */}
          <div className="border-t pt-4 mt-4">
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
