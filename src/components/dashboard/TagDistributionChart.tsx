
import { useContact } from '@/context/ContactContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export function TagDistributionChart() {
  const { contacts } = useContact();
  
  // Count tags across all contacts
  const tagCounts: Record<string, number> = {};
  
  contacts.forEach(contact => {
    contact.tags.forEach(tag => {
      if (!tagCounts[tag]) {
        tagCounts[tag] = 0;
      }
      tagCounts[tag]++;
    });
  });
  
  // Convert to format needed for chart
  const chartData = Object.entries(tagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 tags
  
  // Add "Other" category if needed
  const totalTaggedContacts = Object.values(tagCounts).reduce((sum, count) => sum + count, 0);
  
  // Colors for the chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#64748b'];
  
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>
          Distribuição das principais tags
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72 flex flex-col justify-center">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Nenhuma tag encontrada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} contatos`, ""]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
