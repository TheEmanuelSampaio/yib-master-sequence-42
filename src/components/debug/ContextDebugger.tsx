
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

/**
 * Este componente é apenas para fins de depuração.
 * Ele mostra informações sobre o estado atual do contexto no console.
 */
export function ContextDebugger() {
  const appContext = useApp();
  const authContext = useAuth();
  
  useEffect(() => {
    console.log('=== CONTEXT DEBUGGER ===');
    console.log('App Context:', appContext);
    console.log('Auth Context:', authContext);
    console.log('=== END CONTEXT DEBUGGER ===');
  }, [appContext, authContext]);
  
  return null;
}
