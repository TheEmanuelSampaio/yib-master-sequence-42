
import { Badge } from "@/components/ui/badge";
import { MessageCircle, FileCode, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStageTypeIndicatorProps {
  stageType: string;
  showLabel?: boolean;
}

export const MessageStageTypeIndicator = ({ stageType, showLabel = false }: MessageStageTypeIndicatorProps) => {
  const getStageTypeIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4" />;
      case "pattern":
        return <FileCode className="h-4 w-4" />;
      case "typebot":
        return <Bot className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };
  
  return (
    <Badge variant="outline" className={cn(
      "flex items-center px-1.5 text-xs",
      stageType === "message" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
      stageType === "pattern" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
      stageType === "typebot" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
    )}>
      {getStageTypeIcon(stageType)}
      {showLabel && <span className="ml-1 capitalize">{stageType}</span>}
    </Badge>
  );
};
