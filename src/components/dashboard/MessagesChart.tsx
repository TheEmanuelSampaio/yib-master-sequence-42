
import { useContact } from '@/context/ContactContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MessagesChart() {
  const { stats } = useContact();
  
  // Create chart data with the most recent 7 days
  const recentStats = stats
    .slice(0, 7)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Fill in missing days with empty data
  const today = new Date();
  const chartData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Find stats for this day, or use zeros
    const dayStats = recentStats.find(s => s.date === dateString) || {
      date: dateString,
      messagesSent: 0,
      messagesFailed: 0,
      messagesScheduled: 0
    };
    
    chartData.push({
      date: dateString,
      messagesSent: dayStats.messagesSent || 0,
      messagesFailed: dayStats.messagesFailed || 0,
      messagesScheduled: dayStats.messagesScheduled || 0
    });
  }
  
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Mensagens</CardTitle>
        <CardDescription>
          Estatísticas dos últimos 7 dias
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="sentColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="failedColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="scheduledColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(parseISO(date), 'dd/MM', { locale: ptBR })} 
            />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip 
              formatter={(value, name) => {
                const labels = {
                  messagesSent: 'Enviadas',
                  messagesFailed: 'Falhas',
                  messagesScheduled: 'Agendadas'
                };
                return [value, labels[name as keyof typeof labels]];
              }}
              labelFormatter={(date) => format(parseISO(date as string), 'dd/MM/yyyy', { locale: ptBR })}
            />
            <Area 
              type="monotone" 
              dataKey="messagesSent" 
              name="messagesSent"
              stroke="#10b981" 
              fillOpacity={1}
              fill="url(#sentColor)"
            />
            <Area 
              type="monotone" 
              dataKey="messagesFailed" 
              name="messagesFailed"
              stroke="#ef4444" 
              fillOpacity={1}
              fill="url(#failedColor)" 
            />
            <Area 
              type="monotone" 
              dataKey="messagesScheduled" 
              name="messagesScheduled"
              stroke="#3b82f6" 
              fillOpacity={1}
              fill="url(#scheduledColor)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
