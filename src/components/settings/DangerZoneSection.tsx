
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function DangerZoneSection() {
  const { user, logout } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (confirmEmail !== user.email) {
      toast.error('Email incorreto');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // Em um caso real, aqui você implementaria a lógica para excluir a conta
      // Por segurança, isso geralmente é feito via função no backend
      
      // Simulando uma exclusão bem-sucedida
      setTimeout(() => {
        toast.success('Conta excluída com sucesso!');
        logout(); // Fazer logout após exclusão
      }, 1500);
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error(`Erro ao excluir conta: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };
  
  return (
    <Card className="border-red-500/50">
      <CardHeader>
        <CardTitle className="text-red-500">Zona de Perigo</CardTitle>
        <CardDescription>
          Ações irreversíveis que afetam sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Excluir Conta</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Essa ação não pode ser desfeita. Todos os seus dados serão removidos permanentemente.
            </p>
            
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Excluir Minha Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir Conta</DialogTitle>
                  <DialogDescription>
                    Essa ação não pode ser desfeita. Todos os seus dados serão removidos permanentemente.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirm-email">Digite seu email para confirmar</Label>
                    <Input 
                      id="confirm-email" 
                      value={confirmEmail} 
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      placeholder={user?.email}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount} 
                    disabled={isDeleting || confirmEmail !== user?.email}
                  >
                    {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
