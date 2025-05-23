
import { useContact } from '@/context/ContactContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function RecentContacts() {
  const { contacts, contactSequences } = useContact();
  
  // Get the 5 most recent contacts
  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Contatos Recentes</CardTitle>
        <CardDescription>
          Os 5 contatos mais recentemente adicionados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {contacts.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">Nenhum contato encontrado.</p>
          ) : (
            recentContacts.map((contact) => {
              // Get active sequences for this contact
              const activeSeqs = contactSequences.filter(
                seq => seq.contactId === contact.id && seq.status === 'active'
              );
              
              return (
                <div key={contact.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {contact.phoneNumber}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {activeSeqs.length > 0 && (
                      <Badge variant="outline" className="mb-1">
                        {activeSeqs.length} seq. {activeSeqs.length === 1 ? 'ativa' : 'ativas'}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(contact.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
