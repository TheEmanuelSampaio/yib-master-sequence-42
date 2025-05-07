
import { StatsCard } from './StatsCard';
import { useApp } from '@/context/AppContext';
import { CircleCheck, MessageSquare, Users, Zap } from 'lucide-react';

export function DashboardStats() {
  const { currentInstance, sequences, contacts, dailyStats } = useApp();

  // Calculate statistics based on current instance
  const activeSequences = sequences.filter(s => 
    s.instanceId === currentInstance?.id && s.status === 'active'
  ).length;

  const totalContacts = contacts.length;
  
  // Get today's stats for the current instance
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const todayStats = dailyStats.find(
    stat => stat.date === today && stat.instanceId === currentInstance?.id
  );

  const messagesSent = todayStats?.messagesSent || 0;
  const completedSequences = todayStats?.completedSequences || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard 
        title="Sequências Ativas" 
        value={activeSequences.toString()} 
        icon={Zap}
      />
      <StatsCard 
        title="Contatos Totais" 
        value={totalContacts.toString()} 
        icon={Users}
      />
      <StatsCard 
        title="Mensagens Enviadas Hoje" 
        value={messagesSent.toString()} 
        icon={MessageSquare}
      />
      <StatsCard 
        title="Sequências Completadas" 
        value={completedSequences.toString()} 
        icon={CircleCheck}
      />
    </div>
  );
}
