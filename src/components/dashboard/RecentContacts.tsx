
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function RecentContacts() {
  const { contacts, contactSequences } = useApp();

  // Ensure we're working with arrays
  const contactsArray = Array.isArray(contacts) ? contacts : [];
  const contactSequencesArray = Array.isArray(contactSequences) ? contactSequences : [];

  // Helper function to get contact sequences
  const getContactSequences = (contactId: string) => {
    return contactSequencesArray.filter(seq => seq.contactId === contactId);
  };

  // Get contacts with recent activity
  const contactsWithActivity = contactsArray
    .map(contact => {
      const sequences = getContactSequences(contact.id);
      if (sequences.length === 0) return null;
      
      // Find the most recent activity
      const mostRecentActivity = sequences.reduce((latest, seq) => {
        const dates = [
          seq.startedAt,
          seq.completedAt,
          seq.removedAt
        ].filter(Boolean) as string[];
        
        if (dates.length === 0) return latest;
        
        const mostRecent = dates.sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        )[0];
        
        if (!latest || (mostRecent && new Date(mostRecent) > new Date(latest))) {
          return mostRecent;
        }
        
        return latest;
      }, '');
      
      if (!mostRecentActivity) return null;
      
      return {
        ...contact,
        lastActivity: mostRecentActivity,
        // Count of active sequences
        activeSequences: sequences.filter(s => s.status === 'active').length,
        completedSequences: sequences.filter(s => s.status === 'completed').length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b!.lastActivity).getTime() - new Date(a!.lastActivity).getTime())
    .slice(0, 5);

  return (
    <Card className="col-span-3 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle>Contatos Recentes</CardTitle>
        <CardDescription>
          Últimos contatos com atividade nas sequências
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[260px]">
          <div className="space-y-4">
            {contactsWithActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma atividade recente
              </div>
            ) : (
              contactsWithActivity.map(contact => contact && (
                <div key={contact.id} className="flex items-start justify-between border-b pb-3">
                  <div className="space-y-1">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {contact.tags && contact.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs py-0 font-normal">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags && contact.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs py-0 font-normal">
                          +{contact.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col items-end">
                      <Badge variant="secondary" className="mb-1">
                        {contact.activeSequences} ativas
                      </Badge>
                      <Badge variant="outline" className="bg-green-500/10">
                        {contact.completedSequences} completas
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(contact.lastActivity), { 
                        addSuffix: true,
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
