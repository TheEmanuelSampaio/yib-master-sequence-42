
import { 
  Hourglass, Clock, CheckCircle, XCircle, AlertCircle, XOctagon 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type MessageStatus = 'waiting' | 'pending' | 'processing' | 'sent' | 'failed' | 'persistent_error' | 'removed' | 'stopped';

interface StatusBadgeProps {
  status: MessageStatus | string;
}

export const MessageStatusBadge = ({ status }: StatusBadgeProps) => {
  switch (status) {
    case 'waiting':
      return (
        <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
          <Hourglass className="h-3 w-3 mr-1" />
          Aguardando
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Processando
        </Badge>
      );
    case 'sent':
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Enviada
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="bg-neutral-500/20 text-neutral-700 dark:text-neutral-400 border-neutral-500/30">
          <Hourglass className="h-3 w-3 mr-1" />
          Falhou
        </Badge>
      );
    case 'persistent_error':
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
          <XOctagon className="h-3 w-3 mr-1" />
          Erro Persistente
        </Badge>
      );
    case 'removed':
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Removida
        </Badge>
      );
    case 'stopped':
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Parou
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
