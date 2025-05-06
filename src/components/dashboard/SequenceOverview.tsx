
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { Check, Clock, Activity, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import { TagConditionGroup } from '@/types';

export function SequenceOverview() {
  const { sequences, currentInstance, refreshData, isDataInitialized } = useApp();

  // Recarregar dados apenas se necessário quando a instância mudar
  useEffect(() => {
    if (currentInstance && !isDataInitialized) {
      refreshData();
    }
  }, [currentInstance, refreshData, isDataInitialized]);

  // Filter sequences for current instance
  const instanceSequences = currentInstance && sequences ? 
    sequences.filter(seq => seq.instanceId === currentInstance.id) : 
    [];

  const activeSequences = instanceSequences.filter(seq => seq.status === 'active');
  
  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Visão Geral das Sequências</CardTitle>
            <CardDescription className="mt-1">
              {activeSequences.length} sequências ativas de {instanceSequences.length} total
            </CardDescription>
          </div>
          <div className="space-x-2">
            <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
              <Check className="w-3 h-3 mr-1" /> Ativas: {activeSequences.length}
            </Badge>
            <Badge variant="outline" className="bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30">
              <Ban className="w-3 h-3 mr-1" /> Inativas: {instanceSequences.length - activeSequences.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {instanceSequences.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2" />
                <p>Nenhuma sequência configurada para esta instância</p>
              </div>
            ) : (
              instanceSequences.map(sequence => (
                <div 
                  key={sequence.id}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full mr-2",
                          sequence.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                        )}
                      />
                      <h3 className="font-medium">{sequence.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        sequence.type === "message" ? "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30" :
                        sequence.type === "pattern" ? "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30" :
                        "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
                      )}>
                        {sequence.type.charAt(0).toUpperCase() + sequence.type.slice(1)}
                      </Badge>
                      <Badge variant={sequence.status === 'active' ? 'default' : 'outline'}>
                        {sequence.status === 'active' ? (
                          <Activity className="h-3 w-3 mr-1" />
                        ) : (
                          <Ban className="h-3 w-3 mr-1" />
                        )}
                        {sequence.status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Condições de Início</p>
                      <div className="space-y-1 mt-1">
                        {sequence.startCondition.groups.map((group: TagConditionGroup, groupIndex) => (
                          <div key={groupIndex} className="flex flex-wrap gap-1">
                            {group.tags.map((tag, tagIndex) => (
                              <Badge key={tag + tagIndex} variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                                {tag}
                                {tagIndex < group.tags.length - 1 && <span className="ml-1 text-xs">&</span>}
                              </Badge>
                            ))}
                            {groupIndex < sequence.startCondition.groups.length - 1 && (
                              <span className="text-xs self-center font-medium">OU</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Condições de Parada</p>
                      <div className="space-y-1 mt-1">
                        {sequence.stopCondition.groups.map((group: TagConditionGroup, groupIndex) => (
                          <div key={groupIndex} className="flex flex-wrap gap-1">
                            {group.tags.map((tag, tagIndex) => (
                              <Badge key={tag + tagIndex} variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                                {tag}
                                {tagIndex < group.tags.length - 1 && <span className="ml-1 text-xs">&</span>}
                              </Badge>
                            ))}
                            {groupIndex < sequence.stopCondition.groups.length - 1 && (
                              <span className="text-xs self-center font-medium">OU</span>
                            )}
                          </div>
                        ))}
                        {sequence.stopCondition.groups.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">Nenhuma</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Estágios ({sequence.stages.length})</p>
                    <div className="flex items-center mt-1 space-x-1">
                      {sequence.stages.map((stage, index) => (
                        <div 
                          key={stage.id}
                          className={cn(
                            "flex items-center",
                            index !== sequence.stages.length - 1 && "flex-1"
                          )}
                        >
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              sequence.type === 'message' ? 'bg-blue-500' : 
                              sequence.type === 'pattern' ? 'bg-purple-500' : 'bg-orange-500'
                            )}
                          />
                          {index !== sequence.stages.length - 1 && (
                            <div className="h-0.5 w-full bg-border" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>Estágio 1</span>
                      {sequence.stages.length > 1 && (
                        <span>Estágio {sequence.stages.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
