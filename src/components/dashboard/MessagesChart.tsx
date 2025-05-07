
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '@/context/AppContext';

export function MessagesChart() {
  // Como não temos as stats definidas no AppContext, vamos usar dados de exemplo
  const data = [
    { name: 'Seg', enviadas: 40, agendadas: 24, falhas: 2 },
    { name: 'Ter', enviadas: 30, agendadas: 13, falhas: 1 },
    { name: 'Qua', enviadas: 20, agendadas: 8, falhas: 0 },
    { name: 'Qui', enviadas: 27, agendadas: 15, falhas: 0 },
    { name: 'Sex', enviadas: 18, agendadas: 5, falhas: 1 },
    { name: 'Sáb', enviadas: 23, agendadas: 12, falhas: 0 },
    { name: 'Dom', enviadas: 34, agendadas: 19, falhas: 3 },
  ];

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Mensagens (últimos 7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="enviadas" fill="#10B981" name="Enviadas" />
            <Bar dataKey="agendadas" fill="#3B82F6" name="Agendadas" />
            <Bar dataKey="falhas" fill="#EF4444" name="Falhas" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
