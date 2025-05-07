import { useState } from "react";
import { useApp } from '@/context/AppContext';
import { Search, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Contact, ContactSequence } from '@/types';
import { toast } from "sonner";

// Componentes refatorados
import { ContactTable } from "@/components/contacts/ContactTable";
import { ContactEditDialog } from "@/components/contacts/ContactEditDialog";
import { ContactStageChangeDialog } from "@/components/contacts/ContactStageChangeDialog";
import { ContactSequencesDialog } from "@/components/contacts/ContactSequencesDialog";

export default function Contacts() {
  const { contacts, sequences, contactSequences, deleteContact, updateContact, removeFromSequence, updateContactSequence, refreshData } = useApp();
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
  
  // Helper function to get contact sequences
  const getContactSequences = (contactId: string) => {
    return contactSequences.filter(seq => seq.contactId === contactId);
  };
  
  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery) ||
    contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
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
      
      <div className="flex items-center justify-between">
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
                isProcessing={isProcessing}
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
