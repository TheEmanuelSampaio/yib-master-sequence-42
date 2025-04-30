
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function UserProfileSection() {
  const { user } = useAuth();
  const [accountName, setAccountName] = useState(user?.accountName || "");
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ account_name: accountName })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Usuário</CardTitle>
        <CardDescription>
          Atualize suas informações de perfil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            value={user?.email || ""} 
            disabled 
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            O email não pode ser alterado
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="accountName">Nome da Conta</Label>
          <Input 
            id="accountName" 
            value={accountName} 
            onChange={(e) => setAccountName(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={handleUpdateProfile} 
          disabled={isUpdating || !accountName || accountName === user?.accountName}
        >
          {isUpdating ? 'Atualizando...' : 'Atualizar Perfil'}
        </Button>
      </CardContent>
    </Card>
  );
}
