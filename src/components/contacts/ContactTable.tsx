
import { Contact, ContactSequence } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ContactTableProps {
  contacts: Contact[];
  getContactSequenceDetails: (contactId: string) => {
    active: number;
    completed: number;
    removed: number;
    total: number;
  };
  onViewSequences: (contact: Contact) => void;
  onPrepareEdit: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  isProcessing: boolean;
}

export const ContactTable = ({ 
  contacts, 
  getContactSequenceDetails,
  onViewSequences, 
  onPrepareEdit, 
  onDeleteContact,
  isProcessing
}: ContactTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Sequências</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length > 0 ? contacts.map(contact => {
            const seqDetails = getContactSequenceDetails(contact.id);
            
            return (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>{contact.phoneNumber}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {seqDetails.total > 0 ? (
                    <div className="flex items-center space-x-2">
                      {seqDetails.active > 0 && (
                        <Badge className="bg-green-600">
                          {seqDetails.active} ativa{seqDetails.active > 1 && 's'}
                        </Badge>
                      )}
                      {seqDetails.completed > 0 && (
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
                          {seqDetails.completed} concluída{seqDetails.completed > 1 && 's'}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Sem sequências
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {seqDetails.active > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onViewSequences(contact)}
                      >
                        <Clock className="h-4 w-4" />
                        <span className="sr-only">Ver Sequências</span>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onPrepareEdit(contact)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o 
                                contato "{contact.name}" e removerá todos os dados associados a ele.
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Nenhum contato encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
