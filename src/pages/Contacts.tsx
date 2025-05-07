
import { useState, useMemo } from "react";
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Search, User, Building, Shield, X, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Contact, ContactSequence } from '@/types';
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

// Componentes refatorados
import { ContactTable } from "@/components/contacts/ContactTable";
import { ContactEditDialog } from "@/components/contacts/ContactEditDialog";
import { ContactStageChangeDialog } from "@/components/contacts/ContactStageChangeDialog";
import { ContactSequencesDialog } from "@/components/contacts/ContactSequencesDialog";

export default function Contacts() {
  const { user } = useAuth();
  const { contacts, clients, sequences, contactSequences, deleteContact, updateContact, removeFromSequence, updateContactSequence, refreshData } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showSequences, setShowSequences] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [selectedContactSequence, setSelectedContactSequence] = useState<ContactSequence | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [showStageChangeDialog, setShowStageChangeDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Check if user is super_admin
  const isUserSuperAdmin = user?.role === 'super_admin';
  
  // Get unique client names for filter
  const uniqueClients = useMemo(() => {
    const clientNames = contacts.map(contact => contact.clientName || '').filter(Boolean);
    return [...new Set(clientNames)].sort();
  }, [contacts]);
  
  // Get unique admin names for filter (only for super_admin)
  const uniqueAdmins = useMemo(() => {
    const adminNames = contacts.map(contact => contact.creatorAccountName || '').filter(Boolean);
    return [...new Set(adminNames)].sort();
  }, [contacts]);
  
  // Helper function to get contact sequences
  const getContactSequences = (contactId: string) => {
    return contactSequences.filter(seq => seq.contactId === contactId);
  };
  
  // Filter contacts based on search, client and admin filters
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Text search filter
      const matchesSearch = 
        searchQuery === '' || 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phoneNumber.includes(searchQuery) ||
        contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Client filter
      const matchesClient = 
        selectedClient === '' || 
        contact.clientName === selectedClient;
      
      // Admin filter (only for super_admin)
      const matchesAdmin = 
        !isUserSuperAdmin || // If not super_admin, this filter is not applied
        selectedAdmin === '' || 
        contact.creatorAccountName === selectedAdmin;
      
      return matchesSearch && matchesClient && matchesAdmin;
    });
  }, [contacts, searchQuery, selectedClient, selectedAdmin, isUserSuperAdmin]);
  
  // Active contacts have at least one active sequence
  const activeContacts = filteredContacts.filter(contact => {
    const sequences = getContactSequences(contact.id);
    return sequences.some(seq => seq.status === 'active');
  });
  
  // Function to get contact's sequence data
  const getContactSequenceDetails = (contactId: string) => {
    const sequences = getContactSequences(contactId);
    return {
      active: sequences.filter(seq => seq.status === 'active').length,
      completed: sequences.filter(seq => seq.status === 'completed').length,
      removed: sequences.filter(seq => seq.status === 'removed').length,
      total: sequences.length
    };
  };
  
  // Reset filters
  const handleClearFilters = () => {
    setSelectedClient('');
    setSelectedAdmin('');
  };
  
  // View contact sequences
  const handleViewSequences = (contact: Contact) => {
    setSelectedContact(contact);
    setShowSequences(true);
  };
  
  // Preparar edição do contato
  const handlePrepareEdit = (contact: Contact) => {
    setContactToEdit(contact);
    setEditName(contact.name);
    setEditPhone(contact.phoneNumber);
    setShowEditDialog(true);
  };
  
  // Salvar edição do contato
  const handleSaveEdit = async () => {
    if (!contactToEdit) return;
    
    setIsProcessing(true);
    
    const result = await updateContact(contactToEdit.id, {
      name: editName,
      phoneNumber: editPhone
    });
    
    if (result.success) {
      toast.success("Contato atualizado com sucesso");
      refreshData();
      setShowEditDialog(false);
    } else {
      toast.error(result.error || "Erro ao atualizar contato");
    }
    
    setIsProcessing(false);
  };
  
  // Excluir contato
  const handleDeleteContact = async (contactId: string) => {
    setIsProcessing(true);
    
    const result = await deleteContact(contactId);
    
    if (result.success) {
      toast.success("Contato excluído com sucesso");
      refreshData();
    } else {
      toast.error(result.error || "Erro ao excluir contato");
    }
    
    setIsProcessing(false);
  };
  
  // Remover contato de uma sequência
  const handleRemoveFromSequence = async (contactSequenceId: string) => {
    setIsProcessing(true);
    
    const result = await removeFromSequence(contactSequenceId);
    
    if (result.success) {
      toast.success("Contato removido da sequência com sucesso");
      refreshData();
      setShowSequences(false); // Fechar o modal
    } else {
      toast.error(result.error || "Erro ao remover contato da sequência");
    }
    
    setIsProcessing(false);
  };
  
  // Preparar mudança de estágio
  const handlePrepareStageChange = (contactSequence: ContactSequence) => {
    setSelectedContactSequence(contactSequence);
    setSelectedStageId(contactSequence.currentStageId || '');
    setShowStageChangeDialog(true);
  };
  
  // Salvar mudança de estágio
  const handleSaveStageChange = async () => {
    if (!selectedContactSequence || !selectedStageId) return;
    
    setIsProcessing(true);
    
    const result = await updateContactSequence(selectedContactSequence.id, {
      currentStageId: selectedStageId
    });
    
    if (result.success) {
      toast.success("Estágio atualizado com sucesso e mensagens reagendadas");
      refreshData();
      setShowStageChangeDialog(false);
    } else {
      toast.error(result.error || "Erro ao atualizar estágio");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie seus contatos e suas sequências
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center w-full max-w-sm space-x-2">
          <Input
            placeholder="Buscar contatos ou tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <Button variant="ghost" className="h-9 px-2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {(selectedClient || selectedAdmin) && (
                  <Badge variant="secondary" className="ml-2 px-1 rounded-full">
                    {(selectedClient ? 1 : 0) + (selectedAdmin ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Filtrar contatos</h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Cliente
                  </label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {uniqueClients.map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {isUserSuperAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Admin
                    </label>
                    <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar admin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {uniqueAdmins.map(admin => (
                          <SelectItem key={admin} value={admin}>{admin}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {(selectedClient || selectedAdmin) && (
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={handleClearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {(selectedClient || selectedAdmin) && (
        <div className="flex flex-wrap gap-2">
          {selectedClient && (
            <Badge variant="secondary" className="px-2 py-1">
              <Building className="h-3 w-3 mr-1" />
              Cliente: {selectedClient}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 p-0 ml-1" 
                onClick={() => setSelectedClient('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {selectedAdmin && (
            <Badge variant="secondary" className="px-2 py-1">
              <Shield className="h-3 w-3 mr-1" />
              Admin: {selectedAdmin}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 p-0 ml-1" 
                onClick={() => setSelectedAdmin('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({filteredContacts.length})</TabsTrigger>
          <TabsTrigger value="active">Em Sequências ({activeContacts.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Contatos</CardTitle>
              <CardDescription>
                Lista de todos os contatos com suas tags e sequências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactTable
                contacts={filteredContacts}
                getContactSequenceDetails={getContactSequenceDetails}
                onViewSequences={handleViewSequences}
                onPrepareEdit={handlePrepareEdit}
                onDeleteContact={handleDeleteContact}
                isProcessing={isProcessing}
                isUserSuperAdmin={isUserSuperAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Contatos em Sequências Ativas</CardTitle>
              <CardDescription>
                Contatos que estão atualmente em pelo menos uma sequência ativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactTable
                contacts={activeContacts}
                getContactSequenceDetails={getContactSequenceDetails}
                onViewSequences={handleViewSequences}
                onPrepareEdit={handlePrepareEdit}
                onDeleteContact={handleDeleteContact}
                isProcessing={isProcessing}
                isUserSuperAdmin={isUserSuperAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modais/Dialogs refatorados em componentes */}
      <ContactEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        contact={contactToEdit}
        onSave={handleSaveEdit}
        isProcessing={isProcessing}
        editName={editName}
        setEditName={setEditName}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
      />
      
      <ContactStageChangeDialog
        open={showStageChangeDialog}
        onOpenChange={setShowStageChangeDialog}
        selectedContactSequence={selectedContactSequence}
        selectedStageId={selectedStageId}
        setSelectedStageId={setSelectedStageId}
        onSave={handleSaveStageChange}
        isProcessing={isProcessing}
        sequences={sequences}
      />
      
      <ContactSequencesDialog
        open={showSequences}
        onOpenChange={setShowSequences}
        contact={selectedContact}
        contactSequences={contactSequences}
        sequences={sequences}
        onPrepareStageChange={handlePrepareStageChange}
        onRemoveFromSequence={handleRemoveFromSequence}
        isProcessing={isProcessing}
      />
    </div>
  );
}
