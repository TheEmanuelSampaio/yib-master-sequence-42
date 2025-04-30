
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
import { useMemo } from 'react';

export function MessagesChart() {
  const { stats } = useApp();

  // Format data for chart
  const chartData = useMemo(() => {
    if (!stats || stats.length === 0) {
      return [];
    }
    
    // Sort stats by date
    const sortedStats = [...stats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return sortedStats.map(stat => {
      // Format date (DD/MM)
      const dateObj = new Date(stat.date);
      const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      
      return {
        date: formattedDate,
        agendadas: stat.messagesScheduled,
        enviadas: stat.messagesSent,
        falhas: stat.messagesFailed,
      };
    });
  }, [stats]);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Mensagens ao Longo do Tempo</CardTitle>
        <CardDescription>
          Volume diário de mensagens agendadas, enviadas e com falhas
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px]">
          {chartData.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Sem dados de mensagens</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
