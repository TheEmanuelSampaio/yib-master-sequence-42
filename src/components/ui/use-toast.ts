
import * as React from "react";
import { useToast as useOriginalToast, toast as originalToast } from "@/hooks/use-toast";
import type { ToastProps } from "@/components/ui/toast";

// Define o tipo ToasterToast (já que não está sendo exportado do componente toast)
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
};

// Create proper callable methods
const successToast = (message: string) => originalToast({ title: "Sucesso", description: message });
const errorToast = (message: string) => originalToast({ title: "Erro", description: message, variant: "destructive" });
const warningToast = (message: string) => originalToast({ title: "Atenção", description: message, variant: "destructive" });
const infoToast = (message: string) => originalToast({ title: "Informação", description: message });

// Extended toast with convenience methods
const toast = {
  ...originalToast,
  success: successToast,
  error: errorToast,
  warning: warningToast,
  info: infoToast,
};

// Estendendo o hook useToast
const useToast = () => {
  const original = useOriginalToast();
  
  return {
    ...original,
    toast: {
      ...original.toast,
      success: successToast,
      error: errorToast,
      warning: warningToast,
      info: infoToast,
    }
  };
};

export { useToast, toast };
