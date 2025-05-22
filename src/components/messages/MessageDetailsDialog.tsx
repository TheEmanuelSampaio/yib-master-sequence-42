
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, FileCode, Bot } from "lucide-react";
import { MessageStatusBadge } from "./MessageStatusBadge";
import { MessageStageTypeIndicator } from "./MessageStageTypeIndicator";
import { Badge } from "@/components/ui/badge";

interface MessageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMessage: any | null;
}

export const MessageDetailsDialog = ({ open, onOpenChange, selectedMessage }: MessageDetailsDialogProps) => {
  if (!selectedMessage) return null;
  
  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {selectedMessage.stageType === "message" && <MessageCircle className="h-5 w-5 mr-2" />}
            {selectedMessage.stageType === "pattern" && <FileCode className="h-5 w-5 mr-2" />}
            {selectedMessage.stageType === "typebot" && <Bot className="h-5 w-5 mr-2" />}
            {selectedMessage.stageName}
          </DialogTitle>
          <DialogDescription>
            {selectedMessage.sequenceName} para {selectedMessage.contactName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Status</h4>
              <MessageStatusBadge status={selectedMessage.status || ""} />
              {selectedMessage.attempts > 0 && (
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">
                    {selectedMessage.attempts} tentativa{selectedMessage.attempts > 1 && 's'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Agendada para</h4>
              <div className="text-sm">
                {selectedMessage.scheduledTime ? formatDate(selectedMessage.scheduledTime) : ""}
              </div>
              {selectedMessage.sentAt && (
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">
                    Enviada em: {formatDate(selectedMessage.sentAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-1">Tipo de Conteúdo</h4>
            <MessageStageTypeIndicator stageType={selectedMessage.stageType || "message"} showLabel={true} />
          </div>
          
          {/* Seção de Variáveis */}
          {selectedMessage.variables && Object.keys(selectedMessage.variables || {}).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Variáveis</h4>
              <div className="bg-muted/50 p-3 rounded-md border text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedMessage.variables || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                      <Badge className="mr-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100">
                        {key}
                      </Badge>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium mb-1">Conteúdo Original</h4>
            <div className="bg-muted/50 p-3 rounded-md border text-sm overflow-x-auto">
              {selectedMessage.stageType === "typebot" ? (
                <div className="flex items-center">
                  <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={selectedMessage.content} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {selectedMessage.content}
                  </a>
                </div>
              ) : (
                <div className="whitespace-pre-line">
                  {selectedMessage.content}
                </div>
              )}
            </div>
          </div>
          
          {/* Conteúdo Processado */}
          {selectedMessage.processedContent && (
            <div>
              <h4 className="text-sm font-medium mb-1">Conteúdo Processado</h4>
              <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-md border border-green-200 dark:border-green-700 text-sm overflow-x-auto">
                <div className="whitespace-pre-line">
                  {selectedMessage.processedContent}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
