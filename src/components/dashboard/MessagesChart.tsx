
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from '@/context/AppContext';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function MessagesChart() {
  const { dailyStats, currentInstance } = useApp();
  const [timeframe, setTimeframe] = useState("7");
  
  const filteredStats = useMemo(() => {
    if (!currentInstance) return [];
    
    // Filter stats by current instance and limit by timeframe days
    return dailyStats
      .filter(stat => stat.instanceId === currentInstance.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-parseInt(timeframe));
  }, [dailyStats, currentInstance, timeframe]);
  
  if (!filteredStats || filteredStats.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-3">
          <CardTitle>Atividade de Mensagens</CardTitle>
          <CardDescription>Mensagens enviadas nos últimos dias</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sem dados de mensagens disponíveis para esta instância
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle>Atividade de Mensagens</CardTitle>
          <CardDescription>Mensagens enviadas nos últimos dias</CardDescription>
        </div>
        <div>
          <Select defaultValue={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Período"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredStats}>
              <XAxis 
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                stroke="#888888"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="#888888"
                fontSize={12}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                formatter={(value) => [`${value}`, '']}
                labelFormatter={(value) => formatDate(value)}
                contentStyle={{ fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="messagesSent" 
                name="Enviadas"
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="messagesScheduled" 
                name="Agendadas"
                stroke="#6366f1" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              {/* Optional: add line for failed messages */}
              <Line 
                type="monotone" 
                dataKey="messagesFailed" 
                name="Falhas"
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
