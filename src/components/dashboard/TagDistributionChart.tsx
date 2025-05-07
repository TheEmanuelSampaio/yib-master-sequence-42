
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export function TagDistributionChart() {
  const { contacts } = useApp();
  
  // Count tag occurrences
  const tagCounts: Record<string, number> = {};
  
  contacts.forEach(contact => {
    contact.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Convert to chart data format and sort by count
  const chartData = Object.entries(tagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Only show top 8 tags

  // Chart colors
  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308'];

  return (
    <Card className="col-span-3 lg:col-span-1">
      <CardHeader className="pb-0">
        <CardTitle>Distribuição de Tags</CardTitle>
        <CardDescription>
          Tags mais populares entre os contatos
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[240px] flex justify-center">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={40}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} contatos`, '']}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 12,
                  }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: 12, paddingTop: 20 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Sem dados de tags</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
