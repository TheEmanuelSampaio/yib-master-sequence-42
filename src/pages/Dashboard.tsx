
import { useApp } from '@/context/AppContext';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SequenceOverview } from '@/components/dashboard/SequenceOverview';
import { MessagesChart } from '@/components/dashboard/MessagesChart';
import { RecentContacts } from '@/components/dashboard/RecentContacts';
import { TagDistributionChart } from '@/components/dashboard/TagDistributionChart';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { LayoutDashboard, Users, MessageSquare, CheckCheck } from 'lucide-react';

export default function Dashboard() {
  const { currentInstance, sequences, contacts, stats } = useApp();
  
  // Calculate key metrics
  const activeSequenceCount = sequences.filter(
    s => s.status === 'active' && s.instanceId === currentInstance?.id
  ).length;
  
  const totalSequenceCount = sequences.filter(
    s => s.instanceId === currentInstance?.id
  ).length;
  
  const contactCount = contacts.length;
  
  // Ensure stats is an array before using find
  const statsArray = Array.isArray(stats) ? stats : [];
  
  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayStats = statsArray.find(s => s.date === today) || {
    messagesSent: 0,
    messagesScheduled: 0,
    messagesFailed: 0,
    newContacts: 0,
    completedSequences: 0,
  };
  
  // Calculate message success rate
  const successRate = todayStats.messagesSent > 0 
    ? Math.round((todayStats.messagesSent / (todayStats.messagesSent + todayStats.messagesFailed)) * 100) 
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
          description={`${todayStats.newContacts} novos hoje`}
          trend={{
            value: 8,
            positive: true
          }}
        />
        <StatsCard
          title="Mensagens Hoje"
          value={todayStats.messagesSent}
          icon={MessageSquare}
          description={`${todayStats.messagesScheduled} agendadas`}
          trend={{
            value: 12,
            positive: true
          }}
        />
        <StatsCard
          title="Taxa de Sucesso"
          value={`${successRate}%`}
          icon={CheckCheck}
          description={`${todayStats.messagesFailed} falhas hoje`}
          trend={{
            value: 4,
            positive: successRate >= 95
          }}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        <DashboardStats />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <MessagesChart />
        <RecentContacts />
        <TagDistributionChart />
      </div>
      
      <SequenceOverview />
    </div>
  );
}
