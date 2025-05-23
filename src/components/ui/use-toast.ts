
import * as React from "react";
import { useToast as useOriginalToast, toast as originalToast } from "@/hooks/use-toast";
import type { ToastProps } from "@/components/ui/toast";

// Define ToasterToast type since it's not exported from the toast component
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
};

// Create callable methods with proper return type
const successToast = (message: string) => originalToast({ title: "Sucesso", description: message });
const errorToast = (message: string) => originalToast({ title: "Erro", description: message, variant: "destructive" });
const warningToast = (message: string) => originalToast({ title: "Atenção", description: message, variant: "destructive" });
const infoToast = (message: string) => originalToast({ title: "Informação", description: message });

// Create a new toast object that's both callable and has methods
const toast = Object.assign(
  (props: ToastProps) => originalToast(props),
  {
    success: successToast,
    error: errorToast,
    warning: warningToast,
    info: infoToast,
  }
);

// Extend the useToast hook
const useToast = () => {
  const original = useOriginalToast();
  
  return {
    ...original,
    toast: Object.assign(
      (props: ToastProps) => original.toast(props),
      {
        success: successToast,
        error: errorToast,
        warning: warningToast,
        info: infoToast,
      }
    )
  };
};

export { useToast, toast };
