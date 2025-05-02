
import { ContactSequence, Sequence } from '@/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContactStageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContactSequence: ContactSequence | null;
  selectedStageId: string;
  setSelectedStageId: (stageId: string) => void;
  onSave: () => Promise<void>;
  isProcessing: boolean;
  sequences: Sequence[];
}

export const ContactStageChangeDialog = ({
  open,
  onOpenChange,
  selectedContactSequence,
  selectedStageId,
  setSelectedStageId,
  onSave,
  isProcessing,
  sequences
}: ContactStageChangeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Garante que document.body não fique com classes indesejadas
      if (!newOpen) {
        document.body.style.pointerEvents = '';
        document.body.removeAttribute('data-scroll-locked');
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Alterar Estágio</DialogTitle>
          <DialogDescription>
            Selecione o novo estágio para este contato na sequência.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {selectedContactSequence && (
            <Select
              value={selectedStageId}
              onValueChange={setSelectedStageId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um estágio" />
              </SelectTrigger>
              <SelectContent onClick={(e) => e.stopPropagation()}>
                <SelectGroup>
                  {sequences
                    .find(s => s.id === selectedContactSequence.sequenceId)
                    ?.stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isProcessing || !selectedStageId}>
            {isProcessing ? "Salvando..." : "Atualizar estágio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
