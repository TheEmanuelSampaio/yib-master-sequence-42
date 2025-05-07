import React from "react";
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessagesChart } from "@/components/dashboard/MessagesChart";
import { SequencesDoughnut } from "@/components/dashboard/SequencesDoughnut";
import { StatsCards } from "@/components/dashboard/StatsCards";

export default function Dashboard() {
  const { currentInstance, sequences, contacts, contactSequences, stats } = useApp();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {currentInstance ? `Dashboard para ${currentInstance.name}` : 'Selecione uma instância para visualizar o dashboard'}
        </p>
      </div>
      
      {currentInstance ? (
        <div className="grid gap-6">
          <StatsCards 
            messageStats={{
              sent: stats?.messagesSent || 0,
              scheduled: stats?.messagesScheduled || 0,
              failed: 0
            }}
            contactStats={{
              total: contacts.length,
              active: stats?.activeContacts || 0
            }}
            sequenceStats={{
              total: sequences.length,
              active: stats?.activeSequences || 0
            }}
          />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <MessagesChart />
            <SequencesDoughnut 
              sequences={sequences.filter(seq => seq.instanceId === currentInstance.id)}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p>Selecione uma instância para visualizar o dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
