
import { useToast as useOriginalToast, toast as originalToast } from "@/hooks/use-toast";
import { ToasterToast } from "@/components/ui/toast";

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
