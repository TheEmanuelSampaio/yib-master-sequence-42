
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { MessagesChart } from "@/components/dashboard/MessagesChart";
import { SequenceOverview } from "@/components/dashboard/SequenceOverview";
import { Alert as AlertIcon } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Dashboard() {
  const { currentInstance, dailyStats } = useApp();
  
  if (!currentInstance) {
    return (
      <Alert className="mb-6">
        <AlertIcon className="h-4 w-4" />
        <AlertDescription>
          Selecione uma instância para ver o dashboard
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas sequências e métricas
        </p>
      </div>

      <div className="space-y-6">
        <DashboardStats />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MessagesChart />
          <SequenceOverview />
        </div>
      </div>
    </div>
  );
}
