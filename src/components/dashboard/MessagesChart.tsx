
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function MessagesChart() {
  const { stats } = useApp();

  // Process chart data with memoization to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    console.log("[MessagesChart] Processing chart data");
    
    // Ensure stats is an array before sorting
    if (!Array.isArray(stats) || stats.length === 0) {
      return [];
    }
    
    // Sort stats by date
    const sortedStats = [...stats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Format data for chart - limit to last 14 days if we have more data
    // to improve performance and readability
    const limitedStats = sortedStats.length > 14 
      ? sortedStats.slice(sortedStats.length - 14) 
      : sortedStats;
    
    return limitedStats.map(stat => {
      // Format date (DD/MM)
      const dateObj = new Date(stat.date);
      const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      
      return {
        date: formattedDate,
        agendadas: stat.messagesScheduled || 0,
        enviadas: stat.messagesSent || 0,
        falhas: stat.messagesFailed || 0,
      };
    });
  }, [stats]);

  // If we have no data, show placeholder
  if (chartData.length === 0) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Mensagens ao Longo do Tempo</CardTitle>
          <CardDescription>
            Volume diário de mensagens agendadas, enviadas e com falhas
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Mensagens ao Longo do Tempo</CardTitle>
        <CardDescription>
          Volume diário de mensagens agendadas, enviadas e com falhas
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: -10,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }} 
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 12,
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="agendadas"
                name="Agendadas"
                stroke="#2563eb"
                fill="#2563eb40"
                activeDot={{ r: 8 }}
              />
              <Area
                type="monotone"
                dataKey="enviadas"
                name="Enviadas"
                stroke="#10b981"
                fill="#10b98140"
              />
              <Area
                type="monotone"
                dataKey="falhas"
                name="Falhas"
                stroke="#ef4444"
                fill="#ef444440"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
