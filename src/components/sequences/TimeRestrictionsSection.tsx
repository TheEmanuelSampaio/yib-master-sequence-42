
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Lock } from "lucide-react";
import { TimeRestriction } from "@/types";
import { RestrictionItem } from "./RestrictionItem";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

interface TimeRestrictionsSectionProps {
  localRestrictions: TimeRestriction[];
  globalRestrictions: TimeRestriction[];
  showAddRestrictionDialog: boolean;
  setShowAddRestrictionDialog: (show: boolean) => void;
  showGlobalRestrictionsDialog: boolean;
  setShowGlobalRestrictionsDialog: (show: boolean) => void;
  onRemoveRestriction: (id: string) => void;
  onUpdateRestriction: (restriction: TimeRestriction) => void;
  onAddGlobalRestriction: (restriction: TimeRestriction) => void;
  dayNames: string[];
  availableGlobalRestrictions: TimeRestriction[];
  NewRestrictionDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    newRestriction: Omit<TimeRestriction, "id">;
    setNewRestriction: (restriction: Omit<TimeRestriction, "id">) => void;
    addLocalRestriction: () => void;
    dayNames: string[];
  }>;
  isGlobalRestrictionSelected: (id: string) => boolean;
}

export function TimeRestrictionsSection({
  localRestrictions,
  globalRestrictions,
  showAddRestrictionDialog,
  setShowAddRestrictionDialog,
  showGlobalRestrictionsDialog,
  setShowGlobalRestrictionsDialog,
  onRemoveRestriction,
  onUpdateRestriction,
  onAddGlobalRestriction,
  dayNames,
  availableGlobalRestrictions,
  NewRestrictionDialog,
  isGlobalRestrictionSelected
}: TimeRestrictionsSectionProps) {
  return (
    <div className="space-y-8">
      {/* Restrições Locais */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Restrições de Horário</CardTitle>
            <CardDescription>
              Define quando as mensagens não serão enviadas
            </CardDescription>
          </div>
          <Dialog open={showAddRestrictionDialog} onOpenChange={setShowAddRestrictionDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Restrição
              </Button>
            </DialogTrigger>
            {/* Moved NewRestrictionDialog here inside the Dialog component */}
            {showAddRestrictionDialog && (
              <NewRestrictionDialog 
                open={showAddRestrictionDialog}
                onOpenChange={setShowAddRestrictionDialog}
                newRestriction={{
                  name: "Nova restrição",
                  active: true,
                  days: [1, 2, 3, 4, 5],
                  startHour: 22,
                  startMinute: 0,
                  endHour: 8,
                  endMinute: 0,
                  isGlobal: false,
                }}
                setNewRestriction={() => {}}
                addLocalRestriction={() => {}}
                dayNames={dayNames}
              />
            )}
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Restrições locais e globais selecionadas */}
            {[...localRestrictions, ...globalRestrictions].length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                Nenhuma restrição configurada
              </div>
            ) : (
              <div className="space-y-2">
                {localRestrictions.map(restriction => (
                  <RestrictionItem
                    key={restriction.id}
                    restriction={restriction}
                    onRemove={onRemoveRestriction}
                    onUpdate={onUpdateRestriction}
                    editable={true}
                    dayNames={dayNames}
                  />
                ))}
                {globalRestrictions.map(restriction => (
                  <RestrictionItem
                    key={restriction.id}
                    restriction={restriction}
                    onRemove={onRemoveRestriction}
                    onUpdate={() => {}} // Não é possível atualizar restrições globais
                    editable={false}
                    dayNames={dayNames}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Restrições Globais */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Lock className="h-4 w-4 mr-2 text-blue-500" />
            <CardTitle>Restrições Globais</CardTitle>
          </div>
          <CardDescription>
            Restrições de horário disponíveis para todas as sequências
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableGlobalRestrictions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                Não há restrições globais disponíveis
              </div>
            ) : (
              availableGlobalRestrictions.map(restriction => (
                <RestrictionItem
                  key={restriction.id}
                  restriction={restriction}
                  onRemove={() => {}}
                  onUpdate={() => {}}
                  onSelect={() => onAddGlobalRestriction(restriction)}
                  selected={isGlobalRestrictionSelected(restriction.id)}
                  editable={false}
                  dayNames={dayNames}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
