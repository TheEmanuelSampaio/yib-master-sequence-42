
import { useApp } from '@/context/AppContext';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SequenceOverview } from '@/components/dashboard/SequenceOverview';
import { MessagesChart } from '@/components/dashboard/MessagesChart';
import { RecentContacts } from '@/components/dashboard/RecentContacts';
import { TagDistributionChart } from '@/components/dashboard/TagDistributionChart';
import { LayoutDashboard, Users, MessageSquare, CheckCheck, Clock } from 'lucide-react';

export default function Dashboard() {
  const { currentInstance, sequences, contacts, stats } = useApp();
  
  // Calculate key metrics
  const activeSequenceCount = sequences.filter(
    s => s.status === 'active' && s.instance_id === currentInstance?.id
  ).length;
  
  const totalSequenceCount = sequences.filter(
    s => s.instance_id === currentInstance?.id
  ).length;
  
  const contactCount = contacts.length;
  
  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayStats = stats.find(s => s.date === today) || {
    messages_sent: 0,
    messages_scheduled: 0,
    messages_failed: 0,
    new_contacts: 0,
    completed_sequences: 0,
  };
  
  // Calculate message success rate
  const successRate = todayStats.messages_sent > 0 
    ? Math.round((todayStats.messages_sent / (todayStats.messages_sent + todayStats.messages_failed)) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da instância {currentInstance?.name || ''}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Sequências"
          value={totalSequenceCount}
          icon={LayoutDashboard}
          description={`${activeSequenceCount} sequências ativas`}
        />
        <StatsCard
          title="Contatos"
          value={contactCount}
          icon={Users}
          description={`${todayStats.new_contacts} novos hoje`}
          trend={{
            value: 8,
            positive: true
          }}
        />
        <StatsCard
          title="Mensagens Hoje"
          value={todayStats.messages_sent}
          icon={MessageSquare}
          description={`${todayStats.messages_scheduled} agendadas`}
          trend={{
            value: 12,
            positive: true
          }}
        />
        <StatsCard
          title="Taxa de Sucesso"
          value={`${successRate}%`}
          icon={CheckCheck}
          description={`${todayStats.messages_failed} falhas hoje`}
          trend={{
            value: 4,
            positive: successRate >= 95
          }}
        />
      </div>

      <div className="grid gap-4 grid-cols-3">
        <MessagesChart />
      </div>

      <div className="grid gap-4 grid-cols-3">
        <RecentContacts />
        <TagDistributionChart />
      </div>
      
      <SequenceOverview />
    </div>
  );
}
