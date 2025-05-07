
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from '@/context/AppContext';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DashboardStats() {
  const { stats } = useApp();
  const [chartPeriod, setChartPeriod] = useState<"week" | "month">("week");
  
  // Ensure stats is an array before using reduce
  const statsArray = Array.isArray(stats) ? stats : [];
  
  // Cálculos para estatísticas resumidas
  const totalStats = statsArray.reduce((acc, day) => {
    return {
      messagesSent: acc.messagesSent + day.messagesSent,
      messagesFailed: acc.messagesFailed + day.messagesFailed,
      messagesScheduled: acc.messagesScheduled + day.messagesScheduled,
      completedSequences: acc.completedSequences + day.completedSequences,
      newContacts: acc.newContacts + day.newContacts
    };
  }, {
    messagesSent: 0,
    messagesFailed: 0,
    messagesScheduled: 0,
    completedSequences: 0,
    newContacts: 0
  });
  
  // Filtragem de dados por período
  const currentDate = new Date();
  let filteredStats = [];
  
  if (chartPeriod === "week") {
    // Últimos 7 dias
    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    filteredStats = statsArray.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= oneWeekAgo && dayDate <= currentDate;
    });
  } else {
    // Últimos 30 dias
    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    filteredStats = statsArray.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= oneMonthAgo && dayDate <= currentDate;
    });
  }
  
  // Calcular taxa de sucesso
  const successRate = totalStats.messagesSent > 0 
    ? Math.round((totalStats.messagesSent / (totalStats.messagesSent + totalStats.messagesFailed)) * 100)
    : 0;
  
  // Dados formatados para os gráficos
  const chartData = filteredStats.map(day => ({
    date: new Date(day.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
    messagesSent: day.messagesSent,
    messagesFailed: day.messagesFailed,
    newContacts: day.newContacts
  }));
  
  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Estatísticas de Desempenho</CardTitle>
          <CardDescription>
            Visão geral das métricas principais
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={chartPeriod === "week" ? "default" : "outline"} 
            size="sm"
            onClick={() => setChartPeriod("week")}
          >
            7 dias
          </Button>
          <Button 
            variant={chartPeriod === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartPeriod("month")}
          >
            30 dias
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-sm font-medium text-muted-foreground mb-1">Mensagens Enviadas</div>
            <div className="text-2xl font-bold">{totalStats.messagesSent}</div>
            <div className="text-xs text-muted-foreground mt-1">Taxa de sucesso: {successRate}%</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-sm font-medium text-muted-foreground mb-1">Novos Contatos</div>
            <div className="text-2xl font-bold">{totalStats.newContacts}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-sm font-medium text-muted-foreground mb-1">Sequências Completadas</div>
            <div className="text-2xl font-bold">{totalStats.completedSequences}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-sm font-medium text-muted-foreground mb-1">Falhas</div>
            <div className="text-2xl font-bold">{totalStats.messagesFailed}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalStats.messagesFailed > 0 ? 
                `${(totalStats.messagesFailed / (totalStats.messagesSent + totalStats.messagesFailed) * 100).toFixed(1)}% do total` : 
                'Sem falhas'}
            </div>
          </div>
        </div>
        
        <div className="h-[200px] mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="date" 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Bar dataKey="messagesSent" name="Mensagens Enviadas" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="newContacts" name="Novos Contatos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="messagesFailed" name="Falhas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
