
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
      
      // Get user emails from auth.users through Supabase function or RPC
      const { data: authUsersData, error: authUsersError } = await supabase
        .rpc('get_users_with_emails');
        
      if (authUsersError) {
        console.error("Error fetching user emails:", authUsersError);
        // Continue with what we have, but log the error
      }
      
      // Create a map of user IDs to emails for quick lookup
      const emailMap = new Map();
      if (authUsersData && Array.isArray(authUsersData)) {
        authUsersData.forEach(userData => {
          if (userData.id && userData.email) {
            emailMap.set(userData.id, userData.email);
          }
        });
      }
      
      // Now map profiles to users with emails from the emailMap
      const usersWithEmails = profilesData.map(profile => {
        // Try to get email from the map, fall back to current user email or a placeholder
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

  const addUser = async (user: { email: string; password: string; accountName: string, isAdmin?: boolean }) => {
    try {
      // Instead of using rpc, use a custom API call or edge function
      // This is a temporary workaround until the database function is properly created
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          account_name: user.accountName,
          role: user.isAdmin ? 'admin' : 'user'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creating user');
      }
      
      // Refresh users list
      await refreshUsers();
      
      toast.success("Usuário criado com sucesso");
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(`Erro ao criar usuário: ${error.message}`);
    }
  };

  const updateUser = async (id: string, data: { accountName?: string; role?: "super_admin" | "admin" }) => {
    try {
      // Only update fields that are provided
      const updateData: any = {};
      if (data.accountName !== undefined) {
        updateData.account_name = data.accountName;
      }
      if (data.role !== undefined) {
        updateData.role = data.role;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Update users list
      setUsers(prev => 
        prev.map(user => 
          user.id === id 
            ? { 
                ...user, 
                accountName: data.accountName ?? user.accountName, 
                role: data.role ?? user.role 
              } 
            : user
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
      // Delete via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: id,
          requesting_user_id: currentUser?.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir usuário');
      }
      
      // Update users list
      setUsers(prev => prev.filter(user => user.id !== id));
      
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
