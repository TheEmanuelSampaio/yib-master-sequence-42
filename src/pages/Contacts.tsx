
import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Search, User, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Contact, ContactSequence } from '@/types';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  console.log("[Contacts] Render start");
  const { 
    contacts, 
    sequences, 
    contactSequences, 
    clients, 
    users, 
    deleteContact, 
    updateContact, 
    removeFromSequence, 
    updateContactSequence,
    refreshData,
    isLoading: globalLoading
  } = useApp();

  const { isSuper } = useAuth();
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
  const [clientFilter, setClientFilter] = useState<string>("");
  const [adminFilter, setAdminFilter] = useState<string>("");
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  
  // Helper function to get contact sequences - memoized for better performance
  const getContactSequences = useCallback((contactId: string) => {
    return contactSequences.filter(seq => seq.contactId === contactId);
  }, [contactSequences]);
  
  // Apply all filters to contacts - memoized to prevent recomputation on every render
  const applyFilters = useCallback((contactsList: Contact[]) => {
    // First apply text search
    let filtered = contactsList.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery) ||
      contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Then apply client filter if set
    if (clientFilter && clientFilter !== "all") {
      filtered = filtered.filter(contact => contact.clientId === clientFilter);
    }
    
    // Then apply admin filter if set (super admin only)
    if (isSuper && adminFilter && adminFilter !== "all") {
      filtered = filtered.filter(contact => contact.adminId === adminFilter);
    }
    
    return filtered;
  }, [searchQuery, clientFilter, adminFilter, isSuper]);
  
  // Memoized filtered contacts
  const filteredContacts = useMemo(() => {
    console.log("[Contacts] Recalculating filtered contacts");
    return applyFilters(contacts);
  }, [contacts, applyFilters]);
  
  // Memoized active contacts
  const activeContacts = useMemo(() => {
    console.log("[Contacts] Recalculating active contacts");
    return filteredContacts.filter(contact => {
      const sequences = getContactSequences(contact.id);
      return sequences.some(seq => seq.status === 'active');
    });
  }, [filteredContacts, getContactSequences]);
  
  // Function to get contact's sequence data - memoized
  const getContactSequenceDetails = useCallback((contactId: string) => {
    const sequences = getContactSequences(contactId);
    return {
      active: sequences.filter(seq => seq.status === 'active').length,
      completed: sequences.filter(seq => seq.status === 'completed').length,
      removed: sequences.filter(seq => seq.status === 'removed').length,
      total: sequences.length
    };
  }, [getContactSequences]);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    setClientFilter("");
    setAdminFilter("");
  }, []);
  
  // Safe refresh function with throttling
  const safeRefreshContacts = useCallback(async () => {
    const now = Date.now();
    // Ensure we don't refresh too often (at least 3 seconds between refreshes)
    if (now - lastRefreshTime < 3000) {
      console.log("[Contacts] Throttling refresh request");
      return;
    }
    
    console.log("[Contacts] Refreshing contacts data");
    setLocalLoading(true);
    setLastRefreshTime(now);
    
    try {
      await refreshData("contacts");
    } catch (error) {
      console.error("[Contacts] Error refreshing contact data:", error);
    } finally {
      setLocalLoading(false);
    }
  }, [refreshData, lastRefreshTime]);
  
  // View contact sequences
  const handleViewSequences = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setShowSequences(true);
  }, []);
  
  // Preparar edição do contato
  const handlePrepareEdit = useCallback((contact: Contact) => {
    setContactToEdit(contact);
    setEditName(contact.name);
    setEditPhone(contact.phoneNumber);
    setShowEditDialog(true);
  }, []);
  
  // Salvar edição do contato
  const handleSaveEdit = useCallback(async () => {
    if (!contactToEdit) return;
    
    setIsProcessing(true);
    
    try {
      const result = await updateContact(contactToEdit.id, {
        name: editName,
        phoneNumber: editPhone
      });
      
      if (result.success) {
        toast.success("Contato atualizado com sucesso");
        setShowEditDialog(false);
        
        // Update local state instead of full refresh
        // Only refresh on failure
      } else {
        toast.error(result.error || "Erro ao atualizar contato");
        // Only refresh on failure
        safeRefreshContacts();
      }
    } catch (error) {
      console.error("[Contacts] Error updating contact:", error);
      toast.error("Erro ao atualizar contato");
    } finally {
      setIsProcessing(false);
    }
  }, [contactToEdit, editName, editPhone, updateContact, safeRefreshContacts]);
  
  // Excluir contato
  const handleDeleteContact = useCallback(async (contactId: string) => {
    setIsProcessing(true);
    
    try {
      const result = await deleteContact(contactId);
      
      if (result.success) {
        toast.success("Contato excluído com sucesso");
        // Let the delete operation update the context state
        // Don't call refreshData() here
      } else {
        toast.error(result.error || "Erro ao excluir contato");
        safeRefreshContacts(); // Only refresh on failure
      }
    } catch (error) {
      console.error("[Contacts] Error deleting contact:", error);
      toast.error("Erro ao excluir contato");
    } finally {
      setIsProcessing(false);
    }
  }, [deleteContact, safeRefreshContacts]);
  
  // Remover contato de uma sequência
  const handleRemoveFromSequence = useCallback(async (contactSequenceId: string) => {
    setIsProcessing(true);
    
    try {
      const result = await removeFromSequence(contactSequenceId);
      
      if (result.success) {
        toast.success("Contato removido da sequência com sucesso");
        setShowSequences(false); // Fechar o modal
        // Let the remove operation update the context state
        // Don't call refreshData() here
      } else {
        toast.error(result.error || "Erro ao remover contato da sequência");
        safeRefreshContacts(); // Only refresh on failure
      }
    } catch (error) {
      console.error("[Contacts] Error removing contact from sequence:", error);
      toast.error("Erro ao remover contato da sequência");
    } finally {
      setIsProcessing(false);
    }
  }, [removeFromSequence, safeRefreshContacts]);
  
  // Preparar mudança de estágio
  const handlePrepareStageChange = useCallback((contactSequence: ContactSequence) => {
    setSelectedContactSequence(contactSequence);
    setSelectedStageId(contactSequence.currentStageId || '');
    setShowStageChangeDialog(true);
  }, []);
  
  // Salvar mudança de estágio
  const handleSaveStageChange = useCallback(async () => {
    if (!selectedContactSequence || !selectedStageId) return;
    
    setIsProcessing(true);
    
    try {
      const result = await updateContactSequence(selectedContactSequence.id, {
        currentStageId: selectedStageId
      });
      
      if (result.success) {
        toast.success("Estágio atualizado com sucesso e mensagens reagendadas");
        setShowStageChangeDialog(false);
        // Let the update operation handle state changes
        // Don't call refreshData() here
      } else {
        toast.error(result.error || "Erro ao atualizar estágio");
        safeRefreshContacts(); // Only refresh on failure
      }
    } catch (error) {
      console.error("[Contacts] Error updating stage:", error);
      toast.error("Erro ao atualizar estágio");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedContactSequence, selectedStageId, updateContactSequence, safeRefreshContacts]);
  
  // Only refresh on initial mount or when explicitly needed - avoids multiple loading loops
  useEffect(() => {
    console.log("[Contacts] Component mounted or reloaded");
    // Do not call refreshData here - rely on the MainLayout to load initial data
  }, []);
  
  // Determine if loading is needed
  const isLoadingData = globalLoading || localLoading;

  console.log("[Contacts] Render complete");

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie seus contatos e suas sequências
        </p>
      </div>
      
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {(clientFilter || adminFilter) && (
                <Badge className="ml-2 bg-primary">{(clientFilter ? 1 : 0) + (adminFilter ? 1 : 0)}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Filtrar Contatos</h4>
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Cliente</label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.accountName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {isSuper && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Admin</label>
                    <Select value={adminFilter} onValueChange={setAdminFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os admins" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os admins</SelectItem>
                        {users.filter(user => user.role === 'admin').map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.accountName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={resetFilters}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
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
                isProcessing={isProcessing || isLoadingData}
                showClientColumn={true}
                showAdminColumn={isSuper}
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
                isProcessing={isProcessing || isLoadingData}
                showClientColumn={true}
                showAdminColumn={isSuper}
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
