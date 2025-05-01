
import { createContext, useContext, useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { User, AuthContextType } from "@/types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const [isSuper, setIsSuper] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
        setIsSignedIn(!!data.session);

        if (data.session?.user?.id) {
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.session.user.id)
            .maybeSingle();

          if (userError) throw userError;
          
          // Set user with camelCase property conversion
          if (userData) {
            setUser({
              ...userData,
              accountName: userData.account_name
            });
          }

          // Check if user is super admin
          const { data: isAdmin, error: adminError } = await supabase.rpc('is_super_admin');
          if (!adminError) {
            setIsSuper(isAdmin === true);
          }
          
          // Fetch setup status
          const { data: setupData } = await supabase
            .from('app_setup')
            .select('setup_completed')
            .single();
            
          setSetupCompleted(setupData?.setup_completed ?? false);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setIsSignedIn(!!session);

      if (session?.user?.id) {
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (userError) {
          console.error("Error fetching user data:", userError);
          setError(userError.message);
        } else if (userData) {
          setUser({
            ...userData,
            accountName: userData.account_name,
            email: session.user.email
          });
        }
      } else {
        setUser(null);
      }

      if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Extract user data from the session
      if (data?.user) {
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (userError) throw userError;
        
        if (userData) {
          setUser({
            ...userData,
            accountName: userData.account_name,
            email: data.user.email
          });
        }
      }
      
      toast.success("Login bem-sucedido!");
    } catch (error) {
      console.error("Error signing in:", error);
      setError(error instanceof Error ? error.message : String(error));
      toast.error(`Erro ao fazer login: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;
      
      toast.success("Cadastro realizado com sucesso! Verifique seu e-mail para ativar sua conta.");
    } catch (error) {
      console.error("Error signing up:", error);
      setError(error instanceof Error ? error.message : String(error));
      toast.error(`Erro ao criar conta: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Error signing out:", error);
      setError(error instanceof Error ? error.message : String(error));
      toast.error(`Erro ao fazer logout: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signIn,
        signUp,
        signOut,
        logout: signOut, // Alias for backward compatibility
        loading,
        error,
        clearError,
        isSignedIn,
        setupCompleted,
        isSuper
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
