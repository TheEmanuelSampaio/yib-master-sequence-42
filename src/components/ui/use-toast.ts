
import { useToast as useOriginalToast, toast as originalToast } from "@/hooks/use-toast";

// Estendendo o objeto toast para incluir métodos de conveniência
const toast = {
  ...originalToast,
  success: (message: string) => originalToast({ title: "Sucesso", description: message }),
  error: (message: string) => originalToast({ title: "Erro", description: message, variant: "destructive" }),
  warning: (message: string) => originalToast({ title: "Atenção", description: message, variant: "destructive" }),
  info: (message: string) => originalToast({ title: "Informação", description: message }),
};

// Estendendo o hook useToast
const useToast = () => {
  const original = useOriginalToast();
  return {
    ...original,
    toast: {
      ...original.toast,
      success: (message: string) => original.toast({ title: "Sucesso", description: message }),
      error: (message: string) => original.toast({ title: "Erro", description: message, variant: "destructive" }),
      warning: (message: string) => original.toast({ title: "Atenção", description: message, variant: "destructive" }),
      info: (message: string) => original.toast({ title: "Informação", description: message }),
    }
  };
};

export { useToast, toast };
