
import React, { memo } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageStatusBadge } from "./MessageStatusBadge";
import { MessageStageTypeIndicator } from "./MessageStageTypeIndicator";
import { Badge } from "@/components/ui/badge";

interface MessageTableRowProps {
  message: any;
  onViewMessage: (message: any) => void;
}

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const MessageTableRow = memo(({ message, onViewMessage }: MessageTableRowProps) => {
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{message.contactName}</div>
          <div className="text-xs text-muted-foreground">{message.contactPhone}</div>
        </div>
      </TableCell>
      <TableCell>{message.sequenceName}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-1">
          <MessageStageTypeIndicator stageType={message.stageType} />
          <span>{message.stageName}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>
            {formatDistanceToNow(new Date(message.scheduledTime), {
              addSuffix: true,
              locale: ptBR
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(message.scheduledTime)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <MessageStatusBadge status={message.status} />
          {message.attempts > 0 && (
            <span className="text-xs text-muted-foreground">
              {message.attempts} tentativa{message.attempts > 1 && 's'}
            </span>
          )}
        </div>
        {message.variables && Object.keys(message.variables).length > 0 && (
          <span className="text-xs text-muted-foreground mt-1 inline-flex items-center">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 h-4 mr-1">
              var
            </Badge>
            {Object.keys(message.variables).length} variável(is)
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewMessage(message)}
        >
          Ver Conteúdo
        </Button>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.message.id === nextProps.message.id && 
         prevProps.message.status === nextProps.message.status &&
         prevProps.message.attempts === nextProps.message.attempts;
});

MessageTableRow.displayName = 'MessageTableRow';

export default MessageTableRow;
