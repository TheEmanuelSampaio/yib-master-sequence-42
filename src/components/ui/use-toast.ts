
import { useToast, toast } from "@/hooks/use-toast";

// Create proper TypeScript interface for the toast object with success and error methods
interface ToastWithExtras {
  (props: any): {
    id: string;
    dismiss: () => void;
    update: (props: any) => void;
  };
  success: (message: string) => void;
  error: (message: string) => void;
}

// Cast toast as the extended interface to make TypeScript happy
const toastWithExtras = toast as unknown as ToastWithExtras;

export { useToast, toastWithExtras as toast };
