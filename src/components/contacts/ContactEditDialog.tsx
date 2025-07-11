
import { useState } from "react";
import { Contact } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSafeDialogHandler, resetBodyStylesAfterDialog, stopEventPropagation } from "@/utils/dialogHelpers";

interface ContactEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSave: () => Promise<void>;
  isProcessing: boolean;
  editName: string;
  setEditName: (name: string) => void;
  editPhone: string;
  setEditPhone: (phone: string) => void;
}

export const ContactEditDialog = ({
  open,
  onOpenChange,
  contact,
  onSave,
  isProcessing,
  editName,
  setEditName,
  editPhone,
  setEditPhone
}: ContactEditDialogProps) => {
  // Criar handler seguro para o diálogo
  const safeOpenChangeHandler = createSafeDialogHandler(onOpenChange);

  return (
    <Dialog 
      open={open} 
      onOpenChange={safeOpenChangeHandler}
    >
      <DialogContent className="sm:max-w-[425px]" onClick={stopEventPropagation}>
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
          <DialogDescription>
            Edite as informações do contato.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-sm font-medium">
              Nome
            </label>
            <Input
              id="name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="phone" className="text-right text-sm font-medium">
              Telefone
            </label>
            <Input
              id="phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            resetBodyStylesAfterDialog();
            onOpenChange(false);
          }}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isProcessing}>
            {isProcessing ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
