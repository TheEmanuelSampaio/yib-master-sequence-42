
import { createContext, useContext, useState } from "react";
import { User } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface UsersContextType {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: { email: string; password: string; accountName: string, isAdmin?: boolean }) => Promise<void>;
  updateUser: (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  const refreshUsers = async () => {
    try {
      if (!currentUser || currentUser.role !== 'super_admin') return;
      
      // Get profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;
      
      // Get user emails from auth.users through function or RPC
      const { data: authUsersData, error: authUsersError } = await supabase
        .rpc('get_users_with_emails');
        
      if (authUsersError) {
        console.error("Error fetching user emails:", authUsersError);
        // Continue with what we have
      }
      
      // Create map of user IDs to emails
      const emailMap = new Map();
      if (authUsersData && Array.isArray(authUsersData)) {
        authUsersData.forEach(userData => {
          if (userData.id && userData.email) {
            emailMap.set(userData.id, userData.email);
          }
        });
      }
      
      // Map profiles to users with emails
      const usersWithEmails = profilesData.map(profile => {
        const email = emailMap.get(profile.id) || 
                      (profile.id === currentUser.id ? currentUser.email : `user-${profile.id.substring(0, 4)}@example.com`);
        
        return {
          id: profile.id,
          accountName: profile.account_name,
          email,
          role: profile.role,
          avatar: ""
        };
      });
      
      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(`Erro ao carregar usuários: ${error.message}`);
    }
  };

  const addUser = async (userData: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      // Use Supabase auth to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Erro ao criar usuário");
      }
      
      // Update the profile with the account name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          account_name: userData.accountName,
          role: userData.isAdmin ? 'admin' : 'admin' // Default to admin for now
        })
        .eq('id', data.user.id);
      
      if (updateError) throw updateError;
      
      toast.success("Usuário criado com sucesso");
      refreshUsers();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    }
  };

  const updateUser = async (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => {
    try {
      const updateData: any = {};
      
      if (data.accountName !== undefined) updateData.account_name = data.accountName;
      if (data.role !== undefined) updateData.role = data.role;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setUsers(prev => 
        prev.map(u => 
          u.id === id ? { ...u, accountName: data.accountName || u.accountName, role: data.role || u.role } : u
        )
      );
      
      toast.success("Usuário atualizado com sucesso");
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Requires admin privileges in Supabase
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("Usuário excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    }
  };

  return (
    <UsersContext.Provider value={{
      users,
      setUsers,
      addUser,
      updateUser,
      deleteUser,
      refreshUsers
    }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error("useUsers must be used within a UsersProvider");
  }
  return context;
};
