
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

/**
 * This component is for debugging purposes only.
 * It displays information about the current state of the context in the console.
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
