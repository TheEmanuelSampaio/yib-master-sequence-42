import { useState, useMemo } from "react";
import { useApp } from '@/context/AppContext';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Search, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Contacts() {
  const { 
    contacts, 
    currentInstance, 
    deleteContact, 
    updateContact, 
    removeFromSequence, 
    updateContactSequence 
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    if (!contacts || !currentInstance) return [];
    
    // Filter contacts by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return contacts.filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        contact.phoneNumber.toLowerCase().includes(query) ||
        contact.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return contacts;
  }, [contacts, currentInstance, searchQuery]);

  if (!currentInstance) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Selecione uma instância para visualizar os contatos
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
        <p className="text-muted-foreground">
          Gerenciamento de contatos e suas sequências ativas
        </p>
      </div>
      
      <div className="flex justify-between items-center gap-4 flex-col sm:flex-row">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar contato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Contato
        </Button>
      </div>
      
      {/* Contacts list implementation */}
      <div className="text-center">
        <p>Total de {filteredContacts.length} contatos</p>
        {/* Implement contact cards or table here */}
      </div>
    </div>
  );
}
