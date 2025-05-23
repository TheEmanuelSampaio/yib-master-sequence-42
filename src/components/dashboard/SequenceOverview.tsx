
import { useSequence } from '@/context/SequenceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlaySquare, MinusSquare, PlusSquare, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useApp } from '@/context/AppContext';

export function SequenceOverview() {
  const { sequences, loadingState, loadSequences } = useSequence();
  const { currentInstance } = useApp();
  
  const instanceSequences = sequences.filter(
    s => s.instanceId === currentInstance?.id
  );
  
  const handleRefresh = async () => {
    await loadSequences(currentInstance?.id);
  };
  
  if (loadingState.isLoading) {
    return (
      <div className="flex items-center justify-center h-72">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Sequências Ativas</CardTitle>
          <CardDescription>
            Sequências em andamento nesta instância
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {instanceSequences.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">Nenhuma sequência encontrada para esta instância.</p>
          ) : (
            instanceSequences.map((sequence, i) => (
              <div key={sequence.id} className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  {sequence.status === 'active' ? (
                    <PlaySquare className="w-5 h-5 text-green-500 mr-3" />
                  ) : (
                    <MinusSquare className="w-5 h-5 text-yellow-500 mr-3" />
                  )}
                  <div>
                    <div className="font-medium">{sequence.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sequence.stages.length} estágios
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge
                    variant={sequence.status === 'active' ? 'default' : 'secondary'}
                  >
                    {sequence.status === 'active' ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
