
import { MessageCircle } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

interface EmptyMessageStateProps {
  searchQuery?: string;
}

export const EmptyMessageState = ({ searchQuery }: EmptyMessageStateProps) => {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center space-y-1">
          <MessageCircle className="h-6 w-6 text-muted-foreground" />
          <div className="text-muted-foreground">Nenhuma mensagem encontrada</div>
          {searchQuery && (
            <div className="text-sm text-muted-foreground">
              Tente alterar os filtros ou a busca
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
