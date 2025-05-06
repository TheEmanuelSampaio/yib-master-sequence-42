
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';

export function UsersTab() {
  const { users, addUser, updateUser, deleteUser } = useApp();

  // Stub implementation for now
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Usuários</CardTitle>
        <CardDescription>
          Adicione, edite ou remova usuários do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Usuário
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.accountName[0]}</AvatarFallback>
                  </Avatar>
                  {user.accountName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'super_admin' ? 'default' : 'outline'}>
                    {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
