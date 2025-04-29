
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSuper: boolean;
  setupCompleted: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, accountName: string, isSuper: boolean) => Promise<void>;
  logout: () => Promise<void>;
  completeSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuper, setIsSuper] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getAppSetup = async () => {
      const { data, error } = await supabase
        .from('app_setup')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching app setup:", error);
      } else {
        setSetupCompleted(data.setup_completed);
      }
    };

    getAppSetup();
  }, []);

  useEffect(() => {
    setLoading(true);

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          try {
            // Get user profile data
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profileError) throw profileError;

            const userWithProfile = {
              id: session.user.id,
              email: session.user.email || "",
              accountName: profileData.account_name,
              role: profileData.role,
              avatar: "",
            };
            
            setUser(userWithProfile);
            setIsSuper(profileData.role === "super_admin");
          } catch (error) {
            console.error("Error fetching user profile:", error);
            setUser(null);
          }
        } else {
          setUser(null);
          setIsSuper(false);
        }
        
        setLoading(false);
      }
    );

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Get user profile data
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              console.error("Error fetching user profile:", profileError);
              setUser(null);
              setLoading(false);
              return;
            }

            const userWithProfile = {
              id: session.user.id,
              email: session.user.email || "",
              accountName: profileData.account_name,
              role: profileData.role,
              avatar: "",
            };
            
            setUser(userWithProfile);
            setIsSuper(profileData.role === "super_admin");
            setLoading(false);
          });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      navigate("/");
      toast.success("Login bem-sucedido!");
    } catch (error: any) {
      toast.error(`Erro ao fazer login: ${error.message}`);
    }
  };

  const signup = async (email: string, password: string, accountName: string, isSuper: boolean) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Update the profile with account name and role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            account_name: accountName,
            role: isSuper ? 'super_admin' : 'admin'
          })
          .eq('id', data.user.id);
        
        if (updateError) throw updateError;
        
        if (isSuper) {
          // Mark setup as completed
          const { error: setupError } = await supabase
            .from('app_setup')
            .update({ 
              setup_completed: true,
              setup_completed_at: new Date().toISOString()
            })
            .eq('setup_completed', false);
          
          if (setupError) throw setupError;
          
          setSetupCompleted(true);
        }
        
        toast.success("Conta criada com sucesso!");
      }
    } catch (error: any) {
      toast.error(`Erro ao criar conta: ${error.message}`);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
      toast.success("Logout realizado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao fazer logout: ${error.message}`);
    }
  };

  const completeSetup = async () => {
    try {
      const { error } = await supabase
        .from('app_setup')
        .update({ 
          setup_completed: true,
          setup_completed_at: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (error) throw error;
      
      setSetupCompleted(true);
      toast.success("Setup concluído com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao completar setup: ${error.message}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isSuper,
      setupCompleted,
      login,
      signup,
      logout,
      completeSetup
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
