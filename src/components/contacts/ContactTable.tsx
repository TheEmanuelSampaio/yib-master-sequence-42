
import { Contact } from '@/types';
import { User, Tag, Phone, Eye, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, Building, UserCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContactSequenceDetails {
  active: number;
  completed: number;
  removed: number;
  total: number;
}

interface ContactTableProps {
  contacts: Contact[];
  getContactSequenceDetails: (contactId: string) => ContactSequenceDetails;
  onViewSequences: (contact: Contact) => void;
  onPrepareEdit: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  isProcessing: boolean;
  showClientColumn?: boolean;
  showAdminColumn?: boolean;
}

export const ContactTable = ({
  contacts,
  getContactSequenceDetails,
  onViewSequences,
  onPrepareEdit,
  onDeleteContact,
  isProcessing,
  showClientColumn = false,
  showAdminColumn = false,
}: ContactTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Contato</TableHead>
          <TableHead>Telefone</TableHead>
          {showClientColumn && <TableHead>Cliente</TableHead>}
          {showAdminColumn && <TableHead>Admin</TableHead>}
          <TableHead>Tags</TableHead>
          <TableHead>Sequências</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts && contacts.length > 0 ? (
          contacts.map(contact => {
            // Make sure contact exists before trying to get sequence details
            const sequenceDetails = contact ? getContactSequenceDetails(contact.id) : { active: 0, completed: 0, removed: 0, total: 0 };
            
            return (
              <TableRow key={contact.id}>
                <TableCell className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.name}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.phoneNumber}</span>
                  </div>
                </TableCell>
                {showClientColumn && (
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.clientName || "—"}</span>
                    </div>
                  </TableCell>
                )}
                {showAdminColumn && (
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.adminName || "—"}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {/* Add null check for contact.tags before mapping */}
                    {contact.tags && Array.isArray(contact.tags) ? contact.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    )) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {sequenceDetails.active > 0 && (
                      <Badge className="bg-green-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {sequenceDetails.active} ativa{sequenceDetails.active !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {sequenceDetails.completed > 0 && (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {sequenceDetails.completed} concluída{sequenceDetails.completed !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {sequenceDetails.removed > 0 && (
                      <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {sequenceDetails.removed} removida{sequenceDetails.removed !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onViewSequences(contact)}
                      disabled={isProcessing}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onPrepareEdit(contact)}
                      disabled={isProcessing}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Contato?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá remover permanentemente o contato "{contact.name}" e todos os seus dados, incluindo o histórico de sequências.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteContact(contact.id)}
                            className="bg-red-500 hover:bg-red-600"
                            disabled={isProcessing}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={showClientColumn && showAdminColumn ? 7 : showClientColumn || showAdminColumn ? 6 : 5} className="text-center py-6 text-muted-foreground">
              Nenhum contato encontrado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
